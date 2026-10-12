export function layoutReading(canvas){
  const width=canvas.clientWidth,desktop=width>=800,factor=width/900;canvas.classList.toggle('desktop',desktop);let bottom=180;
  canvas.querySelectorAll('[data-layout]').forEach(el=>{const e=JSON.parse(el.dataset.layout);if(!desktop){el.style.cssText=el.dataset.phone||'';return;}const x=e.x*factor,y=e.y*factor,w=e.w*factor;el.style.cssText=`left:${x}px;top:${y}px;width:${w}px;transform:rotate(${e.rotation}deg)`;if(!el.classList.contains('public-text'))el.style.height=`${e.h*factor}px`;const h=el.offsetHeight,angle=e.rotation*Math.PI/180;const transformedHeight=Math.abs(w*Math.sin(angle))+Math.abs(h*Math.cos(angle));bottom=Math.max(bottom,y+(h+transformedHeight)/2+70);});canvas.style.height=desktop?`${bottom}px`:'';
}
