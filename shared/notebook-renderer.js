import {esc,renderText,MEDIA_PATH} from './document.js';
import {entryDate,geometryOverflow} from './notebook-format.js';
import {fitTextBox} from './text-fit.js';
export function renderNotebook(post,base='/',{deferMedia=false}={}){
 const header=`<header class="notebook-header"><h2>${esc(post.title)}</h2><time datetime="${esc(post.publishedAt||post.created)}">${esc(entryDate(post))}</time></header>`;
 return header+`<div class="notebook-composition">${post.elements.map(e=>{
 const style=`left:${e.x}px;top:${e.y}px;width:${e.w}px;${e.type==='text'&&!e.fixedHeight?'min-height':'height'}:${e.h}px;transform:rotate(${e.rotation}deg)${e.type==='text'?`;--text-size:${e.fontSize??28}px`:''}`;
 let html;if(e.type==='text')html=renderText(e.doc);else if(e.type==='photo')html=`<img ${deferMedia?'data-src':'src'}="${esc(MEDIA_PATH.test(e.src)?base+e.src:e.src)}" alt="${esc(e.alt)}" draggable="false" loading="lazy" decoding="async" width="${Math.round(e.w)}" height="${Math.round(e.h)}">`;
 else html=`<svg viewBox="0 0 ${e.sourceW} ${e.sourceH}" aria-hidden="true">${e.strokes.map(s=>`<path d="${s.points.map((p,i)=>`${i?'L':'M'}${p[0]},${p[1]}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="${s.size}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`;
 return `<div class="notebook-object notebook-${e.type}" data-object-id="${e.id}"${e.type==='text'?` data-font="${e.font??'serif'}"${e.fixedHeight?' data-fixed-height="true"':''}`:''} style="${style}">${html}</div>`;
 }).join('')}</div>`;
}
// Browser-only canonical measurement; imported by studio and build verifier.
export async function measureNotebook(post,element){
 await document.fonts.load('44px Kalam',post.title||'bbyteeth');
 for(const e of post.elements.filter(e=>e.type==='text'&&e.font==='handwriting')){
  const faces=await document.fonts.load(`${e.fontSize??28}px Caveat`);
  if(!faces.length||faces.some(face=>face.status!=='loaded'))throw Error('Handwriting font unavailable.');
 }
 // Force layout before waiting, so hidden studio measurements request any
 // body fallback/italic faces required by this entry as well.
 void element.offsetHeight;
 await document.fonts.ready;
 const failures=geometryOverflow(post);const title=element.querySelector('.notebook-header h2');
 if(!post.title.trim()||title.scrollHeight>104.5)failures.push('title');
 for(const object of element.querySelectorAll('.notebook-object')){
  const model=post.elements.find(e=>e.id===object.dataset.objectId);let h=model.h;
  if(model.type==='text'){
   if(model.fixedHeight){if(!fitTextBox(object,model).fits)failures.push(model.id);}
   else h=Math.max(h,object.scrollHeight);
  }
  const r=model.rotation*Math.PI/180,w=Math.abs(model.w*Math.cos(r))+Math.abs(h*Math.sin(r)),bh=Math.abs(model.w*Math.sin(r))+Math.abs(h*Math.cos(r));
  const x=model.x+(model.w-w)/2,y=model.y+(h-bh)/2;
  if(x<-.01||y<-.01||x+w>792.01||y+bh>920.01)failures.push(model.id);
 }
 return failures;
}
