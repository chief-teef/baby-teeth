import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage({viewport:{width:756,height:876},acceptDownloads:true}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());let writes=0;
await page.route('**/api/**',r=>r.fulfill({json:new URL(r.request().url()).pathname==='/api/session'?{configured:true,signedIn:true,login:'fixture',csrf:'test'}:(r.request().method()==='PUT'?(writes++,{post:{...r.request().postDataJSON().post,status:'draft'},revision:'a'.repeat(40)}):{})}));
const read=()=>page.evaluate(async()=>{const {load}=await import('/src/storage.js');return load();});
const settled=()=>page.waitForFunction(()=>document.querySelector('#status').textContent==='Saved on this device');
const menu=label=>page.getByRole('button',{name:label,exact:true}).click();
try{
 await page.goto(process.argv[2]||'http://127.0.0.1:5175/');await page.waitForTimeout(500);
 assert.equal(await page.locator('.title-error').count(),0);assert.match(await page.locator('#fit-status').textContent(),/Add a title/);
 assert.equal(await page.locator('#format').isVisible(),false);assert.equal(await page.locator('[data-format=bold]').isDisabled(),true);
 assert.ok((await page.locator('#stage').boundingBox()).y<=260,'756px blank page starts within 260px');
 await page.screenshot({animations:'disabled',path:'test-results/studio-after-756.png'});
 await page.setViewportSize({width:834,height:1194});await page.waitForTimeout(100);assert.ok((await page.locator('#stage').boundingBox()).y<=240,'834px blank page starts within 240px');
 await menu('Publication');await menu('Publish entry');await page.waitForTimeout(150);assert.equal(writes,0);assert.ok(await page.locator('#title').evaluate(e=>e===document.activeElement));assert.equal(await page.locator('.title-error').count(),1);
 await page.locator('#title').fill('Presentation integrity');await page.locator('#add-text').click();await page.locator('.tiptap').fill('Keep this selection and its structured text.');
 await page.keyboard.press('Control+a');await menu('Bold');assert.equal(await page.locator('[data-format=bold]').getAttribute('aria-pressed'),'true');
 await settled();
 await page.evaluate(async()=>{const {load,save}=await import('/src/storage.js');const {uid}=await import('/src/model.js');const b=await load(),p=b.posts[0],group=uid();const c=document.createElement('canvas');c.width=40;c.height=30;p.elements.push({id:uid(),group,type:'photo',src:c.toDataURL('image/jpeg'),alt:'Fixture photo',x:400,y:60,w:200,h:150,rotation:4},{id:uid(),group,type:'drawing',x:400,y:450,w:100,h:100,sourceW:100,sourceH:100,rotation:0,strokes:[{color:'#203524',size:4,points:[[10,10],[50,50]]}]});p.music={artists:[{name:'Fixture artist'}],songs:[]};await save(b);});
 await page.reload();await page.waitForSelector('.tiptap');await page.waitForTimeout(500);const before=await read();
 await fs.writeFile('test-results/studio-shell-content-before.json',JSON.stringify(before,null,2));
 await page.locator('.tiptap').click();await page.keyboard.press('End');await page.keyboard.press('Shift+Home');
 await page.evaluate(()=>window.keptEditor=document.querySelector('.tiptap'));
 for(const [width,height] of [[1440,900],[1280,800],[1024,1366],[1366,1024],[834,1194],[1194,834],[756,876],[390,844],[320,568]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(120);
  assert.ok(await page.locator('#github-save').isVisible());assert.ok(await page.locator('#add-text').isVisible());assert.ok(await page.locator('#add-photo').isVisible());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'shell has no horizontal overflow');
  if(width<1000){await menu('Entries');assert.equal(await page.locator('#entries-toggle').getAttribute('aria-expanded'),'true');await page.screenshot({animations:'disabled',path:`test-results/studio-entries-${width}.png`});await page.keyboard.press('Escape');assert.ok(await page.locator('#entries-toggle').evaluate(e=>e===document.activeElement));}
  await menu('Move & resize');assert.equal(await page.locator('#properties-toggle').getAttribute('aria-expanded'),'false');
  await page.locator('.object.photo').click();assert.equal(await page.locator('#properties-toggle').getAttribute('aria-expanded'),'false');
  const handle=await page.locator('.object.photo .resize').boundingBox(),grab=await page.locator('.object.photo .grab').boundingBox();assert.ok(handle.width>=43.9&&handle.height>=43.9);assert.ok(grab.width>=43.9&&grab.height>=43.9);
  await menu('Properties');assert.equal(await page.locator('#properties-toggle').getAttribute('aria-expanded'),'true');await page.screenshot({animations:'disabled',path:`test-results/studio-properties-${width}.png`});
  if(width<1280)await page.keyboard.press('Escape');else await menu('Close properties');
  assert.equal(await page.locator('#properties-toggle').getAttribute('aria-expanded'),'false');
  assert.equal(await page.getByRole('button',{name:'Draw',exact:true}).count(),0);await menu('Write');
  await page.screenshot({animations:'disabled',path:`test-results/studio-write-${width}.png`});
  await page.locator('.tiptap').click();await page.screenshot({animations:'disabled',path:`test-results/studio-text-${width}.png`});
  await menu('More tools');await page.screenshot({animations:'disabled',path:`test-results/studio-tools-${width}.png`});await page.keyboard.press('Escape');
  await menu('Account & tools');await menu('Help');await page.screenshot({animations:'disabled',path:`test-results/studio-help-${width}.png`});await menu('Got it');
 }
 assert.ok(await page.evaluate(()=>keptEditor===document.querySelector('.tiptap')),'presentation keeps the editor mounted');
 await page.setViewportSize({width:834,height:1194});await menu('Move & resize');await page.locator('.object.text').click();await menu('Properties');
 const input=page.getByRole('spinbutton',{name:'X of selected object'});await input.focus();await page.setViewportSize({width:1280,height:800});await page.waitForTimeout(100);assert.ok(await input.evaluate(e=>e===document.activeElement));assert.equal(await page.locator('#properties-dialog').evaluate(e=>e.open),false);assert.equal(await page.locator('#properties-toggle').getAttribute('aria-expanded'),'true');await menu('Close properties');await menu('Write');
 await page.setViewportSize({width:834,height:1194});await menu('Entries');await page.setViewportSize({width:1024,height:768});await page.waitForTimeout(100);assert.equal(await page.locator('#entries-dialog').evaluate(e=>e.open),false);assert.ok(await page.locator('#title').evaluate(e=>e===document.activeElement));
 await page.locator('.tiptap').click();await page.evaluate(()=>{Object.defineProperty(visualViewport,'height',{configurable:true,value:innerHeight-300});visualViewport.dispatchEvent(new Event('resize'));});
 assert.equal(await page.locator('#keyboard-actions').isVisible(),true);assert.equal(await page.locator('#keyboard-save').isDisabled(),await page.locator('#github-save').isDisabled());await page.screenshot({animations:'disabled',path:'test-results/studio-keyboard-simulation.png'});
 await page.evaluate(()=>{delete visualViewport.height;visualViewport.dispatchEvent(new Event('resize'));});assert.equal(await page.locator('#keyboard-actions').isVisible(),false);
 await page.setViewportSize({width:834,height:1194});await page.locator('.tiptap').click();await page.keyboard.press('End');await page.keyboard.press('Shift+Home');
 const selected=await page.evaluate(()=>getSelection().toString());const scroll=await page.evaluate(()=>scrollY);
 await page.locator('#preview').click();await page.waitForSelector('.book-scene');await page.waitForTimeout(800);
 const header=await page.locator('.top').boundingBox(),preview=await page.locator('#reader').boundingBox();assert.ok(preview.y>=header.y+header.height-1);
 await page.screenshot({animations:'disabled',path:'test-results/studio-preview.png'});await page.locator('#preview').click();await page.waitForTimeout(100);
 assert.ok(await page.locator('.tiptap').evaluate(e=>e===document.activeElement));assert.equal(await page.evaluate(()=>getSelection().toString()),selected);assert.ok(Math.abs(await page.evaluate(()=>scrollY)-scroll)<=1);
 await page.waitForTimeout(500);assert.deepEqual(await read(),before,'presentation changes no IDs, geometry, groups, marks, music or local revision');assert.equal(await page.locator('#undo').isDisabled(),true,'presentation adds no undo entries after reload');
 await page.setViewportSize({width:1440,height:900});await menu('Move & resize');await page.locator('.object.photo').click();const grab=await page.locator('.object.photo .grab').boundingBox();await page.mouse.move(grab.x+grab.width/2,grab.y+grab.height/2);await page.mouse.down();await page.mouse.move(grab.x+grab.width/2+30,grab.y+grab.height/2+20,{steps:6});await page.mouse.up();await settled();const moved=(await read()).posts[0].elements;const photo=before.posts[0].elements[1],ink=before.posts[0].elements[2];assert.ok(moved[1].x>photo.x);assert.ok(Math.abs((moved[1].x-photo.x)-(moved[2].x-ink.x))<.01);assert.ok(Math.abs((moved[1].y-photo.y)-(moved[2].y-ink.y))<.01);await menu('Undo');await settled();assert.deepEqual((await read()).posts[0].elements,before.posts[0].elements);
 await page.locator('.object.text').click();await menu('Properties');await menu('Duplicate');assert.equal(await page.locator('.object.text').count(),2);await menu('Undo');assert.equal(await page.locator('.object.text').count(),1);await page.locator('.object.text').click();await menu('Delete');assert.equal(await page.locator('.object.text').count(),0);await menu('Undo');assert.equal(await page.locator('.object.text').count(),1);await menu('Close properties');
 await page.locator('#multi-toggle').click();await page.locator('.object.photo').click();await page.locator('#multi-toggle').click();await menu('Properties');const width=page.getByRole('spinbutton',{name:'Width of selected object'});await width.fill('240');await width.press('Tab');await settled();const resized=(await read()).posts[0].elements[1];assert.equal(resized.w,240);assert.equal(resized.h/resized.w,photo.h/photo.w);await menu('Undo');await menu('Close properties');await menu('Write');
 await page.locator('#title').focus();await page.locator('#title').evaluate(e=>e.setSelectionRange(2,7));await page.locator('#preview').click();await page.waitForSelector('.book-scene');await page.locator('#preview').click();await page.waitForTimeout(100);assert.deepEqual(await page.locator('#title').evaluate(e=>[e===document.activeElement,e.selectionStart,e.selectionEnd]),[true,2,7]);
 await menu('Move & resize');await page.locator('.object.text').click();await menu('Properties');const property=page.getByRole('spinbutton',{name:'X of selected object'});await property.focus();await page.locator('#preview').click();await page.waitForSelector('.book-scene');await page.locator('#preview').click();await page.waitForTimeout(100);assert.ok(await property.evaluate(e=>e===document.activeElement));await menu('Close properties');await menu('Write');
 await menu('Account & tools');await page.locator('summary').click();assert.equal(await page.locator('#stress').count(),1);await page.keyboard.press('Escape');
 await page.setViewportSize({width:834,height:1194});await page.emulateMedia({reducedMotion:'reduce'});await menu('Entries');assert.equal(await page.locator('#entries-dialog').evaluate(e=>getComputedStyle(e).animationName),'none');await page.keyboard.press('Escape');
 const failure=await browser.newPage({viewport:{width:834,height:1194}});let failureWrites=0;
 await failure.route('**/api/**',r=>{if(r.request().method()==='PUT')failureWrites++;return r.fulfill({json:{configured:true,signedIn:true,login:'fixture',csrf:'test'}});});
 await failure.route('**/shared/book/scene.js*',r=>r.abort());await failure.goto(process.argv[2]||'http://127.0.0.1:5175/');await failure.locator('#title').fill('Retained on preview failure');await failure.locator('#add-text').click();await failure.locator('.tiptap').fill('Unsaved text survives unavailable preview.');
 await failure.locator('#preview').click();await failure.locator('#toast').filter({hasText:'Preview could not load'}).waitFor();assert.equal(await failure.locator('.tiptap').isVisible(),true);assert.match(await failure.locator('.tiptap').textContent(),/survives/);
 await failure.evaluate(()=>document.fonts.load=()=>Promise.reject(Error('Fixture font failure')));await failure.locator('#title').fill('Fonts must pass');await failure.locator('#fit-status').filter({hasText:'fonts are unavailable'}).waitFor();await failure.getByRole('button',{name:'Publication',exact:true}).click();failure.on('dialog',d=>d.accept());await failure.locator('#github-publish').click();await failure.waitForTimeout(200);assert.equal(failureWrites,0);await failure.screenshot({animations:'disabled',path:'test-results/studio-font-error.png'});
 await failure.evaluate(async()=>{const {load,save}=await import('/src/storage.js');const b=await load();b.posts[0].version=1;await save(b);});await failure.reload();await failure.locator('#recovery-export').waitFor();
 for(const [width,height] of [[1440,900],[1280,800],[1024,1366],[1366,1024],[834,1194],[1194,834],[756,876],[390,844],[320,568]]){await failure.setViewportSize({width,height});await failure.waitForTimeout(80);await failure.screenshot({animations:'disabled',path:`test-results/studio-recovery-${width}.png`});}
 await failure.close();
 for(const factor of [2,4]){
  // Effective viewport/DPR equivalent; this is desktop zoom simulation, not Safari acceptance.
  const zoom=await browser.newPage({viewport:{width:1440/factor,height:900/factor},deviceScaleFactor:factor});await zoom.goto(process.argv[2]||'http://127.0.0.1:5175/');await zoom.waitForSelector('#title');await zoom.getByRole('button',{name:'Account & tools',exact:true}).click();await zoom.getByRole('button',{name:'Help',exact:true}).click();await zoom.screenshot({animations:'disabled',path:`test-results/studio-zoom-${factor*100}.png`});await zoom.getByRole('button',{name:'Got it',exact:true}).click();await zoom.getByRole('button',{name:'Entries',exact:true}).click();await zoom.screenshot({animations:'disabled',path:`test-results/studio-entries-zoom-${factor*100}.png`});await zoom.keyboard.press('Escape');assert.ok(await zoom.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await zoom.close();
 }
 // Serve the actual production artifact: development capacity controls must be absent.
 const root=path.resolve('dist'),server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep))throw Error();const body=await fs.readFile(file);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.woff2':'font/woff2','.png':'image/png'}[path.extname(file)]||'application/octet-stream'));res.end(body);}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const production=await browser.newPage();await production.goto(`http://127.0.0.1:${server.address().port}/`);await production.waitForSelector('#title');assert.equal(await production.locator('#stress').count(),0);await production.close();}finally{await new Promise(r=>server.close(r));}
 assert.deepEqual(errors,[]);console.log('PASS studio readiness, fresh publication gate, nine widths, 44px handles, truthful disclosures, mounted editors, preview focus/selection/scroll, content and undo invariance, dev tools and reduced motion.');
}finally{await browser.close();}
