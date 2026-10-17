import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {randomFillSync} from 'node:crypto';
import sharp from 'sharp';

const pattern=(width,height,channels=3)=>{const pixels=Buffer.alloc(width*height*channels);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*channels,on=(x+y)%2===0;pixels[i]=on?255:0;pixels[i+1]=(x*17+y*29)%256;pixels[i+2]=on?0:255;if(channels===4)pixels[i+3]=(x+y)%3?255:96;}return pixels;};
const svg=(width,height,body)=>sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`)).ensureAlpha().png().toBuffer();
const jpeg=await sharp(pattern(1200,800),{raw:{width:1200,height:800,channels:3}}).jpeg({quality:92}).withMetadata({orientation:6}).toBuffer();
const small=await sharp(pattern(200,100),{raw:{width:200,height:100,channels:3}}).jpeg({quality:92}).toBuffer();
const webp=await sharp(pattern(900,600),{raw:{width:900,height:600,channels:3}}).webp({quality:90}).toBuffer();
const alpha=await sharp(pattern(900,1200,4),{raw:{width:900,height:1200,channels:4}}).png().toBuffer();
const opaque=await sharp(pattern(660,440,4).fill(255),{raw:{width:660,height:440,channels:4}}).png().toBuffer();
// G3 review fixtures: opaque line art/text, hard-edged transparent sticker, soft semi-transparent edge.
const lineArt=await svg(1400,900,`<rect width="1400" height="900" fill="#fffaf0"/>${Array.from({length:40},(_,i)=>`<line x1="${40+i*33}" y1="60" x2="${80+i*31}" y2="840" stroke="#203040" stroke-width="${1+i%3}"/>`).join('')}<text x="80" y="480" font-family="Georgia,serif" font-size="96" fill="#b0306a">Baby Teeth 1600</text><text x="84" y="560" font-family="Georgia,serif" font-size="28" fill="#203040">fine print stays sharp at DPR 2</text>`);
const sticker=await svg(1200,1200,`<path d="M600 80 L720 460 L1120 460 L800 700 L920 1100 L600 860 L280 1100 L400 700 L80 460 L480 460 Z" fill="#ffcc33" stroke="#7a2a00" stroke-width="18"/><text x="430" y="640" font-family="Georgia,serif" font-size="90" fill="#7a2a00">wow</text>`);
const softEdge=await svg(1000,1000,`<defs><radialGradient id="g"><stop offset="0.55" stop-color="#3a7bd5" stop-opacity="1"/><stop offset="1" stop-color="#3a7bd5" stop-opacity="0"/></radialGradient></defs><circle cx="500" cy="500" r="480" fill="url(#g)"/>`);
const wide=await sharp({create:{width:2000,height:1000,channels:4,background:{r:40,g:160,b:90,alpha:.6}}}).png().toBuffer();
const noiseRaw=Buffer.alloc(2400*1800*4);randomFillSync(noiseRaw);const noise=await sharp(noiseRaw,{raw:{width:2400,height:1800,channels:4}}).png({compressionLevel:1}).toBuffer();
const fixture=Object.fromEntries(Object.entries({jpeg,small,webp,alpha,opaque,lineArt,sticker,softEdge,wide,noise}).map(([k,v])=>[k,v.toString('base64')]));
const studio=process.env.STUDIO_URL||'http://127.0.0.1:5175/';
const browser=await chromium.launch({executablePath:process.env.NOTEBOOK_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{const page=await browser.newPage();await page.goto(studio);const result=await page.evaluate(async fixture=>{
  const {PNG_MAX_SIDE,PNG_MAX_BYTES}=await import('/shared/png.js'),{processPhoto}=await import('/src/photo-processing.js'),{jpegForUpload,dataUrl}=await import('/src/cloud.js');
  const file=(base64,name,type)=>new File([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],name,{type});
  const inspect=async input=>{const photo=await processPhoto(input),upload=await jpegForUpload(photo.src),again=await jpegForUpload(photo.src),reload=await dataUrl(upload),reloaded=await jpegForUpload(reload),bitmap=await createImageBitmap(upload),bytes=new Uint8Array(await upload.arrayBuffer()),reloadedBytes=new Uint8Array(await reloaded.arrayBuffer()),dimensions=[bitmap.width,bitmap.height];bitmap.close();return {photo,mime:upload.type,reused:upload===again,dimensions,bytes:[...bytes],reloadedBytes:[...reloadedBytes]};};
  const oriented=await inspect(file(fixture.jpeg,'oriented.jpg','image/jpeg')),low=await inspect(file(fixture.small,'small.jpg','image/jpeg')),converted=await inspect(file(fixture.webp,'detail.webp','image/webp'));
  const png={};for(const name of ['alpha','opaque','lineArt','sticker','softEdge','wide','noise'])png[name]=await inspect(file(fixture[name],`${name}.png`,'image/png'));
  return {pngMaxSide:PNG_MAX_SIDE,pngMaxBytes:PNG_MAX_BYTES,oriented,low,converted,png};
},fixture);
  for(const item of [result.oriented,result.low,result.converted]){assert.equal(item.mime,'image/jpeg');assert.deepEqual(item.bytes,item.reloadedBytes,'upload/reload must preserve durable bytes');assert.ok(item.reused,'upload must reuse the processed durable JPEG');assert.equal(Buffer.from(item.bytes).includes(Buffer.from('Exif')),false);}
  assert.deepEqual(result.oriented.dimensions,[800,1200],'EXIF orientation is applied before sizing');assert.equal(result.oriented.photo.w,330);assert.equal(result.oriented.photo.h,495);assert.deepEqual(result.low.dimensions,[200,100],'small sources are never upscaled');assert.deepEqual(result.converted.dimensions,[900,600]);
  const sources={alpha,opaque,lineArt,sticker,softEdge,wide,noise};
  for(const [name,item] of Object.entries(result.png)){
    const bytes=Buffer.from(item.bytes),meta=await sharp(bytes).metadata();
    assert.equal(item.mime,'image/png',name);assert.ok(Math.max(...item.dimensions)<=result.pngMaxSide&&bytes.length<=result.pngMaxBytes,name);assert.deepEqual(item.bytes,item.reloadedBytes,name);assert.ok(item.reused,name);
    assert.deepEqual(bytes,Buffer.from(item.photo.src.split(',')[1],'base64'),`${name}: upload reuses the single import encode`);assert.equal(meta.channels,4,`${name}: alpha channel kept`);
    const source=await sharp(sources[name]).metadata();if(Math.max(source.width,source.height)<=result.pngMaxSide&&name!=='noise'){
      assert.deepEqual(item.dimensions,[source.width,source.height],`${name}: no resize below the bound`);
      // Same size: alpha must be exact and fully opaque pixels lossless (no matte, no lossy step).
      const [out,src]=await Promise.all([sharp(bytes).raw().toBuffer(),sharp(sources[name]).ensureAlpha().raw().toBuffer()]);let alphaDiff=0,opaqueDiff=0,partial=0;for(let i=0;i<out.length;i+=4){alphaDiff=Math.max(alphaDiff,Math.abs(out[i+3]-src[i+3]));if(src[i+3]>0&&src[i+3]<255)partial++;if(src[i+3]===255)for(let c=0;c<3;c++)opaqueDiff=Math.max(opaqueDiff,Math.abs(out[i+c]-src[i+c]));}
      assert.equal(alphaDiff,0,`${name}: alpha preserved exactly`);assert.equal(opaqueDiff,0,`${name}: opaque pixels lossless`);if(['sticker','softEdge','alpha'].includes(name))assert.ok(partial>0&&out[3]===src[3],`${name}: semi-transparent pixels and transparent corner survive`);
    }
  }
  assert.deepEqual(result.png.wide.dimensions,[1600,800],'larger PNG is capped at 1600px');assert.ok(result.png.noise.dimensions[0]>=660&&result.png.noise.dimensions[0]<1600,'incompressible PNG steps down in dimensions, never format, and keeps the 660px 2x target');
  // Integrated studio: import → local recovery reload → mocked upload/save with 600 MB storage → reopen online from mocked raw media.
  const studioPage=await browser.newPage({viewport:{width:1280,height:900}});let uploaded,saved;
  await studioPage.route('https://raw.githubusercontent.com/**',route=>route.fulfill({contentType:'image/png',body:uploaded}));
  await studioPage.route('**/api/**',async route=>{const request=route.request(),p=new URL(request.url()).pathname;
    if(p==='/api/session')return route.fulfill({json:{configured:true,signedIn:true,login:'fixture',csrf:'fixture',repository:'owner/repo',branch:'main',capabilities:{readVersions:[2,3],writeVersion:3,scrapbookWritesEnabled:true}}});
    if(p==='/api/assets'){uploaded=request.postDataBuffer();return route.fulfill({json:{path:`media/${'a'.repeat(40)}.png`,receipt:'fixture'}});}
    if(p==='/api/posts')return route.fulfill({json:{posts:saved?[{id:saved.post.id,title:saved.post.title,status:'draft',revision:'b'.repeat(40)}]:[],storageBytes:600_000_000}});
    if(request.method()==='PUT'){saved=request.postDataJSON();return route.fulfill({json:{post:{...saved.post,status:'draft'},revision:'b'.repeat(40),publishing:false}});}
    if(p.startsWith('/api/posts/'))return route.fulfill({json:{post:{...saved.post,status:'draft'},revision:'b'.repeat(40)}});
    return route.fulfill({json:{}});});
  const photoSrc=()=>studioPage.locator('.object.photo img').first().getAttribute('src');
  await studioPage.goto(studio);await studioPage.evaluate(()=>indexedDB.databases().then(dbs=>Promise.all(dbs.map(db=>new Promise(r=>{const q=indexedDB.deleteDatabase(db.name);q.onsuccess=q.onerror=q.onblocked=r;})))));await studioPage.reload();
  await studioPage.getByRole('textbox',{name:'Entry title'}).fill('PNG quality fixture');await studioPage.locator('#photos').setInputFiles({name:'sticker.png',mimeType:'image/png',buffer:sticker});await studioPage.waitForSelector('.object.photo img');
  const imported=await photoSrc();assert.deepEqual(Buffer.from(imported.split(',')[1],'base64'),Buffer.from(result.png.sticker.bytes),'studio import stores the full-size PNG');
  await studioPage.waitForTimeout(800);await studioPage.reload();await studioPage.waitForSelector('.object.photo img');assert.equal(await photoSrc(),imported,'local recovery keeps the same PNG bytes');
  await studioPage.locator('#github-save').click();await studioPage.waitForFunction(()=>/Saved to GitHub|Draft saved online/.test(document.querySelector('#cloud-state').textContent+document.querySelector('#toast').textContent));
  assert.deepEqual(uploaded,Buffer.from(result.png.sticker.bytes),'upload sends the import bytes without a second encode');assert.equal(saved.post.pages[0].elements[0].src,`media/${'a'.repeat(40)}.png`);
  await studioPage.waitForFunction(()=>document.querySelector('#storage-meter').textContent.includes('600 MB'));const meter=await studioPage.locator('#storage-meter').evaluate(e=>({text:e.textContent,warning:e.classList.contains('warning')}));assert.ok(meter.warning&&/over 500 MB.*Saving still works/.test(meter.text),'storage warning shown after a successful (unblocked) save');
  await studioPage.evaluate(()=>document.querySelector('#github-load').click());await studioPage.waitForSelector('#online-dialog[open]');await studioPage.screenshot({path:'test-results/storage-meter-warning.png'});
  await studioPage.locator('#online-list button',{hasText:'PNG quality fixture'}).first().click();await studioPage.waitForFunction(()=>!document.querySelector('#online-dialog').open);await studioPage.waitForSelector('.object.photo img');
  assert.deepEqual(Buffer.from((await photoSrc()).split(',')[1],'base64'),uploaded,'cloud reload hydrates the identical PNG');await studioPage.close();
  // G3 review sheet: 330px placement and an enlarged box, over a checkerboard so transparency is visible; "previous" approximates the old 512px derivative.
  const previous=(await sharp(sticker).resize(512,512,{fit:'inside'}).png().toBuffer()).toString('base64'),url=name=>result.png[name].photo.src;
  const rows=[['Opaque line art',url('lineArt'),null,'left:-330px;top:-200px'],['Transparent sticker',url('sticker'),`data:image/png;base64,${previous}`,'left:-330px;top:-200px'],['Semi-transparent edge',url('softEdge'),null,'left:0;top:-330px']];
  for(const dpr of [1,2]){const proof=await browser.newPage({deviceScaleFactor:dpr,viewport:{width:1400,height:1150}});await proof.setContent(`<style>body{margin:16px;font:14px Georgia,serif;background:#fff}.row{display:flex;gap:24px;align-items:flex-start;margin-bottom:18px}.label{width:150px}.check{background:repeating-conic-gradient(#ccc 0 25%,#fff 0 50%) 0 0/20px 20px}.normal{width:330px}.zoom{width:330px;height:330px;overflow:hidden;position:relative}.zoom img{position:absolute;width:990px}figure{margin:0}figcaption{font-size:12px}</style>${rows.map(([label,src,old,crop])=>`<div class="row"><div class="label">${label}<br>DPR ${dpr}</div><figure><img class="normal check" src="${src}"><figcaption>330px placement</figcaption></figure><figure><div class="zoom check"><img style="${crop}" src="${src}"></div><figcaption>enlarged 3× crop</figcaption></figure>${old?`<figure><div class="zoom check"><img style="${crop}" src="${old}"></div><figcaption>previous 512px (approx.), same crop</figcaption></figure>`:''}</div>`).join('')}`);await proof.evaluate(()=>Promise.all([...document.images].map(image=>image.decode())));await proof.screenshot({path:`test-results/png-quality-dpr${dpr}.png`,fullPage:true});await proof.close();}
  for(const dpr of [1,2]){const proof=await browser.newPage({deviceScaleFactor:dpr,viewport:{width:1100,height:850}});await proof.setContent(`<style>body{background:#eee;display:flex;gap:30px;align-items:flex-start}.normal{width:330px}.large{width:660px}img{height:auto}</style><img class="normal" src="${result.oriented.photo.src}"><img class="large" src="${result.oriented.photo.src}">`);await proof.locator('img').last().evaluate(image=>image.decode());await proof.screenshot({path:`test-results/media-quality-dpr${dpr}.png`});await proof.close();}
  console.log('PASS durable JPEG/WebP reuse; PNG 1600px cap, no upscale, dimension step-down, exact alpha, lossless opaque pixels, single encode; studio import → recovery → upload/save → reload; storage warning non-blocking; DPR 1/2 review sheets');
}finally{await browser.close();}
