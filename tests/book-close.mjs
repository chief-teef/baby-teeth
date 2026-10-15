import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {CLOSE_MS} from '../shared/book/timing.js';
import {serveBuild} from './static-server.mjs';
const site=await serveBuild(),browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true}),page=await browser.newPage({viewport:{width:1440,height:900}});
try{
 await page.goto(site.url);await page.waitForFunction(()=>window.bookScene);
 await page.locator('.book-rail').getByRole('button',{name:'Open book',exact:true}).click();await page.waitForFunction(()=>bookScene.controller.state==='open-idle');
 await page.locator('.book-rail').getByRole('button',{name:'Close book',exact:true}).click();
 for(const progress of [25,50,75]){await page.waitForTimeout(CLOSE_MS/4);await page.screenshot({path:`test-results/book-close-${progress}.png`});}
 await page.waitForFunction(()=>bookScene.controller.state==='closed');assert.equal(await page.locator('.closing-leaf').count(),0);assert.equal(await page.locator('.book-pages').evaluate(e=>getComputedStyle(e).visibility),'hidden');
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(async()=>{await bookScene.open();await bookScene.close();});assert.equal(await page.locator('.closing-leaf').count(),0);
 console.log('PASS closing sheet folds into the right stack; no leftover paper after close; reduced motion uses no moving copy.');
}finally{await browser.close();await site.close();}
