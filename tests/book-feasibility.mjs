import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
fs.mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5174/prototypes/book.html');await page.waitForFunction(()=>window.fixture);
 assert.equal(await page.evaluate(()=>fixture.turn.engine.getOrientation()),'landscape');
 await page.getByRole('button',{name:'Newer pages'}).click();await page.waitForTimeout(800);assert.equal(await page.evaluate(()=>fixture.turn.engine.getCurrentPageIndex()),2);
 await page.screenshot({path:'test-results/feasibility-spread.png'});
 await page.getByRole('button',{name:'Older pages'}).click();await page.waitForTimeout(800);assert.equal(await page.evaluate(()=>fixture.turn.engine.getCurrentPageIndex()),0);
 const box=await page.locator('#pages').boundingBox();await page.mouse.move(box.x+box.width-8,box.y+box.height-8);await page.mouse.down();await page.mouse.move(box.x+box.width*.66,box.y+box.height-35,{steps:12});await page.screenshot({path:'test-results/feasibility-curl.png'});await page.mouse.up();await page.waitForTimeout(800);
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Zoom',exact:true}).click();assert.equal(await page.evaluate(()=>fixture.turn.engine.getOrientation()),'landscape');
 assert.deepEqual(errors,[]);console.log('PASS desktop HTML engine button turns, scaled corner drag, fixed landscape at phone width. Actual iPad remains unverified.');
}finally{await browser.close();}
