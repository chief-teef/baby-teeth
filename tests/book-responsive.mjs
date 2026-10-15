import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {deskLayout} from '../shared/book/camera.js';
const sizes=[[1440,900],[1280,800],[1024,768],[834,1194],[768,600],[600,400],[480,400],[390,844],[320,568],[320,400]];
const overlap=(a,b)=>Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>1;
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [width,height] of sizes){
  await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:5174/prototypes/diary.html');await page.waitForFunction(()=>window.bookScene);
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>bookScene.open());
  const props=await page.locator('.desk-prop').evaluateAll(items=>items.map(e=>{const b=e.getBoundingClientRect();return {name:e.className,x:b.x,y:b.y,width:b.width,height:b.height};}));
  const camera=await page.locator('.book-camera').evaluate(e=>{const m=new DOMMatrix(getComputedStyle(e).transform);return {x:m.e,y:m.f,width:1912*m.a,height:1280*m.a};});
  const rail=await page.locator('.book-rail').boundingBox();
  for(const prop of props){
   assert.ok(prop.x>=-1&&prop.y>=-1&&prop.x+prop.width<=width+1&&prop.y+prop.height<=height+1,`${width}x${height}: ${prop.name} stays on screen`);
   assert.ok(!overlap(prop,camera),`${width}x${height}: ${prop.name} does not cover the book`);
   assert.ok(!overlap(prop,rail),`${width}x${height}: ${prop.name} does not cover controls`);
  }
  for(let i=0;i<props.length;i++)for(let j=i+1;j<props.length;j++)assert.ok(!overlap(props[i],props[j]),`${width}x${height}: props stay separated`);
  assert.ok(!overlap(camera,rail),`${width}x${height}: book stays above controls`);
  const layout=deskLayout(width,height);assert.ok(camera.width<=layout.frame.width+1&&camera.height<=layout.frame.height+1);
  if(layout.compact){
   await page.locator('.mp3-handle').click();
   const panel=await page.locator('.mp3-screen').boundingBox();assert.ok(panel.y>=0&&panel.y+panel.height<=height+1,'Compact music panel fits vertically');
   const footer=await page.locator('.spotify-attribution').boundingBox();
   for(const item of await page.locator('.mp3-screen li').all())assert.ok((await item.boundingBox()).y+(await item.boundingBox()).height<=footer.y+1,'Music rows stay above attribution');
   await page.getByRole('button',{name:'Close player',exact:true}).click();
  }
  if(width===390||height===400||width===1440)await page.screenshot({path:`test-results/responsive-desk-${width}-${height}.png`});
 }
 // Resizing a zoomed scene reduces its fitted scale and keeps controls reachable.
 await page.setViewportSize({width:1440,height:900});await page.reload();await page.waitForFunction(()=>window.bookScene);await page.evaluate(()=>bookScene.open());
 await page.mouse.move(500,450);await page.mouse.wheel(0,-150);await page.waitForTimeout(80);
 const large=await page.locator('.book-camera').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).a);
 await page.setViewportSize({width:320,height:400});await page.waitForTimeout(100);
 assert.ok(await page.locator('.book-camera').evaluate((e,old)=>new DOMMatrix(getComputedStyle(e).transform).a<old,large));
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'no-preference'});await page.reload();await page.waitForFunction(()=>window.bookScene);
 const figurine=page.locator('.desk-figurine'),box=await figurine.boundingBox(),left=await figurine.evaluate(e=>parseFloat(e.style.left));
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+20,box.y+box.height/2+10);await page.mouse.up();
 assert.ok(Math.abs(await figurine.evaluate(e=>parseFloat(e.style.left))-left-20)<1,'Scaled props drag in screen coordinates');
 await page.locator('.herb-buds').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#demo').dataset.herbs==='buds');
 await page.locator('.herb-grind').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#demo').dataset.herbs==='dust');
 await page.locator('.herb-dust').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#demo').dataset.herbs==='smoking');
 const lighter=await page.locator('.desk-lighter').boundingBox(),pipe=await page.locator('.desk-pipe').boundingBox(),propScale=deskLayout(390,844).scale;
 assert.ok(Math.abs(lighter.x+28*propScale-(pipe.x+pipe.width*.82))<2,'Scaled lighter reaches the pipe horizontally');
 assert.ok(Math.abs(lighter.y+4*propScale-(pipe.y+pipe.height*.35))<2,'Scaled lighter reaches the pipe vertically');
 assert.deepEqual(errors,[]);console.log('PASS separated book, six props and reachable controls across ten desktop/tablet/phone/short viewports, plus resize. Chromium only.');
}finally{await browser.close();}
