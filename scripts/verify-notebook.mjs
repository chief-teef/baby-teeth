import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'node:http';
import {chromium} from '@playwright/test';
import {entryPages,assertPublicationGeometry} from '../shared/notebook-format.js';
import {renderNotebook} from '../shared/notebook-renderer.js';
export async function verifyNotebooks(posts,root){
 root=path.resolve(root);
 posts.forEach(assertPublicationGeometry);const notebooks=posts.flatMap(post=>entryPages(post).map((_,pageIndex)=>({post,pageIndex})));if(!notebooks.length)return;
 const css=fs.readFileSync(path.join(root,'shared/notebook.css'),'utf8').replace(/@import[^;]+;/g,'').replace(/url\([^)]*grain[^)]*\)/g,'none');
 const theme=fs.readFileSync(path.join(root,'shared/book/theme.css'),'utf8').replaceAll('../../public/','/public/');
 const server=createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/measure'){const {post,pageIndex}=notebooks[Number(url.searchParams.get('index'))];res.setHeader('Content-Type','text/html');res.end(`<!doctype html><style>${theme}${css}</style><article class="notebook-page">${renderNotebook(post,'/',{pageIndex})}</article>`);return;}const relative=decodeURIComponent(url.pathname).slice(1),file=path.resolve(root,relative);if(!file.startsWith(root+path.sep)||!/^shared\/|^public\/(book|editor\/fonts)\//.test(relative)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.ttf')?'font/ttf':'application/octet-stream');fs.createReadStream(file).pipe(res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';browser=await chromium.launch({headless:true,...(process.env.NOTEBOOK_BROWSER?{executablePath:process.env.NOTEBOOK_BROWSER}:process.platform==='win32'&&fs.existsSync(edge)?{executablePath:edge}:{})});const page=await browser.newPage({viewport:{width:1200,height:1400}});for(let i=0;i<notebooks.length;i++){await page.goto(`http://127.0.0.1:${server.address().port}/measure?index=${i}`);const errors=await page.evaluate(async ({post,pageIndex})=>{const {measureNotebook}=await import('/shared/notebook-renderer.js');await document.fonts.load('52px VT323');await document.fonts.load('28px Gelasio');if(!document.fonts.check('52px VT323'))throw Error('Production font unavailable.');return measureNotebook(post,document.querySelector('article'),{pageIndex});},notebooks[i]);if(errors.length)throw Error(`Published notebook ${notebooks[i].post.id} does not fit: ${errors.join(', ')}. Candidate build rejected.`);}console.log(`Canonical rendered fit verified: ${notebooks.length} published notebook pages.`);}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
