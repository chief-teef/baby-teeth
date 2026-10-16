import {encodePng,cleanPng,PNG_MAX_BYTES,PNG_MAX_SIDE} from '../shared/png.js';
const processedPng=new Map();
export function createCloudClient(base=''){
  let session={configured:false,signedIn:false};
  async function request(path,options={}){if(typeof options.body==='string'&&new TextEncoder().encode(options.body).length>900000)throw Error('This online save exceeds 900,000 bytes including upload receipts. Reduce this entry before retrying; local recovery and export remain available.');const response=await fetch(`${base}${path}`,{credentials:'same-origin',...options,headers:{...(options.body instanceof Blob?{}:options.body?{'Content-Type':'application/json'}:{}),...(options.method&&options.method!=='GET'?{'X-Studio-Contract':'3'}:{}),...(session.csrf?{'X-CSRF-Token':session.csrf}:{}),...options.headers}});let data;try{data=await response.json();}catch{throw Error('Online saving is not configured at this address.');}if(!response.ok){const error=Error(data.error||'Online request failed.');error.status=response.status;throw error;}return data;}
  return {
    async check(){try{session=await request('/api/session');}catch(error){session={configured:error.status===503,signedIn:false,...(error.status===503?{unavailable:true}:{})};}return session;},
    login(){location.href=`${base}/auth/login`;},
    async logout(){await request('/auth/logout',{method:'POST'});session={...session,signedIn:false};},
    list:()=>request('/api/posts'),
    spotify:url=>request('/api/spotify?url='+encodeURIComponent(url)),
    lifecycle:(id,action,baseRevision)=>request(`/api/posts/${id}/${action}`,{method:'POST',body:JSON.stringify({baseRevision})}),
    get:id=>request(`/api/posts/${id}`),
    upload:blob=>request('/api/assets',{method:'POST',headers:{'Content-Type':blob.type},body:blob}),
    save:(id,body)=>request(`/api/posts/${id}`,{method:'PUT',body:JSON.stringify(body)}),
    deployment:commit=>request(`/api/deployment?commit=${commit}`),
  };
}
export async function jpegForUpload(src){
  if(processedPng.has(src))return processedPng.get(src);
  let original;
  if(/^data:image\/(jpeg|png|webp);base64,/.test(src)){
    // Local photos are data URLs; fetching them is blocked by the studio CSP.
    const comma=src.indexOf(','),bytes=atob(src.slice(comma+1));
    original=new Blob([Uint8Array.from(bytes,character=>character.charCodeAt(0))],{type:src.slice(5,src.indexOf(';'))});
  }else original=await fetch(src).then(r=>{if(!r.ok)throw Error('Could not read this photo for upload.');return r.blob();});
  if(original.type==='image/png'){
    try{const bytes=await cleanPng(new Uint8Array(await original.arrayBuffer())),blob=new Blob([bytes],{type:'image/png'});processedPng.set(src,blob);if(processedPng.size>24)processedPng.delete(processedPng.keys().next().value);return blob;}catch{/* Imported PNGs are normalized from decoded pixels below. */}
  }
  const image=await createImageBitmap(original);
  if(original.type==='image/png'||/^data:image\/png;/.test(src)||/\.png(?:[?#]|$)/i.test(src)){
    try{const blob=await pngForUpload(image);processedPng.set(src,blob);if(processedPng.size>24)processedPng.delete(processedPng.keys().next().value);return blob;}finally{image.close();}
  }
  const canvas=document.createElement('canvas');let ratio=Math.min(1,1600/Math.max(image.width,image.height));
  const encode=async quality=>{canvas.width=Math.round(image.width*ratio);canvas.height=Math.round(image.height*ratio);const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);return new Promise(r=>canvas.toBlob(r,'image/jpeg',quality));};
  try{let blob=await encode(.8);if(blob?.size>600000)blob=await encode(.65);if(blob?.size>600000){ratio*=.7;blob=await encode(.7);}if(!blob||blob.size>700000)throw Error('This photo needs to be smaller before online saving.');return blob;}finally{image.close();}
}
export async function pngForUpload(image){
  const canvas=document.createElement('canvas');let ratio=Math.min(1,PNG_MAX_SIDE/Math.max(image.width,image.height));
  for(let attempt=0;attempt<8;attempt++,ratio*=.8){canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio));const context=canvas.getContext('2d',{willReadFrequently:true});context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);const pixels=context.getImageData(0,0,canvas.width,canvas.height).data,bytes=await encodePng(canvas.width,canvas.height,pixels);if(bytes.length<=PNG_MAX_BYTES)return new Blob([bytes],{type:'image/png'});}
  throw Error('This transparent photo exceeds the online PNG limit. Resize it and retry; your local work and export are safe.');
}
export function dataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});}
