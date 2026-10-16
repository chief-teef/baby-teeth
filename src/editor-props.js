// The impression is ordinary PNG content; only its holder and cursor are editor furniture.
import toothUrl from '../public/editor/tooth-stamp.png?url';
import otisUrl from '../public/editor/otis.svg?url';

export function mountEditorProps({root,getEntry,getActivePageId,placeStamp,notify=()=>{}}){
 const props=document.createElement('aside');props.className='editor-props';props.setAttribute('aria-label','Scrapbook props');
 props.innerHTML=`<div class="stamp-holder"><button type="button" class="stamp-pickup" aria-pressed="false"><img src="${toothUrl}" alt="" draggable="false"><span>Tooth stamp</span></button><button type="button" class="stamp-keyboard" hidden>Place tooth on active page</button><span class="stamp-hint">Pick up · click paper · Esc to put away</span></div><figure class="editor-otis" aria-label="Otis, your orange pixel cat"><img src="${otisUrl}" alt="Otis the orange cat" draggable="false"><figcaption>otis.exe <span aria-hidden="true">♥</span></figcaption></figure>`;
 const cursor=document.createElement('img');cursor.className='stamp-cursor';cursor.src=toothUrl;cursor.alt='';cursor.hidden=true;cursor.draggable=false;
 (root.querySelector('.toolbar')||root).append(props);root.append(cursor);
 const holder=props.querySelector('.stamp-pickup'),keyboard=props.querySelector('.stamp-keyboard'),cat=props.querySelector('.editor-otis');
 const motion=matchMedia('(prefers-reduced-motion: reduce)');let active=true,armed=false,down=null,disposed=false,source;
 const controller=new AbortController(),on=(target,event,fn,options={})=>target.addEventListener(event,fn,{...options,signal:controller.signal});
 function sync(){const shown=active&&!document.hidden;props.hidden=!active;cursor.hidden=!shown||!armed;cat.classList.toggle('otis-paused',!shown||motion.matches);if(!shown)down=null;}
 function arm(value){armed=Boolean(value);down=null;holder.setAttribute('aria-pressed',String(armed));holder.querySelector('span').textContent=armed?'Put stamp away':'Tooth stamp';keyboard.hidden=!armed;root.classList.toggle('stamp-armed',armed);sync();}
 function pageAt(event){const target=event.target;if(!(target instanceof Element)||target.closest('button,input,select,textarea,a,[role="dialog"]'))return null;const object=target.closest('.object[data-page-id]'),page=object?root.querySelector('.paper-page[data-page-id="'+CSS.escape(object.dataset.pageId)+'"]'):target.closest('.paper-page,[data-paper-page]');if(!page||!root.contains(page))return null;const r=page.getBoundingClientRect();return event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom?page:null;}
 async function stamp(location){
  const entryId=getEntry()?.id;if(!entryId)return;
  try{
   if(!source){const response=await fetch(toothUrl);if(!response.ok)throw Error('Stamp image could not load.');const blob=await response.blob();source=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Stamp image could not load.'));reader.readAsDataURL(blob);});}
   if(disposed||!active||!armed||getEntry()?.id!==entryId)return;
   const result=await placeStamp({src:source,w:84,h:98,alt:'Pixel tooth impression',...location});
   if(result===false)return;
   if(!motion.matches){cursor.getAnimations().forEach(a=>a.cancel());cursor.animate([{transform:'translate(-50%,-55%) translateY(-12px) rotate(-8deg)'},{transform:'translate(-50%,-55%) translateY(5px) rotate(0deg)',offset:.65},{transform:'translate(-50%,-55%)'}],{duration:180});}
  }catch(error){notify(error.message);}
 }
 on(holder,'click',()=>{arm(!armed);if(armed)notify('Tooth stamp ready. Click paper repeatedly, or use Place tooth. Escape puts it away.');});
 on(keyboard,'click',()=>stamp({pageId:getActivePageId()}));
 on(root,'pointermove',event=>{if(!active||!armed)return;cursor.style.left=`${event.clientX}px`;cursor.style.top=`${event.clientY}px`;cursor.hidden=!pageAt(event);});
 on(root,'pointerdown',event=>{if(!active||!armed||event.button!==0)return;const page=pageAt(event);if(!page)return;event.preventDefault();event.stopImmediatePropagation();down={pointer:event.pointerId,x:event.clientX,y:event.clientY,page,entryId:getEntry()?.id};},{capture:true});
 on(root,'click',event=>{if(active&&armed&&pageAt(event)){event.preventDefault();event.stopImmediatePropagation();}},{capture:true});
 on(root,'pointerup',event=>{if(!active||!armed||!down||event.pointerId!==down.pointer)return;const start=down;down=null;event.preventDefault();event.stopImmediatePropagation();if(pageAt(event)!==start.page||getEntry()?.id!==start.entryId||Math.hypot(event.clientX-start.x,event.clientY-start.y)>8)return;stamp({pageId:start.page.dataset.pageId||getActivePageId(),clientX:event.clientX,clientY:event.clientY});},{capture:true});
 on(document,'pointercancel',()=>{down=null;});
 on(document,'keydown',event=>{if(active&&armed&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();arm(false);holder.focus();}},{capture:true});
 on(document,'visibilitychange',()=>{if(document.hidden)cursor.getAnimations().forEach(a=>a.cancel());sync();});
 on(motion,'change',()=>{if(motion.matches)cursor.getAnimations().forEach(a=>a.cancel());sync();});
 sync();
 return {setActive(value){active=Boolean(value);if(!active){arm(false);cursor.getAnimations().forEach(a=>a.cancel());}sync();},dispose(){disposed=true;controller.abort();cursor.getAnimations().forEach(a=>a.cancel());root.classList.remove('stamp-armed');props.remove();cursor.remove();}};
}
