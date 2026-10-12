import {Editor,generateHTML} from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import interact from 'interactjs';
import {WIDTH,uid,textDoc,blankPost,blankBook,height,bounds,phoneLayout,validateBook} from './model.js';
import {load,save} from './storage.js';
import './style.css';
import './y2k.css';
import './cloud.css';
import {createCloudClient,jpegForUpload,dataUrl} from './cloud.js';
import {MEDIA_PATH} from '../shared/document.js';
import {renderComposition} from '../shared/renderer.js';
import {layoutReading} from '../shared/reading-layout.js';
import '../blog/src/reader.css';

const $=s=>document.querySelector(s),clone=x=>structuredClone(x);
let book=blankBook(),activeId=book.posts[0].id,mode='write',selection=new Set(),editors=new Map(),scale=1,extraHeight=0;
let undo=[],redo=[],saveTimer,saveChain=Promise.resolve(),typingAt=0,view='editor',previewWidth=350,drawing=null,resizeObserver;
const extensions=[StarterKit.configure({undoRedo:false,link:{openOnClick:false,HTMLAttributes:{rel:'noopener noreferrer'}}})];
const post=()=>book.posts.find(p=>p.id===activeId);
const status=text=>{$('#status').textContent=text;};
function toast(message){$('#toast').textContent=message;$('#toast').classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.add('hidden'),5000);}
function checkpoint(){undo.push(clone(book));if(undo.length>80)undo.shift();redo=[];typingAt=0;updateHistory();}
function changed(){post().localVersion=(post().localVersion||0)+1;status('Saving on this device…');clearTimeout(saveTimer);saveTimer=setTimeout(persist,350);updateCounts();updateCloudControls();}
function persist(){clearTimeout(saveTimer);const snapshot=clone(book);saveChain=saveChain.catch(()=>{}).then(()=>save(snapshot)).then(()=>status('Saved on this device')).catch(()=>{status('Local save failed · export a backup');toast('Device storage is unavailable or full. Export a backup to keep your work.');});return saveChain;}
function updateHistory(){$('#undo').disabled=!undo.length;$('#redo').disabled=!redo.length;}
function history(direction){if(drawing)return;const from=direction==='undo'?undo:redo,to=direction==='undo'?redo:undo;if(!from.length)return;to.push(clone(book));book=from.pop();if(!book.posts.some(p=>p.id===activeId))activeId=book.posts[0].id;selection.clear();render();changed();}

$('#app').innerHTML=`
<header class="top"><div class="brand">baby teeth</div><span class="tag">a glittery little corner of the internet</span><span class="prototype">EDITOR PROTOTYPE</span><span class="status" id="status" role="status">Opening local drafts…</span><button class="preview-toggle" id="preview">Reading preview ↗</button></header>
<div class="layout" id="editor-view"><aside class="sidebar"><span class="eyebrow">Your scrapbook</span><h2>my little entries</h2><button id="new-entry" class="primary">+ Blank entry</button><div class="entries" id="entries"></div><p class="quiet">welcome 2 my scrapbook ♥ words, photos & doodles.</p><div class="bottom"><button id="export">Export backup ↓</button><button id="import">Import backup</button><button id="stress">Open large test entry</button><button id="help">How to test</button><p class="quiet">Drafts stay in this browser.<br>Nothing is published yet.</p></div></aside>
<main class="main"><div class="workhead"><input class="title" id="title" aria-label="Entry title" maxlength="500"><span class="count" id="count"></span></div>
<div class="cloudbar"><button id="github-login">Sign in with GitHub</button><button id="github-load" disabled>Open online entries</button><button id="github-save" disabled>Save draft online</button><button id="github-publish" disabled>Publish entry</button><button id="github-unpublish" class="hidden">Unpublish</button><button id="github-copy" class="hidden">Keep as a new copy</button><span id="cloud-state" role="status">Checking online saving…</span><a id="public-blog" href="https://chief-teef.github.io/baby-teeth/" target="_blank" rel="noopener">Public blog ↗</a></div>
<div class="toolbar"><div class="segmented" aria-label="Editor mode"><button data-mode="write">Write</button><button data-mode="arrange">Move & resize</button><button data-mode="draw">Draw</button></div><button id="add-text">+ Text box</button><button id="add-photo">+ Photos</button><button id="undo" class="compact" aria-label="Undo">↶</button><button id="redo" class="compact" aria-label="Redo">↷</button>
<div class="formatbar" id="format"><button data-format="bold"><b>B</b></button><button data-format="italic"><i>I</i></button><button data-format="heading">H2</button><button data-format="bulletList">List</button><button data-format="link">Link</button></div>
<div class="drawbar hidden" id="draw-tools"><label>Ink <input id="ink" type="color" value="#ff1493"></label><label>Width <input id="pen-width" type="range" min="1" max="16" value="4"></label><button id="eraser">Stroke eraser</button></div></div>
<div id="inspector" class="inspector hidden"></div><div class="notice" id="notice"></div><div class="workspace"><div class="stage-wrap" id="stage-wrap"><div class="stage" id="stage"><svg class="drawing-surface" id="drawing-surface"></svg><div class="empty" id="empty"><h3>A blank page, just for you.</h3><p>Add a text box or some photos. Leave a little room for a doodle.</p></div></div></div><button id="grow" class="grow">+ More room at the bottom</button></div></main></div>
<section id="reader" class="reader hidden"></section><input id="photos" type="file" accept="image/*" multiple hidden><input id="archive" type="file" accept="application/json,.json" hidden><div class="toast hidden" id="toast" role="status"></div>
<dialog id="help-dialog"><h2>Your scrapbook studio</h2><p><b>Write:</b> add text boxes and type or paste from Google Docs.<br><b>Move & resize:</b> drag a photo, text box, or its Drag label. Select an object and drag its corner handle to resize.<br><b>Draw:</b> Pencil draws, fingers scroll.<br><b>Group:</b> select objects together to attach a doodle to a photo.</p><p><b>On this device:</b> automatic recovery.<br><b>Save draft online:</b> available on your other signed-in devices.<br><b>Publish:</b> makes a new entry public after the site build.<br><b>Save & update site:</b> updates an already published entry.<br>Export a backup before clearing browser data. Offline reopening is still pending.</p><div class="actions"><button id="close-help" class="primary">Got it</button></div></dialog>
<dialog id="online-dialog"><h2>Online entries</h2><p>Your current local entries stay on this device. Open an online entry as a separate working copy.</p><div id="online-list"></div><div class="actions"><button id="close-online">Close</button></div></dialog>`;

try{const saved=await load();if(saved){book=validateBook(saved);if(!book.posts.length)book=blankBook();activeId=book.posts[0].id;}status('Saved on this device');}catch{status('Local recovery unavailable');toast('Could not open local drafts. You can still edit and export a backup.');}
let multi=false,erase=false;
const cloud=createCloudClient();let cloudSession={configured:false,signedIn:false},cloudBusy=false,cloudMessage='Checking online saving…';
let deploymentTimer;
function updateCloudControls(){
  if(!$('#cloud-state'))return;
  const p=post(),published=p?.cloud?.status==='published';
  $('#github-login').textContent=cloudSession.signedIn?`Sign out (${cloudSession.login})`:'Sign in with GitHub';
  $('#github-login').disabled=cloudBusy;
  $('#github-load').disabled=cloudBusy||!cloudSession.signedIn;
  $('#github-save').disabled=cloudBusy||!cloudSession.signedIn;
  $('#github-publish').disabled=cloudBusy||!cloudSession.signedIn||published;
  $('#github-unpublish').classList.toggle('hidden',!published);$('#github-unpublish').disabled=cloudBusy||!cloudSession.signedIn;
  $('#github-save').textContent=published?'Save & update site':'Save draft online';
  $('#github-copy').classList.toggle('hidden',!p?.cloud?.conflict);
  $('#cloud-state').textContent=cloudBusy?cloudMessage:p?.cloud?.conflict?'Conflict · your local work is preserved':p?.cloud?.publishing?'Saved to GitHub · publishing…':p?.cloud?.deployment&&p.cloud.deployment!=='success'?'Saved to GitHub · site update failed or unconfirmed':p?.cloud?.revision?(p.cloud.savedVersion===(p.localVersion||0)?(published?(p.cloud.deployment==='success'?'Live · this revision is published':'Published entry · saved to GitHub'):'Draft saved to GitHub'):'Local changes · not yet saved online'):(cloudSession.signedIn?'This entry is only on this device':cloudMessage);
}
async function checkCloud(){cloudSession=await cloud.check();cloudMessage=cloudSession.unavailable?'Online saving unavailable · local drafts are safe':cloudSession.configured?(cloudSession.signedIn?'Signed in · local changes need an online save':'Sign in to save across devices'):'Local editor · online saving setup pending';updateCloudControls();}
async function saveOnline(action){
  if(cloudBusy)return;finishDrawing();await persist();const target=post(),snapshot=clone(target),savedVersion=target.localVersion||0;
  cloudBusy=true;cloudMessage='Preparing online save…';updateCloudControls();
  try{
    const receipts={};let count=0;const photos=snapshot.elements.filter(e=>e.type==='photo');
    for(const e of photos){
      if(!MEDIA_PATH.test(e.assetPath||'')){cloudMessage=`Uploading photo ${++count} of ${photos.length}…`;updateCloudControls();const upload=await cloud.upload(await jpegForUpload(e.src));e.assetPath=upload.path;receipts[upload.path]=upload.receipt;}
      if(e.assetReceipt)receipts[e.assetPath]=e.assetReceipt;
      const local=target.elements.find(x=>x.id===e.id);if(local){local.assetPath=e.assetPath;local.assetReceipt=receipts[e.assetPath]||local.assetReceipt;}
      e.src=e.assetPath;delete e.assetPath;
    }
    cloudMessage='Saving to GitHub…';updateCloudControls();
    const result=await cloud.save(snapshot.id,{post:snapshot,baseRevision:snapshot.cloud?.revision||null,action,receipts});
    target.cloud={revision:result.revision,commit:result.commit,status:result.post.status,savedVersion,publishing:result.publishing,publishedAt:result.post.publishedAt};
    cloudMessage=result.publishing?'Saved · publication build started':'Saved to GitHub';await persist();
    if(result.publishing)monitorDeployment(target.id,result.commit);toast(result.publishing?'Saved to GitHub. Waiting for the public site build.':'Draft saved online. It is not public.');
  }catch(error){cloudMessage=error.message;if(error.status===401)await checkCloud();if(error.status===409){target.cloud={...target.cloud,conflict:true};await persist();}if(error.status===400&&/Photo upload/.test(error.message)){target.elements.filter(e=>e.type==='photo').forEach(e=>{delete e.assetPath;delete e.assetReceipt;});}toast(error.message);}finally{cloudBusy=false;updateCloudControls();}
}
async function monitorDeployment(id,commit){
  clearTimeout(deploymentTimer);
  try{const state=await cloud.deployment(commit);const target=book.posts.find(p=>p.id===id);if(!target||target.cloud?.commit!==commit)return;
    if(state.status==='completed'){target.cloud.publishing=false;target.cloud.deployment=state.conclusion;cloudMessage=state.conclusion==='success'?'Public site updated':'Saved to GitHub · site build failed';await persist();toast(cloudMessage);updateCloudControls();return;}
    deploymentTimer=setTimeout(()=>monitorDeployment(id,commit),15000);
  }catch{const target=book.posts.find(p=>p.id===id);if(target?.cloud?.commit===commit){target.cloud.publishing=false;target.cloud.deployment='unknown';await persist();}cloudMessage='Saved to GitHub · deployment status unavailable';updateCloudControls();}
}
async function openOnlineEntries(){
  if(cloudBusy)return;cloudBusy=true;cloudMessage='Opening online entries…';updateCloudControls();
  try{const result=await cloud.list();const list=$('#online-list');list.replaceChildren();if(!result.posts.length)list.textContent='No online entries yet. Save a draft to create the first one.';
    for(const entry of result.posts){const button=document.createElement('button');button.textContent=`${entry.title||`Entry ${entry.id.slice(0,8)}`} · ${entry.status||'saved'}`;button.onclick=()=>loadOnlineEntry(entry.id);list.append(button);}$('#online-dialog').showModal();
  }catch(error){toast(error.message);}finally{cloudBusy=false;updateCloudControls();}
}
async function loadOnlineEntry(id){
  if(cloudBusy)return;cloudBusy=true;cloudMessage='Loading online entry…';updateCloudControls();
  try{const result=await cloud.get(id),loaded=result.post;
    for(const e of loaded.elements.filter(e=>e.type==='photo')){if(!MEDIA_PATH.test(e.src))throw Error('Invalid online photo reference.');e.assetPath=e.src;const response=await fetch(`https://raw.githubusercontent.com/chief-teef/baby-teeth/main/${e.src}`);if(!response.ok)throw Error('An online photo could not be loaded. Retry later.');e.src=await dataUrl(await response.blob());}
    validateBook({version:1,posts:[loaded]});checkpoint();const existing=book.posts.find(p=>p.id===id);
    if(existing){const copy=clone(existing);copy.id=uid();copy.title=`${copy.title} (local recovery copy)`;delete copy.cloud;book.posts.push(copy);book.posts=book.posts.filter(p=>p!==existing);}
    loaded.localVersion=0;loaded.cloud={revision:result.revision,status:loaded.status,savedVersion:0,publishedAt:loaded.publishedAt};book.posts.push(loaded);activeId=loaded.id;selection.clear();render();await persist();$('#online-dialog').close();toast(existing?'Online entry opened. Your previous local version is kept as a recovery copy.':'Online entry opened on this device.');
  }catch(error){toast(error.message);}finally{cloudBusy=false;cloudMessage='Signed in · online entries available';updateCloudControls();}
}
function renderEntries(){const root=$('#entries');root.replaceChildren();[...book.posts].reverse().forEach(p=>{const b=document.createElement('button');b.className=`entry ${p.id===activeId?'selected':''}`;const t=document.createElement('span');t.textContent=p.title||'Untitled entry';const s=document.createElement('small');s.textContent=`${p.elements.length} objects · local draft`;b.append(t,s);b.onclick=()=>{finishDrawing();activeId=p.id;selection.clear();extraHeight=0;render();};root.append(b);});}
function render(){editors.forEach(e=>e.destroy());editors.clear();resizeObserver?.disconnect();renderEntries();$('#title').value=post().title;const stage=$('#stage');stage.querySelectorAll('.object').forEach(e=>{interact(e).unset();e.remove();});post().elements.forEach(mount);resizeObserver=new ResizeObserver(entries=>{for(const entry of entries){const e=post().elements.find(e=>e.id===entry.target.dataset.id);if(e?.type==='text'){const next=Math.ceil(entry.target.scrollHeight);if(Math.abs(e.h-next)>1){e.h=next;updateStage();changed();}}}});stage.querySelectorAll('.object.text').forEach(el=>resizeObserver.observe(el));updateMode();updateSelection();updateStage();updateCounts();updateHistory();updateCloudControls();}
function updateCounts(){const p=post();$('#count').textContent=`${p.elements.filter(e=>e.type==='photo').length} photos · ${p.elements.filter(e=>e.type==='text').length} text boxes`;$('#empty').classList.toggle('hidden',!!p.elements.length);}
function updateStage(){const available=$('#stage-wrap').parentElement.clientWidth-26;scale=Math.min(1,available/WIDTH);const h=height(post().elements)+extraHeight;$('#stage').style.width=`${WIDTH}px`;$('#stage').style.height=`${h}px`;$('#stage').style.transform=`scale(${scale})`;$('#stage-wrap').style.width=`${WIDTH*scale}px`;$('#stage-wrap').style.height=`${h*scale}px`;$('#drawing-surface').setAttribute('viewBox',`0 0 ${WIDTH} ${h}`);}
function setObjectStyle(el,e){el.style.left=`${e.x}px`;el.style.top=`${e.y}px`;el.style.width=`${e.w}px`;if(e.type!=='text')el.style.height=`${e.h}px`;el.style.transform=`rotate(${e.rotation}deg)`;}
function paths(svg,strokes){svg.replaceChildren();strokes.forEach(s=>{const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',s.points.map((pt,i)=>`${i?'L':'M'}${pt[0]},${pt[1]}`).join(' '));p.setAttribute('fill','none');p.setAttribute('stroke',s.color);p.setAttribute('stroke-width',s.size);p.setAttribute('stroke-linecap','round');p.setAttribute('stroke-linejoin','round');svg.append(p);});}
function mount(e){const el=document.createElement('div');el.className=`object ${e.type}`;el.dataset.id=e.id;setObjectStyle(el,e);
  if(e.type==='text'){const editor=new Editor({element:el,extensions,content:e.doc,editable:mode==='write',onFocus:()=>{selection=new Set([e.id]);updateSelection();},onUpdate:({editor})=>{if(Date.now()-typingAt>800)checkpoint();typingAt=Date.now();e.doc=editor.getJSON();e.h=Math.max(48,el.scrollHeight);changed();updateStage();}});editors.set(e.id,editor);}
  else if(e.type==='photo'){const img=document.createElement('img');img.src=e.src;img.alt=e.alt;img.draggable=false;el.append(img);}
  else {const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${e.sourceW} ${e.sourceH}`);paths(svg,e.strokes);el.append(svg);}
  const grab=document.createElement('span');grab.className='grab';grab.textContent='↔ Drag';grab.setAttribute('aria-hidden','true');el.append(grab);
  const handle=document.createElement('span');handle.className='resize';handle.setAttribute('aria-hidden','true');el.append(handle);
  el.addEventListener('pointerdown',ev=>{if(mode!=='arrange')return;if(multi){if(selection.has(e.id))selection.delete(e.id);else selection.add(e.id);}else if(!selection.has(e.id)){selection=new Set(e.group?post().elements.filter(x=>x.group===e.group).map(x=>x.id):[e.id]);}updateSelection();});
  $('#stage').insertBefore(el,$('#drawing-surface'));
  interact(el).draggable({enabled:mode==='arrange',ignoreFrom:'.resize',listeners:{start(){if(!selection.has(e.id))selection=new Set([e.id]);checkpoint();},move(ev){const dx=ev.dx/scale,dy=ev.dy/scale;const selected=post().elements.filter(x=>selection.has(x.id));const minX=Math.min(...selected.map(x=>bounds(x).x));const minY=Math.min(...selected.map(x=>bounds(x).y));const shiftX=Math.max(dx,-minX),shiftY=Math.max(dy,-minY);selected.forEach(x=>{x.x+=shiftX;x.y+=shiftY;const dom=$(`[data-id="${x.id}"]`);if(dom)setObjectStyle(dom,x);});updateStage();},end(){changed();updateSelection();}}}).resizable({enabled:mode==='arrange',edges:{bottom:'.resize',right:'.resize'},listeners:{start(){checkpoint();},move(ev){const old=e.w;e.w=Math.max(80,Math.min(880,e.w+ev.deltaRect.width/scale));if(e.type!=='text')e.h=Math.max(30,e.h*e.w/old);setObjectStyle(el,e);updateStage();},end(){changed();updateSelection();}}});
}
function updateMode(){document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));$('#stage').className=`stage mode-${mode}`;$('#format').classList.toggle('hidden',mode!=='write');$('#draw-tools').classList.toggle('hidden',mode!=='draw');editors.forEach(e=>e.setEditable(mode==='write'));document.querySelectorAll('.object').forEach(el=>{interact(el).draggable({enabled:mode==='arrange'}).resizable({enabled:mode==='arrange'});});$('#notice').textContent=mode==='write'?'Write · tap a text box to type. To move photos or text, choose Move & resize above.':mode==='arrange'?'Move & resize · press any photo, text box, or Drag label and drag it. Tap to select, then drag its corner dot to resize.':'Draw · Pencil makes marks; fingers scroll. Mouse drawing also works on desktop.';if(mode==='draw'){$('#notice').replaceChildren(document.createTextNode('Draw · Pencil draws; fingers scroll. '));const b=document.createElement('button');b.textContent='Finish doodle';b.onclick=finishDrawing;$('#notice').append(b);}updateSelection();}
function updateSelection(){document.querySelectorAll('.object').forEach(el=>{el.classList.toggle('selected',selection.has(el.dataset.id));});const root=$('#inspector');root.replaceChildren();root.classList.toggle('hidden',mode!=='arrange');if(mode!=='arrange')return;
  const addButton=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=fn;root.append(b);return b;};
  const multiButton=addButton(multi?'Multi-select on':'Multi-select',()=>{multi=!multi;updateSelection();});multiButton.classList.toggle('active',multi);
  const chosen=post().elements.filter(e=>selection.has(e.id));const note=document.createElement('span');note.textContent=chosen.length?`${chosen.length} selected`:'Tap an object to arrange it';root.append(note);if(!chosen.length)return;
  if(chosen.length===1){const e=chosen[0];for(const [label,key] of [['X','x'],['Y','y'],['Width','w'],['Rotate','rotation']]){const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.type='number';input.value=Math.round(e[key]);input.setAttribute('aria-label',`${label} of selected object`);input.onchange=()=>{let n=Number(input.value);if(!Number.isFinite(n))return;checkpoint();if(key==='w'){n=Math.max(80,Math.min(880,n));if(e.type!=='text')e.h*=n/e.w;}else if(key==='rotation')n=Math.max(-180,Math.min(180,n));else n=Math.max(0,Math.min(50000,n));e[key]=n;setObjectStyle($(`[data-id="${e.id}"]`),e);updateStage();changed();};wrap.append(input);root.append(wrap);}if(e.type==='photo'){const wrap=document.createElement('label');wrap.textContent='Description';const i=document.createElement('input');i.type='text';i.value=e.alt;i.placeholder='What’s in this photo?';i.onchange=()=>{checkpoint();e.alt=i.value;$(`[data-id="${e.id}"] img`).alt=i.value;changed();};wrap.append(i);root.append(wrap);}}
  addButton('Duplicate',()=>{checkpoint();const groupMap=new Map();chosen.forEach(e=>{const copy=clone(e);copy.id=uid();copy.x+=25;copy.y+=25;if(copy.group){if(!groupMap.has(copy.group))groupMap.set(copy.group,uid());copy.group=groupMap.get(copy.group);}post().elements.push(copy);});render();changed();});
  addButton('Front',()=>{checkpoint();post().elements=[...post().elements.filter(e=>!selection.has(e.id)),...chosen];render();changed();});
  addButton('Back',()=>{checkpoint();post().elements=[...chosen,...post().elements.filter(e=>!selection.has(e.id))];render();changed();});
  if(chosen.length>1)addButton('Group',()=>{checkpoint();const id=uid();chosen.forEach(e=>e.group=id);multi=false;changed();updateSelection();});
  if(chosen.some(e=>e.group))addButton('Ungroup',()=>{checkpoint();const ids=new Set(chosen.map(e=>e.group).filter(Boolean));post().elements.forEach(e=>{if(ids.has(e.group))delete e.group;});changed();updateSelection();});
  addButton('Delete',()=>{checkpoint();post().elements=post().elements.filter(e=>!selection.has(e.id));selection.clear();render();changed();});
}
function addText(){finishDrawing();checkpoint();const e={id:uid(),type:'text',doc:textDoc(''),x:80,y:post().elements.length?Math.max(...post().elements.map(e=>e.y+e.h))+35:70,w:360,h:55,rotation:0};post().elements.push(e);mode='write';render();selection=new Set([e.id]);editors.get(e.id).commands.focus();$(`[data-id="${e.id}"]`).scrollIntoView({block:'center',behavior:'smooth'});changed();}
async function processPhoto(file){if(file.size>35*1024*1024)throw Error(`${file.name}: file is over the 35 MB prototype limit.`);let image;try{image=await createImageBitmap(file,{imageOrientation:'from-image'});}catch{throw Error(`${file.name}: this browser cannot decode it. Export it as JPEG, PNG, or WebP for this prototype.`);}if(image.width*image.height>80000000){image.close();throw Error(`${file.name}: image dimensions are too large.`);}const ratio=Math.min(1,1600/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.round(image.width*ratio);canvas.height=Math.round(image.height*ratio);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);image.close();const src=canvas.toDataURL('image/jpeg',.8),w=330,h=w*canvas.height/canvas.width;return {id:uid(),type:'photo',src,alt:'',w,h,x:100,y:80,rotation:0};}
$('#photos').onchange=async ev=>{const files=[...ev.target.files];ev.target.value='';if(!files.length)return;const target=post();checkpoint();let done=0;const errors=[];$('#add-photo').disabled=true;for(const file of files){try{const e=await processPhoto(file);e.y=target.elements.length?Math.max(...target.elements.map(e=>e.y+e.h))+35:80;target.elements.push(e);if(target.id===activeId){mount(e);updateStage();updateCounts();}changed();}catch(e){errors.push(e.message);}done++;status(`Processing photo ${done} of ${files.length}…`);await new Promise(r=>setTimeout(r,0));}$('#add-photo').disabled=false;await persist();if(errors.length)toast(errors.join(' '));else toast(`${done} photos added. Choose Move & resize above, then press and drag a photo.`);};

function point(ev){const r=$('#stage').getBoundingClientRect();return [(ev.clientX-r.left)/scale,(ev.clientY-r.top)/scale];}
function finishDrawing(){if(!drawing||!drawing.strokes.length)return;const pts=drawing.strokes.flatMap(s=>s.points),pad=20,minX=Math.max(0,Math.min(...pts.map(p=>p[0]))-pad),minY=Math.max(0,Math.min(...pts.map(p=>p[1]))-pad),maxX=Math.max(...pts.map(p=>p[0]))+pad,maxY=Math.max(...pts.map(p=>p[1]))+pad;const w=Math.max(40,maxX-minX),h=Math.max(40,maxY-minY);const e={id:uid(),type:'drawing',x:minX,y:minY,w,h,sourceW:w,sourceH:h,rotation:0,strokes:drawing.strokes.map(s=>({...s,points:s.points.map(p=>[p[0]-minX,p[1]-minY])}))};checkpoint();post().elements.push(e);drawing=null;$('#drawing-surface').replaceChildren();mount(e);changed();updateStage();}
const surface=$('#drawing-surface');let stroke,inkPointerId=null;
const fingers=new Map();
// Native pan-y permits Safari to scroll/cancel a Pencil pointer. Draw mode
// disables native panning up front and handles finger navigation explicitly.
surface.onpointerdown=ev=>{
  if(mode!=='draw')return;
  ev.preventDefault();
  if(ev.pointerType==='touch'){
    fingers.set(ev.pointerId,{y:ev.clientY,blocked:inkPointerId!==null});
    surface.setPointerCapture(ev.pointerId);
    return;
  }
  if(inkPointerId!==null)return;
  inkPointerId=ev.pointerId;
  fingers.forEach(finger=>finger.blocked=true);
  surface.setPointerCapture(ev.pointerId);
  const pt=point(ev);
  if(erase){const hit=[...post().elements].reverse().find(e=>e.type==='drawing'&&pt[0]>=e.x&&pt[0]<=e.x+e.w&&pt[1]>=e.y&&pt[1]<=e.y+e.h);if(hit){checkpoint();hit.strokes.pop();if(!hit.strokes.length)post().elements=post().elements.filter(e=>e.id!==hit.id);render();changed();}return;}
  if(!drawing)drawing={strokes:[]};
  stroke={color:$('#ink').value,size:Number($('#pen-width').value),points:[pt,[pt[0]+.01,pt[1]+.01]]};
  drawing.strokes.push(stroke);paths(surface,drawing.strokes);
};
surface.onpointermove=ev=>{
  if(mode!=='draw')return;
  const finger=fingers.get(ev.pointerId);
  if(finger){
    ev.preventDefault();
    const delta=finger.y-ev.clientY;finger.y=ev.clientY;
    if(!finger.blocked&&inkPointerId===null&&fingers.size===1)window.scrollBy(0,delta);
    return;
  }
  if(ev.pointerId!==inkPointerId||!stroke)return;
  ev.preventDefault();
  const samples=ev.getCoalescedEvents?.();
  for(const event of samples?.length?samples:[ev]){const p=point(event),last=stroke.points.at(-1);if(Math.hypot(p[0]-last[0],p[1]-last[1])>.8)stroke.points.push(p);}
  paths(surface,drawing.strokes);
};
function endPointer(ev){
  if(fingers.delete(ev.pointerId))return;
  if(ev.pointerId!==inkPointerId)return;
  inkPointerId=null;stroke=null;finishDrawing();
}
surface.onpointerup=endPointer;
surface.onpointercancel=endPointer;
surface.onlostpointercapture=endPointer;

function safeText(doc){try{const template=document.createElement('template');template.innerHTML=generateHTML(doc,extensions);template.content.querySelectorAll('a').forEach(a=>{if(!/^https?:\/\//i.test(a.getAttribute('href')||''))a.removeAttribute('href');a.setAttribute('rel','noopener noreferrer');});return template.innerHTML;}catch{return '<p>Text could not be rendered.</p>';}}
function readerObject(e){const el=document.createElement('div');el.className=`object ${e.type}`;setObjectStyle(el,e);if(e.type==='text'){el.classList.add('reader-text');el.innerHTML=safeText(e.doc);}else if(e.type==='photo'){const img=document.createElement('img');img.src=e.src;img.alt=e.alt;img.loading='lazy';img.width=Math.round(e.w);img.height=Math.round(e.h);el.append(img);}else{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${e.sourceW} ${e.sourceH}`);paths(svg,e.strokes);svg.setAttribute('aria-hidden','true');el.append(svg);}return el;}
function showPreview(){
  finishDrawing();view='reader';$('#editor-view').classList.add('hidden');$('#reader').classList.remove('hidden');$('#preview').textContent='← Back to editor';
  const root=$('#reader');root.replaceChildren();const head=document.createElement('div');head.className='reader-head';head.innerHTML='<span class="eyebrow">Reading preview</span><h1>my little life ♥</h1><p>Preview uses the same layout as the public blog. Unsaved changes are included.</p>';
  const controls=document.createElement('div');controls.className='reader-controls';
  for(const [name,w] of [['Phone',350],['Tablet',700],['Desktop',900]]){const b=document.createElement('button');b.textContent=name;b.classList.toggle('active',previewWidth===w);b.onclick=()=>{previewWidth=w;showPreview();};controls.append(b);}head.append(controls);root.append(head);
  [...book.posts].reverse().forEach(p=>{
    const entry=document.createElement('article');entry.className='reader-entry';entry.style.maxWidth=`${previewWidth}px`;
    const header=document.createElement('header'),title=document.createElement('h2'),date=document.createElement('time');title.textContent=p.title||'Untitled entry';date.textContent=new Date(p.cloud?.publishedAt||p.created).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'});header.append(title,date);
    const content=document.createElement('div');content.innerHTML=renderComposition(p,'');entry.append(header,...content.childNodes);root.append(entry);
    layoutReading(entry.querySelector('[data-canvas]'));
  });window.scrollTo(0,0);
}
function exportBook(){finishDrawing();const a=document.createElement('a');const url=URL.createObjectURL(new Blob([JSON.stringify(book)],{type:'application/json'}));a.href=url;a.download=`baby-teeth-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
$('#archive').onchange=async ev=>{const file=ev.target.files[0];ev.target.value='';if(!file)return;try{if(file.size>100*1024*1024)throw Error('Archive exceeds the 100 MB prototype limit.');const incoming=validateBook(JSON.parse(await file.text()));for(const p of incoming.posts)for(const e of p.elements)if(e.type==='text')generateHTML(e.doc,extensions);checkpoint();const existing=new Set(book.posts.map(p=>p.id));incoming.posts.forEach(p=>{if(existing.has(p.id)){p.id=uid();delete p.cloud;}book.posts.push(p);});activeId=book.posts.at(-1).id;selection.clear();render();changed();toast('Archive imported as additional entries. Existing entries are preserved.');}catch(e){toast(`Import failed: ${e.message}`);}};
function stressEntry(){finishDrawing();checkpoint();const p=blankPost();p.title='A bigger little entry · capacity test';for(let i=0;i<20;i++){const c=document.createElement('canvas');c.width=600;c.height=450;const ctx=c.getContext('2d');ctx.fillStyle=['#c6d4b8','#e4c6ba','#c9d7d8','#dfd5af'][i%4];ctx.fillRect(0,0,600,450);ctx.fillStyle='#fffefa';ctx.beginPath();ctx.arc(310,180,85,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5b6654';ctx.font='30px Georgia';ctx.fillText(`Photo study ${i+1}`,55,365);p.elements.push({id:uid(),type:'photo',src:c.toDataURL('image/jpeg',.75),alt:`Sample photo ${i+1}`,x:i%2?490:70,y:100+Math.floor(i/2)*540,w:300,h:225,rotation:i%2?4:-3});}for(let i=0;i<30;i++)p.elements.push({id:uid(),type:'text',doc:textDoc(i%3===0?'Little things I want to remember. The light through the window, a walk with nowhere to go, and the way an ordinary afternoon becomes a memory.':`A small note, number ${i+1}. Write anything here.`),x:i%2?470:90,y:355+Math.floor(i/3)*540+(i%3===2?130:0),w:320,h:100,rotation:0});book.posts.push(p);activeId=p.id;selection.clear();render();changed();toast('20 sample photos + 30 editable text boxes. Your other entries are preserved.');}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{finishDrawing();mode=b.dataset.mode;updateMode();});
$('#new-entry').onclick=()=>{finishDrawing();checkpoint();const p=blankPost();book.posts.push(p);activeId=p.id;selection.clear();extraHeight=0;render();changed();};
$('#title').oninput=()=>{if(Date.now()-typingAt>800)checkpoint();typingAt=Date.now();post().title=$('#title').value;renderEntries();changed();};
$('#add-text').onclick=addText;$('#add-photo').onclick=()=>{finishDrawing();$('#photos').click();};$('#undo').onclick=()=>history('undo');$('#redo').onclick=()=>history('redo');$('#grow').onclick=()=>{extraHeight+=600;updateStage();};$('#eraser').onclick=()=>{erase=!erase;$('#eraser').classList.toggle('active',erase);};
document.querySelectorAll('[data-format]').forEach(b=>{b.onpointerdown=ev=>ev.preventDefault();b.onclick=()=>{const editor=editors.get([...selection][0]);if(!editor)return toast('Tap inside a text box first.');const chain=editor.chain().focus();switch(b.dataset.format){case 'bold':chain.toggleBold().run();break;case 'italic':chain.toggleItalic().run();break;case 'heading':chain.toggleHeading({level:2}).run();break;case 'bulletList':chain.toggleBulletList().run();break;case 'link':{const url=prompt('Link address (https://…)');if(url===null)return;if(!url.trim())chain.unsetLink().run();else if(/^https?:\/\//i.test(url))chain.setLink({href:url}).run();else toast('Use an https:// or http:// link.');}}};});
$('#preview').onclick=()=>{if(view==='editor')showPreview();else{view='editor';$('#reader').classList.add('hidden');$('#editor-view').classList.remove('hidden');$('#preview').textContent='Reading preview ↗';updateStage();}};
$('#export').onclick=exportBook;$('#import').onclick=()=>$('#archive').click();$('#stress').onclick=stressEntry;$('#help').onclick=()=>$('#help-dialog').showModal();$('#close-help').onclick=()=>$('#help-dialog').close();
window.addEventListener('resize',()=>{if(view==='editor')updateStage();});document.addEventListener('visibilitychange',()=>{if(document.hidden){finishDrawing();persist();}});window.addEventListener('pagehide',()=>{finishDrawing();persist();});window.addEventListener('keydown',ev=>{if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='z'){ev.preventDefault();history(ev.shiftKey?'redo':'undo');}if(ev.key==='Escape'){finishDrawing();selection.clear();updateSelection();}});
render();
$('#github-login').onclick=async()=>{if(cloudSession.signedIn){try{await cloud.logout();await checkCloud();}catch(error){toast(error.message);}}else if(cloudSession.configured)cloud.login();else toast('Online saving setup is pending. Keep using this editor and export a backup before moving to the connected studio.');};
$('#github-save').onclick=()=>saveOnline('save');
$('#github-publish').onclick=()=>{if(confirm('Publish this entry so anyone can read it on the public blog?'))saveOnline('publish');};
$('#github-unpublish').onclick=()=>{if(confirm('Remove this entry from the public blog after the next build? Its saved draft and repository history will remain.'))saveOnline('unpublish');};
$('#github-load').onclick=openOnlineEntries;
$('#close-online').onclick=()=>$('#online-dialog').close();
$('#github-copy').onclick=()=>{checkpoint();const p=clone(post());p.id=uid();p.title=`${p.title} (copy)`;delete p.cloud;book.posts.push(p);activeId=p.id;render();changed();toast('Local work kept as a new entry. You can save this copy online.');};
checkCloud();
