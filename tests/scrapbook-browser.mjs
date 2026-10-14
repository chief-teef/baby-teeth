import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
 const page=await browser.newPage({reducedMotion:'reduce',viewport:{width:390,height:844}});
 await page.goto('http://127.0.0.1:5173/');
 await page.evaluate(async()=>{const {mountScrapbook}=await import('/shared/scrapbook.js');const root=document.createElement('section');root.id='fixture';root.innerHTML='<article class="reader-entry">Oldest</article><article class="reader-entry">Middle</article><article class="reader-entry">Newest</article>';document.body.replaceChildren(root);mountScrapbook(root);});
 const root=page.locator('#fixture');
 assert.equal(await root.locator('.reader-entry:visible').textContent(),'Newest');
 assert.equal(await root.getByRole('button',{name:'Last',exact:true}).isEnabled(),false);
 await root.getByRole('button',{name:'Previous',exact:true}).click();assert.equal(await root.locator('.reader-entry:visible').textContent(),'Middle');
 await root.getByRole('button',{name:'First',exact:true}).click();assert.equal(await root.locator('.reader-entry:visible').textContent(),'Oldest');
 assert.equal(await root.getByRole('button',{name:'Previous',exact:true}).isEnabled(),false);
 await root.getByRole('button',{name:'Next',exact:true}).click();assert.equal(await root.getByRole('status').textContent(),'Page 2 of 3');
 await root.getByRole('button',{name:'Last',exact:true}).click();assert.equal(await root.locator('.reader-entry:visible').textContent(),'Newest');
 assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
 for(const count of [0,1]){await page.evaluate(async count=>{const {mountScrapbook}=await import('/shared/scrapbook.js');const root=document.querySelector('#fixture');root.replaceChildren();if(count){const article=document.createElement('article');article.className='reader-entry';root.append(article);}mountScrapbook(root);},count);assert.equal(await root.locator('nav').count(),count);if(count)assert.equal(await root.locator('button:disabled').count(),4);}
 console.log('PASS: newest first, previous/next, first/last, boundaries, reduced motion, empty and single scrapbook.');
}finally{await browser.close();}
