// Reader-only cat paw: one swipe per press, or a wiggle in place when motion is reduced or paused.
const SWIPE=[{transform:'translateX(0)'},{transform:'translateX(-52px) rotate(-6deg)',offset:.35},{transform:'translateX(-40px) rotate(-3deg)',offset:.5},{transform:'translateX(0)'}];
const WIGGLE=[{transform:'rotate(0)'},{transform:'rotate(-8deg)',offset:.25},{transform:'rotate(7deg)',offset:.6},{transform:'rotate(0)'}];
export function mountPaw(root,base){
 const events=new AbortController(),edge=document.createElement('div'),paw=document.createElement('button');let still=false,motion;
 paw.type='button';paw.className='desk-paw';paw.ariaLabel='cat paw';paw.innerHTML=`<img src="${base}book/paw.png" alt="">`;edge.className='desk-paw-edge';edge.append(paw);root.append(edge);
 const stop=()=>{motion?.cancel();motion=null;};
 paw.addEventListener('click',()=>{stop();motion=paw.firstElementChild.animate(still?WIGGLE:SWIPE,{duration:500,easing:'ease-out'});motion.onfinish=()=>{motion=null;};},{signal:events.signal});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();},{signal:events.signal});
 return {place(y){paw.style.top=y+'px';},pause(value,reduced){still=value||reduced;if(still)stop();},dispose(){stop();events.abort();edge.remove();}};
}
