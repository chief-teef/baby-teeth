export function createAudio(base){
 let context,source,enabled=true,unlocked=false,variation=0,unlockTask=null,disposed=false;
 const requests=new AbortController(),samples=[];
 try{enabled=localStorage.getItem('bbyteeth-muted')!=='1';}catch{}
 function unlock(){
  if(!enabled||disposed)return Promise.resolve();if(unlockTask)return unlockTask;
  unlockTask=(async()=>{try{
   context??=new (window.AudioContext||window.webkitAudioContext)();await context.resume();
   if(samples.length!==2){const loaded=await Promise.all([0,1].map(async i=>context.decodeAudioData(await (await fetch(`${base}book/turn-${i}.wav`,{signal:requests.signal})).arrayBuffer())));samples.splice(0,samples.length,...loaded);}
   unlocked=!disposed;
  }catch{unlocked=false;}})().finally(()=>{unlockTask=null;});return unlockTask;
 }
 function play(){
  const selected=variation++%2;if(!enabled||!unlocked||disposed||samples.length!==2)return;
  try{source?.stop();source=context.createBufferSource();source.buffer=samples[selected];const gain=context.createGain(),now=context.currentTime;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.18,now+.005);gain.gain.setValueAtTime(.18,now+.135);gain.gain.linearRampToValueAtTime(0,now+.14);source.connect(gain).connect(context.destination);source.start();}catch{}
 }
 return {unlock,play,get enabled(){return enabled;},toggle(){enabled=!enabled;try{localStorage.setItem('bbyteeth-muted',enabled?'0':'1');}catch{}if(!enabled)source?.stop();else unlock();return enabled;},dispose(){disposed=true;requests.abort();source?.stop();context?.close().catch(()=>{});}};
}
