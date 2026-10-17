import interact from 'interactjs';
import {entryPages,pageGeometry,elementBounds,entryDate} from '../shared/notebook-format.js';
import './page-composition.css';
export const PAGE_STEP=1248;
const union=elements=>{const b=elements.map(elementBounds),x=Math.min(...b.map(v=>v.x)),y=Math.min(...b.map(v=>v.y));return {x,y,w:Math.max(...b.map(v=>v.x+v.w))-x,h:Math.max(...b.map(v=>v.y+v.h))-y};};
export function dropPlacement(elements,sourceIndex,targetIndex,dx,dy){
 const source=pageGeometry(sourceIndex),target=pageGeometry(targetIndex),moved=elements.map(e=>({...e,x:e.x+dx+source.x-target.x,y:e.y+dy+sourceIndex*PAGE_STEP+source.y-targetIndex*PAGE_STEP-target.y})),box=union(moved),fits=box.w<=target.width+.01&&box.h<=target.height+.01;
 const shiftX=fits?Math.max(-box.x,Math.min(0,target.width-box.x-box.w)):0,shiftY=fits?Math.max(-box.y,Math.min(0,target.height-box.y-box.h)):0;
 return {fits,objects:moved.map(e=>({...e,x:e.x+shiftX,y:e.y+shiftY}))};
}
export function nearestPage(y,count,sourceIndex){
 let chosen=0,distance=Infinity;
 for(let i=0;i<count;i++){const top=i*PAGE_STEP,bottom=top+1200,d=y<top?top-y:y>bottom?y-bottom:0;if(d<distance-.001||Math.abs(d-distance)<.001&&i===sourceIndex){chosen=i;distance=d;}}
 return chosen;
}
export function createPageComposition({root,wrap,workspace,getEntry,getPage,getActivePageId,setActivePageId,findElement,getSelection,setSelection,runCommand,beginGesture,commitGesture,cancelGesture,notify=()=>{},onLayout=()=>{},onSelection=()=>{}}){
 const bound=new Set();
 let lastPointerId;
 let scale=1,matLeft=0,matTop=0,drag=null,frame=0,disposed=false,lastFrame=0;
 const pages=()=>entryPages(getEntry());
 const pageFor=id=>pages().find(page=>page.elements.some(e=>e.id===id));
 const node=id=>root.querySelector(`.object[data-id="${CSS.escape(id)}"]`);
 function point(ev,pageId=getActivePageId()){
  const index=Math.max(0,pages().findIndex(page=>page.id===pageId)),g=pageGeometry(index),r=root.getBoundingClientRect();return [(ev.clientX-r.left)/scale-matLeft-g.x,(ev.clientY-r.top)/scale-matTop-index*PAGE_STEP-g.y];
 }
 function activePage(){
  if(drag)return getPage(getActivePageId())||pages()[0];
  const focus=document.activeElement?.closest('.object[data-page-id],.paper-page[data-page-id]');if(focus&&root.contains(focus)){const page=getPage(focus.dataset.pageId);if(page)return page;}
  if(getSelection().size){const page=pageFor([...getSelection()][0]);if(page)return page;}
  const viewport={top:Math.max(0,workspace.getBoundingClientRect().top),bottom:Math.min(innerHeight,workspace.getBoundingClientRect().bottom),left:0,right:innerWidth};let best=0,area=-1;
  root.querySelectorAll('.paper-page:not(.candidate-page)').forEach((paper,index)=>{const r=paper.getBoundingClientRect(),visible=Math.max(0,Math.min(r.bottom,viewport.bottom)-Math.max(r.top,viewport.top))*Math.max(0,Math.min(r.right,viewport.right)-Math.max(r.left,viewport.left));if(visible>area){area=visible;best=index;}});
  return pages()[best]||pages()[0];
 }
 function activeCenter(){const page=activePage();setActivePageId(page.id);const index=pages().indexOf(page),paper=root.querySelector(`.paper-page[data-page-id="${CSS.escape(page.id)}"]`),r=paper.getBoundingClientRect(),g=pageGeometry(index),top=Math.max(r.top+g.y*scale,0,workspace.getBoundingClientRect().top),bottom=Math.min(r.top+(g.y+g.height)*scale,innerHeight,workspace.getBoundingClientRect().bottom);return [g.width/2,Math.max(0,Math.min(g.height,((top+Math.max(top,bottom))/2-r.top)/scale-g.y))];}
 function makePaper(index,candidate=false){
  const page=pages()[index],paper=document.createElement('section');paper.className='paper-page notebook-page'+(candidate?' candidate-page':'');paper.dataset.pageIndex=index;if(page&&!candidate)paper.dataset.pageId=page.id;else paper.setAttribute('aria-hidden','true');
  if(!candidate){paper.setAttribute('aria-label',`Paper page ${index+1} of ${pages().length}`);paper.tabIndex=0;paper.addEventListener('focus',()=>{if([...getSelection()].some(id=>!page.elements.some(e=>e.id===id)))setSelection([]);setActivePageId(page.id);onSelection();});paper.addEventListener('pointerdown',ev=>{if(ev.target.closest('.object'))return;setActivePageId(page.id);setSelection([]);onSelection();});}
  if(index===0&&!candidate){const header=document.createElement('header');header.className='notebook-header';const title=document.createElement('h2'),date=document.createElement('time');title.textContent=getEntry().title;date.textContent=entryDate(getEntry());header.append(title,date);paper.append(header);}
  const number=document.createElement('span');number.className='editor-page-number';number.textContent=candidate?'Release here for a new page':`Page ${index+1}`;number.setAttribute('aria-hidden','true');paper.append(number);return paper;
 }
 function renderPages(){for(const el of bound)if(!el.isConnected){interact(el).unset();bound.delete(el);}if(drag)cancel();root.querySelectorAll(':scope > .paper-page,:scope > .notebook-header').forEach(el=>el.remove());pages().forEach((_,index)=>root.append(makePaper(index)));if(!getPage(getActivePageId()))setActivePageId(pages()[0].id);layout();}
 function layout(){
  if(disposed)return;root.classList.add('notebook-stage','paper-stack');
  const all=pages().flatMap((page,index)=>page.elements.map(e=>{const b=elementBounds(e),g=pageGeometry(index);return {...b,x:b.x+g.x,y:b.y+index*PAGE_STEP+g.y};}));
  if(!drag){matLeft=Math.max(0,-Math.min(0,...all.map(b=>b.x))+ (all.some(b=>b.x<0)?40:0));matTop=Math.max(0,-Math.min(0,...all.map(b=>b.y))+(all.some(b=>b.y<0)?40:0));}
  const right=Math.max(900,...all.map(b=>b.x+b.w+40)),width=matLeft+right,height=matTop+Math.max((pages().length+(drag?.candidate?1:0))*PAGE_STEP-48,...all.map(b=>b.y+b.h+60));
  const css=getComputedStyle(workspace),available=workspace.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight);scale=Math.max(.1,Math.min(1,available/900));
  root.style.width=width+'px';root.style.height=height+'px';root.style.transform=`scale(${scale})`;root.style.setProperty('--screen-unit',1/scale+'px');root.style.setProperty('--mat-left',matLeft+'px');root.style.setProperty('--mat-top',matTop+'px');wrap.style.width=width*scale+'px';wrap.style.height=height*scale+'px';
  root.querySelectorAll(':scope > .paper-page').forEach(paper=>{paper.style.left=matLeft+'px';paper.style.top=matTop+Number(paper.dataset.pageIndex)*PAGE_STEP+'px';});
  const title=root.querySelector('.paper-page .notebook-header h2');if(title)title.textContent=getEntry().title;const date=root.querySelector('.paper-page .notebook-header time');if(date)date.textContent=entryDate(getEntry());onLayout();
 }
 function styleObject(el,e){if(drag?.original.some(original=>original.id===e.id))return;const page=pageFor(e.id);if(!page)return;const index=pages().indexOf(page),g=pageGeometry(index);el.dataset.pageId=page.id;el.style.left=matLeft+g.x+e.x+'px';el.style.top=matTop+index*PAGE_STEP+g.y+e.y+'px';el.style.width=e.w+'px';el.style.height=e.type==='text'&&!e.fixedHeight?'auto':e.h+'px';el.style.zIndex=String(10+page.elements.indexOf(e));}
 function expandSelection(page,id){let chosen=new Set(getSelection());if(!chosen.has(id))chosen=new Set([id]);const groups=new Set(page.elements.filter(e=>chosen.has(e.id)&&e.group).map(e=>e.group));page.elements.forEach(e=>{if(e.group&&groups.has(e.group))chosen.add(e.id);});return page.elements.filter(e=>chosen.has(e.id));}
 function refreshSelection(){root.querySelectorAll('.object').forEach(el=>el.classList.toggle('selected',getSelection().has(el.dataset.id)));onSelection();}
 function updatePreview(){
  if(!drag)return;const r=root.getBoundingClientRect(),p=[(drag.clientX-r.left)/scale,(drag.clientY-r.top)/scale];drag.dx=p[0]-drag.start[0];drag.dy=p[1]-drag.start[1];drag.moved ||=Math.abs(drag.dx)+Math.abs(drag.dy)>.25;
  const wants=p[1]-matTop>(pages().length-1)*PAGE_STEP+1200;
  if(wants!==drag.candidate){drag.candidate=wants;root.querySelector('.candidate-page')?.remove();if(wants)root.append(makePaper(pages().length,true));layout();}
  for(const original of drag.original){const el=node(original.id);if(el){el.style.left=matLeft+drag.geometry.x+original.x+drag.dx+'px';el.style.top=matTop+drag.sourceIndex*PAGE_STEP+drag.geometry.y+original.y+drag.dy+'px';el.classList.add('moving-object');}}
 }
 function edgeTick(now){
  if(!drag)return;const delta=Math.min(32,now-(lastFrame||now));lastFrame=now;
  const rect=workspace.getBoundingClientRect(),top=Math.max(0,rect.top),bottom=Math.min(innerHeight,rect.bottom),zone=64,y=drag.clientY;let velocity=y<top+zone?-Math.min(1,(top+zone-y)/zone):y>bottom-zone?Math.min(1,(y-bottom+zone)/zone):0;
  if(velocity){let scroller=workspace;while(scroller&&!(scroller.scrollHeight>scroller.clientHeight+1&&/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)))scroller=scroller.parentElement;if(!scroller)scroller=document.scrollingElement;const before=scroller.scrollTop;scroller.scrollTop+=velocity*delta*.8;if(scroller.scrollTop!==before)updatePreview();}
  frame=requestAnimationFrame(edgeTick);
 }
 function start(ev,id){
  const page=pageFor(id);if(!page)return;const selected=expandSelection(page,id);setActivePageId(page.id);setSelection(selected.map(e=>e.id));refreshSelection();beginGesture();
  const r=root.getBoundingClientRect(),x=ev.clientX0??ev.clientX,y=ev.clientY0??ev.clientY;drag={sourceId:page.id,sourceIndex:pages().indexOf(page),geometry:pageGeometry(pages().indexOf(page)),original:selected.map(e=>structuredClone(e)),start:[(x-r.left)/scale,(y-r.top)/scale],clientX:ev.clientX,clientY:ev.clientY,dx:0,dy:0,candidate:false,moved:false,pointerId:ev.pointerId??lastPointerId,interaction:ev.interaction};root.classList.add('dragging-pages');lastFrame=0;frame=requestAnimationFrame(edgeTick);
 }
 function finish(){
  if(!drag)return;const state=drag;drag=null;cancelAnimationFrame(frame);root.classList.remove('dragging-pages');root.querySelector('.candidate-page')?.remove();
  if(!state.moved){cancelGesture();return;}
  const r=root.getBoundingClientRect(),y=(state.clientY-r.top)/scale-matTop,targetIndex=nearestPage(y,pages().length+(state.candidate?1:0),state.sourceIndex),source=getPage(state.sourceId);
  let target=pages()[targetIndex];if(!target){target={id:crypto.randomUUID(),elements:[]};getEntry().pages.push(target);}
  const placement=dropPlacement(state.original,state.sourceIndex,targetIndex,state.dx,state.dy),positions=new Map(placement.objects.map(e=>[e.id,e]));
  const moved=source.elements.filter(e=>positions.has(e.id));for(const e of moved){const position=positions.get(e.id);e.x=position.x;e.y=position.y;}
  if(source!==target){source.elements=source.elements.filter(e=>!positions.has(e.id));target.elements.push(...moved);}setActivePageId(target.id);commitGesture('Move objects');if(!placement.fits)notify('This group is larger than the page. Resize it before publishing.');
 }
 function cancel(){if(!drag)return;const interaction=drag.interaction;drag=null;interaction?.stop();cancelAnimationFrame(frame);root.classList.remove('dragging-pages');root.querySelector('.candidate-page')?.remove();cancelGesture();}
 function bindObject(el,e){bound.add(el);
  interact(el).draggable({enabled:true,ignoreFrom:e.type==='text'?'.ProseMirror,.resize-handle,.rotate-handle':'.resize-handle,.rotate-handle',listeners:{start:ev=>start(ev,e.id),move:ev=>{if(!drag)return;drag.clientX=ev.clientX;drag.clientY=ev.clientY;updatePreview();},end:finish}});
 }
 function moveSelection(direction){const source=pageFor([...getSelection()][0]);if(!source)return;const index=pages().indexOf(source),next=index+direction;if(next<0)return;const selected=expandSelection(source,[...getSelection()][0]),placement=dropPlacement(selected,index,next,0,next*PAGE_STEP+pageGeometry(next).y-index*PAGE_STEP-pageGeometry(index).y);runCommand('Move to '+(direction<0?'previous':'next')+' page',()=>{let target=pages()[next];if(!target){target={id:crypto.randomUUID(),elements:[]};getEntry().pages.push(target);}const ids=new Set(selected.map(e=>e.id));source.elements=source.elements.filter(e=>!ids.has(e.id));target.elements.push(...placement.objects);setActivePageId(target.id);setSelection(selected.map(e=>e.id));});if(!placement.fits)notify('This group is larger than the page. Resize it before publishing.');}
 function reorderSelection(direction){const page=pageFor([...getSelection()][0]);if(!page)return;const selected=new Set(expandSelection(page,[...getSelection()][0]).map(e=>e.id));runCommand(direction>0?'Bring forward':'Send backward',()=>{const a=page.elements;if(direction>0){for(let i=a.length-2;i>=0;i--)if(selected.has(a[i].id)&&!selected.has(a[i+1].id))[a[i],a[i+1]]=[a[i+1],a[i]];}else for(let i=1;i<a.length;i++)if(selected.has(a[i].id)&&!selected.has(a[i-1].id))[a[i],a[i-1]]=[a[i-1],a[i]];});}
 function renderLayers(container){if(!container)return;const focused=container.contains(document.activeElement)?document.activeElement?.dataset.layerId:null;container.replaceChildren();const title=document.createElement('h2');title.textContent='Layers';container.append(title);const page=activePage();if(!page)return;[...page.elements].reverse().forEach((e,index)=>{const button=document.createElement('button');button.type='button';button.dataset.layerId=e.id;button.textContent=`${page.elements.length-index}. ${e.type==='text'?'Text':e.type==='drawing'?'Retained ink':e.alt||'Photo'}`;button.setAttribute('aria-pressed',String(getSelection().has(e.id)));button.onclick=()=>{setActivePageId(page.id);setSelection(expandSelection(page,e.id).map(x=>x.id));refreshSelection();};container.append(button);});if(focused)container.querySelector(`[data-layer-id="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});}
 const onDown=ev=>{if(!drag)lastPointerId=ev.pointerId;},onUp=ev=>{if(drag&&ev.pointerId===drag.pointerId)finish();};
 const onKey=ev=>{if(ev.key==='Escape'&&drag){ev.preventDefault();cancel();}},onCancel=ev=>{if(!drag||ev.pointerId!==drag.pointerId||ev.type==='lostpointercapture'&&!root.contains(ev.target))return;cancel();},onHidden=()=>{if(document.hidden)cancel();},onScroll=()=>{if(drag)updatePreview();};
 document.addEventListener('keydown',onKey,true);root.addEventListener('pointerdown',onDown,true);document.addEventListener('pointerup',onUp,true);document.addEventListener('pointercancel',onCancel,true);document.addEventListener('lostpointercapture',onCancel,true);document.addEventListener('visibilitychange',onHidden);window.addEventListener('scroll',onScroll,true);
 return {renderPages,layout,styleObject,bindObject,point,getScale:()=>scale,activePage,activeCenter,moveSelection,reorderSelection,renderLayers,dispose(){cancel();disposed=true;cancelAnimationFrame(frame);document.removeEventListener('keydown',onKey,true);root.removeEventListener('pointerdown',onDown,true);document.removeEventListener('pointerup',onUp,true);document.removeEventListener('pointercancel',onCancel,true);document.removeEventListener('lostpointercapture',onCancel,true);document.removeEventListener('visibilitychange',onHidden);window.removeEventListener('scroll',onScroll,true);for(const el of bound)interact(el).unset();bound.clear();}};
}








