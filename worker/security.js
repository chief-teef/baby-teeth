import {Buffer} from 'node:buffer';
const encoder=new TextEncoder();
export const base64=bytes=>Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength).toString('base64');
export const unbase64=value=>new Uint8Array(Buffer.from(value,'base64'));
export const url64=bytes=>base64(bytes).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export const random=()=>url64(crypto.getRandomValues(new Uint8Array(32)));
export const digest=async value=>url64(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));
async function key(secret){if(typeof secret!=='string'||secret.length<32)throw Error('Session encryption is not configured.');return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',encoder.encode(secret)),'AES-GCM',false,['encrypt','decrypt']);}
export async function seal(secret,purpose,data){const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(purpose)},await key(secret),encoder.encode(JSON.stringify(data)));return `${url64(iv)}.${url64(new Uint8Array(encrypted))}`;}
export async function open(secret,purpose,value){try{if(typeof value!=='string'||value.length>16000)return null;const [nonce,cipher]=value.split('.');const decode=s=>unbase64(s.replace(/-/g,'+').replace(/_/g,'/'));const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(nonce),additionalData:encoder.encode(purpose)},await key(secret),decode(cipher));const data=JSON.parse(new TextDecoder().decode(plain));return data.exp>Date.now()?data:null;}catch{return null;}}
export function cookie(request,name){return (request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(`${name}=`))?.slice(name.length+1);}
export const setCookie=(name,value,age)=>`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
export class HttpError extends Error{constructor(status,message,details={}){super(message);this.status=status;this.details=details;}}
export async function limitedBody(request,max){const length=Number(request.headers.get('content-length'));if(length>max)throw new HttpError(413,'Upload is too large.');if(!request.body)return new Uint8Array();
  // A framed in-bound body is read natively (G1: the JS chunk loop cost ~9 ms CPU at 3 MB); the length is still rechecked.
  if(request.headers.has('content-length')&&Number.isSafeInteger(length)){const bytes=new Uint8Array(await request.arrayBuffer());if(bytes.length>max)throw new HttpError(413,'Upload is too large.');return bytes;}
  const reader=request.body.getReader();const chunks=[];let size=0;while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new HttpError(413,'Upload is too large.');}chunks.push(value);}const all=new Uint8Array(size);let i=0;for(const chunk of chunks){all.set(chunk,i);i+=chunk.length;}return all;}
export async function jsonBody(request,max=900000){if(!(request.headers.get('content-type')||'').startsWith('application/json'))throw new HttpError(415,'Use JSON for this request.');try{return JSON.parse(new TextDecoder().decode(await limitedBody(request,max)));}catch(e){if(e instanceof HttpError)throw e;throw new HttpError(400,'Invalid JSON.');}}
// Strip EXIF/XMP/comments and reject malformed JPEG headers. The site serves
// images with a JPEG MIME type and nosniff; arbitrary SVG/HTML is never accepted.
export function cleanJpeg(bytes){
  if(bytes.length<20||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)throw new HttpError(400,'Upload a processed JPEG photo.');
  const parts=[bytes.subarray(0,2)];let i=2,dimensions=false,scan=false;
  while(i<bytes.length-2){if(bytes[i]!==255)throw new HttpError(400,'Invalid JPEG header.');const marker=bytes[i+1];if(marker===218){if(!dimensions)throw new HttpError(400,'Missing JPEG dimensions.');parts.push(bytes.subarray(i));scan=true;break;}
    if(marker===0||marker===216||marker===217)throw new HttpError(400,'Invalid JPEG marker.');const length=(bytes[i+2]<<8)|bytes[i+3];if(length<2||i+length+2>bytes.length)throw new HttpError(400,'Invalid JPEG segment.');
    if([192,193,194].includes(marker)){const h=(bytes[i+5]<<8)|bytes[i+6],w=(bytes[i+7]<<8)|bytes[i+8];if(!w||!h||w>2400||h>2400)throw new HttpError(400,'Photo dimensions exceed the processed upload limit.');dimensions=true;}
    if(marker!==225&&marker!==254)parts.push(bytes.subarray(i,i+length+2));i+=length+2;
  }
  if(!dimensions||!scan||parts.length<2)throw new HttpError(400,'Invalid JPEG photo.');const output=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;parts.forEach(p=>{output.set(p,offset);offset+=p.length;});return output;
}
