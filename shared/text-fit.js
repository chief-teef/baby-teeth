const fitsCache=new WeakMap();
let fontGeneration=0,watching=false;
function watchFonts(){if(watching||typeof document==='undefined')return;watching=true;document.fonts.addEventListener('loadingdone',()=>fontGeneration++);document.fonts.addEventListener('loadingerror',()=>fontGeneration++);}
function smallestRun(content,fallback){let min=Infinity,node;const walker=document.createTreeWalker(content,NodeFilter.SHOW_TEXT);while((node=walker.nextNode()))if(node.textContent.length){const size=parseFloat(getComputedStyle(node.parentElement).fontSize);if(size>0)min=Math.min(min,size);}return Number.isFinite(min)?min:fallback;}
// Scale every authored typography length, leaving the box and saved document intact.
export function fitTextBox(element,model){
 watchFonts();const preferred=model.fontSize??28;
 if(model.type!=='text'||!model.fixedHeight)return {fontSize:preferred,scale:1,fits:true,small:false};
 const content=element.querySelector('.ProseMirror')||element;
 function apply(result){element.style.setProperty('--text-size',result.fontSize+'px');element.style.setProperty('--text-scale',String(result.scale));element.dataset.fixedHeight='true';element.dataset.textFits=String(result.fits);element.dataset.fittedSize=String(result.fontSize);element.dataset.smallText=String(result.small);content.style.height=model.h+'px';content.style.minHeight='0';content.style.boxSizing='border-box';content.style.overflow='hidden';return result;}
 const cached=fitsCache.get(element);
 if(cached&&cached.doc===model.doc&&cached.w===model.w&&cached.h===model.h&&cached.font===model.font&&cached.preferred===preferred&&cached.generation===fontGeneration)return apply(cached.result);
 if(!content.getClientRects().length){const host=document.createElement('div');host.className='notebook-stage';host.style.cssText=`position:fixed;left:-100000px;top:0;width:${model.w}px;visibility:hidden;pointer-events:none`;const clone=element.cloneNode(true);clone.style.display='block';clone.style.position='relative';clone.style.left=clone.style.top='0';clone.style.transform='none';clone.style.width=model.w+'px';host.append(clone);document.body.append(host);try{return apply(fitTextBox(clone,model));}finally{host.remove();}}
 apply({fontSize:preferred,scale:1,fits:true,small:false});
 const test=scale=>{element.style.setProperty('--text-size',preferred*scale+'px');element.style.setProperty('--text-scale',String(scale));return content.scrollHeight<=model.h&&content.scrollWidth<=model.w;};
 const minRun=smallestRun(content,preferred),minimum=1/minRun;let scale=1,fits=test(1);
 if(!fits){let low=minimum,high=1;fits=test(minimum);if(fits){while((high-low)*Math.max(preferred,144)>.25){const mid=(low+high)/2;if(test(mid))low=mid;else high=mid;}scale=low;}else scale=minimum;}
 fits=test(scale)&&fits;const result={fontSize:preferred*scale,scale,fits,small:minRun*scale<12};
 fitsCache.set(element,{doc:model.doc,w:model.w,h:model.h,font:model.font,preferred,generation:fontGeneration,result});return apply(result);
}
