import {createPageTurn} from '../shared/book/page-turn.js';
import {fitCamera,focusCamera,inversePoint} from '../shared/book/camera.js';
const camera=document.querySelector('#camera'),root=document.querySelector('#pages');
for(let i=0;i<4;i++){const p=document.createElement('article');p.className='sheet';p.innerHTML=`<h1>Feasibility face ${i}</h1><p>Selectable real text with <a href="#example">a working link</a>.</p><img width="320" height="240" src="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="#a4ca68"/><circle cx="160" cy="120" r="70" fill="#edb5c8"/></svg>')}" alt="Local image fixture"><svg viewBox="0 0 300 200"><path d="M10 150 Q100 0 290 150" fill="none" stroke="#203524" stroke-width="8"/></svg>`;root.append(p);}
let scale,focus=false;function layout(){const c=focus?focusCamera(innerWidth,innerHeight,'right'):fitCamera(innerWidth,innerHeight);scale=c.scale;camera.style.transform=`translate(${c.x}px,${c.y}px) scale(${scale})`;}
const turn=createPageTurn(root,[...root.children]);window.fixture={turn,layout};layout();window.onresize=layout;
document.querySelector('#older').onclick=()=>turn.turn(0);document.querySelector('#newer').onclick=()=>turn.turn(2);document.querySelector('#zoom').onclick=()=>{focus=!focus;layout();};
let drag;root.onpointerdown=e=>{const r=root.getBoundingClientRect();if(focus||e.clientY<r.bottom-64||!(e.clientX<r.left+64||e.clientX>r.right-64))return;drag={start:inversePoint(e,root,scale),side:e.clientX<r.left+64?'left':'right'};};
root.onpointermove=e=>{if(!drag)return;const p=inversePoint(e,root,scale);if(Math.abs(p.x-drag.start.x)*scale<6)return;root.setPointerCapture(e.pointerId);turn.fold(p);};
root.onpointerup=e=>{if(!drag)return;const p=inversePoint(e,root,scale);turn.release(Math.abs(p.x-drag.start.x)>315);drag=null;};root.onpointercancel=()=>{turn.release(false);drag=null;};
