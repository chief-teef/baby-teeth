// Canonical static RGBA8 PNG; no browser encoder assumptions or metadata.
// Free-runtime profile gate: larger RGBA decodes exceeded the request CPU budget.
export const PNG_MAX_BYTES=300000,PNG_MAX_SIDE=512,PNG_MAX_PIXELS=262144;
const signature=Uint8Array.of(137,80,78,71,13,10,26,10),encoder=new TextEncoder();
const table=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(bytes){let crc=0xffffffff;for(let i=0;i<bytes.length;i++)crc=table[(crc^bytes[i])&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
export function pngChunk(type,data=new Uint8Array()) {const out=new Uint8Array(data.length+12),view=new DataView(out.buffer);view.setUint32(0,data.length);out.set(encoder.encode(type),4);out.set(data,8);view.setUint32(out.length-4,crc32(out.subarray(4,-4)));return out;}
export function joinBytes(parts){const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const part of parts){out.set(part,offset);offset+=part.length;}return out;}
export const isPng=bytes=>bytes.length>=8&&signature.every((v,i)=>bytes[i]===v);
function dimensions(width,height){if(!width||!height||width>PNG_MAX_SIDE||height>PNG_MAX_SIDE||width*height>PNG_MAX_PIXELS)throw Error('PNG dimensions exceed the processed upload limit.');}
export async function encodePng(width,height,rgba){dimensions(width,height);if(rgba.length!==width*height*4)throw Error('Invalid RGBA pixels.');const row=width*4,raw=new Uint8Array(height*(row+1));for(let y=0;y<height;y++)raw.set(rgba.subarray(y*row,(y+1)*row),y*(row+1)+1);const compressed=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());const header=new Uint8Array(13),view=new DataView(header.buffer);view.setUint32(0,width);view.setUint32(4,height);header[8]=8;header[9]=6;return joinBytes([signature,pngChunk('IHDR',header),pngChunk('IDAT',compressed),pngChunk('IEND')]);}
export async function cleanPng(bytes){
  if(bytes.length>PNG_MAX_BYTES||!isPng(bytes))throw Error('Upload a processed PNG smaller than 300 KB.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),parts=[signature],idat=[];let offset=8,count=0,width,height,ended=false,idatEnded=false;
  while(offset<bytes.length){
    if(++count>2048||offset+12>bytes.length)throw Error('Invalid PNG chunk length.');
    const length=view.getUint32(offset),end=offset+length+12;if(end>bytes.length)throw Error('Truncated PNG chunk.');
    const type=String.fromCharCode(...bytes.subarray(offset+4,offset+8));if(!/^[A-Za-z]{4}$/.test(type)||type[2]!==type[2].toUpperCase())throw Error('Invalid PNG chunk type.');
    if(crc32(bytes.subarray(offset+4,end-4))!==view.getUint32(end-4))throw Error('Invalid PNG checksum.');
    const data=bytes.subarray(offset+8,end-4);
    if(count===1&&type!=='IHDR')throw Error('PNG header must be first.');
    if(type==='IHDR'){if(count!==1||length!==13)throw Error('Invalid PNG header.');width=view.getUint32(offset+8);height=view.getUint32(offset+12);dimensions(width,height);if(data[8]!==8||data[9]!==6||data[10]||data[11]||data[12])throw Error('Use a static non-interlaced RGBA8 PNG.');parts.push(bytes.subarray(offset,end));}
    else if(type==='IDAT'){if(idatEnded)throw Error('PNG image chunks must be contiguous.');idat.push(data);parts.push(bytes.subarray(offset,end));}
    else if(type==='IEND'){if(length||!idat.length||end!==bytes.length)throw Error('Invalid PNG ending.');parts.push(bytes.subarray(offset,end));ended=true;}
    else {if(['acTL','fcTL','fdAT'].includes(type)||type[0]===type[0].toUpperCase())throw Error('Animated or unsupported PNG chunk.');if(idat.length)idatEnded=true;}
    offset=end;
  }
  if(!ended)throw Error('PNG ending is missing.');
  const expected=height*(1+4*width),stride=1+4*width;let size=0,nextRow=0;
  const compressed=joinBytes(idat);let inputOffset=0;
  // Small input pulls also bound the transient output of a hostile deflate block.
  const input=new ReadableStream({pull(controller){if(inputOffset===compressed.length){controller.close();return;}const end=Math.min(inputOffset+4096,compressed.length);controller.enqueue(compressed.subarray(inputOffset,end));inputOffset=end;}});
  const reader=input.pipeThrough(new DecompressionStream('deflate')).getReader();
  try{while(true){const {done,value}=await reader.read();if(done)break;if(size+value.length>expected)throw Error('PNG decoded data exceeds its dimensions.');while(nextRow<size+value.length){if(value[nextRow-size]>4)throw Error('Invalid PNG row filter.');nextRow+=stride;}size+=value.length;}if(size!==expected)throw Error('Truncated PNG image data.');}catch(error){await reader.cancel().catch(()=>{});throw Error(`Invalid PNG compressed image: ${error.message}`);}finally{reader.releaseLock();}
  return joinBytes(parts);
}
