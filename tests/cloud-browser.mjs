import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage({viewport:{width:1200,height:900}});
const calls=[];let stored,conflict=false;
try{
  await page.route('**/api/**',async route=>{
    const req=route.request(),u=new URL(req.url());let result={};
    if(u.pathname==='/api/session')result={configured:true,signedIn:true,login:'chief-teef',csrf:'test-csrf'};
    else if(u.pathname==='/api/posts')result={posts:stored?[{id:stored.id,title:stored.title,status:stored.status,updatedAt:'2026-10-16T18:00:00.000Z'}]:[]};
    else if(/\/(trash|restore)$/.test(u.pathname)&&req.method()==='POST'){stored={...stored,status:u.pathname.endsWith('/trash')?'trashed':'draft'};result={post:stored,revision:'c'.repeat(40),publishing:false};}
    else if(u.pathname.startsWith('/api/posts/')&&req.method()==='PUT'){
      assert.equal(req.headers()['x-csrf-token'],'test-csrf');const data=req.postDataJSON();calls.push(data);
      if(conflict)return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'A newer version exists online.'})});
      stored={...data.post,status:data.action==='publish'||stored?.status==='published'?'published':'draft'};
      result={post:stored,revision:String(calls.length).repeat(40),commit:'a'.repeat(40),publishing:stored.status==='published'};
    }else if(u.pathname.startsWith('/api/posts/'))result={post:stored,revision:'b'.repeat(40)};
    else if(u.pathname==='/api/deployment')result={status:'completed',conclusion:'success'};
    await route.fulfill({contentType:'application/json',body:JSON.stringify(result)});
  });
  await page.goto(process.argv[2]||'http://localhost:5173/');
  // Blank titles are valid: whitespace is kept while typing and the date labels the entry.
  await page.getByRole('textbox',{name:'Entry title'}).fill('   ');assert.equal(await page.getByRole('textbox',{name:'Entry title'}).inputValue(),'   ');
  await page.getByRole('button',{name:'+ Text box',exact:true}).click();
  await page.locator('.tiptap').fill('A draft to keep across devices.');
  await page.getByRole('button',{name:'Save draft online',exact:true}).click();
  await page.locator('#cloud-state').filter({hasText:'Online draft saved'}).waitFor();
  assert.equal(calls[0].action,'save');assert.equal(calls[0].baseRevision,null);
  const dialogs=[];page.on('dialog',d=>{dialogs.push(d.message());d.accept();});
  await page.getByRole('button',{name:'Publication',exact:true}).click();await page.getByRole('button',{name:'Publish entry',exact:true}).click();
  await page.locator('#cloud-state').getByText('Live · this revision is published',{exact:true}).waitFor();
  assert.equal(await page.locator('#fit-status').isHidden(),true);assert.equal(await page.locator('.title-error').count(),0);
  assert.equal(await page.locator('.paper-page .notebook-header h2').isHidden(),true);assert.match(await page.locator('.paper-page .notebook-header time').textContent(),/^[a-z]{3} \d{1,2}, \d{4}$/);
  assert.match(await page.locator('.entry span').first().textContent(),/^[a-z]{3} \d{1,2}, \d{4}$/);assert.equal(await page.locator('.entry small').first().textContent(),'Live · this revision is published');
  assert.equal(calls[1].action,'publish');assert.equal(calls[1].baseRevision,'1'.repeat(40));
  await page.locator('.tiptap').fill('An updated public entry.');
  await page.getByRole('button',{name:'Save & update site',exact:true}).click();
  await page.locator('#cloud-state').getByText('Live · this revision is published',{exact:true}).waitFor();
  assert.equal(calls[2].action,'save');
  conflict=true;await page.locator('.tiptap').fill('Local work that must not be overwritten.');
  await page.getByRole('button',{name:'Save & update site',exact:true}).click();
  await page.getByRole('button',{name:'Keep as a new copy',exact:true}).waitFor();
  assert.match(await page.locator('.tiptap').textContent(),/must not be overwritten/);
  await page.getByRole('button',{name:'Manage entries',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'oct 16, 2026 · published',exact:true}).click();
  await page.getByText('Online entry opened. Your previous local version is kept as a recovery copy.',{exact:true}).waitFor();
  assert.equal(await page.locator('.entry').count(),2);
  assert.match(await page.locator('.tiptap').textContent(),/updated public entry/);
  await page.getByRole('button',{name:'Manage entries',exact:true}).click();
  await page.getByRole('button',{name:'Move to trash',exact:true}).click();
  await page.getByRole('button',{name:'Trash',exact:true}).click();
  await page.getByRole('button',{name:'Restore as draft',exact:true}).waitFor();
  assert.ok(dialogs.some(m=>m.startsWith('Move “oct 16, 2026” to trash?')));
  assert.equal(await page.getByRole('dialog').getByRole('button',{name:'oct 16, 2026 · trashed',exact:true}).isEnabled(),false);
  await page.getByRole('button',{name:'Restore as draft',exact:true}).click();
  await page.getByText('Trash is empty.',{exact:true}).waitFor();
  await page.locator('#cms-active').click();
  await page.getByRole('dialog').getByRole('button',{name:'oct 16, 2026 · draft',exact:true}).waitFor();
  console.log('PASS: blank-titled (date-labelled) draft save, publish, live status, auto-update, conflict retention, and opening online entries without losing local work.');
}finally{await browser.close();}
