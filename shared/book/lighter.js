import {movableProp} from './prop.js';
export function mountLighter(root,base){
 const button=document.createElement('button');button.className='desk-prop desk-lighter';button.ariaLabel='Pick up lighter · arrow keys move · Escape puts down';
 button.innerHTML=`<span class="lighter-rig" aria-hidden="true"><canvas width="96" height="112"></canvas><span class="lighter-shell prop-art"><img class="lighter-lid" src="${base}book/lighter-lid.png" alt=""><img class="lighter-body" src="${base}book/lighter.png" alt=""></span></span>`;
 root.append(button);const ctx=button.querySelector('canvas').getContext('2d'),particles=[];let held=false,paused=false,reduced=false,frame=0,last=0,credit=0,wind=0,tilt=0,ignition=0,flight=null;
 function clear(){cancelAnimationFrame(frame);frame=0;particles.length=0;credit=0;tilt=wind=0;ctx.clearRect(0,0,96,112);button.classList.remove('ignited');button.style.setProperty('--tilt','0deg');}
 function rest(){ctx.clearRect(0,0,96,112);if(!held)return;button.classList.add('ignited');ctx.fillStyle='#ffab66';ctx.fillRect(45,78,7,13);ctx.fillRect(47,69,3,12);ctx.fillStyle='#fff0b0';ctx.fillRect(47,82,3,9);}
 function tick(now){frame=0;if(!held||paused||reduced||document.hidden)return;const dt=Math.min(.035,(now-last)/1000||1/60);last=now;if(now<ignition){frame=requestAnimationFrame(tick);return;}button.classList.add('ignited');credit=Math.min(6,credit+dt*120);
  while(credit>=1&&particles.length<90){credit--;const speed=40+Math.random()*30;particles.push({x:48+(Math.random()-.5)*2,y:91,vx:(Math.random()-.5)*6-Math.sin(tilt)*speed,vy:-Math.cos(tilt)*speed,age:0,life:.3+Math.random()*.4,size:2+Math.random()*2,phase:Math.random()*6});}
  ctx.clearRect(0,0,96,112);
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;if(p.age>=p.life){particles.splice(i,1);continue;}p.vx+=(Math.sin(p.phase+p.age*19)*18+wind*.08-Math.sin(tilt)*35-p.vx*2)*dt;p.vy-=Math.cos(tilt)*35*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;const heat=1-p.age/p.life;
   // Fade before any canvas boundary, including fast lateral drags.
   const edge=Math.max(0,Math.min(1,(p.x-8)/14,(88-p.x)/14,(p.y-8)/16,(104-p.y)/12));ctx.fillStyle=`rgba(255,${Math.round(95+heat*145)},${Math.round(heat*115)},${heat*.75*edge})`;const size=Math.max(1,Math.round(p.size*heat));ctx.fillRect(Math.round(p.x),Math.round(p.y),size,size*2);
  }
  ctx.fillStyle='#b9cdff';ctx.fillRect(47,91,3,1);wind*=Math.exp(-dt*4);button.style.setProperty('--flame-glow',String(.55+Math.sin(now*.004)*.05+Math.sin(now*.007)*.025));frame=requestAnimationFrame(tick);
 }
 function light(spin=true){held=true;if(paused||reduced)rest();else{last=performance.now();ignition=last+(spin?420:0);frame=requestAnimationFrame(tick);}}
 function putDown(){held=false;clear();}
 const prop=movableProp(root,button,button,{pickup:light,release:putDown,move(v){wind=Math.max(-90,Math.min(90,v*70));const degrees=Math.max(-25,Math.min(25,v*16));tilt=degrees*Math.PI/180;button.style.setProperty('--tilt',degrees+'deg');}});
 async function lightPipe(pipe,onLight,signal){
  if(signal.aborted)return;prop.cancel();const start=button.getBoundingClientRect(),target=pipe.getBoundingClientRect(),dx=target.left+target.width*.82-28-start.left,dy=target.top+target.height*.35-4-start.top;
  button.disabled=true;button.classList.add('automatic','held');button.setAttribute('aria-busy','true');
  const cancel=()=>{flight?.cancel();putDown();};signal.addEventListener('abort',cancel,{once:true});
  const travel=async frames=>{flight?.cancel();flight=button.animate(frames,{duration:380,easing:'cubic-bezier(.2,1.1,.35,1)',fill:'forwards'});await flight.finished;};const at=`translate(${dx}px,${dy}px)`,arc=`translate(${dx*.5}px,${dy*.5-70}px)`;
  try{await travel([{transform:'translate(0,0)'},{transform:arc,offset:.5},{transform:at}]);if(signal.aborted)return;light(false);flight.cancel();flight=button.animate([{transform:at},{transform:at}],{duration:300,fill:'forwards'});onLight();await flight.finished;putDown();await travel([{transform:at},{transform:arc,offset:.5},{transform:'translate(0,0)'}]);}
  catch(error){if(error.name!=='AbortError')throw error;}
  finally{signal.removeEventListener('abort',cancel);flight?.cancel();flight=null;putDown();button.classList.remove('automatic','held');button.disabled=false;button.removeAttribute('aria-busy');}
 }
 return {lightPipe,resize:prop.resize,pause(value,resting){prop.pause(value,resting);paused=value;reduced=resting;cancelAnimationFrame(frame);frame=0;if(paused||reduced)rest();else if(held){last=performance.now();frame=requestAnimationFrame(tick);}},dispose(){flight?.cancel();prop.dispose();clear();}};
}
