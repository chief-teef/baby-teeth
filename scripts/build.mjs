import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validatePost} from '../shared/document.js';
import sharp from 'sharp';
import {verifyNotebooks} from './verify-notebook.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
function run(args,cwd=root){const result=spawnSync(process.execPath,args,{cwd,stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
const mode=process.argv[2]||'editor';
if(mode==='editor')run([path.join(root,'node_modules/vite/bin/vite.js'),'build','--base=./']);
else if(mode==='verification'){
  const {build}=await import('vite');
  await build({root,base:'./',build:{rollupOptions:{input:{studio:path.join(root,'index.html'),diary:path.join(root,'prototypes/diary.html')}}}});
}
else if(mode==='blog'){
  const source=process.env.BLOG_CONTENT_DIR||path.join(root,'content/posts');
  const candidates=fs.existsSync(source)?fs.readdirSync(source).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(source,f),'utf8'))).filter(p=>p.status==='published'):[];
  candidates.forEach(p=>validatePost(p));await verifyNotebooks(candidates,root);
  const astroPackage=JSON.parse(fs.readFileSync(path.join(root,'node_modules/astro/package.json'),'utf8'));
  run([path.join(root,'node_modules/astro',astroPackage.bin.astro),'build'],path.join(root,'blog'));
  const dir=process.env.BLOG_CONTENT_DIR||path.join(root,'content/posts');const posts=fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'))).filter(p=>p.status==='published'):[];
  const paths=new Set();posts.forEach(p=>{validatePost(p);p.elements.filter(e=>e.type==='photo').forEach(e=>paths.add(e.src));});
  for(const media of paths){const input=path.join(process.env.BLOG_MEDIA_ROOT||root,media),output=path.join(root,'dist-blog',media);if(!fs.existsSync(input))throw Error(`Missing published photo: ${media}`);const image=sharp(input,{limitInputPixels:5760000}),metadata=await image.metadata();if(metadata.format!=='jpeg'||metadata.width>2400||metadata.height>2400)throw Error(`Invalid published JPEG: ${media}`);await image.raw().toBuffer();fs.mkdirSync(path.dirname(output),{recursive:true});fs.copyFileSync(input,output);}
  fs.writeFileSync(path.join(root,'dist-blog','revision.json'),JSON.stringify({commit:process.env.GITHUB_SHA||null,builtAt:new Date().toISOString()}));
  console.log(`Published-only build: ${posts.length} entries, ${paths.size} photos. Draft documents and assets excluded.`);
}else throw Error('Unknown build target.');
