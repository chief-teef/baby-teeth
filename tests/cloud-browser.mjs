import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage({viewport:{width:1200,height:900}});
const calls=[];let stored,conflict=false;
try{
  await page.route('**/api/**',async route=>{
    const req=route.request(),u=new URL(req.url());let result={};
    if(u.pathname==='/api/session')result={configured:true,signedIn:true,login:'chief-teef',csrf:'test-csrf'};
    else if(u.pathname==='/api/posts')result={posts:stored?[{id:stored.id,title:stored.title,status:stored.status}]:[]};
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
  await page.goto('http://localhost:5173/');
  await page.getByRole('button',{name:'+ Text box',exact:true}).click();
  await page.locator('.tiptap').fill('A draft to keep across devices.');
  await page.getByRole('button',{name:'Save draft online',exact:true}).click();
  await page.getByText('Draft saved to GitHub',{exact:true}).waitFor();
  assert.equal(calls[0].action,'save');assert.equal(calls[0].baseRevision,null);
  page.on('dialog',d=>d.accept());
  await page.getByRole('button',{name:'Publish entry',exact:true}).click();
  await page.getByText('Live · this revision is published',{exact:true}).waitFor();
  assert.equal(calls[1].action,'publish');assert.equal(calls[1].baseRevision,'1'.repeat(40));
  await page.locator('.tiptap').fill('An updated public entry.');
  await page.getByRole('button',{name:'Save & update site',exact:true}).click();
  await page.getByText('Live · this revision is published',{exact:true}).waitFor();
  assert.equal(calls[2].action,'save');
  conflict=true;await page.locator('.tiptap').fill('Local work that must not be overwritten.');
  await page.getByRole('button',{name:'Save & update site',exact:true}).click();
  await page.getByRole('button',{name:'Keep as a new copy',exact:true}).waitFor();
  assert.match(await page.locator('.tiptap').textContent(),/must not be overwritten/);
  await page.getByRole('button',{name:'Manage entries',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:/Untitled entry/}).click();
  await page.getByText('Online entry opened. Your previous local version is kept as a recovery copy.',{exact:true}).waitFor();
  assert.equal(await page.locator('.entry').count(),2);
  assert.match(await page.locator('.tiptap').textContent(),/updated public entry/);
  await page.getByRole('button',{name:'Manage entries',exact:true}).click();
  await page.getByRole('button',{name:'Move to trash',exact:true}).click();
  await page.getByRole('button',{name:'Trash',exact:true}).click();
  await page.getByRole('button',{name:'Restore as draft',exact:true}).waitFor();
  assert.equal(await page.getByRole('dialog').getByRole('button',{name:/Untitled entry/}).isEnabled(),false);
  await page.getByRole('button',{name:'Restore as draft',exact:true}).click();
  await page.getByText('Trash is empty.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Entries',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:/Untitled entry.*draft/}).waitFor();
  console.log('PASS: draft save, publish, live status, auto-update, conflict retention, and opening online entries without losing local work.');
}finally{await browser.close();}
