export const HUDDLE=['po','figurine','dipsy','tinky'];
export function deskLayout(width,height){
 const scale=Math.max(.5,Math.min(1,width/1440,height/900)),compact=width<1280||height<850,gap=16,bottom=height-84;
 const sizes={figurine:[80*scale,116*scale],po:[80*scale,104*scale],dipsy:[80*scale,124*scale],tinky:[80*scale,132*scale],jar:[88*scale,120*scale],grinder:[112*scale,88*scale],lighter:[56*scale,116*scale],pipe:[204*scale,120*scale],mp3:compact?[88,120]:[280,460]},positions={};
 let frame,paw=height/2;
 // Teletubby huddle in Laa-Laa's slot, front to back; each step goes right and up so heads stay visible.
 const huddle=(dx,rise)=>{const {x,y}=positions.figurine;HUDDLE.forEach((k,i)=>{positions[k]={x:x+i*dx,y:y+(HUDDLE.length-1-i)*rise};});};
 if(width<768&&!(height<600&&width>=600&&width>height)){
  const top=['figurine','jar','grinder'],lower=['lighter','pipe','mp3'];
  const topHeight=Math.max(...top.map(k=>sizes[k][1])),lowerHeight=Math.max(...lower.map(k=>sizes[k][1]));
  for(const row of [top,lower])row.forEach((k,i)=>{const [w,h]=sizes[k];positions[k]={x:i===0?gap:i===1?(width-w)/2:width-gap-w,y:row===top?gap:bottom-h};});
  huddle(20*scale,6);
  frame={x:gap,y:gap+topHeight+gap,width:width-gap*2,height:Math.max(1,bottom-lowerHeight-gap-(gap+topHeight+gap))};
 }else if(height<600){
  const keys=['figurine','jar','grinder','lighter','pipe','mp3'],rowHeight=Math.max(...keys.map(k=>sizes[k][1]));
  keys.forEach((k,i)=>{const [w,h]=sizes[k];positions[k]={x:gap+(width-gap*2)/keys.length*(i+.5)-w/2,y:gap+(rowHeight-h)/2};});
  huddle(20*scale,6);
  frame={x:gap,y:gap+rowHeight+gap,width:width-gap*2,height:Math.max(1,bottom-(gap+rowHeight+gap)-gap)};
 }else{
  const left=['figurine','jar','grinder'],right=['lighter','mp3','pipe'];
  for(const column of [left,right])column.forEach((k,i)=>{const [w,h]=sizes[k];positions[k]={x:column===left?gap:width-gap-w,y:i===0?gap:i===1?(gap+bottom-h)/2:bottom-h};});
  const leftWidth=Math.max(...left.map(k=>sizes[k][0]))+gap*2,rightWidth=Math.max(...right.map(k=>sizes[k][0]))+gap*2;
  frame={x:leftWidth,y:gap,width:Math.max(1,width-leftWidth-rightWidth),height:Math.max(1,bottom-gap)};
  huddle(Math.min(20*scale,(leftWidth-gap-sizes.tinky[0])/3),46);
  // The compact player sits at mid-height on the right edge; the paw drops into the gap above the pipe so it never covers the heart button.
  if(compact)paw=(positions.mp3.y+sizes.mp3[1]+positions.pipe.y)/2;
  // Larger screens only. Ashtray and Geek Bar are life-size against the lighter (~14.5px/cm); the rest are sized to read at a glance.
  Object.assign(sizes,{thomas:[112*scale,80*scale],muscle:[96*scale,40*scale],hotrod:[96*scale,40*scale],note:[96*scale,96*scale],ashtray:[160*scale,64*scale],geekbar:[78*scale,132*scale]});
  // shortcut: measured menu width (470px, centred); re-measure if the menu changes (book-responsive catches overlap).
  const menuLeft=(width-470)/2-8,menuRight=(width+470)/2+8,lane=height-44,s=12*scale,[tw,th]=sizes.thomas,[cw,ch]=sizes.muscle;
  positions.thomas={x:gap,y:lane-th/2};
  // Cars park in a row after Thomas, or stack in the strip when the row would reach the menu.
  if(gap+tw+s+cw+s+cw<=menuLeft){positions.muscle={x:gap+tw+s,y:lane-ch/2};positions.hotrod={x:gap+tw+s+cw+s,y:lane-ch/2};}
  else{positions.muscle={x:gap+tw+s,y:lane-ch-2};positions.hotrod={x:gap+tw+s,y:lane+2};}
  positions.note={x:gap,y:(positions.jar.y+sizes.jar[1]+positions.grinder.y-sizes.note[1])/2};
  const base=positions.lighter.y+sizes.lighter[1],column=width-rightWidth+gap,[gw,gh]=sizes.geekbar,[aw,ah]=sizes.ashtray,beside=positions.lighter.x-gap-gw;
  positions.geekbar=beside>=column?{x:beside,y:Math.max(gap,base-gh)}:{x:column,y:base+gap};
  const tray=width-gap-aw;
  positions.ashtray=tray>=menuRight?{x:tray,y:lane-ah/2}:{x:column,y:Math.max(base,positions.geekbar.y+gh)+gap};
 }
 return {scale,compact,positions,sizes,frame,paw};
}
export function fitCamera(width,height,open=true){
 const {frame}=deskLayout(width,height),w=open?2120:1196,h=1420;
 const scale=Math.min(frame.width/w,frame.height/h,.72);
 return {scale,x:frame.x+(frame.width-w*scale)/2-(open?0:924*scale),y:frame.y+(frame.height-h*scale)/2};
}
export function focusCamera(width,height,side,oneToOne=false){
 const padding=width>=768?24:12,scale=oneToOne?1:Math.min((width-padding*2)/900,1.2);
 return {scale,x:padding-(side==='left'?44:968)*scale,y:52-40*scale};
}
export function inversePoint(event,element,scale){const r=element.getBoundingClientRect();return {x:(event.clientX-r.left)/scale,y:(event.clientY-r.top)/scale};}
export function clampBook(x,y,camera,width,height,open){const w=(open?1912:988)*camera.scale,h=1280*camera.scale,left=camera.x+(open?0:924*camera.scale);return {x:Math.max(120-left-w,Math.min(width-120-left,x)),y:Math.max(120-camera.y-h,Math.min(height-120-camera.y,y))};}
export function safeViewport(root){const style=getComputedStyle(root),left=parseFloat(style.getPropertyValue('--safe-left'))||0,right=parseFloat(style.getPropertyValue('--safe-right'))||0,top=parseFloat(style.getPropertyValue('--safe-top'))||0,bottom=parseFloat(style.getPropertyValue('--safe-bottom'))||0;return {width:root.clientWidth-left-right,height:root.clientHeight-top-bottom,left,top,right,bottom};}
