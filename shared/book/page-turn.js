import {PageFlip} from 'page-flip';
import {TURN_MS,RETURN_MS} from './timing.js';
// Pinned 2.0.7: internal fold/animation access is isolated here and covered by
// the feasibility fixture. Native library handlers cannot invert camera scale.
export function createPageTurn(root,pages,{onFlip=()=>{},onState=()=>{}}={}){
 const engine=new PageFlip(root,{width:924,height:1200,size:'fixed',usePortrait:false,autoSize:false,showCover:false,flippingTime:TURN_MS,maxShadowOpacity:.20,useMouseEvents:false,showPageCorners:false,mobileScrollSupport:false,disableFlipByClick:false});
 // Replace the engine's unconditional loop before loadFromHTML calls start().
 let frame=0,disposed=false;
 engine.on('flip',e=>onFlip(e.data));engine.on('changeState',e=>{wake();onState(e.data);});
 let renderer;
 Object.defineProperty(engine,'render',{get:()=>renderer,set:value=>{renderer=value;value.start=()=>value.update();},configurable:true});
 engine.loadFromHTML(pages);
 const render=engine.getRender();
 const originalRender=render.render.bind(render),outerShadow=render.drawOuterShadow.bind(render),innerShadow=render.drawInnerShadow.bind(render);
 const shade=(element,direction,opacity)=>{element.style.background=`linear-gradient(${direction},rgba(32,53,36,${opacity}) 0% 25%,rgba(32,53,36,${opacity*.6}) 25% 50%,rgba(32,53,36,${opacity*.25}) 50% 75%,transparent 75%)`;};
 render.drawOuterShadow=()=>{outerShadow();if(render.shadow)shade(render.outerShadow,render.getDirection()===0?'to right':'to left',Math.min(render.shadow.opacity,.12));};
 render.drawInnerShadow=()=>{innerShadow();if(render.shadow)shade(render.innerShadow,render.getDirection()===0?'to left':'to right',Math.min(render.shadow.opacity,.20));};
 const startAnimation=render.startAnimation.bind(render);let returnCurl=false;
 render.startAnimation=(frames,duration,done)=>{const n=frames.length,cancelled=returnCurl,eased=frames.map((_,i)=>{const t=Math.floor(i/Math.max(1,n-1)*24)/24,p=cancelled?1-(1-t)**3:t<.12?.04*(t/.12)**2:.04+.96*(1-(1-(t-.12)/.88)**3);return frames[Math.round(p*(n-1))];});render.timer=performance.now();startAnimation(eased,cancelled?RETURN_MS:TURN_MS,done);wake();};
 const bends=new Map();
 function cleanBends(){for(const [element,overlay] of bends){overlay.remove();element.querySelector(':scope > .notebook-page')?.style.removeProperty('visibility');}bends.clear();}
 function bendSheet(){
  const leaf=render.flippingPage?.getElement();if(!leaf||!leaf.querySelector('.notebook-page')){cleanBends();return;}
  for(const [element,overlay] of bends)if(element!==leaf){overlay.remove();element.querySelector(':scope > .notebook-page')?.style.removeProperty('visibility');bends.delete(element);}
  let overlay=bends.get(leaf);const paper=leaf.querySelector(':scope > .notebook-page');if(!paper)return;
  if(!overlay){overlay=document.createElement('div');overlay.className='curl-bands';overlay.inert=true;overlay.ariaHidden='true';for(let i=0;i<16;i++){const band=document.createElement('div');band.className='curl-band';const copy=paper.cloneNode(true);copy.removeAttribute('id');copy.ariaHidden='true';copy.inert=true;copy.style.visibility='visible';copy.style.marginLeft='0';copy.style.left=`${-i*924/16}px`;band.append(copy);overlay.append(band);}leaf.append(overlay);paper.style.visibility='hidden';bends.set(leaf,overlay);}
  const progress=(flip.getCalculation()?.getFlippingProgress()||0)/100,amplitude=Math.round(Math.sin(Math.min(1,progress)*Math.PI)*12)*4;
  [...overlay.children].forEach((band,i)=>{const x=i*924/16,next=(i+1)*924/16,w=924/16,warp=p=>amplitude*Math.sin(p/924*Math.PI),x1=x+warp(x),x2=next+warp(next),y1=warp(x)*.3,y2=warp(next)*.3;band.style.cssText=`left:0;top:0;width:${w+1}px;height:1200px;transform-origin:0 0;transform:matrix(${(x2-x1)/w},${(y2-y1)/w},0,1,${x1},${y1})`;});
  // Library-created temporary faces must never duplicate readable navigation.
  for(const item of root.querySelectorAll('.stf__item'))if(!pages.includes(item)){item.inert=true;item.ariaHidden='true';}
 }
 function tick(time){frame=0;if(disposed||document.hidden)return;originalRender(Math.max(time,render.animation?.startedAt||0));bendSheet();if(render.animation)frame=requestAnimationFrame(tick);}
 function wake(){if(!disposed&&!frame)frame=requestAnimationFrame(tick);}
 wake();
 const flip=engine.getFlipController();
 return {engine,get active(){return !!render.animation||engine.getState()==='user_fold';},turnTo(index){engine.turnToPage(index);wake();},turn(index){engine.flip(index,'bottom');wake();},
  fold(point){flip.fold(point);wake();},
  release(commit){const calc=flip.getCalculation();if(!calc)return;const start=calc.getPosition();returnCurl=!commit;flip.animateFlippingTo(start,{x:commit?-924:924,y:1200},commit);returnCurl=false;wake();},
  settle(){engine.getRender().finishAnimation();cleanBends();wake();},
  dispose(){disposed=true;cancelAnimationFrame(frame);cleanBends();engine.destroy();}
 };
}
