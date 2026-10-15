import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {serveBuild} from './static-server.mjs';
fs.mkdirSync('test-results',{recursive:true});
const site=await serveBuild(),browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('requestfailed',r=>console.log('FAILED',r.url(),r.failure()));
try{
 await page.goto(site.url);await page.waitForFunction(()=>window.bookScene);assert.equal(await page.evaluate(()=>bookScene.controller.state),'closed');await page.screenshot({path:'test-results/book-closed.png'});
 await page.getByRole('button',{name:'Open book',exact:true}).last().click();await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>bookScene.controller.state),'open-idle');await page.screenshot({path:'test-results/book-open.png'});
 await page.locator('.book-rail').getByRole('button',{name:'Zoom in',exact:true}).click();await page.waitForTimeout(500);await page.screenshot({path:'test-results/book-focus.png'});
 for(const [width,height] of [[1280,800],[1024,1366],[1366,1024],[834,1194],[1194,834],[390,844],[360,800],[320,568]]){await page.setViewportSize({width,height});await page.waitForTimeout(50);const rail=await page.locator('.book-rail').boundingBox();assert.ok(rail.x>=0&&rail.y>=0&&rail.x+rail.width<=width+1&&rail.y+rail.height<=height+1);assert.equal(await page.evaluate(()=>bookScene.controller.current.id),'00000006-1111-4111-8111-111111111111');if(width===390)await page.screenshot({path:'test-results/book-phone.png'});}
 await page.getByRole('link',{name:'Reading mode'}).click();assert.ok(await page.locator('.reading-fallback .public-photo').count());assert.equal(await page.locator('.book-scene').count(),0);
 const nojs=await browser.newContext({javaScriptEnabled:false});const fallback=await nojs.newPage();await fallback.goto(site.url);assert.ok(await fallback.locator('.reader-entry').first().isVisible());await nojs.close();
 assert.deepEqual(errors,[]);console.log('PASS closed/open/focused book, nine viewports, reachable controls, canonical fixture content in reading mode and no-JS fallback. Desktop Chromium only.');
}finally{await browser.close();await site.close();}
