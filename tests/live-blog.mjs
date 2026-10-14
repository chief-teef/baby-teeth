import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1100,height:850}});
  await page.goto('https://chief-teef.github.io/baby-teeth/');
  await page.locator('.reader-entry:not([hidden])').waitFor();
  assert.equal(await page.getByRole('button',{name:'+ Text box',exact:true}).count(),0);
  await page.screenshot({path:'test-results/live-public-blog.png'});
  await page.goto('https://baby-teeth-studio.aucourantfilms.workers.dev/');
  await page.getByRole('link',{name:'Sign in with GitHub →'}).waitFor();
  assert.equal(await page.locator('#stage').count(),0);
  await page.screenshot({path:'test-results/live-studio-signin.png'});
  console.log('PASS: live public scrapbook and logged-out studio sign-in screen.');
}finally{await browser.close();}
