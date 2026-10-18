import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
async function fixture(page){
 await page.goto('http://127.0.0.1:5175/prototypes/diary.html');
 return page.evaluate(async()=>{
  await import('/shared/notebook.css');
  const {blankPost,uid,textDoc}=await import('/src/model.js');
  const {renderNotebook,measureNotebook}=await import('/shared/notebook-renderer.js');
  const {renderComposition}=await import('/shared/renderer.js');
  const p=blankPost();p.title='Handwriting test';p.pages[0].elements=[{id:uid(),type:'text',x:10,y:20,w:340,h:150,rotation:0,doc:textDoc('A quiet afternoon, déjà vu. Ångström.'),font:'handwriting',fontSize:32,fixedHeight:true}];
  const root=document.createElement('div');root.innerHTML=`<div class="notebook-page">${renderNotebook(p)}</div><div class="notebook-stage"><div class="object" data-font="handwriting" style="--text-size:32px;width:340px"><div class="ProseMirror"><p>A quiet afternoon, déjà vu. Ångström.</p></div></div></div>${renderComposition(p)}`;document.body.append(root);
  const failures=await measureNotebook(p,root);
  const canonical=getComputedStyle(root.querySelector('.notebook-text')),editor=getComputedStyle(root.querySelector('.ProseMirror')),flow=getComputedStyle(root.querySelector('.public-text'));
  const parity=['fontFamily','fontSize','lineHeight'].map(key=>[canonical[key],editor[key],flow[key]]);
  const faces=[...document.fonts].filter(face=>face.family==='Caveat'&&face.status==='loaded').length;
  const sample=root.querySelector('.notebook-text p');sample.innerHTML='<strong>Bold handwriting</strong> <em>Italic handwriting</em>';
  await document.fonts.load('700 32px Caveat');
  const formatting={bold:getComputedStyle(sample.querySelector('strong')).fontWeight,italic:getComputedStyle(sample.querySelector('em')).fontStyle,synthesis:getComputedStyle(sample).fontSynthesis};
  p.pages[0].elements[0].h=20;root.querySelector('.notebook-page').innerHTML=renderNotebook(p);const overflow=await measureNotebook(p,root);
  delete p.pages[0].elements[0].font;delete p.pages[0].elements[0].fontSize;delete p.pages[0].elements[0].fixedHeight;root.querySelector('.notebook-page').innerHTML=renderNotebook(p);
  const legacy=getComputedStyle(root.querySelector('.notebook-text'));
  const legacyMetrics={family:legacy.fontFamily,size:legacy.fontSize,line:legacy.lineHeight};
  Object.assign(p.pages[0].elements[0],{font:'handwriting',fontSize:32,fixedHeight:true,h:150});root.querySelector('.notebook-page').innerHTML=renderNotebook(p);
  return {failures,parity,faces,formatting,overflow,id:p.pages[0].elements[0].id,legacy:legacyMetrics,fontReady:document.fonts.check('32px Caveat')};
 });
}
try{
 const page=await browser.newPage();const result=await fixture(page);
 assert.deepEqual(result.failures,[]);assert.ok(result.faces>0&&result.fontReady);
 for(const row of result.parity)assert.equal(new Set(row).size,1);
 assert.ok(result.parity[0][0].includes('Caveat'));assert.equal(result.parity[1][0],'32px');
 assert.equal(result.formatting.bold,'700');assert.equal(result.formatting.italic,'italic');assert.equal(result.formatting.synthesis,'weight style');
 assert.ok(!result.overflow.includes(result.id),'spilled fixed-height text never fails fit');assert.ok(result.legacy.family.startsWith('Georgia'));assert.equal(result.legacy.size,'28px');assert.equal(result.legacy.line,'38px');
 await page.screenshot({path:'test-results/text-fonts.png',fullPage:true});
 const failed=await browser.newPage();await failed.route('**/Caveat-*.woff2',route=>route.abort());
 await assert.rejects(fixture(failed),/Handwriting font unavailable|NetworkError/);
 console.log('PASS self-hosted handwriting loads; editor/canonical/reading parity, legacy metrics, fixed-height spill passes fit and font failure');
}finally{await browser.close();}
