import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage();
try{
 for(const [width,height] of [[1440,900],[834,1194],[390,844],[320,568]]){
  await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:5175/prototypes/diary.html');await page.waitForFunction(()=>window.bookScene);await page.evaluate(()=>bookScene.open());await page.waitForFunction(()=>bookScene.controller.state==='open-idle');await page.locator('.book-rail').getByRole('button',{name:'Zoom out',exact:true}).click();await page.waitForFunction(()=>bookScene.controller.camera==='overview');
  const player=page.locator('.desk-mp3'),screen=player.locator('.mp3-screen');if(width<768)await player.locator('.mp3-handle').click();
  for(const [kind,names] of [['Artists',['brakence','glaive','Remi Wolf']],['Songs',['crystallized','Crooked Elbow','Dramatic Girl (feat. Che Ecru)']]]){
   await player.getByRole('button',{name:kind,exact:true}).click();assert.equal(await player.locator('li').count(),3);assert.deepEqual(await player.locator('.mp3-title').allTextContents(),names);assert.equal(await player.locator('li a').count(),3);assert.equal(await player.locator('li img').count(),3);
   const bounds=await screen.evaluate(e=>({scroll:e.scrollHeight,client:e.clientHeight,width:e.scrollWidth,clientWidth:e.clientWidth}));assert.ok(bounds.scroll<=bounds.client,JSON.stringify({width,kind,bounds}));assert.ok(bounds.width<=bounds.clientWidth);
   const gap=await screen.evaluate(e=>{const outer=e.getBoundingClientRect(),badge=e.querySelector('.spotify-attribution').getBoundingClientRect();return outer.bottom-badge.bottom-parseFloat(getComputedStyle(e).borderBottomWidth);});assert.ok(gap>=4&&gap<=6,'Attribution hugs the LCD bottom');
   for(const img of await player.locator('li img').all())await img.evaluate(e=>e.decode());
   await page.screenshot({path:`test-results/mp3-${width}-${kind}.png`});
  }
 }
 console.log('PASS supplied Spotify titles/artwork/links and three rows without scrolling at four viewports.');
}finally{await browser.close();}
