export function createCloudClient(base=''){
  let session={configured:false,signedIn:false};
  async function request(path,options={}){const response=await fetch(`${base}${path}`,{credentials:'same-origin',...options,headers:{...(options.body instanceof Blob?{}:options.body?{'Content-Type':'application/json'}:{}),...(session.csrf?{'X-CSRF-Token':session.csrf}:{}),...options.headers}});let data;try{data=await response.json();}catch{throw Error('Online saving is not configured at this address.');}if(!response.ok){const error=Error(data.error||'Online request failed.');error.status=response.status;throw error;}return data;}
  return {
    async check(){try{session=await request('/api/session');}catch(error){session={configured:error.status===503,signedIn:false,...(error.status===503?{unavailable:true}:{})};}return session;},
    login(){location.href=`${base}/auth/login`;},
    async logout(){await request('/auth/logout',{method:'POST'});session={...session,signedIn:false};},
    list:()=>request('/api/posts'),
    get:id=>request(`/api/posts/${id}`),
    upload:blob=>request('/api/assets',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:blob}),
    save:(id,body)=>request(`/api/posts/${id}`,{method:'PUT',body:JSON.stringify(body)}),
    deployment:commit=>request(`/api/deployment?commit=${commit}`),
  };
}
export async function jpegForUpload(src){
  const original=await fetch(src).then(r=>r.blob());const image=await createImageBitmap(original);
  const canvas=document.createElement('canvas');let ratio=Math.min(1,1600/Math.max(image.width,image.height));
  const encode=async quality=>{canvas.width=Math.round(image.width*ratio);canvas.height=Math.round(image.height*ratio);const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);return new Promise(r=>canvas.toBlob(r,'image/jpeg',quality));};
  try{let blob=await encode(.8);if(blob?.size>600000)blob=await encode(.65);if(blob?.size>600000){ratio*=.7;blob=await encode(.7);}if(!blob||blob.size>700000)throw Error('This photo needs to be smaller before online saving.');return blob;}finally{image.close();}
}
export function dataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});}
