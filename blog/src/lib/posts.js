import fs from 'node:fs';
import path from 'node:path';
import {validatePost} from '../../../shared/document.js';
const dir=process.env.BLOG_CONTENT_DIR||path.resolve(process.cwd(),'../content/posts');
export function allPosts(){if(!fs.existsSync(dir))return [];return fs.readdirSync(dir).filter(f=>/^[a-f0-9-]{36}\.json$/i.test(f)).map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'))).filter(p=>p.status==='published').map(p=>{validatePost(p);if(!Number.isFinite(Date.parse(p.publishedAt)))throw Error('Published entry has no valid publication date.');return p;}).sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||b.id.localeCompare(a.id));}
export const base='/baby-teeth/';
export const postUrl=p=>`${base}posts/${p.id}/`;
