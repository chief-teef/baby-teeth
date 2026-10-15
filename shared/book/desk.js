import {deskLayout,safeViewport} from './camera.js';
import {mountLighter} from './lighter.js';
import {movableProp} from './prop.js';
import {mountMusicPlayer} from './music-player.js';
import {mountHerbs} from './herbs.js';
export function mountDesk(root,base){
 const desk=document.createElement('div');desk.className='book-desk';desk.ariaHidden='true';root.prepend(desk);
 const lighter=mountLighter(root,base),props=[['lighter',lighter]],objects={};let player,herbs,width=0,height=0;
 for(const [kind,label] of [['jar','Glass herb jar'],['grinder','Pink herb grinder'],['pipe','Pink glass pipe'],['figurine','Little yellow Teletubby'],['mp3','Pink MP3 player']]){
  const element=document.createElement(kind==='figurine'?'button':'div');element.className=`desk-prop desk-${kind}`;objects[kind]=element;
  if(element.tagName!=='BUTTON'){element.tabIndex=0;element.setAttribute('role','group');}
  element.innerHTML=`<img class="prop-art" src="${base}book/${kind}.png" alt="">`;
  if(kind==='grinder')element.insertAdjacentHTML('beforeend',`<img class="grinder-top" src="${base}book/grinder-top.png" alt="">`);
  if(kind==='pipe')element.insertAdjacentHTML('beforeend',`<img class="pipe-herbs" src="${base}book/oregano.png" alt="">`);
  if(kind==='mp3'){element.classList.toggle('awake',root.clientWidth>=1280&&root.clientHeight>=850);const control=document.createElement('button');control.className='mp3-handle';control.textContent='♡';control.ariaLabel='Toggle music screen';control.setAttribute('aria-expanded',String(element.classList.contains('awake')));control.onclick=()=>{element.classList.toggle('awake');control.setAttribute('aria-expanded',String(element.classList.contains('awake')));};element.append(control);player=mountMusicPlayer(element,base);}
  element.ariaLabel=`Pick up ${label} · arrow keys move · Escape puts down`;root.append(element);props.push([kind,movableProp(root,element,element,{pickup(){if(kind==='pipe')herbs.smoke();}})]);
 }
 herbs=mountHerbs(root,objects,base,lighter);
 return {update:post=>player.update(post),resize(w,h){if(w===width&&h===height)return;const layout=deskLayout(w,h);root.style.setProperty('--prop-scale',layout.scale);if(layout.compact){objects.mp3.classList.remove('awake');objects.mp3.querySelector('.mp3-handle').setAttribute('aria-expanded','false');}width=w;height=h;herbs.resize();const safe=safeViewport(root);props.forEach(([kind,p])=>p.resize({x:layout.positions[kind].x+safe.left,y:layout.positions[kind].y+safe.top}));},pause(value,reduced){herbs.pause(value,reduced);props.forEach(([,p])=>p.pause(value,reduced));},dispose(){herbs.dispose();props.forEach(([,p])=>p.dispose());desk.remove();}};
}
