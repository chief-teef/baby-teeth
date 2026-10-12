import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('dist-blog');
const server=createServer((req,res)=>{const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/baby-teeth\//,'');let file=path.resolve(root,relative||'index.html');if(!file.startsWith(root+path.sep)){res.writeHead(404);return res.end();}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.existsSync(file)){res.writeHead(404);return res.end('Missing');}const type={'.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.html':'text/html','.xml':'application/xml','.json':'application/json'}[path.extname(file)]||'text/plain';res.writeHead(200,{'Content-Type':type});fs.createReadStream(file).pipe(res);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true}),page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(`http://127.0.0.1:${server.address().port}/baby-teeth/`);await page.waitForSelector('[data-canvas]');
  assert.equal(await page.locator('.reader-entry').count(),5);
  assert.equal(await page.locator('.public-canvas.desktop').count(),0);
  assert.equal(await page.locator('.public-text').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)),21);
  for(const image of await page.locator('.public-photo img').all()){await image.scrollIntoViewIfNeeded();await image.evaluate(e=>e.decode());assert.ok(await image.evaluate(e=>e.naturalWidth>0));}
  await page.evaluate(()=>window.scrollTo(0,0));
  assert.ok(!await page.getByText('DRAFT_TITLE_SECRET').count());
  await page.screenshot({path:'test-results/public-phone.png',fullPage:false});
  await page.setViewportSize({width:1280,height:960});await page.waitForFunction(()=>document.querySelectorAll('.public-canvas.desktop').length===5);
  await page.screenshot({path:'test-results/public-desktop.png',fullPage:false});
  const bad=await page.goto(`http://127.0.0.1:${server.address().port}/baby-teeth/posts/00000007-1111-4111-8111-111111111111/`);assert.equal(bad.status(),404);
  assert.deepEqual(errors,[]);console.log('PASS: public reader phone reflow, desktop collage, readable fonts, image decoding, and no draft route.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
