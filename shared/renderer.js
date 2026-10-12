import {esc,renderText,MEDIA_PATH} from './document.js';
import {bounds} from '../src/model.js';
function ink(e){const paths=e.strokes.map(s=>`<path d="${s.points.map((p,i)=>`${i?'L':'M'}${p[0]},${p[1]}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="${s.size}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');return `<svg viewBox="0 0 ${e.sourceW} ${e.sourceH}" aria-hidden="true">${paths}</svg>`;}
const layout=e=>esc(JSON.stringify({x:e.x,y:e.y,w:e.w,h:e.h,rotation:e.rotation}));
export function renderComposition(post,base='/baby-teeth/'){
  const units=[],groups=new Map();post.elements.forEach(e=>{const key=e.group||e.id;if(!groups.has(key)){const unit=[];groups.set(key,unit);units.push(unit);}groups.get(key).push(e);});
  return `<div class="public-canvas" data-canvas>${units.map(unit=>{
    const media=unit.filter(e=>e.type!=='text');let html='';
    if(media.length){const b=media.map(bounds),x=Math.min(...b.map(b=>b.x)),y=Math.min(...b.map(b=>b.y)),w=Math.max(...b.map(b=>b.x+b.w))-x,h=Math.max(...b.map(b=>b.y+b.h))-y;
      html+=`<div class="media-group" style="aspect-ratio:${w}/${h};max-width:${Math.min(900,w)}px">${media.map(e=>{
        const style=`left:${(e.x-x)/w*100}%;top:${(e.y-y)/h*100}%;width:${e.w/w*100}%;height:${e.h/h*100}%;transform:rotate(${e.rotation}deg)`;
        return `<div class="public-object public-${e.type}" data-layout="${layout(e)}" data-phone="${esc(style)}" style="${style}">${e.type==='photo'?`<img src="${esc(MEDIA_PATH.test(e.src)?base+e.src:e.src)}" alt="${esc(e.alt)}" width="${Math.round(e.w)}" height="${Math.round(e.h)}" loading="lazy" decoding="async">`:ink(e)}</div>`;
      }).join('')}</div>`;
    }
    html+=unit.filter(e=>e.type==='text').map(e=>`<div class="public-object public-text" data-layout="${layout(e)}">${renderText(e.doc)}</div>`).join('');return html;
  }).join('')}</div>`;
}
