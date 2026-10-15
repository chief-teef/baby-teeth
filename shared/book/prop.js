// One pickup lifecycle for desk objects; positions stay in this scene only.
export function movableProp(root,element,handle,{pickup=()=>{},release=()=>{},move=()=>{}}={}){
 const events=new AbortController(),options={signal:events.signal};let x=0,y=0,pointer=null,start,held=false,reduced=false,paused=false;
 function clamp(){const r=root.getBoundingClientRect(),size=element.getBoundingClientRect();x=Math.max(0,Math.min(Math.max(0,r.width-size.width),x));y=Math.max(0,Math.min(Math.max(0,r.height-size.height),y));element.style.left=x+'px';element.style.top=y+'px';}
 function pressed(value){element.dataset.held=String(value);if(handle.tagName==='BUTTON')handle.setAttribute('aria-pressed',String(value));else handle.setAttribute('aria-description',value?'Picked up. Arrow keys move; Escape puts down.':'Enter or Space picks up; arrow keys move.');}
 function down(){if(held)return;held=true;element.classList.add('held');pressed(true);pickup();}
 function up(){held=false;const id=pointer;pointer=null;if(id!==null&&handle.hasPointerCapture(id))handle.releasePointerCapture(id);element.classList.remove('held');pressed(false);release();}
 pressed(false);
 handle.addEventListener('pointerdown',e=>{const control=e.target.closest('button,a,input,select,[data-prop-control]');if(e.button!==0||pointer!==null||control&&control!==handle)return;e.preventDefault();e.stopPropagation();handle.focus({preventScroll:true});pointer=e.pointerId;element.classList.add('pointer-focused');start={x,y,cx:e.clientX,cy:e.clientY,last:e.clientX,time:performance.now()};handle.setPointerCapture(pointer);down();},options);
 handle.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;const now=performance.now(),velocity=(e.clientX-start.last)/Math.max(1,now-start.time);x=start.x+e.clientX-start.cx;y=start.y+e.clientY-start.cy;clamp();move(reduced||paused?0:velocity);start.last=e.clientX;start.time=now;},options);
 for(const event of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(event,e=>{if(e.pointerId===pointer)up();},options);
 handle.addEventListener('focus',()=>element.classList.remove('pointer-focused'),options);
 handle.addEventListener('keydown',e=>{if(e.target!==handle)return;element.classList.remove('pointer-focused');if(['Enter',' ','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();e.stopPropagation();if(e.repeat&&['Enter',' '].includes(e.key))return;if(e.key==='Escape')up();else if(['Enter',' '].includes(e.key))held?up():down();else{const step=e.shiftKey?40:10;x+=(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0);y+=(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0);clamp();}}},options);
 handle.addEventListener('blur',()=>{if(pointer===null)up();},options);
 return {cancel:up,resize(position){up();x=position.x;y=position.y;clamp();},pause(value,resting){paused=value;reduced=resting;element.classList.toggle('still',value||resting);if(document.hidden)up();},dispose(){up();events.abort();element.remove();}};
}
