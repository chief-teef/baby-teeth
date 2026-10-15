export function fitCamera(width,height,open=true){
 const padding=width>=768?24:12,w=open?2120:1196,h=1420;
 const scale=Math.min((width-padding*2)/w,(height-padding*2)/h,.72);
 return {scale,x:(width-w*scale)/2-(open?0:924*scale),y:(height-h*scale)/2};
}
export function focusCamera(width,height,side,oneToOne=false){
 const padding=width>=768?24:12,scale=oneToOne?1:Math.min((width-padding*2)/900,1.2);
 return {scale,x:padding-(side==='left'?44:968)*scale,y:52-40*scale};
}
export function inversePoint(event,element,scale){const r=element.getBoundingClientRect();return {x:(event.clientX-r.left)/scale,y:(event.clientY-r.top)/scale};}
export function clampBook(x,y,camera,width,height,open){const w=(open?1912:988)*camera.scale,h=1280*camera.scale,left=camera.x+(open?0:924*camera.scale);return {x:Math.max(120-left-w,Math.min(width-120-left,x)),y:Math.max(120-camera.y-h,Math.min(height-120-camera.y,y))};}
export function safeViewport(root){const style=getComputedStyle(root),left=parseFloat(style.getPropertyValue('--safe-left'))||0,right=parseFloat(style.getPropertyValue('--safe-right'))||0,top=parseFloat(style.getPropertyValue('--safe-top'))||0,bottom=parseFloat(style.getPropertyValue('--safe-bottom'))||0;return {width:root.clientWidth-left-right,height:root.clientHeight-top-bottom,left,top,right,bottom};}
