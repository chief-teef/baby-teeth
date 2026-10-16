import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

const inventory=JSON.parse(await readFile('assets/editor/font-inventory.json','utf8'));
assert.equal(inventory.length,17);
for(const face of inventory){
 const bytes=await readFile(`public/${face.file}`);
 assert.equal(bytes.subarray(0,4).toString(),'wOF2');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),face.sha256);
 assert.ok((await readFile(`public/${face.licenseFile}`,'utf8')).length>1000);
}
const png=await sharp('public/editor/tooth-stamp.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
assert.ok(png.info.channels===4);
assert.ok([...png.data].filter((_,index)=>index%4===3).some(alpha=>alpha===0));
assert.ok([...png.data].filter((_,index)=>index%4===3).some(alpha=>alpha===255));

const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
await mkdir('test-results',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const fixtureUrl=new URL('/__desktop_shell_fixture__',process.env.STUDIO_TEST_URL||'http://127.0.0.1:5175').href;
 await page.route(fixtureUrl,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body></body></html>'}));
 await page.goto(fixtureUrl);
 await page.evaluate(async()=>{
  document.body.className='studio';document.body.innerHTML='<div id="fixture"><header class="top"><span class="brand">bbyteeth</span><span class="status">Recovered on this device</span><button>Account & tools</button></header><div class="layout"><aside class="sidebar"><h2>Entries</h2><button class="entry selected">October scraps<small>Local draft</small></button></aside><main class="main"><div class="workhead"><label class="title-field">Entry title<input class="title" value="October scraps"></label><div class="entry-actions"><span id="cloud-state">Saved on this device</span><button class="primary">Save draft online</button></div></div><div class="toolbar"><button>+ Text</button><button>+ Photos</button></div><div class="context-row"><span id="notice">Your paper, your rules.</span></div><div id="stage" class="workspace notebook-stage"><div class="paper-page" data-page-id="page-1" style="margin:auto;background:#fffaf0;width:600px;height:500px"><div id="paper-sample">Canonical paper</div></div><div class="gap" style="height:80px">Page gap</div></div></main></div></div>';
  const style=document.createElement('style');style.textContent='.layout{display:grid;grid-template-columns:216px 1fr}.top{display:flex;align-items:center}.workhead,.toolbar{display:flex;align-items:center;gap:8px}.workspace{padding:24px}.paper-page{position:relative}.sidebar{display:grid;align-content:start;gap:12px}.top .status{margin-left:auto}@media(max-width:999px){.layout{grid-template-columns:1fr}.sidebar{display:none}.paper-page{max-width:100%}}';document.head.append(style);
  await import('/src/style.css');await import('/src/notebook-studio.css');await import('/src/desktop-shell.css');
  const {mountEditorProps}=await import('/src/editor-props.js');
  window.impressions=[];window.props=mountEditorProps({root:document.querySelector('#fixture'),getEntry:()=>({id:'entry-1'}),getActivePageId:()=> 'page-1',placeStamp:value=>{window.impressions.push(value);return true;}});
 });
 const holder=page.locator('.stamp-pickup');
 await holder.click();assert.equal(await page.evaluate(()=>impressions.length),0);
 await page.locator('.paper-page').click({position:{x:100,y:100}});
 await page.locator('.paper-page').click({position:{x:100,y:100}});
 await page.waitForFunction(()=>impressions.length===2);
 assert.equal(await holder.getAttribute('aria-pressed'),'true');
 await page.locator('.gap').click();assert.equal(await page.evaluate(()=>impressions.length),2);
 await page.getByRole('button',{name:'Place tooth on active page'}).click();
 await page.waitForFunction(()=>impressions.length===3);
 const placed=await page.evaluate(()=>impressions);
 assert.ok(placed.every(stamp=>stamp.src.startsWith('data:image/png;base64,')&&stamp.pageId==='page-1'));
 assert.equal(placed[2].clientX,undefined);
 await page.keyboard.press('Escape');assert.equal(await holder.getAttribute('aria-pressed'),'false');
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.editor-otis img').evaluate(node=>getComputedStyle(node).animationName),'none');
 await page.emulateMedia({reducedMotion:'no-preference'});
 assert.notEqual(await page.locator('.editor-otis img').evaluate(node=>getComputedStyle(node).animationName),'none');
 await page.evaluate(()=>props.setActive(false));assert.ok(await page.locator('.editor-props').isHidden());
 assert.equal(await page.locator('.editor-otis img').evaluate(node=>getComputedStyle(node).animationName),'none');
 await page.evaluate(()=>props.setActive(true));
 for(const [width,height] of [[1440,900],[1280,800],[834,1194],[390,844]]){
  await page.setViewportSize({width,height});
  await page.evaluate(()=>window.scrollTo(0,0));
  assert.ok(await page.getByRole('button',{name:'Tooth stamp',exact:true}).isVisible());
  const dock=await page.locator('.editor-props').boundingBox(),paper=await page.locator('.paper-page').boundingBox();
  assert.ok(dock.y+dock.height<=paper.y,'Props stay above canonical paper');
  assert.ok(dock.x>=0&&dock.x+dock.width<=width,'Props fit viewport');
  await page.screenshot({path:`test-results/desktop-shell-${width}.png`,fullPage:true});
 }
 await page.evaluate(()=>props.dispose());assert.equal(await page.locator('.editor-props,.stamp-cursor').count(),0);
 console.log('PASS font integrity, transparent tooth, repeated/gap/keyboard stamps, Otis motion/disposal, four shell sizes');
}finally{await browser.close();}
