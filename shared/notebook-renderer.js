import {esc,renderText,resolveMediaUrl} from './document.js';
import {entryDate,geometryOverflow,entryPages,pageGeometry} from './notebook-format.js';
import {fontFamily,fontById} from './font-registry.js';
export function renderNotebook(post,base='/',{deferMedia=false,pageIndex=0}={}){
 const page=entryPages(post)[pageIndex],geometry=pageGeometry(pageIndex);if(!page)throw Error('Page index out of range.');
 const header=pageIndex===0?`<header class="notebook-header">${post.title.trim()?`<h2>${esc(post.title)}</h2>`:''}<time datetime="${esc(post.publishedAt||post.created)}">${esc(entryDate(post))}</time></header>`:'';
 return header+`<div class="notebook-composition" data-page-index="${pageIndex}" style="top:${geometry.y}px;height:${geometry.height}px">${page.elements.map(e=>{
 const style=`left:${e.x}px;top:${e.y}px;width:${e.w}px;${e.type==='text'&&!e.fixedHeight?'min-height':'height'}:${e.h}px;transform:rotate(${e.rotation}deg)${e.type==='text'?`;--text-size:${e.fontSize??28}px;--text-font:${fontFamily(e.font)}`:''}`;
 let html;if(e.type==='text')html=renderText(e.doc);else if(e.type==='photo')html=`<img ${deferMedia?'data-src':'src'}="${esc(resolveMediaUrl(e.src,base))}" alt="${esc(e.alt)}" draggable="false" loading="lazy" decoding="async" width="${Math.round(e.w)}" height="${Math.round(e.h)}">`;
 else html=`<svg viewBox="0 0 ${e.sourceW} ${e.sourceH}" aria-hidden="true">${e.strokes.map(s=>`<path d="${s.points.map((p,i)=>`${i?'L':'M'}${p[0]},${p[1]}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="${s.size}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`;
 return `<div class="notebook-object notebook-${e.type}" data-object-id="${e.id}"${e.type==='text'?` data-font="${e.font??'serif'}"${e.fixedHeight?' data-fixed-height="true"':''}`:''} style="${style}">${html}</div>`;
 }).join('')}</div>`;
}
// Browser-only canonical measurement; imported by studio and build verifier.
export async function measureNotebook(post,element,{pageIndex=0}={}){
 const page=entryPages(post)[pageIndex],geometry=pageGeometry(pageIndex);if(!page)throw Error('Page index out of range.');
 if(pageIndex===0){const faces=await document.fonts.load('52px VT323',post.title.trim()||'bbyteeth');if(!faces.length)throw Error('Title font unavailable.');}
 for(const e of page.elements.filter(e=>e.type==='text'))await loadTextFonts(e);
 // Force layout before waiting, so hidden studio measurements request any
 // body fallback/italic faces required by this entry as well.
 void element.offsetHeight;
 await document.fonts.ready;
 const failures=geometryOverflow(post,{pageIndex});const title=element.querySelector('.notebook-header h2');
 if(pageIndex===0&&title&&title.scrollHeight>104.5)failures.push('title');
 for(const object of element.querySelectorAll('.notebook-object')){
  const model=page.elements.find(e=>e.id===object.dataset.objectId);let h=model.h;
  // Fixed boxes keep their authored height; spilled text never fails the fit.
  if(model.type==='text'&&!model.fixedHeight)h=Math.max(h,object.scrollHeight);
  const r=model.rotation*Math.PI/180,w=Math.abs(model.w*Math.cos(r))+Math.abs(h*Math.sin(r)),bh=Math.abs(model.w*Math.sin(r))+Math.abs(h*Math.cos(r));
  const x=model.x+(model.w-w)/2,y=model.y+(h-bh)/2;
  if(x<-.01||y<-.01||x+w>geometry.width+.01||y+bh>geometry.height+.01)failures.push(model.id);
 }
 return failures;
}
export async function loadTextFonts(model){
 const used=new Map();
 function walk(node,font=model.font||'serif',weight=400,style='normal'){
  for(const mark of node.marks||[]){if(mark.type==='textStyle'&&mark.attrs?.font)font=mark.attrs.font;if(mark.type==='bold')weight=700;if(mark.type==='italic')style='italic';}
  if(node.type==='text'){const key=`${font}|${weight}|${style}`,old=used.get(key);used.set(key,{font,weight,style,text:(old?.text||'')+node.text});}
  for(const child of node.content||[])walk(child,font,weight,style);
 }
 walk(model.doc);if(!used.size)used.set('empty',{font:model.font||'serif',weight:400,style:'normal',text:'bbyteeth'});
 for(const {font,weight,style,text} of used.values()){
  const registered=fontById(font);if(!registered)throw Error('Text font unavailable.');
  const family=font==='serif'?'Gelasio':registered.family;
  const faces=await document.fonts.load(`${style} ${weight} ${model.fontSize||28}px "${family}"`,text);
  if(!faces.length||faces.some(face=>face.status!=='loaded'))throw Error(`Font unavailable: ${registered.label}.`);
 }
}
