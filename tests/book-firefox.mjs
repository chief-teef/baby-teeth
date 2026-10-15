import {firefox} from '@playwright/test';
import assert from 'node:assert/strict';
import {serveBuild} from './static-server.mjs';
const site=await serveBuild(),browser=await firefox.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(site.url);await page.waitForFunction(()=>window.bookScene);await page.locator('.book-rail').getByRole('button',{name:'Open book'}).click();await page.waitForFunction(()=>bookScene.controller.state==='open-idle');await page.locator('.book-rail').getByRole('button',{name:'Older pages',exact:true}).click();await page.waitForFunction(()=>bookScene.controller.state==='open-idle'&&bookScene.controller.index<5);await page.screenshot({path:'test-results/book-firefox.png'});
 await page.locator('.book-rail').getByRole('button',{name:'Zoom in'}).click();await page.waitForFunction(()=>bookScene.controller.state==='open-idle');assert.equal(await page.evaluate(()=>bookScene.controller.camera),'focus');await page.locator('.book-rail').getByRole('button',{name:'Close book'}).click();await page.waitForFunction(()=>bookScene.controller.state==='closed');assert.deepEqual(errors,[]);console.log('PASS desktop Firefox: cover, physical turn, focus, close, no browser exceptions.');
}finally{await browser.close();await site.close();}
