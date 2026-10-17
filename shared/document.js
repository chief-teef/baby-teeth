import {fontById,fontFamily} from './font-registry.js';
import {entryPages,entryElements,validateFormat} from './notebook-format.js';
import {validateMusic} from './music.js';
export const POST_ID = /^[a-f0-9-]{36}$/i;
export const MEDIA_PATH = /^(media\/([a-f0-9]{40})|r2\/([a-f0-9]{64}))\.(jpg|png)$/;
export function parseMediaPath(path){const m=typeof path==='string'&&path.match(MEDIA_PATH);return m?{storage:m[2]?'git':'r2',sha:m[2]||m[3],extension:m[4],mime:m[4]==='png'?'image/png':'image/jpeg'}:null;}
export function resolveMediaUrl(path,base='/'){return parseMediaPath(path)?base+path:path;}
export const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function validatePost(post,{local=false}={}){
  if(post)validateFormat(post);
  if(post?.music!==undefined)validateMusic(post.music);
  if(!post||!POST_ID.test(post.id)||typeof post.title!=='string'||post.title.length>500||!Number.isFinite(Date.parse(post.created)))throw Error('Invalid entry identity or date.');
  if(post.version===2&&Object.hasOwn(post,'pages'))throw Error('V2 entries cannot contain nested pages.');
  const pages=entryPages(post);
  if(post.version===3&&(Object.hasOwn(post,'elements')||!Array.isArray(pages)||pages.length<1||pages.length>500))throw Error('Invalid entry pages.');
  const pageIds=new Set(),groups=new Map();let count=0;
  for(const page of pages){if(!page||!Array.isArray(page.elements)||(post.version===3&&(!POST_ID.test(page.id)||pageIds.has(page.id)||(pages.length>1&&!page.elements.length))))throw Error('Invalid or duplicated page.');pageIds.add(page.id);if((count+=page.elements.length)>500)throw Error('Entry exceeds 500 objects.');}
  const elements=entryElements(post);
  const ids=new Set();let totalPoints=0;
  for(const e of elements){
    if(!POST_ID.test(e.id)||ids.has(e.id)||!['text','photo','drawing'].includes(e.type))throw Error('Invalid or duplicated object.');ids.add(e.id);
    for(const key of ['x','y','w','h','rotation'])if(!Number.isFinite(e[key])||Math.abs(e[key])>100000)throw Error('Invalid object geometry.');
    if(e.w<20||e.h<1||Math.abs(e.rotation)>180)throw Error('Invalid object size or rotation.');
    if(e.group!==undefined&&!POST_ID.test(e.group))throw Error('Invalid group.');
    if(e.type==='text'){
      if(e.font!==undefined&&!(post.version===2?['handwriting','serif'].includes(e.font):!!fontById(e.font)))throw Error('Invalid text font.');
      if(e.fontSize!==undefined&&(!Number.isFinite(e.fontSize)||e.fontSize<(post.version===2?18:6)||e.fontSize>(post.version===2?60:144)))throw Error('Invalid text size.');
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
  for(const page of pages)for(const e of page.elements)if(e.group){if(groups.has(e.group)&&groups.get(e.group)!==page.id)throw Error('Groups cannot span pages.');groups.set(e.group,page.id);}
  // The repository save limit must not make a locally recovered draft unreadable.
  if(totalPoints>100000&&!local)throw Error('This entry has too much ink for one online save. Reduce the ink before saving online; local recovery and export remain available.');
  return post;
}
export function cleanPost(post){
  validatePost(post);
  const cleanElements=elements=>elements.map(e=>{
    const result={id:e.id,type:e.type,x:e.x,y:e.y,w:e.w,h:e.h,rotation:e.rotation};if(e.group)result.group=e.group;
    if(e.type==='text'){result.doc=cleanText(e.doc);for(const key of ['font','fontSize','fixedHeight'])if(e[key]!==undefined)result[key]=e[key];}
    if(e.type==='photo'){result.src=e.src;result.alt=e.alt;}
    if(e.type==='drawing'){result.sourceW=e.sourceW;result.sourceH=e.sourceH;result.strokes=structuredClone(e.strokes);}
    return result;
  });
  return {version:post.version,pageFormat:post.pageFormat,id:post.id,title:post.title.trim()?post.title:'',created:post.created,...(post.music?{music:validateMusic(post.music)}:{}),...(post.version===2?{elements:cleanElements(post.elements)}:{pages:post.pages.map(page=>({id:page.id,elements:cleanElements(page.elements)}))})};
}
export const textContent=node=>node.type==='text'?node.text:(node.content||[]).map(textContent).join(node.type==='doc'?' ':'');
export function excerpt(post){return entryElements(post).filter(e=>e.type==='text').map(e=>textContent(e.doc)).join(' ').replace(/\s+/g,' ').trim().slice(0,180);}

const nodeTypes=new Set(['doc','paragraph','heading','text','bulletList','orderedList','listItem','blockquote','codeBlock','horizontalRule','hardBreak']);
const markTypes=new Set(['bold','italic','strike','underline','code','link','textStyle']);
const inline=new Set(['text','hardBreak']);
const blocks=new Set(['paragraph','heading','bulletList','orderedList','blockquote','codeBlock','horizontalRule']);
const ranges={fontSize:[6,144],lineHeight:[.8,3],spaceBefore:[0,144],spaceAfter:[0,144],letterSpacing:[-2,20]};
const color=value=>typeof value==='string'&&/^#[a-f0-9]{6}$/i.test(value);
function textAttrs(type,attrs={}){
 const result={};
 if(type==='heading'){if(![1,2,3,4,5,6].includes(attrs.level))throw Error('Invalid heading.');result.level=attrs.level;}
 if(type==='orderedList'&&attrs.start!==undefined){if(!Number.isInteger(attrs.start)||attrs.start<1||attrs.start>1000000)throw Error('Invalid list start.');result.start=attrs.start;}
 if(['paragraph','heading'].includes(type)){
  if(attrs.textAlign!==undefined){if(!['left','center','right','justify'].includes(attrs.textAlign))throw Error('Invalid text alignment.');result.textAlign=attrs.textAlign;}
  for(const key of ['lineHeight','spaceBefore','spaceAfter','letterSpacing'])if(attrs[key]!==undefined){const [min,max]=ranges[key];if(!Number.isFinite(attrs[key])||attrs[key]<min||attrs[key]>max)throw Error('Invalid paragraph spacing.');result[key]=attrs[key];}
 }
 return result;
}
function cleanMark(mark){
 if(!mark||!markTypes.has(mark.type))throw Error('Unsupported formatting.');
 const result={type:mark.type},attrs=mark.attrs||{},clean={};
 if(mark.type==='link'){if(typeof attrs.href!=='string'||!/^https?:\/\//i.test(attrs.href)||attrs.href.length>2000)throw Error('Use an http or https link.');try{const url=new URL(attrs.href);if(!['http:','https:'].includes(url.protocol))throw Error();}catch{throw Error('Use an http or https link.');}clean.href=attrs.href;}
 if(mark.type==='textStyle'){
  if(attrs.font!==undefined){if(!fontById(attrs.font))throw Error('Invalid text font.');clean.font=attrs.font;}
  if(attrs.fontSize!==undefined){if(!Number.isFinite(attrs.fontSize)||attrs.fontSize<6||attrs.fontSize>144)throw Error('Invalid text size.');clean.fontSize=attrs.fontSize;}
  for(const key of ['color','highlight'])if(attrs[key]!==undefined){if(!color(attrs[key]))throw Error('Invalid text color.');clean[key]=attrs[key];}
 }
 if(Object.keys(clean).length)result.attrs=clean;return result;
}
export function cleanText(node,depth=0,state={count:0},parent){
 if(depth>20||++state.count>10000||!node||!nodeTypes.has(node.type))throw Error('Unsupported text structure.');
 if(parent){const valid=['paragraph','heading'].includes(parent)?inline.has(node.type):parent==='codeBlock'?node.type==='text':['bulletList','orderedList'].includes(parent)?node.type==='listItem':['doc','blockquote','listItem'].includes(parent)?blocks.has(node.type):false;if(!valid)throw Error('Invalid text nesting.');}
 const result={type:node.type};
 if(node.type==='text'){if(typeof node.text!=='string'||node.text.length>100000||!node.text.length)throw Error('Invalid text.');result.text=node.text;}
 const attrs=textAttrs(node.type,node.attrs);if(Object.keys(attrs).length)result.attrs=attrs;
 if(node.marks!==undefined){if(node.type!=='text'||!Array.isArray(node.marks)||node.marks.length>8)throw Error('Invalid formatting.');const kinds=new Set();result.marks=node.marks.map(mark=>{if(kinds.has(mark?.type))throw Error('Duplicate formatting.');kinds.add(mark?.type);return cleanMark(mark);});}
 if(node.content!==undefined){if(!Array.isArray(node.content)||node.content.length>10000||['text','hardBreak','horizontalRule'].includes(node.type))throw Error('Invalid text content.');result.content=node.content.map(child=>cleanText(child,depth+1,state,node.type));}
 return result;
}
export function validateText(node){cleanText(node);return node;}
const lengthStyle=(key,value)=>`${key}:calc(${value}px * var(--text-scale,1))`;
export function renderText(node){
 if(node.type==='text'){let html=esc(node.text);for(const mark of node.marks||[]){if(mark.type==='textStyle'){const attrs=cleanMark(mark).attrs||{},styles=[];if(attrs.font)styles.push(`font-family:${fontFamily(attrs.font)}`);if(attrs.fontSize!==undefined)styles.push(lengthStyle('font-size',attrs.fontSize));if(attrs.color)styles.push(`color:${attrs.color}`);if(attrs.highlight)styles.push(`background-color:${attrs.highlight}`);html=`<span style="${esc(styles.join(';'))}">${html}</span>`;}else if(mark.type==='link'){html=`<a href="${esc(cleanMark(mark).attrs.href)}" rel="noopener noreferrer">${html}</a>`;}else{const tag={bold:'strong',italic:'em',strike:'s',underline:'u',code:'code'}[mark.type];if(tag)html=`<${tag}>${html}</${tag}>`;}}return html;}
 if(node.type==='horizontalRule')return '<hr>';if(node.type==='hardBreak')return '<br>';
 const html=(node.content||[]).map(renderText).join('');if(node.type==='doc')return html;
 const tag={paragraph:'p',bulletList:'ul',orderedList:'ol',listItem:'li',blockquote:'blockquote',codeBlock:'pre'}[node.type]||(node.type==='heading'?`h${node.attrs?.level||2}`:'p');
 const attrs=textAttrs(node.type,node.attrs),styles=[];if(attrs.textAlign)styles.push(`text-align:${attrs.textAlign}`);if(attrs.lineHeight!==undefined)styles.push(`line-height:${attrs.lineHeight}`);for(const [key,css] of [['spaceBefore','margin-top'],['spaceAfter','margin-bottom'],['letterSpacing','letter-spacing']])if(attrs[key]!==undefined)styles.push(lengthStyle(css,attrs[key]));
 return `<${tag}${node.type==='orderedList'&&attrs.start!==undefined?` start="${attrs.start}"`:''}${styles.length?` style="${esc(styles.join(';'))}"`:''}>${html||'<br>'}</${tag}>`;
}
