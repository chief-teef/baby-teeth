import {validateFormat} from './notebook-format.js';
import {validateMusic} from './music.js';
export const POST_ID = /^[a-f0-9-]{36}$/i;
export const MEDIA_PATH = /^media\/[a-f0-9]{40}\.jpg$/;
export const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nodeTypes=new Set(['doc','paragraph','heading','text','bulletList','orderedList','listItem','blockquote','codeBlock','horizontalRule','hardBreak']);
const markTypes=new Set(['bold','italic','strike','underline','code','link']);
export function validateText(node,depth=0,state={count:0}){
  if(depth>20||++state.count>10000||!node||!nodeTypes.has(node.type))throw Error('Unsupported text structure.');
  if(node.type==='text'&&(typeof node.text!=='string'||node.text.length>100000))throw Error('Invalid text.');
  if(node.type==='heading'&&![1,2,3,4,5,6].includes(node.attrs?.level))throw Error('Invalid heading.');
  if(node.marks){if(!Array.isArray(node.marks)||node.marks.length>8)throw Error('Invalid formatting.');for(const m of node.marks){if(!markTypes.has(m.type))throw Error('Unsupported formatting.');if(m.type==='link'&&(typeof m.attrs?.href!=='string'||!/^https?:\/\//i.test(m.attrs.href)||m.attrs.href.length>2000))throw Error('Use an http or https link.');}}
  if(node.content){if(!Array.isArray(node.content))throw Error('Invalid text content.');for(const child of node.content)validateText(child,depth+1,state);}
}
export function validatePost(post,{local=false}={}){
  if(post)validateFormat(post);
  if(post?.music!==undefined)validateMusic(post.music);
  if(!post||!POST_ID.test(post.id)||typeof post.title!=='string'||post.title.length>500||!Number.isFinite(Date.parse(post.created)))throw Error('Invalid entry identity or date.');
  if(!Array.isArray(post.elements)||post.elements.length>500)throw Error('Entry exceeds 500 objects.');
  const ids=new Set();let totalPoints=0;
  for(const e of post.elements){
    if(!POST_ID.test(e.id)||ids.has(e.id)||!['text','photo','drawing'].includes(e.type))throw Error('Invalid or duplicated object.');ids.add(e.id);
    for(const key of ['x','y','w','h','rotation'])if(!Number.isFinite(e[key])||Math.abs(e[key])>100000)throw Error('Invalid object geometry.');
    if(e.w<20||e.h<1||Math.abs(e.rotation)>180)throw Error('Invalid object size or rotation.');
    if(e.group!==undefined&&!POST_ID.test(e.group))throw Error('Invalid group.');
    if(e.type==='text'){
      if(e.font!==undefined&&!['handwriting','serif'].includes(e.font))throw Error('Invalid text font.');
      if(e.fontSize!==undefined&&(!Number.isFinite(e.fontSize)||e.fontSize<18||e.fontSize>60))throw Error('Invalid text size.');
      if(e.fixedHeight!==undefined&&e.fixedHeight!==true)throw Error('Invalid text height mode.');
      if(e.doc?.type!=='doc')throw Error('Invalid text document.');validateText(e.doc);
    }
    if(e.type==='photo'){
      if(typeof e.src!=='string'||(!MEDIA_PATH.test(e.src)&&!(local&&/^data:image\/(jpeg|png|webp);base64,/.test(e.src))))throw Error('Invalid photo reference.');
      if(typeof e.alt!=='string'||e.alt.length>3000)throw Error('Invalid photo description.');
    }
    if(e.type==='drawing'){
      if(!Number.isFinite(e.sourceW)||!Number.isFinite(e.sourceH)||e.sourceW<1||e.sourceH<1||e.sourceW>100000||e.sourceH>100000||!Array.isArray(e.strokes)||e.strokes.length>2000)throw Error('Invalid drawing.');
      for(const s of e.strokes){if(!/^#[a-f0-9]{6}$/i.test(s.color)||!Number.isFinite(s.size)||s.size<1||s.size>40||!Array.isArray(s.points)||s.points.length>50000)throw Error('Invalid stroke.');totalPoints+=s.points.length;for(const pt of s.points)if(!Array.isArray(pt)||pt.length!==2||!pt.every(n=>Number.isFinite(n)&&Math.abs(n)<100000))throw Error('Invalid stroke point.');}
    }
  }
  // The repository save limit must not make a locally recovered draft unreadable.
  if(totalPoints>100000&&!local)throw Error('This entry has too much ink for one online save. Reduce the ink before saving online; local recovery and export remain available.');
  return post;
}
export function cleanPost(post){
  validatePost(post);
  return {version:2,pageFormat:post.pageFormat,id:post.id,title:post.title,created:post.created,...(post.music?{music:validateMusic(post.music)}:{}),elements:post.elements.map(e=>{
    const result={id:e.id,type:e.type,x:e.x,y:e.y,w:e.w,h:e.h,rotation:e.rotation};if(e.group)result.group=e.group;
    if(e.type==='text'){result.doc=e.doc;for(const key of ['font','fontSize','fixedHeight'])if(e[key]!==undefined)result[key]=e[key];}
    if(e.type==='photo'){result.src=e.src;result.alt=e.alt;}
    if(e.type==='drawing'){result.sourceW=e.sourceW;result.sourceH=e.sourceH;result.strokes=e.strokes;}
    return result;
  })};
}
export function renderText(node){
  if(node.type==='text'){let html=esc(node.text);for(const mark of node.marks||[]){if(mark.type==='link'){if(/^https?:\/\//i.test(mark.attrs?.href||''))html=`<a href="${esc(mark.attrs.href)}" rel="noopener noreferrer">${html}</a>`;}else{const tag={bold:'strong',italic:'em',strike:'s',underline:'u',code:'code'}[mark.type];if(tag)html=`<${tag}>${html}</${tag}>`;}}return html;}
  if(node.type==='horizontalRule')return '<hr>';if(node.type==='hardBreak')return '<br>';
  const html=(node.content||[]).map(renderText).join('');if(node.type==='doc')return html;
  const tag={paragraph:'p',bulletList:'ul',orderedList:'ol',listItem:'li',blockquote:'blockquote',codeBlock:'pre'}[node.type]||(node.type==='heading'?`h${[1,2,3,4,5,6].includes(node.attrs?.level)?node.attrs.level:2}`:'p');
  return `<${tag}>${html||'<br>'}</${tag}>`;
}
export const textContent=node=>node.type==='text'?node.text:(node.content||[]).map(textContent).join(node.type==='doc'?' ':'');
export function excerpt(post){return post.elements.filter(e=>e.type==='text').map(e=>textContent(e.doc)).join(' ').replace(/\s+/g,' ').trim().slice(0,180);}
