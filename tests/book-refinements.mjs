import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true}),page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 for(const [width,height] of [[1440,900],[834,1194],[390,844],[320,568]]){
  await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:5175/prototypes/diary.html');await page.waitForFunction(()=>window.bookScene);
  const picker=page.getByRole('button',{name:'Page color',exact:true});await picker.click();
  assert.equal(await picker.getAttribute('aria-expanded'),'true');assert.equal(await page.locator('.paper-swatches button').count(),5);assert.equal(await page.locator('.paper-control').textContent(),'');
  const box=await page.locator('.paper-swatches').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<=height,JSON.stringify(box));
  assert.equal(await page.locator('.paper-swatches button:focus').count(),1);await page.screenshot({path:`test-results/swatches-${width}.png`});
  await page.keyboard.press('Escape');assert.equal(await picker.getAttribute('aria-expanded'),'false');assert.equal(await page.evaluate(()=>bookScene.controller.state),'closed');assert.ok(await picker.evaluate(e=>e===document.activeElement));
  await picker.click();await page.getByRole('button',{name:'lavender paper'}).click();assert.equal(await page.locator('.book-scene').evaluate(e=>e.style.getPropertyValue('--page-color')),'#EBE2F2');
  await page.reload();await page.waitForFunction(()=>window.bookScene);await picker.click();assert.equal(await page.getByRole('button',{name:'lavender paper'}).getAttribute('aria-pressed'),'true');await page.mouse.click(2,2);assert.equal(await picker.getAttribute('aria-expanded'),'false');
  await page.evaluate(()=>{void bookScene.open();});await page.waitForFunction(()=>document.querySelector('.opening-page .page-fold'));
  assert.equal(await page.locator('.opening-page').evaluate(e=>e.inert&&e.ariaHidden==='true'&&!e.querySelector('button')),true);
  await page.waitForTimeout(220);await page.screenshot({path:`test-results/attached-open-${width}.png`});await page.waitForFunction(()=>bookScene.controller.state==='open-idle');
  if(width<768){await page.locator('.book-rail').getByRole('button',{name:'Zoom out',exact:true}).click();}
  const start=await page.locator('.book-corner.left').boundingBox();assert.ok(start.width>=44&&start.height>=44);
  await page.locator('.book-corner.left').click();await page.waitForFunction(()=>document.querySelector('.curl-bands .page-fold'));
  assert.equal(await page.locator('.book-corner.left').evaluate(e=>e===document.activeElement),true);
  assert.equal(await page.locator('.curl-bands').evaluate(e=>e.inert&&e.ariaHidden==='true'&&!e.querySelector('button')),true);
  assert.match(await page.locator('.stf__outerShadow').evaluate(e=>e.style.background),/25%/);
  await page.waitForTimeout(100);await page.screenshot({path:`test-results/attached-turn-${width}.png`});await page.waitForFunction(()=>bookScene.controller.state==='open-idle');
  assert.equal(await page.locator('.book-corner.left').evaluate(e=>e===document.activeElement),true);
  if(width===1440){await page.locator('.book-corner.left').click();await page.waitForFunction(()=>bookScene.controller.state==='open-idle'&&bookScene.controller.spread===0);assert.equal(await page.locator('.book-rail').getByRole('button',{name:'Zoom in',exact:true}).evaluate(e=>e===document.activeElement),true);await page.locator('.book-rail').getByRole('button',{name:'Newer pages',exact:true}).click();await page.waitForFunction(()=>bookScene.controller.state==='open-idle'&&bookScene.controller.spread===1);}
  await page.evaluate(()=>{void bookScene.close();});await page.waitForFunction(()=>document.querySelector('.closing-leaf .page-fold'));await page.waitForTimeout(150);await page.screenshot({path:`test-results/attached-close-${width}.png`});await page.waitForFunction(()=>bookScene.controller.state==='closed');
  await page.screenshot({path:`test-results/figurine-${width}.png`,clip:await page.locator('.desk-tubby').evaluateAll(items=>{const r=items.map(e=>e.getBoundingClientRect()),x=Math.min(...r.map(b=>b.x)),y=Math.min(...r.map(b=>b.y));return {x,y,width:Math.max(...r.map(b=>b.right))-x,height:Math.max(...r.map(b=>b.bottom))-y};})});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>bookScene.open());await page.waitForFunction(()=>bookScene.controller.state==='open-idle');await page.getByRole('button',{name:'Page color',exact:true}).click();await page.getByRole('button',{name:'mint paper'}).press('Enter');assert.equal(await page.locator('.book-scene').evaluate(e=>e.style.getPropertyValue('--page-color')),'#E3EDCF');
 await page.evaluate(()=>bookScene.dispose());assert.equal(await page.locator('.page-fold,.paper-swatches,.curl-bands').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS attached inert corner copies, reachable hit targets, wordless swatches/selection/persistence, keyboard/light dismissal, four widths, reduced motion and disposal.');
}finally{await browser.close();}

