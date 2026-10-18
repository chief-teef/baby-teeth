import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.NOTEBOOK_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true}),url=process.env.STUDIO_URL||'http://127.0.0.1:5175/';
const runs=page=>page.evaluate(()=>[...document.querySelectorAll('#stage .object.text')].at(-1).querySelector('.ProseMirror').innerText);
const sizes=locator=>locator.evaluate(el=>[...el.querySelectorAll('span[style]')].map(span=>parseFloat(getComputedStyle(span).fontSize)));
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.locator('#add-text').click();const editor=page.locator('#stage .ProseMirror').last(),size=page.getByLabel('Preferred font size',{exact:true});
 // Size across a hard break: no "Invalid formatting." and the size holds after the next edit.
 await editor.pressSequentially('Line one');await editor.press('Shift+Enter');await editor.pressSequentially('Line two');await editor.press('Control+a');await size.fill('60');await size.press('Tab');
 assert.ok(await page.locator('#toast').evaluate(t=>t.classList.contains('hidden')||!/Invalid formatting/.test(t.textContent)),'no invalid formatting toast');
 await editor.click();await editor.press('Control+End');await editor.pressSequentially('!');await page.waitForTimeout(150);assert.ok((await sizes(editor)).every(n=>n===60),JSON.stringify(await sizes(editor)));assert.equal(await runs(page),'Line one\nLine two!');
 // Mixed selection shows the largest size; ArrowUp moves every run to largest + 1.
 await editor.press('Control+Home');await editor.press('Shift+End');await size.fill('40');await size.press('Tab');await editor.click();await editor.press('Control+a');
 assert.equal(await size.inputValue(),'60');assert.equal(await size.getAttribute('data-mixed'),'true');
 await size.focus();await size.press('ArrowUp');await size.press('Tab');assert.ok((await sizes(editor)).every(n=>n===61),JSON.stringify(await sizes(editor)));
 // −/+ change by 1px, each one undo entry, keeping the selection.
 const plus=page.getByRole('button',{name:'Increase text size',exact:true}),minus=page.getByRole('button',{name:'Decrease text size',exact:true});
 assert.ok((await plus.boundingBox()).width>=44&&(await minus.boundingBox()).height>=44,'44px targets');
 await plus.click();await plus.click();assert.ok((await sizes(editor)).every(n=>n===63));assert.equal(await size.inputValue(),'63');
 await page.locator('#undo').click();assert.ok((await sizes(page.locator('#stage .ProseMirror').last())).every(n=>n===62),'one undo per click');
 await page.locator('#stage .ProseMirror').last().click();await page.locator('#stage .ProseMirror').last().press('Control+a');await minus.click();assert.ok((await sizes(page.locator('#stage .ProseMirror').last())).every(n=>n===61));
 // A pending caret size survives a click back into the text and applies to typing.
 await page.locator('#add-text').click();const pending=page.locator('#stage .ProseMirror').last();await pending.pressSequentially('abc');await size.fill('90');await size.press('Tab');
 await pending.click({position:{x:17,y:30}});await pending.pressSequentially('Z');await page.waitForTimeout(100);
 assert.equal(await pending.evaluate(el=>{const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node,size;while((node=walker.nextNode()))if(node.textContent.includes('Z'))size=getComputedStyle(node.parentElement).fontSize;return size;}),'90px','pending size applies after a click');
 // Inspector label.
 await page.locator('#properties-toggle').click();assert.equal(await page.getByRole('spinbutton',{name:'Text size of selected object'}).count(),1);assert.equal(await page.getByText('Maximum text size').count(),0);await page.getByRole('button',{name:'Close properties',exact:true}).click();
 assert.deepEqual(errors,[]);await page.close();
 // Pinned bars in a multi-page entry: both on desktop, only the formatting row below 1000px.
 for(const [width,height,both] of [[1440,900,true],[768,1024,false]]){
  const pinned=await browser.newPage({viewport:{width,height}});await pinned.goto(url);await pinned.waitForSelector('#add-text');
  await pinned.evaluate(async()=>{const {blankBook,uid,textDoc}=await import('/src/model.js'),{save}=await import('/src/storage.js');const b=blankBook();b.posts[0].title='Pinned toolbars';b.posts[0].pages=[0,1,2].map(i=>({id:uid(),elements:[{id:uid(),type:'text',x:60,y:60,w:400,h:140,rotation:0,font:'serif',fontSize:32,fixedHeight:true,doc:textDoc(`Page ${i+1}`)}]}));await save(b);});
  await pinned.reload();await pinned.waitForSelector('.paper-page[data-page-index="2"]');await pinned.locator('#stage .ProseMirror').last().scrollIntoViewIfNeeded();await pinned.locator('#stage .ProseMirror').last().click();await pinned.locator('#stage .ProseMirror').last().press('Control+a');await pinned.evaluate(()=>window.scrollTo(0,document.scrollingElement.scrollHeight));await pinned.waitForTimeout(200);
  const layout=await pinned.evaluate(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect(),bold=document.querySelector('[data-action="bold"]').getBoundingClientRect(),hit=document.elementFromPoint(bold.x+bold.width/2,bold.y+bold.height/2);return {scrolled:scrollY,top:rect('.top').bottom,toolbar:[rect('.main>.toolbar').top,rect('.main>.toolbar').bottom],context:[rect('.main>.context-row').top,rect('.main>.context-row').bottom],boldHit:!!hit?.closest('[data-action="bold"]'),addHit:document.elementFromPoint(rect('#add-text').x+5,rect('#add-text').y+5)?.closest('#add-text')!==null};});
  assert.ok(layout.scrolled>1000,JSON.stringify(layout));assert.ok(layout.boldHit,'formatting bar is on screen and clickable '+JSON.stringify(layout));
  if(both){assert.ok(Math.abs(layout.toolbar[0]-layout.top)<1&&Math.abs(layout.context[0]-layout.toolbar[1])<1,'bars stack under .top '+JSON.stringify(layout));assert.ok(layout.addHit,'main toolbar clickable');}
  else{assert.ok(layout.toolbar[1]<0,'main toolbar scrolls away');assert.ok(Math.abs(layout.context[0]-layout.top)<1,'formatting row pinned under .top '+JSON.stringify(layout));}
  await pinned.getByRole('button',{name:'Bold',exact:true}).click();assert.equal(await pinned.locator('#stage .ProseMirror').last().locator('strong').count(),1);
  // Focus is never hidden: keyboard focus on the page-1 text scrolls it below the pinned bars.
  await pinned.locator('#stage .ProseMirror').first().focus();await pinned.waitForTimeout(200);const focusTop=await pinned.evaluate(()=>[document.activeElement.getBoundingClientRect().top,document.querySelector('.main>.context-row').getBoundingClientRect().bottom]);assert.ok(focusTop[0]>=focusTop[1]-1,'focused text clears the pinned bars '+JSON.stringify(focusTop));
  await pinned.evaluate(()=>window.scrollTo(0,document.scrollingElement.scrollHeight/2));await pinned.waitForTimeout(150);await pinned.screenshot({path:`test-results/pinned-toolbars-${width}.png`});await pinned.close();
 }
 console.log('PASS size across hard breaks, largest mixed size, ArrowUp, −/+ undo steps, pending caret size, Text size label, pinned bars at 1440 and 768.');
}finally{await browser.close();}
