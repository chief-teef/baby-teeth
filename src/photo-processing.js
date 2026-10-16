import {uid} from './model.js';
import {pngForUpload,dataUrl} from './cloud.js';
import {isPng} from '../shared/png.js';
export async function processPhoto(file){
  if(file.size>35*1024*1024)throw Error(`${file.name}: file is over the 35 MB prototype limit.`);
  const bytes=new Uint8Array(await file.arrayBuffer()),png=isPng(bytes);let animated=false;
  if(png){const view=new DataView(bytes.buffer);for(let offset=8;offset+12<=bytes.length;){const length=view.getUint32(offset);if(offset+12+length>bytes.length)break;if(String.fromCharCode(...bytes.subarray(offset+4,offset+8))==='acTL')animated=true;offset+=12+length;}}
  let image;try{image=await createImageBitmap(file,{imageOrientation:'from-image'});}catch{throw Error(`${file.name}: this browser cannot decode it. Export it as JPEG, PNG, or WebP.`);}
  try{if(image.width*image.height>80000000)throw Error(`${file.name}: image dimensions are too large.`);const ratio=Math.min(1,1600/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio));let src;
    if(png)src=await dataUrl(await pngForUpload(image));else{canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);src=canvas.toDataURL('image/jpeg',.8);}
    const w=330,h=w*canvas.height/canvas.width;return {id:uid(),type:'photo',src,alt:'',w,h,x:100,y:80,rotation:0,...(animated?{importNotice:'Animated PNG imported as a still image.'}:{})};
  }finally{image.close();}
}
