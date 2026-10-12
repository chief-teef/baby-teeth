import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage({viewport:{width:1024,height:768},hasTouch:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(process.argv[2]||'http://localhost:5173/');
  await page.getByRole('button',{name:'Draw',exact:true}).click();
  assert.equal(await page.locator('#drawing-surface').evaluate(e=>getComputedStyle(e).touchAction),'none');
  const cdp=await page.context().newCDPSession(page);
  const box=await page.locator('#stage').boundingBox();
  const x=box.x+250,y=box.y+150;
  const initial=await page.evaluate(()=>window.scrollY);
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1,pointerType:'pen'});
  // Palm events must neither move the viewport nor get appended to the ink.
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x+40,y:y+40,id:99}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+40,y:y-80,id:99}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  for(let i=1;i<=10;i++)await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:x+i*4,y:y+i*8,button:'left',buttons:1,pointerType:'pen'});
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:x+40,y:y+80,button:'left',buttons:0,clickCount:1,pointerType:'pen'});
  assert.equal(await page.evaluate(()=>window.scrollY),initial,'Pencil drawing must keep the page still');
  assert.equal(await page.locator('.object.drawing').count(),1,'Pencil stroke survives');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
  for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*15,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(await page.evaluate(()=>window.scrollY)>initial+40,'Finger swipe should scroll in drawing mode');
  assert.equal(await page.locator('.object.drawing').count(),1,'Finger scrolling must not draw');
  await page.getByRole('button',{name:'Write',exact:true}).click();
  assert.equal(await page.locator('#stage').evaluate(e=>getComputedStyle(e).touchAction),'pan-y','Writing keeps native touch scrolling');
  assert.deepEqual(errors,[]);
  console.log('PASS: pen stroke keeps viewport still; palm input ignored; finger swipe scrolls without ink; Write retains native scroll.');
}finally{await browser.close();}
