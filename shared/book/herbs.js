export function mountHerbs(root,{jar,grinder,pipe},base,lighter){
 const events=new AbortController(),options={signal:events.signal};let stage='empty',drag=null,ghost=null,paused=false,reduced=false,frame=0,last=0,started=0,credit=0,previous=null,actionTimer=0,lighting=null,grindPointer=null,grindMoved=false;
 const particles=[],canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.className='pipe-smoke';canvas.ariaHidden='true';root.append(canvas);
 const status=document.createElement('div');status.className='book-sr herb-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');root.append(status);
 function control(parent,label,cls){const b=document.createElement('button');b.className=cls;b.ariaLabel=label;parent.append(b);return b;}
 const buds=control(jar,'Put buds in grinder','herb-buds'),grind=control(grinder,'Grind herbs','herb-grind'),dust=control(grinder,'Fill pipe with dust','herb-dust');
 buds.innerHTML=`<img src="${base}book/buds.png" alt="">`;dust.innerHTML=`<img src="${base}book/dust.png" alt="">`;
 grinder.insertAdjacentHTML('beforeend',`<img class="grinder-well" src="${base}book/grinder-well.png" alt=""><img class="grinder-fill" src="${base}book/buds.png" alt="">`);
 function setStage(next,message){stage=next;root.dataset.herbs=stage;buds.disabled=stage!=='empty';grind.hidden=stage!=='buds';dust.hidden=stage!=='dust';grinder.classList.toggle('loading',stage==='loading');grinder.classList.toggle('loaded',['loading','buds'].includes(stage));grinder.classList.toggle('grinding',stage==='grinding');grinder.classList.toggle('ground',stage==='dust');grinder.classList.toggle('grinder-open',stage==='dust');pipe.classList.toggle('filled',['packed','igniting','smoking'].includes(stage));pipe.classList.toggle('lit',stage==='smoking');status.textContent=message;}
 function later(next,message,ms){clearTimeout(actionTimer);if(paused||reduced)setStage(next,message);else actionTimer=setTimeout(()=>{actionTimer=0;setStage(next,message);},ms);}
 function cancelDrag(){const active=drag;drag=null;ghost?.remove();ghost=null;grinder.classList.remove('herb-target','receiving');pipe.classList.remove('herb-target');if(active&&active.source.hasPointerCapture(active.id))active.source.releasePointerCapture(active.id);}
 function fits(target,x,y){const r=target.getBoundingClientRect();return x>=r.left-12&&x<=r.right+12&&y>=r.top-12&&y<=r.bottom+12;}
 function transfer(source){if(source===buds&&stage==='empty'){setStage('loading','Buds are inside the grinder.');later('buds','Grinder closed. Activate its lid to grind.',520);}else if(source===dust&&stage==='dust'){setStage('packed','Pipe filled.');ignite();}}
 for(const source of [buds,dust]){
  source.addEventListener('pointerdown',e=>{if(e.button!==0||source.disabled||drag)return;e.preventDefault();e.stopPropagation();drag={source,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};source.setPointerCapture(e.pointerId);},options);
  source.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6)return;drag.moved=true;if(!ghost){ghost=document.createElement('img');ghost.className='herb-ghost'+(source===dust?' powder':'');ghost.src=source===buds?base+'book/buds.png':base+'book/dust.png';ghost.alt='';ghost.ariaHidden='true';root.append(ghost);}const r=root.getBoundingClientRect();ghost.style.left=e.clientX-r.left-ghost.offsetWidth/2+'px';ghost.style.top=e.clientY-r.top-ghost.offsetHeight/2+'px';const target=source===buds?grinder:pipe;target.classList.toggle('herb-target',fits(target,e.clientX,e.clientY));if(source===buds)grinder.classList.toggle('receiving',fits(target,e.clientX,e.clientY));},options);
  source.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const moved=drag.moved,target=source===buds?grinder:pipe,valid=fits(target,e.clientX,e.clientY);cancelDrag();if(!moved||valid)transfer(source);else status.textContent=source===buds?'Drop the buds on the grinder.':'Drop the dust on the pipe.';},options);
  for(const event of ['pointercancel','lostpointercapture'])source.addEventListener(event,e=>{if(drag?.id===e.pointerId)cancelDrag();},options);
  source.addEventListener('click',e=>{e.stopPropagation();if(e.detail===0)transfer(source);},options);
 }
 grind.addEventListener('pointerdown',e=>{grindPointer={x:e.clientX,y:e.clientY};grindMoved=false;e.stopPropagation();grind.setPointerCapture(e.pointerId);},options);
 grind.addEventListener('pointermove',e=>{if(grindPointer&&Math.hypot(e.clientX-grindPointer.x,e.clientY-grindPointer.y)>6)grindMoved=true;},options);
 grind.addEventListener('pointercancel',()=>{grindMoved=true;grindPointer=null;},options);
 grind.addEventListener('click',e=>{e.stopPropagation();grindPointer=null;if(stage!=='buds'||e.detail!==0&&grindMoved)return;setStage('grinding','Grinding.');later('dust','Grinder open with dust.',620);},options);
 function stop(){clearTimeout(actionTimer);actionTimer=0;lighting?.abort();lighting=null;pipe.inert=false;cancelAnimationFrame(frame);frame=0;particles.length=0;credit=0;previous=null;ctx.clearRect(0,0,canvas.width,canvas.height);pipe.style.removeProperty('--ember');if(['smoking','igniting'].includes(stage))setStage('packed','Pipe is still filled.');else if(stage==='loading')setStage('buds','Grinder closed.');else if(stage==='grinding')setStage('dust','Grinder open with dust.');}
 function startSmoke(){setStage('smoking','Pipe lit.');started=last=performance.now();if(!frame)frame=requestAnimationFrame(tick);}
 function ignite(){if(stage!=='packed')return;if(paused||reduced){complete();return;}setStage('igniting','Lighting the pipe.');pipe.inert=true;const controller=new AbortController();lighting=controller;lighter.lightPipe(pipe,()=>{if(!controller.signal.aborted)startSmoke();},controller.signal).catch(()=>{if(lighting===controller)stop();}).finally(()=>{if(lighting===controller){lighting=null;pipe.inert=false;}});}
 function complete(){setStage('empty','Finished. The jar, grinder and pipe are ready again.');grinder.classList.remove('grinding');previous=null;credit=0;}
 function tick(now){frame=0;if(paused||reduced||document.hidden){stop();return;}const dt=Math.min(.035,(now-last)/1000||1/60);last=now;
  if(stage==='smoking'&&now-started>=2200)complete();
  if(stage==='smoking'){
   const p=pipe.getBoundingClientRect(),r=root.getBoundingClientRect(),source={x:(p.left-r.left+p.width*.82)/3,y:(p.top-r.top+p.height*.35)/3};const velocity=previous?(source.x-previous.x)/dt:0;previous=source;credit=Math.min(5,credit+dt*30);
   while(credit>=1&&particles.length<96){credit--;particles.push({x:source.x,y:source.y,vx:Math.max(-35,Math.min(35,velocity*.4))+(Math.random()-.5)*4,vy:-8-Math.random()*6,age:0,life:1.1+Math.random()*.7,r:1.5+Math.random()*2,phase:Math.random()*6});}
   pipe.style.setProperty('--ember',String(.65+Math.sin(now*.014)*.2));
  }
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;if(p.age>=p.life){particles.splice(i,1);continue;}p.vx+=(Math.sin(now*.002+p.y*.08+p.phase)*9-p.vx*.8)*dt;p.vy-=10*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;const fade=Math.sin(Math.PI*p.age/p.life),edge=Math.max(0,Math.min(1,p.x/8,(canvas.width-p.x)/8,p.y/8,(canvas.height-p.y)/8)),size=Math.round(p.r+p.age*2);ctx.fillStyle=`rgba(239,229,221,${fade*.22*edge})`;ctx.fillRect(Math.round(p.x)-size,Math.round(p.y)-size,size*2,size*2);ctx.fillRect(Math.round(p.x)-size-1,Math.round(p.y)-size+1,1,size);}
  if(stage==='smoking'||particles.length)frame=requestAnimationFrame(tick);else pipe.style.removeProperty('--ember');
 }
 function resize(){cancelDrag();stop();const r=root.getBoundingClientRect();canvas.width=Math.ceil(r.width/3);canvas.height=Math.ceil(r.height/3);}
 setStage('empty','Drag buds from the jar to the grinder.');resize();
 return {smoke:ignite,resize,pause(value,resting){paused=value;reduced=resting;if(value||resting||document.hidden){cancelDrag();stop();}},dispose(){cancelDrag();stop();events.abort();canvas.remove();status.remove();delete root.dataset.herbs;}};
}
