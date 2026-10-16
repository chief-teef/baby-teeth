import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import settings from '../config/blog.json' with {type:'json'};
const fixtures=path.resolve('test-results/blog-fixtures'),postsDir=path.join(fixtures,'content/posts');fs.mkdirSync(postsDir,{recursive:true});fs.mkdirSync(path.join(fixtures,'media'),{recursive:true});
const publicMedia=`media/${'c'.repeat(40)}.jpg`,draftMedia=`media/${'d'.repeat(40)}.jpg`;
fs.writeFileSync(path.join(fixtures,publicMedia),await sharp({create:{width:32,height:32,channels:3,background:{r:255,g:100,b:200}}}).jpeg().toBuffer());fs.writeFileSync(path.join(fixtures,draftMedia),'DRAFT_PHOTO_SECRET');
const publicPng=`media/${'e'.repeat(40)}.png`;
fs.writeFileSync(path.join(fixtures,publicPng),await sharp({create:{width:64,height:64,channels:4,background:{r:255,g:100,b:200,alpha:.5}}}).png().toBuffer());
const ids=[];
for(let i=0;i<8;i++){
  const id=`${String(i+1).padStart(8,'0')}-1111-4111-8111-111111111111`;ids.push(id);
  const post={version:2,pageFormat:'notebook-900x1200-v1',id,title:i>=6?'DRAFT_TITLE_SECRET':`Published ${i+1}`,created:'2026-10-12T18:00:00.000Z',status:i===7?'trashed':i>=6?'draft':'published',publishedAt:i>=6?null:'2026-10-12T18:00:00.000Z',elements:[{id:'22222222-2222-4222-8222-222222222222',type:'text',x:50,y:50,w:300,h:100,rotation:0,doc:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:i>=6?'DRAFT_TEXT_SECRET':'Readable public content & escaped <tags>.'}]}]}},{id:'33333333-3333-4333-8333-333333333333',type:'photo',x:100,y:200,w:300,h:200,rotation:5,src:i>=6?draftMedia:publicMedia,alt:'Photo fixture'}]};
  if(i===5){post.version=3;post.pages=Array.from({length:6},(_,pageIndex)=>({id:crypto.randomUUID(),elements:post.elements.map(e=>({...structuredClone(e),id:crypto.randomUUID(),...(e.type==='photo'?{src:publicPng}:{}),...(e.type==='text'?{doc:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:`Page ${pageIndex+1}: all page content survives.`,marks:[{type:'textStyle',attrs:{font:'orbitron',fontSize:24,color:'#402E35'}}]}]}]}}:{})}))}));delete post.elements;}
  post.music={artists:[{name:i>=6?'DRAFT_MUSIC_SECRET':`Public artist ${i+1}`}],songs:[]};
  fs.writeFileSync(path.join(postsDir,`${id}.json`),JSON.stringify(post));
  if(i===0){post.version=2;post.pageFormat='notebook-900x1200-v1';fs.writeFileSync(path.join(postsDir,`${id}.json`),JSON.stringify(post));}
}
const buildCommit='a'.repeat(40);
const run=spawnSync(process.execPath,['scripts/build.mjs','blog'],{stdio:'inherit',env:{...process.env,GITHUB_SHA:buildCommit,BLOG_CONTENT_DIR:postsDir,BLOG_MEDIA_ROOT:fixtures}});assert.equal(run.status,0);
const output=path.resolve('dist-blog');
const manifest=JSON.parse(fs.readFileSync(path.join(output,'notifications.json'),'utf8'));
assert.deepEqual(Object.keys(manifest).sort(),['commit','posts','version']);
assert.equal(manifest.version,1);assert.equal(manifest.commit,buildCommit);
assert.equal(manifest.commit,JSON.parse(fs.readFileSync(path.join(output,'revision.json'),'utf8')).commit);
assert.deepEqual(manifest.posts.map(p=>p.id).sort(),ids.slice(0,6).sort());
for(const post of manifest.posts){
  assert.deepEqual(Object.keys(post).sort(),['id','publishedAt','title','url']);
  assert.equal(post.title,`Published ${ids.indexOf(post.id)+1}`);
  assert.equal(post.publishedAt,'2026-10-12T18:00:00.000Z');
  assert.equal(post.url,new URL(`posts/${post.id}/`,settings.publicUrl).href);
}
const manifestText=JSON.stringify(manifest);
for(const privateValue of [ids[6],ids[7],'Readable public content',publicMedia,'Public artist','DRAFT_'])assert.ok(!manifestText.includes(privateValue),`Unexpected manifest data: ${privateValue}`);
assert.ok(fs.existsSync(path.join(output,publicPng)));assert.ok(fs.readFileSync(path.join(output,`posts/${ids[5]}/index.html`),'utf8').includes('Page 6: all page content survives.'));
assert.ok(fs.existsSync(path.join(output,'page/2/index.html')));
assert.ok(fs.existsSync(path.join(output,`posts/${ids[0]}/index.html`)));
assert.ok(!fs.existsSync(path.join(output,`posts/${ids[6]}/index.html`)));
assert.ok(!fs.existsSync(path.join(output,`posts/${ids[7]}/index.html`)));

assert.ok(fs.existsSync(path.join(output,publicMedia)));assert.ok(!fs.existsSync(path.join(output,draftMedia)));
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
for(const file of walk(output).filter(f=>/\.(html|xml|json)$/.test(f))){const text=fs.readFileSync(file,'utf8');assert.ok(!text.includes('DRAFT_'),'Draft data leaked into '+file);}
const html=fs.readFileSync(path.join(output,`posts/${ids[0]}/index.html`),'utf8');assert.ok(html.includes('Readable public content'));assert.ok(html.includes('&lt;tags&gt;'));assert.ok(!html.includes('ProseMirror'));console.log('PASS: individual routes, pagination, actual HTML text, escaping, RSS/sitemap, published-only notification manifest/revision, and draft text/photo exclusion.');
