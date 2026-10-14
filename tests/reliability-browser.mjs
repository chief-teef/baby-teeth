import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage({acceptDownloads:true});
let signedIn=true,uploadFailure=true,saveFailure=false,deployed=false,checks=0,uploads=0,saves=0;
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname;let data;
    if(path==='/api/session')data={configured:true,signedIn,csrf:'test',login:'owner'};
    if(path==='/api/assets'){
      uploads++;
      if(uploadFailure){uploadFailure=false;return route.fulfill({status:503,json:{error:'Upload interrupted.'}});}
      data={path:`media/${'a'.repeat(40)}.jpg`,receipt:'test-receipt'};
    }
    if(path.startsWith('/api/posts/')){
      saves++;
      if(saveFailure){signedIn=false;return route.fulfill({status:401,json:{error:'Sign-in expired.'}});}
      data={post:{...route.request().postDataJSON().post,status:'published'},revision:'b'.repeat(40),commit:'c'.repeat(40),publishing:true};
    }
    if(path==='/api/deployment'){checks++;data={status:deployed?'completed':'in_progress',conclusion:deployed?'success':null};}
    await route.fulfill({json:data||{}});
  });
  await page.goto('http://localhost:5173/');
  await page.getByRole('button',{name:'+ Text box',exact:true}).click();
  await page.locator('.tiptap').evaluate(el=>{
    el.focus();const data=new DataTransfer();
    data.setData('text/html','<b id="docs-internal-guid-test"><h2>My heading</h2><p><span style="font-weight:700">Bold memory</span> <span style="font-style:italic">soft words</span> <a href="https://example.com/">a link</a></p><ul><li>First item</li></ul><ol><li>Ordered item</li></ol></b>');
    data.setData('text/plain','My heading Bold memory soft words a link First item Ordered item');
    el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data}));
  });
  await page.locator('.tiptap h2').waitFor();
  for(const selector of ['strong','em','a[href="https://example.com/"]','ul li','ol li'])assert.ok(await page.locator(`.tiptap ${selector}`).count(),selector);
  await page.waitForFunction(()=>document.querySelector('#status').textContent==='Saved on this device');
  // Add media and ink through the same persisted document format as real input.
  await page.evaluate(async()=>{
    const {load,save}=await import('/src/storage.js');const {uid}=await import('/src/model.js');const book=await load();
    const canvas=document.createElement('canvas');canvas.width=40;canvas.height=30;canvas.getContext('2d').fillRect(0,0,40,30);
    book.posts[0].elements.push({id:uid(),type:'photo',src:canvas.toDataURL('image/jpeg'),alt:'Backup photo',x:10,y:300,w:200,h:150,rotation:4},{id:uid(),type:'drawing',x:10,y:500,w:100,h:100,sourceW:100,sourceH:100,rotation:0,strokes:[{color:'#ff00aa',size:4,points:[[10,10],[50,50]]}]});
    await save(book);
  });
  await page.reload();await page.locator('.object.photo').waitFor();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export backup ↓',exact:true}).click();
  const download=await downloadPromise;const backup=JSON.parse(await fs.readFile(await download.path(),'utf8'));
  assert.equal(backup.posts[0].elements.length,3);
  const original=structuredClone(backup.posts[0].elements);
  await page.locator('#archive').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
  await page.getByText('Archive imported as additional entries. Existing entries are preserved.',{exact:true}).waitFor();
  assert.equal(await page.locator('.entry').count(),2);
  await page.waitForFunction(()=>document.querySelector('#status').textContent==='Saved on this device');
  const restored=await page.evaluate(async()=>{const {load}=await import('/src/storage.js');return (await load()).posts.at(-1).elements;});
  assert.deepEqual(restored,original,'backup restores text, original photo data, ink, and transforms');
  await page.getByRole('button',{name:'Save draft online',exact:true}).click();
  await page.getByText(/Upload interrupted/).waitFor();assert.equal(saves,0);
  await page.reload();await page.locator('.object.photo').waitFor();
  saveFailure=true;
  await page.getByRole('button',{name:'Save draft online',exact:true}).click();
  await page.getByText(/Sign-in expired. Your local work is safe/).waitFor();
  assert.equal(await page.locator('.object.photo').count(),1);assert.equal(await page.locator('.object.drawing').count(),1);
  signedIn=true;saveFailure=false;
  await page.reload();await page.getByRole('button',{name:'Save draft online',exact:true}).click();
  await page.getByText('Saved to GitHub · publishing…',{exact:true}).waitFor();
  assert.equal(uploads,2,'staged photo receipt survives reload and expired login without another upload');
  const before=checks;deployed=true;await page.reload();
  await page.waitForFunction(async()=>{const {load}=await import('/src/storage.js');return (await load()).posts.some(p=>p.cloud?.deployment==='success'&&!p.cloud.publishing);});
  assert.ok(checks>before,'publication checks resume after reopening');
  assert.deepEqual(errors,[]);
  console.log('PASS: Docs-style paste, photo/ink backup roundtrip, interrupted upload, expired login, receipt recovery, resumed publication after reload.');
}finally{await browser.close();}
