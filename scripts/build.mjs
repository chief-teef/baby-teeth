import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validatePost,parseMediaPath} from '../shared/document.js';
import {entryElements} from '../shared/notebook-format.js';
import sharp from 'sharp';
import {cleanPng,PNG_MAX_BYTES,PNG_MAX_SIDE,PNG_MAX_PIXELS} from '../shared/png.js';
import {verifyNotebooks} from './verify-notebook.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const R2_MAX_BYTES=8*1024*1024,R2_MAX_PIXELS=12_000_000,R2_MAX_SIDE=4096;
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
  const paths=new Set();posts.forEach(p=>{validatePost(p);entryElements(p).filter(e=>e.type==='photo').forEach(e=>paths.add(e.src));});
  const publishedMedia=[];
  for(const media of [...paths].sort()){
    const parsed=parseMediaPath(media),input=path.join(process.env.BLOG_MEDIA_ROOT||root,media),output=path.join(root,'dist-blog',media);
    if(!fs.existsSync(input))throw Error(`Missing published photo: ${media}`);
    const bytes=fs.readFileSync(input),image=sharp(bytes,{limitInputPixels:parsed.storage==='r2'?R2_MAX_PIXELS:5760000}),metadata=await image.metadata(),format=parsed.extension==='png'?'png':'jpeg';
    if(parsed.storage==='r2'){
      const checksum=createHash('sha256').update(bytes).digest('hex'),hasMetadata=['exif','icc','iptc','xmp','tifftagPhotoshop','comments'].some(key=>metadata[key]);
      if(bytes.length>R2_MAX_BYTES||metadata.width>R2_MAX_SIDE||metadata.height>R2_MAX_SIDE||metadata.width*metadata.height>R2_MAX_PIXELS||checksum!==parsed.sha||hasMetadata)throw Error(`Invalid published R2 image: ${media}`);
      publishedMedia.push({key:media,mime:parsed.mime,size:bytes.length,sha256:checksum});
    }else if(format==='png'){
      if(bytes.length>PNG_MAX_BYTES||metadata.width>PNG_MAX_SIDE||metadata.height>PNG_MAX_SIDE||metadata.width*metadata.height>PNG_MAX_PIXELS)throw Error(`Published PNG exceeds the processed-image bound: ${media}`);
      // The Worker stores PNGs after structural checks only; Sharp misses bad CRCs, inflate bombs and trailing zlib data, so run the full shared decode.
      try{if((await cleanPng(bytes)).length!==bytes.length)throw Error('non-canonical chunks');}catch(error){throw Error(`Invalid published PNG: ${media}: ${error.message}`);}
    }
    if(metadata.format!==format||metadata.width>(parsed.storage==='r2'?R2_MAX_SIDE:2400)||metadata.height>(parsed.storage==='r2'?R2_MAX_SIDE:2400)||(metadata.pages||1)!==1)throw Error(`Invalid published image: ${media}`);
    await image.raw().toBuffer();fs.mkdirSync(path.dirname(output),{recursive:true});fs.copyFileSync(input,output);
  }
  fs.writeFileSync(path.join(root,'dist-blog','published-media.json'),JSON.stringify({version:1,commit:process.env.GITHUB_SHA||null,media:publishedMedia}));
  fs.writeFileSync(path.join(root,'dist-blog','revision.json'),JSON.stringify({commit:process.env.GITHUB_SHA||null,builtAt:new Date().toISOString()}));
  console.log(`Published-only build: ${posts.length} entries, ${paths.size} photos. Draft documents and assets excluded.`);
}else throw Error('Unknown build target.');
