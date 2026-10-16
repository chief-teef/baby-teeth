import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {BookController,spreadFor,orderedEntries} from '../shared/book/controller.js';
import {renderComposition,renderMusic} from '../shared/renderer.js';
import {readFile} from 'node:fs/promises';

const id=index=>`00000000-0000-4000-8000-${String(index).padStart(12,'0')}`;
function fixture(count=6){
 const text=(number,label)=>({id:id(number),type:'text',x:20,y:20,w:700,h:160,rotation:0,font:'handwriting',fontSize:32,fixedHeight:true,doc:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:label}]}]}});
 return [{version:2,pageFormat:'notebook-900x1200-v1',id:id(1),title:'Older one-page entry',created:'2026-10-01T12:00:00Z',publishedAt:'2026-10-01T12:00:00Z',elements:[text(101,'Original page retained.')]},{version:3,pageFormat:'notebook-900x1200-v1',id:id(2),title:'Six-page latest entry',created:'2026-10-15T12:00:00Z',publishedAt:'2026-10-15T12:00:00Z',music:{artists:[{name:'Local fixture artist'}],songs:[]},pages:Array.from({length:count},(_,index)=>({id:id(201+index),elements:[text(301+index,`Latest page ${index+1}. Every page keeps its own text.`)]}))}];
}
const posts=fixture(),controller=new BookController(orderedEntries([...posts].reverse()));
assert.equal(controller.pages.length,7);assert.equal(controller.index,1);assert.equal(controller.page.pageIndex,0);
assert.equal(controller.firstFace(1),1);assert.equal(controller.entryNeighbor(-1),0);
controller.state='open-idle';assert.equal(controller.request(999),6);controller.index=6;assert.equal(controller.entryNeighbor(-1),0);assert.equal(controller.entryNeighbor(1),1);
assert.equal(spreadFor(1),spreadFor(2));
assert.equal(new BookController([]).current,undefined);

const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
await mkdir('test-results',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const origin=process.env.STUDIO_TEST_URL||'http://127.0.0.1:5175',url=new URL('/__desktop_reader_fixture__',origin).href;
 await page.route(url,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="fixture"></div></body></html>'}));
 await page.goto(url);await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(async posts=>{const {mountBook}=await import('/shared/book/scene.js');window.mountBook=mountBook;window.posts=posts;window.scene=mountBook(document.querySelector('#fixture'),posts,{history:true});},posts);
 assert.equal(await page.evaluate(()=>scene.controller.state),'closed');
 await page.locator('.book-rail').getByRole('button',{name:'Open book',exact:true}).click();
 await page.waitForFunction(()=>scene.controller.state==='open-idle');
 assert.deepEqual(await page.evaluate(()=>[scene.controller.index,scene.controller.page.pageIndex]),[1,0]);
 assert.equal(await page.locator('.book-sheet>.notebook-page[data-entry-id]').count(),7);
 assert.equal(await page.locator('[data-entry-id][data-page-index="0"] .notebook-header').count(),2);
 assert.equal(await page.locator('[data-entry-id]:not([data-page-index="0"]) .notebook-header').count(),0);
 assert.equal(await page.locator('.paper-color-trigger').count(),0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.locator('.book-rail').getByRole('button',{name:'Next page',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>[scene.controller.index,scene.controller.state]),[2,'open-idle']);
 assert.equal(await page.locator('.curl-bands').count(),0,'Same spread selects visible face without a fake turn');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.locator('.book-entry-corner.left').click();assert.equal(await page.evaluate(()=>scene.controller.index),0);
 await page.locator('.book-entry-corner.right').click();assert.equal(await page.evaluate(()=>scene.controller.index),1);
 await page.evaluate(()=>scene.navigate(6));assert.equal(await page.evaluate(()=>scene.controller.page.pageIndex),5);
 await page.locator('.book-entry-corner.left').click();assert.equal(await page.evaluate(()=>scene.controller.index),0);
 await page.goBack();await page.waitForFunction(()=>scene.controller.current?.id===posts[1].id);
 assert.equal(await page.evaluate(()=>scene.controller.page.pageIndex),0,'Back enters the first face of the entry');
 await page.goForward();await page.waitForFunction(()=>scene.controller.current?.id===posts[0].id);
 await page.evaluate(()=>{scene.dispose();scene=mountBook(document.querySelector('#fixture'),posts,{initialId:posts[1].id,history:false});});
 assert.equal(await page.evaluate(()=>scene.controller.page.pageIndex),0);
 assert.equal(await page.evaluate(()=>scene.controller.state),'open-idle');
 await page.locator('.book-rail').getByRole('button',{name:'Contents',exact:true}).click();
 assert.equal(await page.locator('.book-contents button').count(),5,'Contents lists entries, not six duplicates');
 await page.getByRole('button',{name:'Close contents',exact:true}).click();
 const colors=await page.locator('.book-sheet>.notebook-page[data-entry-id]').evaluateAll(nodes=>nodes.map(node=>[node.dataset.entryId,node.style.getPropertyValue('--page-color')]));
 assert.equal(new Set(colors.filter(([entry])=>entry===posts[1].id).map(([,color])=>color)).size,1);
 assert.notEqual(colors[0][1],colors[1][1]);
 for(const [width,height] of [[1440,900],[1280,800],[834,1194],[390,844]]){
  await page.setViewportSize({width,height});await page.screenshot({path:`test-results/desktop-reader-${width}.png`});
  const sizes=await page.locator('.book-entry-corner').evaluateAll(nodes=>nodes.map(node=>[node.offsetWidth,node.offsetHeight]));assert.ok(sizes.every(([w,h])=>w>=44&&h>=44));
 }
 await page.evaluate(()=>{scene.dispose();scene=mountBook(document.querySelector('#fixture'),[posts[1]],{preview:true,history:false,entryIndex:3});});
 assert.equal(await page.locator('.book-sheet>.notebook-page[data-entry-id]').first().evaluate(node=>node.style.getPropertyValue('--page-color')),'#DDEBF0');
 const many=fixture(50);await page.evaluate(posts=>{scene.dispose();scene=mountBook(document.querySelector('#fixture'),posts,{history:false,preview:true});},many);
 for(const index of [25,50,1,0,50]){await page.evaluate(index=>scene.navigate(index),index);assert.equal(await page.evaluate(()=>scene.controller.index),index);}
 assert.equal(await page.locator('.book-sheet>.notebook-page[data-entry-id]').count(),51);
 await page.evaluate(()=>{scene.dispose();scene=mountBook(document.querySelector('#fixture'),[],{history:false});});
 await page.locator('.book-rail').getByRole('button',{name:'Open book',exact:true}).click();
 assert.equal(await page.evaluate(()=>scene.controller.current),undefined);assert.equal(await page.locator('.book-sheet').count(),2);
 await page.evaluate(async()=>{scene.dispose();const {renderComposition}=await import('/shared/renderer.js');const {layoutReading}=await import('/shared/reading-layout.js');await import('/blog/src/reader.css');document.body.innerHTML='<article class="reader-entry">'+renderComposition(posts[1])+'</article>';document.querySelectorAll('[data-canvas]').forEach(layoutReading);});
 assert.equal(await page.locator('.reading-page').count(),6);
 assert.match(await page.locator('.reader-entry').innerText(),/Latest page 6/);
 const flow=await page.locator('.public-text').evaluateAll(nodes=>nodes.map(node=>({position:getComputedStyle(node).position,scale:node.style.getPropertyValue('--text-scale')})));
 assert.ok(flow.every(node=>node.position==='static'&&node.scale==='1'));
 await page.screenshot({path:'test-results/desktop-reader-reflow-390.png',fullPage:true});
 const pngSrc='data:image/png;base64,'+(await readFile('public/editor/tooth-stamp.png')).toString('base64');
 await page.evaluate(async src=>{const {createPhotoViewer}=await import('/shared/book/photos.js');const root=document.createElement('div');root.innerHTML='<div class="notebook-photo"><img alt="Transparent tooth"></div>';document.body.append(root);const source=root.querySelector('img');source.src=src;window.photoViewer=createPhotoViewer(root);photoViewer.show(source);},pngSrc);
 assert.equal(await page.locator('.photo-download').getAttribute('download'),'photo.png');
 await page.evaluate(()=>photoViewer.dispose());
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),fallback=await nojs.newPage();
 await fallback.setContent(`<article>${renderComposition(posts[1])+renderMusic(posts[1])}</article>`);
 assert.equal(await fallback.locator('.reading-page').count(),6);assert.match(await fallback.locator('article').innerText(),/Latest page 6/);assert.match(await fallback.locator('.reading-music').innerText(),/Local fixture artist/);
 await nojs.close();
 assert.deepEqual(errors,[]);console.log('PASS mixed v2/six-page latest, same-spread selection, entry navigation/history, palette, boundaries/empty, 50-page navigation and complete flowing reading');
}finally{await browser.close();}
