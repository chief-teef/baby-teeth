const fitsCache=new WeakMap();
// Fit rendered rich text without changing its preferred size or document.
export function fitTextBox(element,model){
 const preferred=model.fontSize??28;
 if(model.type!=='text'||!model.fixedHeight)return {fontSize:preferred,fits:true};
 const content=element.querySelector('.ProseMirror')||element;
 const cached=fitsCache.get(element);
 if(cached&&cached.doc===model.doc&&cached.w===model.w&&cached.h===model.h&&cached.font===model.font&&cached.preferred===preferred&&cached.fonts===document.fonts.status){element.style.setProperty('--text-size',cached.result.fontSize+'px');element.dataset.fixedHeight='true';element.dataset.textFits=String(cached.result.fits);element.dataset.fittedSize=String(cached.result.fontSize);content.style.height=model.h+'px';content.style.minHeight='0';content.style.boxSizing='border-box';content.style.overflow='hidden';return cached.result;}
 if(!content.getClientRects().length){
  const host=document.createElement('div');host.className='notebook-stage';
  host.style.cssText=`position:fixed;left:-100000px;top:0;width:${model.w}px;visibility:hidden;pointer-events:none`;
  const clone=element.cloneNode(true);clone.style.display='block';clone.style.position='relative';clone.style.left=clone.style.top='0';clone.style.transform='none';clone.style.width=model.w+'px';host.append(clone);document.body.append(host);
  try{
   const result=fitTextBox(clone,model);element.style.setProperty('--text-size',result.fontSize+'px');
   element.dataset.fixedHeight='true';element.dataset.textFits=String(result.fits);element.dataset.fittedSize=String(result.fontSize);
   content.style.height=model.h+'px';content.style.minHeight='0';content.style.boxSizing='border-box';content.style.overflow='hidden';
   return result;
  }finally{host.remove();}
 }
 element.dataset.fixedHeight='true';
 content.style.height=model.h+'px';content.style.minHeight='0';content.style.boxSizing='border-box';content.style.overflow='hidden';
 const test=size=>{
  element.style.setProperty('--text-size',size+'px');
  return content.scrollHeight<=model.h&&content.scrollWidth<=model.w;
 };
 let size=preferred,fits=test(preferred);
 if(!fits){
  let low=4,high=Math.floor(preferred*4),best=4;
  fits=test(1);
  if(fits)while(low<=high){
   const mid=Math.floor((low+high)/2);
   if(test(mid/4)){best=mid;low=mid+1;}else high=mid-1;
  }
  size=best/4;test(size);
 }
 element.dataset.textFits=String(fits);
 element.dataset.fittedSize=String(size);
 const result={fontSize:size,fits};fitsCache.set(element,{doc:model.doc,w:model.w,h:model.h,font:model.font,preferred,fonts:document.fonts.status,result});return result;
}
