import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import settings from '../config/blog.json' with {type:'json'};
import {encodePng} from '../shared/png.js';
import {mediaFixtures} from './desktop-media-fixtures.js';
import {verifyNotebooks} from '../scripts/verify-notebook.mjs';
const fixtures=path.resolve('test-results/blog-fixtures'),postsDir=path.join(fixtures,'content/posts');fs.mkdirSync(postsDir,{recursive:true});fs.mkdirSync(path.join(fixtures,'media'),{recursive:true});
const publicMedia=`media/${'c'.repeat(40)}.jpg`,draftMedia=`media/${'d'.repeat(40)}.jpg`;
fs.writeFileSync(path.join(fixtures,publicMedia),await sharp({create:{width:32,height:32,channels:3,background:{r:255,g:100,b:200}}}).jpeg().toBuffer());fs.writeFileSync(path.join(fixtures,draftMedia),'DRAFT_PHOTO_SECRET');
const publicPng=`media/${'e'.repeat(40)}.png`,largePng=`media/${'f'.repeat(40)}.png`,mediaFixture=await mediaFixtures();
// Studio-canonical PNGs (as the Worker stores them): a small alpha one and the maximal 1600px / ~3 MB one.
const pngBytes=await encodePng(64,64,new Uint8Array(64*64*4).map((_,i)=>i%4===3?128:200));fs.writeFileSync(path.join(fixtures,largePng),mediaFixture.maximal);
const r2Bytes=await sharp({create:{width:96,height:64,channels:4,background:{r:80,g:120,b:220,alpha:.75}}}).png().toBuffer(),r2Sha=createHash('sha256').update(r2Bytes).digest('hex'),publicR2=`r2/${r2Sha}.png`;
fs.mkdirSync(path.join(fixtures,'r2'),{recursive:true});fs.writeFileSync(path.join(fixtures,publicR2),r2Bytes);
const ids=[];
for(let i=0;i<8;i++){
  const id=`${String(i+1).padStart(8,'0')}-1111-4111-8111-111111111111`;ids.push(id);
  const post={version:2,pageFormat:'notebook-900x1200-v1',id,title:i>=6?'DRAFT_TITLE_SECRET':i===4?'':`Published ${i+1}`,created:'2026-10-12T18:00:00.000Z',status:i===7?'trashed':i>=6?'draft':'published',publishedAt:i>=6?null:'2026-10-12T18:00:00.000Z',elements:[{id:'22222222-2222-4222-8222-222222222222',type:'text',x:50,y:50,w:300,h:100,rotation:0,doc:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:i>=6?'DRAFT_TEXT_SECRET':'Readable public content & escaped <tags>.'}]}]}},{id:'33333333-3333-4333-8333-333333333333',type:'photo',x:100,y:200,w:300,h:200,rotation:5,src:i>=6?draftMedia:publicMedia,alt:'Photo fixture'}]};
  if(i===5){post.version=3;post.pages=Array.from({length:6},(_,pageIndex)=>({id:crypto.randomUUID(),elements:post.elements.map(e=>({...structuredClone(e),id:crypto.randomUUID(),...(e.type==='photo'?{src:pageIndex===5?publicR2:pageIndex===4?largePng:publicPng}:{}),...(e.type==='text'?{doc:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:`Page ${pageIndex+1}: all page content survives.`,marks:[{type:'textStyle',attrs:{font:'orbitron',fontSize:24,color:'#402E35'}}]}]}]}}:{})}))}));delete post.elements;}
  // A fixed box whose text spills past the paper: preferred size, never a fit failure.
  if(i===1)post.elements.push({id:'44444444-4444-4444-8444-444444444444',type:'text',x:480,y:760,w:260,h:100,rotation:0,font:'handwriting',fontSize:60,fixedHeight:true,doc:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Spilling words keep their size past the paper edge. '.repeat(3)}]}]}});
  post.music={artists:[{name:i>=6?'DRAFT_MUSIC_SECRET':`Public artist ${i+1}`}],songs:[]};
  fs.writeFileSync(path.join(postsDir,`${id}.json`),JSON.stringify(post));
  if(i===0){post.version=2;post.pageFormat='notebook-900x1200-v1';fs.writeFileSync(path.join(postsDir,`${id}.json`),JSON.stringify(post));}
}
const buildCommit='a'.repeat(40);
// G2: a structurally valid PNG the Worker would store (inflate bomb) must fail the publish build, so nothing deploys.
fs.writeFileSync(path.join(fixtures,publicPng),mediaFixture.decodeOnly.find(([name])=>name==='inflate bomb')[1]);
const rejected=spawnSync(process.execPath,['scripts/build.mjs','blog'],{encoding:'utf8',env:{...process.env,GITHUB_SHA:buildCommit,BLOG_CONTENT_DIR:postsDir,BLOG_MEDIA_ROOT:fixtures}});assert.notEqual(rejected.status,0);assert.match(rejected.stderr,/Invalid published PNG: media\/e{40}\.png/);
fs.writeFileSync(path.join(fixtures,publicPng),pngBytes);
const run=spawnSync(process.execPath,['scripts/build.mjs','blog'],{stdio:'inherit',env:{...process.env,GITHUB_SHA:buildCommit,BLOG_CONTENT_DIR:postsDir,BLOG_MEDIA_ROOT:fixtures}});assert.equal(run.status,0);
const output=path.resolve('dist-blog');
const manifest=JSON.parse(fs.readFileSync(path.join(output,'notifications.json'),'utf8'));
assert.deepEqual(Object.keys(manifest).sort(),['commit','posts','version']);
assert.equal(manifest.version,1);assert.equal(manifest.commit,buildCommit);
assert.equal(manifest.commit,JSON.parse(fs.readFileSync(path.join(output,'revision.json'),'utf8')).commit);
const mediaManifest=JSON.parse(fs.readFileSync(path.join(output,'published-media.json'),'utf8'));
assert.deepEqual(mediaManifest,{version:1,commit:buildCommit,media:[{key:publicR2,mime:'image/png',size:r2Bytes.length,sha256:r2Sha}]});
assert.deepEqual(manifest.posts.map(p=>p.id).sort(),ids.slice(0,6).sort());
for(const post of manifest.posts){
  assert.deepEqual(Object.keys(post).sort(),['id','publishedAt','title','url']);
  assert.equal(post.title,post.id===ids[4]?'':`Published ${ids.indexOf(post.id)+1}`);
  assert.equal(post.publishedAt,'2026-10-12T18:00:00.000Z');
  assert.equal(post.url,new URL(`posts/${post.id}/`,settings.publicUrl).href);
}
const manifestText=JSON.stringify(manifest);
for(const privateValue of [ids[6],ids[7],'Readable public content',publicMedia,'Public artist','DRAFT_'])assert.ok(!manifestText.includes(privateValue),`Unexpected manifest data: ${privateValue}`);
assert.deepEqual(fs.readFileSync(path.join(output,publicPng)),fs.readFileSync(path.join(fixtures,publicPng)));assert.deepEqual(fs.readFileSync(path.join(output,largePng)),Buffer.from(mediaFixture.maximal),'1600px PNG is published byte-identical');assert.deepEqual(fs.readFileSync(path.join(output,publicR2)),r2Bytes);assert.ok(fs.readFileSync(path.join(output,`posts/${ids[5]}/index.html`),'utf8').includes('Page 6: all page content survives.'));
assert.ok(fs.existsSync(path.join(output,'page/2/index.html')));
assert.ok(fs.existsSync(path.join(output,`posts/${ids[0]}/index.html`)));
assert.ok(!fs.existsSync(path.join(output,`posts/${ids[6]}/index.html`)));
assert.ok(!fs.existsSync(path.join(output,`posts/${ids[7]}/index.html`)));

assert.ok(fs.existsSync(path.join(output,publicMedia)));assert.ok(!fs.existsSync(path.join(output,draftMedia)));
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
for(const file of walk(output).filter(f=>/\.(html|xml|json)$/.test(f))){const text=fs.readFileSync(file,'utf8');assert.ok(!text.includes('DRAFT_'),'Draft data leaked into '+file);}
// G1: a published blank-titled entry is labelled by its date and never by a placeholder or an empty label.
const blankHtml=fs.readFileSync(path.join(output,`posts/${ids[4]}/index.html`),'utf8'),rss=fs.readFileSync(path.join(output,'rss.xml'),'utf8'),archive=fs.readFileSync(path.join(output,'archive/index.html'),'utf8');
assert.match(blankHtml,/<title>oct 12, 2026 · bbyteeth<\/title>/);assert.match(blankHtml,/<h2><a href="[^"]*posts\/00000005-[^"]*"><time datetime="2026-10-12T18:00:00.000Z">October 12, 2026<\/time><\/a><\/h2>/);
assert.ok(rss.includes(`<item><title>oct 12, 2026</title><link>${new URL(`posts/${ids[4]}/`,settings.publicUrl).href}</link>`));assert.match(archive,/<a href="[^"]*posts\/00000005-[^"]*"><time datetime="2026-10-12T18:00:00.000Z">oct 12, 2026<\/time><\/a>/);
for(const file of walk(output).filter(f=>/\.(html|xml|json)$/.test(f))){const text=fs.readFileSync(file,'utf8');assert.ok(!/untitled/i.test(text),'Placeholder title in '+file);assert.ok(!/<(a|button|h2|title)\b[^>]*>\s*<\/\1>/.test(text),'Empty label in '+file);assert.ok(!/<title>\s*·/.test(text),'Empty tab title in '+file);}
// G2 (pixel title): canonical VT323 52px/52px fit keeps the two-line limit; blank titles still pass.
const fitPost=title=>({version:2,pageFormat:'notebook-900x1200-v1',id:ids[0],title,created:'2026-10-12T18:00:00.000Z',elements:[]}),fitTitle='a summer day at the lake w'.repeat(4);
await verifyNotebooks([fitPost(fitTitle.slice(0,60)),fitPost('')],process.cwd());
await assert.rejects(verifyNotebooks([fitPost(fitTitle.slice(0,90))],process.cwd()),/does not fit: title\./);
const html=fs.readFileSync(path.join(output,`posts/${ids[0]}/index.html`),'utf8');assert.ok(html.includes('Readable public content'));assert.ok(html.includes('&lt;tags&gt;'));assert.ok(!html.includes('ProseMirror'));
console.log('PASS: malformed published PNG fails the build, byte-identical 1600px PNG, individual routes, pagination, actual HTML text, escaping, RSS/sitemap, published-only notification manifest/revision, date-labelled blank title (G1), VT323 two-line title fit (pixel G2), and draft text/photo exclusion.');
