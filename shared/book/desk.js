import {deskLayout,safeViewport} from './camera.js';
import {mountLighter} from './lighter.js';
import {movableProp} from './prop.js';
import {mountMusicPlayer} from './music-player.js';
import {mountHerbs} from './herbs.js';
import {mountPaw} from './paw.js';
const TUBBIES=['tinky','dipsy','figurine','po'];
export function mountDesk(root,base){
 const desk=document.createElement('div');desk.className='book-desk';desk.ariaHidden='true';root.prepend(desk);
 const lighter=mountLighter(root,base),props=[['lighter',lighter]],objects={};let player,herbs,width=0,height=0;
 for(const [kind,label] of [['jar','Glass herb jar'],['grinder','Pink herb grinder'],['pipe','Pink glass pipe'],['tinky','Tall purple Teletubby'],['dipsy','Green Teletubby'],['figurine','Little yellow Teletubby'],['po','Small red Teletubby'],['mp3','Pink MP3 player'],['thomas','Thomas the Tank Engine toy'],['muscle','Orange toy car'],['hotrod','Teal toy car'],['note','Sticky note with a Courage doodle'],['ashtray','Glass ashtray'],['geekbar','Geek Bar vape']]){
  const element=document.createElement(TUBBIES.includes(kind)?'button':'div');element.className=`desk-prop desk-${kind}${TUBBIES.includes(kind)?' desk-tubby':''}`;objects[kind]=element;
  if(element.tagName!=='BUTTON'){element.tabIndex=0;element.setAttribute('role','group');}
  element.innerHTML=`<img class="prop-art" src="${base}book/${kind}.png" alt="">`;
  if(kind==='grinder')element.insertAdjacentHTML('beforeend',`<img class="grinder-top" src="${base}book/grinder-top.png" alt="">`);
  if(kind==='pipe')element.insertAdjacentHTML('beforeend',`<img class="pipe-herbs" src="${base}book/oregano.png" alt="">`);
  if(kind==='thomas')element.insertAdjacentHTML('beforeend',`<img class="thomas-steam" src="${base}book/steam.png" alt="">`);
  if(kind==='geekbar')element.insertAdjacentHTML('beforeend',`<img class="geekbar-screen" src="${base}book/geekbar-screen.png" alt="">`);
  if(kind==='mp3'){element.classList.toggle('awake',root.clientWidth>=1280&&root.clientHeight>=850);const control=document.createElement('button');control.className='mp3-handle';control.textContent='♡';control.ariaLabel='Toggle music screen';control.setAttribute('aria-expanded',String(element.classList.contains('awake')));control.onclick=()=>{element.classList.toggle('awake');control.setAttribute('aria-expanded',String(element.classList.contains('awake')));};element.append(control);player=mountMusicPlayer(element,base);}
  element.ariaLabel=`Pick up ${label} · arrow keys move · Escape puts down`;root.append(element);props.push([kind,movableProp(root,element,element,{roll:kind==='muscle'||kind==='hotrod',pickup(){if(kind==='pipe')herbs.smoke();}})]);
 }
 herbs=mountHerbs(root,objects,base,lighter);const paw=mountPaw(root,base);
 return {update:post=>player.update(post),resize(w,h){if(w===width&&h===height)return;const layout=deskLayout(w,h);root.style.setProperty('--prop-scale',layout.scale);if(layout.compact){objects.mp3.classList.remove('awake');objects.mp3.querySelector('.mp3-handle').setAttribute('aria-expanded','false');}width=w;height=h;herbs.resize();const safe=safeViewport(root);paw.place(layout.paw+safe.top);props.forEach(([kind,p])=>{const at=layout.positions[kind];if(objects[kind])objects[kind].hidden=!at;if(at)p.resize({x:at.x+safe.left,y:at.y+safe.top});else p.cancel();});},pause(value,reduced){herbs.pause(value,reduced);paw.pause(value,reduced);props.forEach(([,p])=>p.pause(value,reduced));},dispose(){herbs.dispose();paw.dispose();props.forEach(([,p])=>p.dispose());desk.remove();}};
}
