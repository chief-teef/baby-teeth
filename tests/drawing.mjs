import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true}),page=await browser.newPage({viewport:{width:834,height:1194},acceptDownloads:true}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.argv[2]||'http://127.0.0.1:5175/');await page.waitForSelector('#add-text');
 const original=await page.evaluate(async()=>{const {blankBook,uid}=await import('/src/model.js');const {save}=await import('/src/storage.js');const b=blankBook();b.posts[0].title='Legacy drawing retained';const ink={id:uid(),type:'drawing',x:40,y:100,w:220,h:120,rotation:7,sourceW:220,sourceH:120,strokes:[{color:'#203524',size:5,points:[[10,10],[50,70],[150,40]]}]};b.posts[0].pages[0].elements.push(ink);await save(b);return ink;});
 await page.reload();await page.waitForSelector('.object.drawing');assert.equal(await page.getByRole('button',{name:'Draw',exact:true}).count(),0);assert.equal(await page.locator('#drawing-surface,#tooth-stamp,#eraser').count(),0);
 await page.locator('.object.drawing').click();await page.reload();await page.waitForSelector('.object.drawing');
 assert.deepEqual(await page.evaluate(async()=>{const {load}=await import('/src/storage.js');return (await load()).posts[0].pages[0].elements[0];}),original);
 await page.locator('#preview').click();await page.waitForSelector('.notebook-drawing');assert.equal(await page.locator('.notebook-drawing path').count(),1);await page.locator('#preview').click();
 await page.getByRole('button',{name:'Account & tools',exact:true}).click();const download=page.waitForEvent('download');await page.locator('#export').click();const file=await download;await file.saveAs('test-results/legacy-ink-backup.json');const backup=JSON.parse(fs.readFileSync('test-results/legacy-ink-backup.json','utf8'));assert.deepEqual(backup.posts[0].pages[0].elements[0],original);
 await page.locator('#archive').setInputFiles('test-results/legacy-ink-backup.json');await page.waitForTimeout(600);assert.equal(await page.locator('.object.drawing').count(),1);assert.deepEqual(errors,[]);
 console.log('PASS retired pen/stamp controls and unchanged legacy drawing selection, recovery, preview, backup/import.');
}finally{await browser.close();}
