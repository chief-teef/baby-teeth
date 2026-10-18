import {fontFamily} from '../shared/font-registry.js';

import {musicEditor} from './music-editor.js';
import {PAGE,geometryOverflow,OVERFLOW_MESSAGE,entryDate,entryLabel,entryPages,entryElements,pageGeometry} from '../shared/notebook-format.js';
import {renderNotebook,measureNotebook} from '../shared/notebook-renderer.js';
import rawSettings from '../config/blog.json';
import {validateSettings} from '../shared/settings.js';
const settings=validateSettings(rawSettings);
import {createTextEditor,extensions,generateHTML,installDocumentPaste} from './text-editor.js';
import {processPhoto} from './photo-processing.js';
import {createPageComposition} from './page-composition.js';
import {mountTextToolbar} from './text-toolbar.js';
import interact from 'interactjs';
import {WIDTH,uid,textDoc,blankPost,blankBook,bounds,validateBook,migratePost} from './model.js';
import {load,save,recoveryCopies} from './storage.js';
import './style.css';
import './notebook-studio.css';
import './desktop-shell.css';
import {mountEditorProps} from './editor-props.js';
import {orderedEntries,paperColor} from '../shared/paper-colors.js';
import './cloud.css';
import {createCloudClient,jpegForUpload,dataUrl,mediaForRecovery,storageNotice} from './cloud.js';
import {MEDIA_PATH,parseMediaPath} from '../shared/document.js';
import {renderComposition,renderMusic} from '../shared/renderer.js';
import {layoutReading} from '../shared/reading-layout.js';
import '../blog/src/reader.css';

document.body.classList.add('studio');
const $=s=>document.querySelector(s),clone=x=>structuredClone(x);
const interaction=element=>interact(element);
let book=blankBook(),activeId=book.posts[0].id,mode='arrange',selection=new Set(),editors=new Map(),scale=1;
let undo=[],redo=[],saveTimer,saveChain=Promise.resolve(),typingAt=0,view='editor',resizeObserver;
let activePageId=null,composition=null,textToolbar=null,editorProps=null;
let propertiesOpen=false,mutationRevision=0,storageTicket=0,matLeft=0,matTop=0;
let previewScroll={x:0,y:0};
let previewFocus=null,lastEditorFocus=null;
let publicContext=null,colorProvisional=true,previewEntryIndex=0;
let previewBook=null,fitTimer,fitErrors=[],fitGeneration=0,recoveryBlocked=false,unreadRecovery=null;
const post=()=>book.posts.find(p=>p.id===activeId);
const getEntry=post;
const getPage=id=>entryPages(post()).find(p=>p.id===(id||getActivePageId()));
const getActivePageId=()=>{if(!entryPages(post()).some(p=>p.id===activePageId))activePageId=entryPages(post())[0].id;return activePageId;};
const findElement=id=>entryElements(post()).find(e=>e.id===id);
const elementPage=id=>entryPages(post()).find(p=>p.elements.some(e=>e.id===id));
const setActivePageId=id=>{if(entryPages(post()).some(p=>p.id===id))activePageId=id;};
function setSelection(ids){const list=[...ids],page=elementPage(list[0]);selection=new Set(list.filter(id=>elementPage(id)?.id===page?.id));if(page)setActivePageId(page.id);updateSelection();}
function normalizePages(){const p=post(),first=p.pages[0];p.pages=p.pages.filter(page=>page.elements.length);if(!p.pages.length)p.pages=[first];if(first.id!==p.pages[0].id)toast('First page removed. The next page now has the title; check highlighted overflow.');getActivePageId();}
const snapshotState=()=>({book:clone(book),activeId,page:activePageId,selection:[...selection],text:[...editors].map(([id,editor])=>({id,from:editor.state.selection.from,to:editor.state.selection.to,marks:editor.state.storedMarks?.map(mark=>mark.toJSON())??null}))});
function restoreState(state){book=state.book;activeId=state.activeId;activePageId=state.page;selection=new Set(state.selection);pendingTextState=state.text;}
function runCommand(label,mutate,{render:refresh=true}={}){const before=snapshotState();try{mutate();normalizePages();validateBook(book);undo.push(before);if(undo.length>80)undo.shift();redo=[];typingAt=0;if(refresh)render();changed();updateHistory();return true;}catch(error){restoreState(before);render();toast(`${label}: ${error.message}`);return false;}}
let gestureSnapshot,activeShapeCancel,pendingTextState;
function beginGesture(){if(!gestureSnapshot)gestureSnapshot=snapshotState();}
function commitGesture(label){if(!gestureSnapshot)return;const before=gestureSnapshot,after=snapshotState();gestureSnapshot=null;restoreState(before);return runCommand(label,()=>restoreState(after));}
function cancelGesture(){if(!gestureSnapshot)return;restoreState(gestureSnapshot);gestureSnapshot=null;render();}
let formattingCommand=false;
function formatCommand(label,mutate){formattingCommand=true;try{return runCommand(label,mutate,{render:false});}finally{formattingCommand=false;typingAt=0;}}
const status=text=>{$('#status').textContent=text;if($('#keyboard-status'))$('#keyboard-status').textContent=text;$('#recovery-export').hidden=!/failed|unavailable|Unsupported/.test(text);};
function toast(message){$('#toast').textContent=message;$('#toast').classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.add('hidden'),5000);}
function checkpoint(){undo.push(snapshotState());if(undo.length>80)undo.shift();redo=[];typingAt=0;updateHistory();}
function changed(target=post()){mutationRevision=Math.max(mutationRevision,target.localVersion||0)+1;target.localVersion=mutationRevision;status('Saving on this device…');clearTimeout(saveTimer);saveTimer=setTimeout(persist,350);updateCounts();updateCloudControls();scheduleFit();}
function persist(){clearTimeout(saveTimer);if(recoveryBlocked){status('Unsupported recovery retained · export original backup');return Promise.resolve();}const snapshot=clone(book),ticket=++storageTicket,revision=mutationRevision;saveChain=saveChain.catch(()=>{}).then(()=>save(snapshot)).then(()=>{if(ticket===storageTicket&&revision===mutationRevision)status('Saved on this device');}).catch(()=>{status('Local save failed · export a backup');toast('Device storage is unavailable or full. Export a backup to keep your work.');});return saveChain;}
function updateHistory(){$('#undo').disabled=!undo.length;$('#redo').disabled=!redo.length;}
function history(direction){const from=direction==='undo'?undo:redo,to=direction==='undo'?redo:undo;if(!from.length)return;to.push(snapshotState());restoreState(from.pop());if(!book.posts.some(p=>p.id===activeId))activeId=book.posts[0].id;selection.clear();render();changed();}

$('#app').innerHTML=`
<header class="top"><div class="brand"></div><button id="entries-toggle" aria-controls="entries-dialog" aria-expanded="false">Entries</button><span class="status" id="status" role="status">Opening local drafts…</span><button id="recovery-export" hidden>Export recovery</button><button class="preview-toggle" id="preview">Reading preview ↗</button><button popovertarget="app-menu">Account & tools</button></header>
<div id="app-menu" class="studio-menu" popover><button id="github-login">Sign in with GitHub</button><button id="export">Export backup ↓</button><button id="export-original">Export original recovery</button><button id="export-legacy">Export legacy-tab recovery</button><button id="import">Import backup</button><button id="help">Help</button><a id="public-blog" target="_blank" rel="noopener">Public blog ↗</a>${import.meta.env.DEV?'<details><summary>Development controls</summary><button id="stress">Open large test entry</button></details>':''}</div>
<div class="layout" id="editor-view"><aside class="sidebar" id="entry-rail"><h2>Entries</h2><button id="close-entries">Close entries</button><button id="new-entry" class="primary">+ Blank entry</button><button id="github-load" disabled>Manage entries</button><div class="entries" id="entries"></div></aside>
<main class="main"><div class="workhead"><label class="title-field">Entry title<input class="title" id="title" aria-label="Entry title" maxlength="500"></label><div class="entry-actions"><span id="cloud-state" role="status">Checking online saving…</span><button id="github-save" disabled>Save draft online</button><button popovertarget="publication-menu">Publication</button><button id="github-copy" class="hidden">Keep as a new copy</button></div></div>
<div id="publication-menu" class="studio-menu" popover><button id="github-publish" disabled>Publish entry</button><button id="github-unpublish" class="hidden">Unpublish</button></div>
<div class="toolbar"><button id="add-text">+ Text box</button><button id="add-photo">+ Photos</button><button id="undo" class="compact" aria-label="Undo">↶</button><button id="redo" class="compact" aria-label="Redo">↷</button><button popovertarget="more-tools">More tools</button></div>
<div id="more-tools" class="studio-menu" popover></div>
<div class="context-row"><span id="notice"></span><div id="text-toolbar"></div><div id="format" hidden></div><span id="selection-summary"></span><button id="multi-toggle" hidden>Multi-select</button><button id="properties-toggle" aria-expanded="false" aria-controls="inspector" hidden>Properties</button><button id="delete-selection" class="danger" hidden>Delete</button><span id="color-context" role="status"></span><span id="count" class="count"></span></div>
<div id="fit-status" role="status" hidden></div><div id="empty" class="empty-prompt">Start with + Text box or + Photos above.</div><div class="workspace"><div class="stage-wrap" id="stage-wrap"><div class="stage" id="stage"></div></div></div><details id="layers-panel"><summary>Layers</summary><aside id="layers" aria-label="Layers"></aside></details><div id="property-rail"><div id="inspector" class="inspector hidden"></div></div></main></div>
<dialog id="entries-dialog" aria-label="Entries"></dialog><dialog id="properties-dialog" aria-label="Properties"></dialog>
<div class="keyboard-actions" id="keyboard-actions" hidden><span id="keyboard-status"></span><button id="keyboard-save">Save draft online</button></div><section id="reader" class="reader hidden"></section><input id="photos" type="file" accept="image/*" multiple hidden><input id="archive" type="file" accept="application/json,.json" hidden><div class="toast hidden" id="toast" role="status"></div>
<dialog id="help-dialog"><h2 tabindex="-1" autofocus>Your scrapbook studio</h2><p><b>Text:</b> add text boxes and type or paste from Google Docs.<br><b>Arrange:</b> drag a photo, text box, or its Drag label. Select an object and drag its edges to reshape. Use the round handle above it to rotate.<br><b>Group:</b> select objects together to keep existing objects together.</p><p><b>On this device:</b> automatic recovery.<br><b>Save draft online:</b> available on your other signed-in devices.<br><b>Publish:</b> makes a new entry public after the site build.<br><b>Save & update site:</b> updates an already published entry.<br>Export a backup before clearing browser data. Offline reopening is still pending.</p><div class="actions"><button id="close-help" class="primary">Got it</button></div></dialog>
<dialog id="online-dialog"><h2>Manage entries</h2><div class="actions"><button id="cms-active">Entries</button><button id="cms-trash">Trash</button></div><p>Your current local entries stay on this device. Open an online entry as a separate working copy.</p><p id="storage-meter" role="status" hidden></p><div id="online-list"></div><div class="actions"><button id="close-online">Close</button></div></dialog>`;

const iconPaths={text:'M4 5h16M12 5v14M8 19h8',photo:'M3 4h18v16H3zM3 16l5-5 4 4 3-3 6 6M16 8h.01',move:'M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4M18 8l4 4-4 4',trash:'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',undo:'M8 4L3 9l5 5M3 9h10a7 7 0 0 1 0 14',redo:'M16 4l5 5-5 5M21 9H11a7 7 0 0 0 0 14',settings:'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6'};
function labelIcon(button,key,label){button.setAttribute('aria-label',label);button.innerHTML='<svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="'+iconPaths[key]+'"/></svg><span>'+label+'</span>';}
for(const [selector,key,label] of [['#add-text','text','+ Text box'],['#add-photo','photo','+ Photos'],['#delete-selection','trash','Delete'],['#undo','undo','Undo'],['#redo','redo','Redo'],['#properties-toggle','settings','Properties']])labelIcon($(selector),key,label);

$('.context-row').append($('#empty'),$('#fit-status'),$('#layers-panel'));
$('.brand').textContent=settings.title;
$('#public-blog').href=settings.publicUrl;
document.title=`${settings.title} · Studio`;
try{const saved=await load();if(saved){unreadRecovery=saved;book=validateBook({...saved,posts:validateBook(saved).posts.map(migratePost)});unreadRecovery=null;if(!book.posts.length)book=blankBook();activeId=book.posts[0].id;}status('Saved on this device');}catch(error){recoveryBlocked=true;status('Local recovery unavailable');toast(recoveryBlocked?'Unsupported recovery is preserved. Export backup downloads its original contents.':`Could not open local drafts: ${error.message}. You can still edit and export a backup.`);}
let multi=false;
const cloud=createCloudClient();let cloudSession={configured:false,signedIn:false},cloudBusy=false,cloudMessage='Checking online saving…';
const music=musicEditor({current:post,apply(value){checkpoint();post().music=value;changed();},preview:url=>cloud.spotify(url),notify:toast});
document.querySelectorAll('#help-dialog,#online-dialog,#entries-dialog,#properties-dialog,#music-dialog').forEach(dialog=>dialog.classList.add('studio-dialog'));
const musicButton=document.createElement('button');musicButton.id='edit-music';musicButton.textContent='Music';musicButton.onclick=()=>music.open();$('#more-tools').prepend(musicButton);
const deploymentTimers=new Map(),deploymentChecks=new Set();
function resumeDeployments(){
  if(!cloudSession.signedIn)return;
  for(const p of book.posts)if(p.cloud?.commit&&(p.cloud.publishing||p.cloud.deployment==='unknown'))monitorDeployment(p.id,p.cloud.commit);
}
let contextFresh=false;
async function refreshColorContext(){try{if(!cloudSession.signedIn)throw Error('offline');const result=await cloud.list();if(!Array.isArray(result.posts))throw Error('No context');publicContext=result.posts;contextFresh=true;showStorage(result.storageBytes);}catch{contextFresh=false;}calculateColorContext();}
let storageWarned=false;
function showStorage(bytes){const notice=storageNotice(bytes),meter=$('#storage-meter');meter.hidden=!notice;if(!notice)return;meter.textContent=notice.text;meter.classList.toggle('warning',notice.warning);if(notice.warning&&!storageWarned){storageWarned=true;toast(notice.text);}}
function calculateColorContext(){const p=post(),prior=publicContext?.find(e=>e.id===p.id),published=!!prior&&(p.cloud?.status||p.status)==='published',active={...p,publishedAt:p.publishedAt||p.cloud?.publishedAt||prior?.publishedAt||new Date().toISOString()};const entries=(publicContext||[]).filter(e=>e.status==='published'&&e.id!==p.id);entries.push(active);previewEntryIndex=orderedEntries(entries).findIndex(e=>e.id===p.id);colorProvisional=!contextFresh||!published;$('#stage').style.setProperty('--page-color',paperColor(previewEntryIndex));$('#stage').dataset.colorProvisional=String(colorProvisional);const label=$('#color-context');if(label)label.textContent=colorProvisional?'Paper color provisional':'';}
function updateCloudControls(){
  if(!$('#cloud-state'))return;
  const p=post(),published=p?.cloud?.status==='published';
  $('#github-login').textContent=cloudSession.signedIn?`Sign out (${cloudSession.login})`:'Sign in with GitHub';
  $('#github-login').disabled=cloudBusy;
  $('#github-load').disabled=cloudBusy||!cloudSession.signedIn;
  $('#github-save').disabled=cloudBusy||!cloudSession.signedIn||p?.cloud?.status==='trashed';
  $('#github-publish').disabled=cloudBusy||!cloudSession.signedIn||published||p?.cloud?.status==='trashed';
  $('#github-unpublish').classList.toggle('hidden',!published);$('#github-unpublish').disabled=cloudBusy||!cloudSession.signedIn;
  $('#github-save').textContent=published?'Save & update site':'Save draft online';
  $('#github-copy').classList.toggle('hidden',!p?.cloud?.conflict);$('#keyboard-save').textContent=$('#github-save').textContent;$('#keyboard-save').disabled=$('#github-save').disabled;
  $('#cloud-state').textContent=cloudBusy?cloudMessage:p?.cloud?.revision||p?.cloud?.conflict?entryState(p):(cloudSession.signedIn?'This entry is only on this device':cloudMessage);
  renderEntries();
}
async function checkCloud(){cloudSession=await cloud.check();if(cloudSession.publicUrl)$('#public-blog').href=cloudSession.publicUrl;cloudMessage=cloudSession.unavailable?'Online saving unavailable · local drafts are safe':cloudSession.configured?(cloudSession.signedIn?'Signed in · local changes need an online save':'Sign in to save across devices'):'Local editor · online saving setup pending';updateCloudControls();}
async function saveOnline(action){
  if(cloudBusy)return;await refreshColorContext();await persist();const target=post(),snapshot=clone(target),savedVersion=target.localVersion||0;
  if((action==='publish'||action==='save'&&snapshot.cloud?.status==='published')){const errors=await checkFit(snapshot);if(errors.length){fitErrors=errors;showFit();focusFitIssue();return;}}
  cloudBusy=true;cloudMessage='Preparing online save…';updateCloudControls();
  try{
    const receipts={};let count=0;const photos=entryElements(snapshot).filter(e=>e.type==='photo'),staged=new Map(photos.filter(e=>MEDIA_PATH.test(e.assetPath||'')).map(e=>[e.src,{path:e.assetPath,receipt:e.assetReceipt}]));
    for(const e of photos){
      if(!MEDIA_PATH.test(e.assetPath||'')){cloudMessage=`Uploading photo ${++count} of ${photos.length}…`;updateCloudControls();let upload=staged.get(e.src);if(!upload){upload=await cloud.upload(await jpegForUpload(e.src));staged.set(e.src,upload);}e.assetPath=upload.path;if(upload.receipt)receipts[upload.path]=upload.receipt;}
      if(e.assetReceipt)receipts[e.assetPath]=e.assetReceipt;
      const local=entryElements(book.posts.find(p=>p.id===target.id)||target).find(x=>x.id===e.id&&x.src===e.src);if(local){local.assetPath=e.assetPath;local.assetReceipt=receipts[e.assetPath]||local.assetReceipt;}
      e.src=e.assetPath;delete e.assetPath;
    }
    cloudMessage='Saving to GitHub…';updateCloudControls();
    const result=await cloud.save(snapshot.id,{post:snapshot,baseRevision:snapshot.cloud?.revision||null,action,receipts});
    const current=book.posts.find(p=>p.id===target.id);if(!current)throw Error('Saved entry is no longer open locally; reopen it from Manage entries.');current.cloud={revision:result.revision,commit:result.commit,status:result.post.status,savedVersion,publishing:result.publishing,publishedAt:result.post.publishedAt};updateStage();
    await refreshColorContext();cloudMessage=result.publishing?'Saved · publication build started':'Saved to GitHub';await persist();
    if(result.publishing)monitorDeployment(target.id,result.commit);toast(result.publishing?'Saved to GitHub. Waiting for the public site build.':'Draft saved online. It is not public.');
  }catch(error){cloudMessage=error.message;if(error.status===401){await checkCloud();toast('Sign-in expired. Your local work is safe. Sign in again, then retry saving.');}if(error.status===409){const current=book.posts.find(p=>p.id===target.id);if(current)current.cloud={...current.cloud,conflict:true};}if(error.status===400&&/Photo upload/.test(error.message)){entryElements(target).filter(e=>e.type==='photo').forEach(e=>{delete e.assetPath;delete e.assetReceipt;});}await persist();if(error.status!==401)toast(`${error.message} Your local work is safe; retry saving when ready.`);}finally{cloudBusy=false;updateCloudControls();}
}
async function monitorDeployment(id,commit){
  if(deploymentChecks.has(id)||!cloudSession.signedIn)return;
  clearTimeout(deploymentTimers.get(id));deploymentChecks.add(id);
  try{const state=await cloud.deployment(commit);const target=book.posts.find(p=>p.id===id);if(!target||target.cloud?.commit!==commit)return;
    if(state.status==='completed'){target.cloud.publishing=false;target.cloud.deployment=state.conclusion;cloudMessage=state.conclusion==='success'?'Public site updated':'Saved to GitHub · site build failed';await persist();toast(cloudMessage);updateCloudControls();return;}
    deploymentTimers.set(id,setTimeout(()=>monitorDeployment(id,commit),15000));
  }catch(error){const target=book.posts.find(p=>p.id===id);if(target?.cloud?.commit===commit){target.cloud.publishing=false;target.cloud.deployment='unknown';await persist();}cloudMessage='Saved to GitHub · deployment status unavailable';if(error.status===401)await checkCloud();else deploymentTimers.set(id,setTimeout(()=>monitorDeployment(id,commit),30000));updateCloudControls();}
  finally{deploymentChecks.delete(id);const target=book.posts.find(p=>p.id===id);if(target?.cloud?.publishing&&target.cloud.commit!==commit)monitorDeployment(id,target.cloud.commit);}
}
let cmsView='active';
// shortcut: the repository index has no created date, so online drafts label by last save; add created to the index if this matters.
const onlineLabel=entry=>entryLabel({...entry,created:entry.updatedAt});
async function openOnlineEntries(){
  if($('#entries-dialog').open)$('#entries-dialog').close();
  if(cloudBusy)return;cloudBusy=true;cloudMessage='Opening online entries…';updateCloudControls();
  try{const result=await cloud.list();showStorage(result.storageBytes);const list=$('#online-list');list.replaceChildren();if(!result.posts.length)list.textContent='No online entries yet. Save a draft to create the first one.';
    const entries=result.posts.filter(e=>cmsView==='trash'?e.status==='trashed':e.status!=='trashed');
    if(!entries.length)list.textContent=cmsView==='trash'?'Trash is empty.':'No online entries yet.';
    for(const entry of entries){
      const row=document.createElement('div'),open=document.createElement('button'),action=document.createElement('button');
      open.textContent=`${onlineLabel(entry)} · ${entry.status||'draft'}`;
      open.disabled=entry.status==='trashed';open.onclick=()=>loadOnlineEntry(entry.id);
      action.textContent=entry.status==='trashed'?'Restore as draft':'Move to trash';action.className=entry.status==='trashed'?'':'danger';
      action.onclick=()=>manageEntry(entry);row.append(open,action);list.append(row);
    }
    $('#online-dialog').showModal();
  }catch(error){toast(error.message);}finally{cloudBusy=false;updateCloudControls();}
}
async function manageEntry(entry){
  const action=entry.status==='trashed'?'restore':'trash';
  if(!confirm(action==='trash'?`Move “${onlineLabel(entry)}” to trash? Its content will be retained for restoration.`:'Restore this entry as a draft? It will need publishing to appear publicly.'))return;
  cloudBusy=true;updateCloudControls();
  try{
    const result=await cloud.lifecycle(entry.id,action,entry.revision);await refreshColorContext();
    const local=book.posts.find(p=>p.id===entry.id);
    if(local){local.cloud={...local.cloud,status:result.post.status,conflict:true,commit:result.commit,publishing:result.publishing};await persist();if(result.publishing)monitorDeployment(local.id,result.commit);}
    toast(action==='trash'?(result.publishing?'Moved to trash. Public removal waits for a successful site build.':'Moved to trash. Local edits are preserved.'):'Restored as a draft. Open it to resume editing.');
  }catch(error){toast(error.message);}
  finally{cloudBusy=false;updateCloudControls();await openOnlineEntries();}
}
async function loadOnlineEntry(id){
  if(cloudBusy)return;cloudBusy=true;cloudMessage='Loading online entry…';updateCloudControls();
  try{const result=await cloud.get(id),loaded=migratePost(result.post);
    if(loaded.status==='trashed')throw Error('Restore this entry from Trash before opening it.');
    for(const e of entryElements(loaded).filter(e=>e.type==='photo')){if(!parseMediaPath(e.src))throw Error('Invalid online photo reference.');e.assetPath=e.src;e.src=await dataUrl(await mediaForRecovery(e.src,cloudSession));}
    validateBook({version:1,posts:[loaded]});const existing=book.posts.find(p=>p.id===id),candidate=clone(book);
    if(existing){const copy=clone(existing);copy.id=uid();copy.title=`${copy.title} (local recovery copy)`;delete copy.cloud;candidate.posts.push(copy);candidate.posts=candidate.posts.filter(p=>p.id!==id);}
    loaded.localVersion=0;loaded.cloud={revision:result.revision,status:loaded.status,savedVersion:0,publishedAt:loaded.publishedAt};candidate.posts.push(loaded);validateBook(candidate);if(new TextEncoder().encode(JSON.stringify(candidate)).length>100*1024*1024)throw Error('The resulting archive exceeds 100 MB. Export local work first.');runCommand('Open online entry',()=>{book=candidate;activeId=loaded.id;selection.clear();});await persist();$('#online-dialog').close();toast(existing?'Online entry opened. Your previous local version is kept as a recovery copy.':'Online entry opened on this device.');
  }catch(error){toast(error.message);}finally{cloudBusy=false;cloudMessage='Signed in · online entries available';updateCloudControls();}
}
function entryState(p){const c=p.cloud;if(c?.conflict)return 'Conflict · local work preserved';if(c?.status==='trashed')return 'Trash';if(c?.publishing)return 'Update pending';if(c?.deployment&&c.deployment!=='success')return 'Site update failed or unconfirmed';if(!c?.revision)return 'Device draft';if(c.savedVersion!==(p.localVersion||0))return 'Local changes';if(c.status==='published')return c.deployment==='success'?'Live · this revision is published':'Published · revision unconfirmed';return 'Online draft saved';}
function renderEntries(){const root=$('#entries');root.replaceChildren();[...book.posts].filter(p=>p.cloud?.status!=='trashed').sort((a,b)=>new Date(a.created)-new Date(b.created)).forEach(p=>{const b=document.createElement('button');b.className=`entry ${p.id===activeId?'selected':''}`;if(p.id===activeId)b.setAttribute('aria-current','true');const t=document.createElement('span');t.textContent=entryLabel(p);const s=document.createElement('small');s.textContent=p.title.trim()?`${entryDate(p)} · ${entryState(p)}`:entryState(p);b.append(t,s);b.onclick=()=>{activeId=p.id;selection.clear();closeProperties();render();$('#entries-dialog').close();};root.append(b);});}
function render(){calculateColorContext();editors.forEach(e=>e.destroy());editors.clear();resizeObserver?.disconnect();renderEntries();$('#title').value=post().title;const stage=$('#stage');stage.querySelectorAll('.object').forEach(e=>{interaction(e).unset();e.remove();});composition?.renderPages();entryElements(post()).forEach(mount);resizeObserver=new ResizeObserver(entries=>{for(const entry of entries){if(!entry.target.getClientRects().length)continue;const e=entryElements(post()).find(e=>e.id===entry.target.dataset.id);if(e?.type==='text'&&!e.fixedHeight){const next=Math.ceil(entry.target.querySelector('.ProseMirror').scrollHeight);if(Math.abs(e.h-next)>1){e.h=next;updateStage();changed();}}}});stage.querySelectorAll('.object.text').forEach(el=>resizeObserver.observe(el));updateMode();updateSelection();updateStage();updateCounts();updateHistory();updateCloudControls();if(pendingTextState){const text=pendingTextState;pendingTextState=null;for(const item of text){const editor=editors.get(item.id);if(!editor)continue;const end=editor.state.doc.content.size;editor.commands.setTextSelection({from:Math.min(item.from,end),to:Math.min(item.to,end)});editor.view.dispatch(editor.state.tr.setStoredMarks(item.marks?.map(mark=>editor.schema.markFromJSON(mark))??null));}}}
function updateCounts(){const p=post();$('#count').textContent=`${entryElements(p).filter(e=>e.type==='photo').length} photos · ${entryElements(p).filter(e=>e.type==='text').length} text boxes`;$('#empty').classList.toggle('hidden',!!entryElements(p).length);$('#notice').hidden=!entryElements(p).length;}
function updateStage(){if(!composition)return;composition.layout();scale=composition.getScale();entryElements(post()).forEach(e=>setObjectStyle($('#stage [data-id="'+CSS.escape(e.id)+'"]'),e));scheduleFit();}

function setObjectStyle(el,e){if(!el)return;composition.styleObject(el,e);if(e.type==='text'){el.dataset.fixedHeight=String(!!e.fixedHeight);el.dataset.font=e.font||'serif';el.dataset.fontSize=e.fontSize||28;el.style.setProperty('--text-size',(e.fontSize||28)+'px');el.style.setProperty('--text-font',fontFamily(e.font));clipToPaper(el,e);}el.style.transform=`rotate(${e.rotation}deg)`;}
// Studio objects share one stage, so clip each text interior to its paper (in the box's rotated frame) to match the book's page clip.
function clipToPaper(el,e){const content=el.querySelector('.ProseMirror'),index=entryPages(post()).findIndex(page=>page.elements.includes(e));if(!content||index<0)return;const g=pageGeometry(index),a=-e.rotation*Math.PI/180,cx=e.x+e.w/2,cy=e.y+e.h/2;content.style.clipPath=`polygon(${[[-g.x,-g.y],[PAGE.width-g.x,-g.y],[PAGE.width-g.x,PAGE.height-g.y],[-g.x,PAGE.height-g.y]].map(([x,y])=>`${(x-cx)*Math.cos(a)-(y-cy)*Math.sin(a)+e.w/2}px ${(x-cx)*Math.sin(a)+(y-cy)*Math.cos(a)+e.h/2}px`).join(',')})`;}
function paths(svg,strokes){svg.replaceChildren();strokes.forEach(s=>{const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',s.points.map((pt,i)=>`${i?'L':'M'}${pt[0]},${pt[1]}`).join(' '));p.setAttribute('fill','none');p.setAttribute('stroke',s.color);p.setAttribute('stroke-width',s.size);p.setAttribute('stroke-linecap','round');p.setAttribute('stroke-linejoin','round');svg.append(p);});}
function mount(e){const el=document.createElement('div');el.className=`object ${e.type}`;el.dataset.id=e.id;el.dataset.pageId=elementPage(e.id)?.id||getActivePageId();setObjectStyle(el,e);
  if(e.type==='text'){const editor=createTextEditor({element:el,content:e.doc,editable:true,defaults:{font:e.font??'serif',fontSize:e.fontSize??28,color:e.localDefaultColor??'#402E35'},onPasteNotice:toast,onFocus:()=>{setSelection([e.id]);},onSelectionUpdate:updateFormatting,onTransaction:updateFormatting,onUpdate:({editor})=>{if(editors.get(e.id)!==editor||JSON.stringify(editor.getJSON())===JSON.stringify(e.doc))return;if(!formattingCommand&&Date.now()-typingAt>800)checkpoint();typingAt=Date.now();e.doc=editor.getJSON();if(!e.fixedHeight)e.h=Math.max(48,el.querySelector('.ProseMirror').scrollHeight);if(!formattingCommand)changed();updateStage();}});editors.set(e.id,editor);}
  else if(e.type==='photo'){const img=document.createElement('img');img.src=e.src;img.alt=e.alt;img.draggable=false;el.append(img);}
  else {const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${e.sourceW} ${e.sourceH}`);paths(svg,e.strokes);el.append(svg);}
  const grab=document.createElement('span');grab.className='grab';grab.textContent='↔ Drag';grab.setAttribute('aria-hidden','true');el.append(grab);
  for(const edge of e.type==='text'?['n','ne','e','se','s','sw','w','nw']:['ne','se','sw','nw']){const handle=document.createElement('button');handle.className='resize-handle resize-'+edge+(edge==='se'?' resize':'');handle.dataset.edge=edge;handle.setAttribute('aria-label','Resize '+({n:'top',ne:'top right',e:'right',se:'bottom right',s:'bottom',sw:'bottom left',w:'left',nw:'top left'}[edge]));el.append(handle);bindShape(handle,el,e,edge);}
  const rotate=document.createElement('button');rotate.className='rotate-handle';rotate.setAttribute('aria-label','Rotate selected object');rotate.innerHTML='↻<span class="rotation-value"></span>';el.append(rotate);bindShape(rotate,el,e,'rotate');
  el.addEventListener('pointerdown',ev=>{const page=elementPage(e.id);if([...selection].some(id=>elementPage(id)?.id!==page?.id))selection.clear();setActivePageId(page?.id);if(multi){if(selection.has(e.id))selection.delete(e.id);else selection.add(e.id);}else if(!selection.has(e.id)){selection=new Set(e.group?getPage().elements.filter(x=>x.group===e.group).map(x=>x.id):[e.id]);}updateSelection();});
  $('#stage').append(el);
  bindInteraction(el,e);
}
function bindInteraction(el,e){composition.bindObject(el,e);}
function bindShape(handle,el,e,edge){
 let gesture;
 const finish=cancel=>{if(!gesture)return;const before=gesture.before,after={...e};gesture=null;activeShapeCancel=null;if(!Object.hasOwn(before,'fixedHeight'))delete e.fixedHeight;Object.assign(e,before);if(!cancel&&JSON.stringify(before)!==JSON.stringify(after)){Object.assign(e,after);commitGesture('Reshape object');}else cancelGesture();setObjectStyle(el,e);updateStage();updateSelection();};
 handle.onpointerdown=ev=>{if(ev.button!==0)return;ev.stopPropagation();ev.preventDefault();selection=new Set([e.id]);updateSelection();const p=point(ev),angle=e.rotation*Math.PI/180,cx=e.x+e.w/2,cy=e.y+e.h/2;beginGesture();activeShapeCancel=()=>finish(true);gesture={before:{...e},pointer:ev.pointerId,p,angle,cx,cy,startAngle:Math.atan2(p[1]-cy,p[0]-cx)};handle.setPointerCapture(ev.pointerId);};
 handle.onpointermove=ev=>{if(!gesture||ev.pointerId!==gesture.pointer)return;const g=gesture,p=point(ev),b=g.before;
 if(edge==='rotate'){let angle=b.rotation+(Math.atan2(p[1]-g.cy,p[0]-g.cx)-g.startAngle)*180/Math.PI;angle=((angle+540)%360)-180;const snap=Math.round(angle/15)*15;e.rotation=Math.abs(angle-snap)<3?snap:Math.round(angle);}
 else {const dx=p[0]-g.p[0],dy=p[1]-g.p[1],lx=dx*Math.cos(g.angle)+dy*Math.sin(g.angle),ly=-dx*Math.sin(g.angle)+dy*Math.cos(g.angle);let w=b.w,h=b.h;if(edge.includes('e'))w+=lx;if(edge.includes('w'))w-=lx;if(edge.includes('s'))h+=ly;if(edge.includes('n'))h-=ly;w=Math.max(80,Math.min(880,w));h=Math.max(48,Math.min(50000,h));if(e.type!=='text'){const ratio=Math.abs(w-b.w)>Math.abs((h-b.h)*b.w/b.h)?w/b.w:h/b.h;w=Math.max(80,Math.min(880,b.w*ratio));h=b.h*w/b.w;}const sx=(edge.includes('w')?-1:edge.includes('e')?1:0)*(w-b.w)/2,sy=(edge.includes('n')?-1:edge.includes('s')?1:0)*(h-b.h)/2;e.w=w;e.h=h;e.x=g.cx+sx*Math.cos(g.angle)-sy*Math.sin(g.angle)-w/2;e.y=g.cy+sx*Math.sin(g.angle)+sy*Math.cos(g.angle)-h/2;if(e.type==='text')e.fixedHeight=true;}
 setObjectStyle(el,e);el.querySelector('.rotation-value').textContent=Math.round(e.rotation)+'°';
 };
 handle.onpointerup=()=>finish(false);handle.onpointercancel=()=>finish(true);handle.onlostpointercapture=()=>finish(true);
 handle.onkeydown=ev=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape'].includes(ev.key))return;ev.preventDefault();ev.stopPropagation();if(ev.key==='Escape'){finish(true);return;}checkpoint();const n=ev.shiftKey?10:1,old=e.w;if(edge==='rotate')e.rotation=Math.max(-180,Math.min(180,e.rotation+(['ArrowLeft','ArrowDown'].includes(ev.key)?-n:n)));else if(['ArrowLeft','ArrowRight'].includes(ev.key))e.w=Math.max(80,Math.min(880,e.w+(ev.key==='ArrowLeft'?-n:n)));else if(e.type==='text')e.h=Math.max(48,e.h+(ev.key==='ArrowUp'?-n:n));else e.w=Math.max(80,Math.min(880,(e.h+(ev.key==='ArrowUp'?-n:n))*e.w/e.h));if(e.type==='text'&&edge!=='rotate')e.fixedHeight=true;if(e.type!=='text'&&edge!=='rotate')e.h*=e.w/old;setObjectStyle(el,e);updateStage();changed();updateSelection();};
}
function deleteSelection(){if(!selection.size)return;runCommand('Delete selection',()=>{getPage().elements=getPage().elements.filter(e=>!selection.has(e.id));selection.clear();});}
function updateMode(){document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});$('#stage').className=`stage mode-${mode}`;editors.forEach(e=>e.setEditable(true,false));document.querySelectorAll('#stage .object').forEach(el=>{interaction(el).draggable({enabled:mode==='arrange'});});$('#notice').textContent='Click text to write · drag its border to move · use handles to resize';updateSelection();}
function updateFormatting(){textToolbar?.refresh();}
function closeProperties(){propertiesOpen=false;if($('#properties-dialog').open)$('#properties-dialog').close();$('#inspector').classList.add('hidden');$('#properties-toggle').setAttribute('aria-expanded','false');}
function presentProperties(){const visible=propertiesOpen;const root=$('#inspector'),dialog=$('#properties-dialog'),focused=root.contains(document.activeElement)?document.activeElement:null;root.classList.toggle('hidden',!visible);$('#properties-toggle').setAttribute('aria-expanded',String(visible));if(innerWidth>=1280){if(dialog.open)dialog.close();$('#property-rail').append(root);}else{dialog.append(root);if(visible&&!dialog.open)dialog.showModal();if(!visible&&dialog.open)dialog.close();}if(visible)focused?.focus({preventScroll:true});}
function updateSelection(){document.querySelectorAll('#stage .object').forEach(el=>{el.classList.toggle('selected',selection.has(el.dataset.id));el.classList.toggle('group-selected',selection.size>1&&selection.has(el.dataset.id));});document.querySelectorAll('#stage .rotation-value').forEach(n=>n.textContent=Math.round(entryElements(post()).find(e=>e.id===n.closest('.object').dataset.id)?.rotation||0)+'°');$('#delete-selection').hidden=!selection.size;composition?.renderLayers($('#layers'));updateFormatting();$('#properties-toggle').hidden=false;$('#multi-toggle').hidden=false;$('#selection-summary').hidden=false;$('#selection-summary').textContent=selection.size?`${selection.size} selected${selection.size>1?' · group selection':''}`:'No object selected';const root=$('#inspector');root.replaceChildren();presentProperties();
  const addButton=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=fn;root.append(b);return b;};
  const multiButton=$('#multi-toggle');multiButton.textContent=multi?'Multi-select on':'Multi-select';multiButton.setAttribute('aria-pressed',String(multi));multiButton.onclick=()=>{multi=!multi;updateSelection();};
  addButton('Close properties',()=>{closeProperties();updateStage();$('#properties-toggle').focus();});
  const chosen=getPage().elements.filter(e=>selection.has(e.id));const note=document.createElement('span');note.textContent=chosen.length?`${chosen.length} selected`:'Tap an object to arrange it';root.append(note);if(!chosen.length)return;
  if(chosen.length===1){const e=chosen[0];for(const [label,key] of [['X','x'],['Y','y'],['Width','w'],...(e.type==='text'?[['Height','h'],['Text size','fontSize']]:[]),['Rotate','rotation']]){const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.type='number';input.value=Math.round(e[key]||(key==='fontSize'?28:0));input.setAttribute('aria-label',`${label} of selected object`);input.onchange=()=>{let n=Number(input.value);if(!Number.isFinite(n))return;checkpoint();if(key==='w'){if(e.type==='text')e.fixedHeight=true;n=Math.max(80,Math.min(880,n));if(e.type!=='text')e.h*=n/e.w;}else if(key==='h'){n=Math.max(48,Math.min(50000,n));e.fixedHeight=true;}else if(key==='fontSize')n=Math.max(6,Math.min(144,n));else if(key==='rotation')n=Math.max(-180,Math.min(180,n));else n=Math.max(0,Math.min(50000,n));e[key]=n;setObjectStyle($(`[data-id="${CSS.escape(e.id)}"]`),e);updateStage();changed();};wrap.append(input);root.append(wrap);}addButton('Reset rotation',()=>{checkpoint();e.rotation=0;setObjectStyle($('#stage [data-id="'+CSS.escape(e.id)+'"]'),e);updateStage();changed();updateSelection();});if(e.type==='text'){const label=document.createElement('label');label.textContent='Text style';const select=document.createElement('select');select.setAttribute('aria-label','Text style');select.innerHTML='<option value="handwriting">Handwriting</option><option value="serif">Book serif</option>';select.value=e.font||'serif';select.onchange=()=>{checkpoint();e.font=select.value;setObjectStyle($('#stage [data-id="'+CSS.escape(e.id)+'"]'),e);changed();};label.append(select);root.append(label);}if(e.type==='photo'){const wrap=document.createElement('label');wrap.textContent='Description';const i=document.createElement('input');i.type='text';i.value=e.alt;i.placeholder='What’s in this photo?';i.onchange=()=>{checkpoint();e.alt=i.value;$(`[data-id="${e.id}"] img`).alt=i.value;changed();};wrap.append(i);root.append(wrap);}}
  addButton('Duplicate',()=>runCommand('Duplicate',()=>{const groupMap=new Map();chosen.forEach(e=>{const copy=clone(e);copy.id=uid();copy.x+=25;copy.y+=25;if(copy.group){if(!groupMap.has(copy.group))groupMap.set(copy.group,uid());copy.group=groupMap.get(copy.group);}getPage().elements.push(copy);});}));
  addButton('Bring forward',()=>composition?.reorderSelection(1));
  addButton('Send backward',()=>composition?.reorderSelection(-1));addButton('Move to previous page',()=>composition?.moveSelection(-1));addButton('Move to next page',()=>composition?.moveSelection(1));
  if(chosen.length>1)addButton('Group',()=>{checkpoint();const id=uid();chosen.forEach(e=>e.group=id);multi=false;changed();updateSelection();});
  if(chosen.some(e=>e.group))addButton('Ungroup',()=>{checkpoint();const ids=new Set(chosen.map(e=>e.group).filter(Boolean));entryElements(post()).forEach(e=>{if(ids.has(e.group))delete e.group;});changed();updateSelection();});

}
function addText({doc=textDoc(''),defaults=textToolbar?.defaults()||{},pageId}={}){const center=composition.activeCenter();if(pageId)setActivePageId(pageId);const page=getPage(),g=pageGeometry(entryPages(post()).indexOf(page));let id;const ok=runCommand('Add text',()=>{const e={id:uid(),type:'text',doc,font:defaults.font||'handwriting',fontSize:defaults.fontSize||32,localDefaultColor:defaults.color||'#402E35',fixedHeight:true,x:Math.max(0,Math.min(g.width-360,center[0]-180)),y:Math.max(0,Math.min(g.height-140,center[1]-70)),w:360,h:140,rotation:0};id=e.id;page.elements.push(e);selection=new Set([id]);});if(ok){editors.get(id)?.commands.focus();$(`[data-id="${id}"]`)?.scrollIntoView({block:'nearest'});}return id;}
$('#photos').onchange=async ev=>{const files=[...ev.target.files];ev.target.value='';if(!files.length)return;composition.activeCenter();const target=post(),targetPage=getPage();let done=0;const errors=[];$('#add-photo').disabled=true;for(const file of files){try{const e=await processPhoto(file);if(!book.posts.includes(target)||!target.pages.includes(targetPage))throw Error('The target entry changed; retry this photo.');if(entryElements(target).length>=500)throw Error('This entry already has 500 objects. Keep the photo file and use another entry.');checkpoint();e.x=80;e.y=80;targetPage.elements.push(e);if(e.importNotice)toast(e.importNotice);if(target.id===activeId){mount(e);updateStage();updateCounts();}changed(target);}catch(e){errors.push(e.message);}done++;status(`Processing photo ${done} of ${files.length}…`);await new Promise(r=>setTimeout(r,0));}$('#add-photo').disabled=false;await persist();if(errors.length)toast(errors.join(' '));else toast(`${done} photos added. Drag a photo to arrange it.`);};

function point(ev){return composition.point(ev,elementPage([...selection][0])?.id);}
async function showPreview(){
 await refreshColorContext();editorProps?.setActive(false);
 previewFocus={entry:activeId,node:lastEditorFocus,propertiesOpen,selection:lastEditorFocus?.matches('input')?[lastEditorFocus.selectionStart,lastEditorFocus.selectionEnd]:null};previewScroll={x:window.scrollX,y:window.scrollY};closeProperties();document.querySelectorAll('[popover]:popover-open').forEach(n=>n.hidePopover());view='reader';updateKeyboardViewport();$('#editor-view').classList.add('hidden');$('#reader').classList.remove('hidden');$('#preview').textContent='← Back to editor';
 try{const {mountBook}=await import('../shared/book/scene.js');if(view!=='reader')return;previewBook?.dispose();const root=$('#reader');root.replaceChildren();previewBook=mountBook(root,[post()],{base:'',initialId:post().id,history:false,preview:true,entryIndex:previewEntryIndex,provisionalColor:colorProvisional,onRead:p=>showReadingPreview(p,root)});}catch{returnToEditor();toast('Preview could not load. Your unsaved work is preserved; retry when connected.');}
}
function returnToEditor(){editorProps?.setActive(true);previewBook?.dispose();previewBook=null;view='editor';$('#reader').classList.add('hidden');$('#reader').replaceChildren();$('#editor-view').classList.remove('hidden');$('#preview').textContent='Reading preview ↗';if(previewFocus?.entry===activeId&&previewFocus.propertiesOpen){propertiesOpen=true;presentProperties();}updateStage();updateKeyboardViewport();requestAnimationFrame(()=>{const target=previewFocus?.entry===activeId&&previewFocus.node?.isConnected&&previewFocus.node.getClientRects().length?previewFocus.node:$('#title');target.focus({preventScroll:true});if(target===previewFocus?.node&&previewFocus.selection)try{target.setSelectionRange(...previewFocus.selection);}catch{}window.scrollTo(previewScroll.x,previewScroll.y);});}
function showReadingPreview(p,root){previewBook?.dispose();previewBook=null;root.classList.remove('book-scene');const entry=document.createElement('article');entry.className='reader-entry';const header=document.createElement('header'),title=document.createElement('h2'),date=document.createElement('time');title.textContent=entryLabel(p);date.textContent=entryDate(p);header.append(title);if(p.title.trim())header.append(date);entry.append(header);entry.insertAdjacentHTML('beforeend',renderComposition(p,'')+renderMusic(p,''));root.replaceChildren(entry);layoutReading(entry.querySelector('[data-canvas]'));}
async function checkFit(p=post()){
 const errors=geometryOverflow(p);for(let pageIndex=0;pageIndex<entryPages(p).length;pageIndex++){const node=document.createElement('article');node.className='notebook-page fit-measure';node.innerHTML=renderNotebook(p,'',{pageIndex});document.body.append(node);try{errors.push(...await measureNotebook(p,node,{pageIndex}));}catch{return ['fonts'];}finally{node.remove();}}return [...new Set(errors)];
}
function focusFitIssue(){if(fitErrors.includes('fonts')){$('#fit-status').scrollIntoView({block:'center'});$('#fit-status button').focus();return;}if(fitErrors.includes('title')){$('#title').focus();$('#title').scrollIntoView({block:'center'});return;}const id=fitErrors.find(id=>entryElements(post()).some(e=>e.id===id));if(id){selection=new Set([id]);updateSelection();$('#stage [data-id="'+CSS.escape(id)+'"]').scrollIntoView({block:'center',inline:'center'});}}
function showFit(){const errors=fitErrors,root=$('#fit-status');root.hidden=!errors.length;$('#title').classList.toggle('title-error',errors.includes('title'));root.replaceChildren();if(!errors.length)return;const message=document.createElement('span');message.textContent=errors.includes('fonts')?'Notebook fonts are unavailable. Drafts remain recoverable.':errors.includes('title')?'The title must fit two lines at 52px before publishing.':OVERFLOW_MESSAGE;const action=document.createElement('button');action.textContent=errors.includes('fonts')?'Retry fonts':errors.includes('title')?'Edit title':'View overflowing object';action.onclick=()=>{if(errors.includes('fonts'))document.fonts.load('52px VT323').then(scheduleFit).catch(scheduleFit);else focusFitIssue();};root.append(message,action);}
function scheduleFit(){clearTimeout(fitTimer);const generation=++fitGeneration;fitTimer=setTimeout(async()=>{const p=post(),errors=await checkFit(p);if(generation!==fitGeneration||p!==post())return;fitErrors=errors;showFit();document.querySelectorAll('#stage .object').forEach(el=>el.classList.toggle('overflow-object',errors.includes(el.dataset.id)));},100);}

async function exportBook(){if(recoveryBlocked&&!unreadRecovery){try{const copies=await recoveryCopies();unreadRecovery=copies.current??copies.legacy;}catch(error){return toast(`Recovery export failed: ${error.message}`);}}const a=document.createElement('a');const url=URL.createObjectURL(new Blob([JSON.stringify(recoveryBlocked?unreadRecovery:book)],{type:'application/json'}));a.href=url;a.download=`baby-teeth-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
async function exportRecoveryCopy(key){try{const copies=await recoveryCopies();if(copies[key]===undefined)return toast('No recovery exists for this copy.');const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(copies[key])],{type:'application/json'}));a.href=url;a.download=`baby-teeth-${key}-recovery.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}catch(error){toast(`Recovery export failed: ${error.message}`);}}
$('#export-original').onclick=()=>exportRecoveryCopy('original');$('#export-legacy').onclick=()=>exportRecoveryCopy('legacy');
$('#archive').onchange=async ev=>{const file=ev.target.files[0];ev.target.value='';if(!file)return;try{if(file.size>100*1024*1024)throw Error('Archive exceeds the 100 MB limit.');const incoming=validateBook(JSON.parse(await file.text()));const copied={version:1,posts:incoming.posts.map(migratePost)};const existing=new Set(book.posts.map(p=>p.id));for(const p of copied.posts){if(existing.has(p.id)){p.id=uid();delete p.cloud;}existing.add(p.id);for(const e of entryElements(p))if(e.type==='text')generateHTML(e.doc,extensions);}validateBook({version:1,posts:[...book.posts,...copied.posts]});if(new TextEncoder().encode(JSON.stringify({version:1,posts:[...book.posts,...copied.posts]})).length>100*1024*1024)throw Error('The resulting archive exceeds 100 MB. Export before importing more.');runCommand('Import backup',()=>{book.posts.push(...copied.posts);activeId=book.posts.at(-1).id;selection.clear();});toast('Archive imported as additional entries. Existing entries are preserved.');}catch(e){toast(`Import failed: ${e.message}`);}};
function stressEntry(){checkpoint();const p=blankPost();p.title='A bigger little entry · capacity test';for(let i=0;i<20;i++){const c=document.createElement('canvas');c.width=600;c.height=450;const ctx=c.getContext('2d');ctx.fillStyle=['#c6d4b8','#e4c6ba','#c9d7d8','#dfd5af'][i%4];ctx.fillRect(0,0,600,450);ctx.fillStyle='#fffefa';ctx.beginPath();ctx.arc(310,180,85,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5b6654';ctx.font='30px Georgia';ctx.fillText(`Photo study ${i+1}`,55,365);p.pages[0].elements.push({id:uid(),type:'photo',src:c.toDataURL('image/jpeg',.75),alt:`Sample photo ${i+1}`,x:i%2?490:70,y:100+Math.floor(i/2)*540,w:300,h:225,rotation:i%2?4:-3});}for(let i=0;i<30;i++)p.pages[0].elements.push({id:uid(),type:'text',doc:textDoc(i%3===0?'Little things I want to remember. The light through the window, a walk with nowhere to go, and the way an ordinary afternoon becomes a memory.':`A small note, number ${i+1}. Write anything here.`),x:i%2?470:90,y:355+Math.floor(i/3)*540+(i%3===2?130:0),w:320,h:100,rotation:0});book.posts.push(p);activeId=p.id;selection.clear();render();changed();toast('20 sample photos + 30 editable text boxes. Your other entries are preserved.');}
recoveryCopies().then(copies=>{if(copies.legacyChanged)toast('A legacy tab changed its recovery. Export legacy-tab recovery to inspect it; current work is retained.');}).catch(()=>{});
if(recoveryBlocked)$('#new-entry').textContent='Discard old recovery & start fresh';
$('#new-entry').onclick=()=>{
 if($('#entries-dialog').open)$('#entries-dialog').close();
 if(recoveryBlocked){recoveryBlocked=false;unreadRecovery=null;book=blankBook();activeId=book.posts[0].id;undo=[];redo=[];$('#new-entry').textContent='+ Blank entry';selection.clear();render();changed();return;}
 checkpoint();if(book.posts.length>=100)return toast('This archive already has 100 entries. Export a backup before starting another archive.');const p=blankPost();book.posts.push(p);activeId=p.id;selection.clear();render();changed();
};
$('#title').oninput=()=>{if(Date.now()-typingAt>800)checkpoint();typingAt=Date.now();post().title=$('#title').value;renderEntries();updateStage();changed();};
$('#title').onblur=()=>scheduleFit();
$('#delete-selection').onclick=deleteSelection;$('#add-text').onclick=()=>addText();$('#add-photo').onclick=()=>{$('#photos').click();};$('#undo').onclick=()=>history('undo');$('#redo').onclick=()=>history('redo');
document.querySelectorAll('[data-format]').forEach(b=>{b.onpointerdown=ev=>ev.preventDefault();b.onclick=()=>{const editor=editors.get([...selection][0]);if(!editor)return toast('Tap inside a text box first.');const chain=editor.chain().focus();switch(b.dataset.format){case 'bold':chain.toggleBold().run();break;case 'italic':chain.toggleItalic().run();break;case 'heading':chain.toggleHeading({level:2}).run();break;case 'bulletList':chain.toggleBulletList().run();break;case 'link':{const url=prompt('Link address (https://…)');if(url===null)return;if(!url.trim())chain.unsetLink().run();else if(/^https?:\/\//i.test(url))chain.setLink({href:url}).run();else toast('Use an https:// or http:// link.');}}};});
$('#preview').onclick=()=>view==='editor'?showPreview():returnToEditor();
$('#export').onclick=exportBook;$('#recovery-export').onclick=exportBook;$('#import').onclick=()=>$('#archive').click();if(import.meta.env.DEV)$('#stress').onclick=stressEntry;$('#help').onclick=()=>$('#help-dialog').showModal();$('#close-help').onclick=()=>$('#help-dialog').close();
composition=createPageComposition({root:$('#stage'),wrap:$('#stage-wrap'),workspace:$('.workspace'),getEntry,getPage,getActivePageId,setActivePageId,findElement,getSelection:()=>selection,setSelection,runCommand,beginGesture,commitGesture,cancelGesture,notify:toast,onSelection:updateSelection});
textToolbar=mountTextToolbar({root:$('#text-toolbar'),getEditor:()=>editors.get([...selection][0]),getEntryId:()=>activeId,getObjectId:()=>[...selection][0],formatCommand,runCommand,notify:toast});
const disposeDocumentPaste=installDocumentPaste({root:$('#app'),addText,getActivePageId:()=>{const page=composition.activePage();setActivePageId(page.id);return page.id;},getDefaults:()=>textToolbar.defaults(),notify:toast});
editorProps=mountEditorProps({root:$('#app'),getEntry,getActivePageId,notify:toast,placeStamp({src,w,h,alt,pageId,clientX,clientY}){let point;if(clientX===undefined)point=composition.activeCenter();else if(pageId)setActivePageId(pageId);const page=getPage();if(!page)return false;point ||=composition.point({clientX,clientY},page.id);return runCommand('Tooth impression',()=>{const id=uid();page.elements.push({id,type:'photo',src,alt,w,h,x:point[0]-w/2,y:point[1]-h/2,rotation:0});selection=new Set([id]);});}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){activeShapeCancel?.();cancelGesture();persist();}});window.addEventListener('pagehide',()=>{persist();});window.addEventListener('keydown',ev=>{if(view!=='editor')return;if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='z'){ev.preventDefault();history(ev.shiftKey?'redo':'undo');}if(ev.key==='Escape'){activeShapeCancel?.();cancelGesture();}if(ev.key==='Escape'&&!document.querySelector('dialog[open],[popover]:popover-open')){selection.clear();updateSelection();}});
render();
$('#github-login').onclick=async()=>{if(cloudSession.signedIn){try{await persist();await cloud.logout();location.reload();}catch(error){toast(error.message);}}else if(cloudSession.configured)cloud.login();else toast('Online saving setup is pending. Keep using this editor and export a backup before moving to the connected studio.');};
$('#github-save').onclick=()=>saveOnline('save');
$('#github-publish').onclick=()=>{if(confirm('Publish this entry so anyone can read it on the public blog?'))saveOnline('publish');};
$('#github-unpublish').onclick=()=>{if(confirm('Remove this entry from the public blog after the next build? Its saved draft and repository history will remain.'))saveOnline('unpublish');};
$('#github-load').onclick=openOnlineEntries;
$('#close-online').onclick=()=>$('#online-dialog').close();
$('#github-copy').onclick=()=>{if(book.posts.length>=100)return toast('This archive already has 100 entries. Export local work first.');checkpoint();const p=clone(post());p.id=uid();p.title=`${p.title} (copy)`;delete p.cloud;delete p.publishedAt;delete p.status;book.posts.push(p);activeId=p.id;render();changed();toast('Local work kept as a new entry. You can save this copy online.');};
checkCloud().then(()=>{resumeDeployments();refreshColorContext();});
window.addEventListener('online',()=>checkCloud().then(resumeDeployments));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkCloud().then(()=>{resumeDeployments();refreshColorContext();});});

$('#cms-active').onclick=()=>{cmsView='active';openOnlineEntries();};
$('#cms-trash').onclick=()=>{cmsView='trash';openOnlineEntries();};

document.fonts.ready.then(()=>{updateStage();scheduleFit();});
document.fonts.addEventListener('loadingdone',()=>{updateStage();scheduleFit();});

$('#properties-toggle').onclick=()=>{propertiesOpen=!propertiesOpen;updateSelection();updateStage();};
$('#properties-dialog').addEventListener('cancel',()=>{closeProperties();updateStage();});
$('#entries-toggle').onclick=()=>{$('#entries-dialog').showModal();$('#entries-toggle').setAttribute('aria-expanded','true');};$('#close-entries').onclick=()=>$('#entries-dialog').close();
$('#entries-dialog').addEventListener('close',()=>{$('#entries-toggle').setAttribute('aria-expanded','false');(innerWidth<1000?$('#entries-toggle'):$('#title')).focus({preventScroll:true});});
$('#entries-dialog').addEventListener('toggle',()=>$('#entries-toggle').setAttribute('aria-expanded',String($('#entries-dialog').open)));
let shellWidth=innerWidth;
function reconcileShell(){if((shellWidth<1000)!==(innerWidth<1000)){if($('#entries-dialog').open)$('#entries-dialog').close();(innerWidth<1000?$('#entries-dialog'):$('#editor-view')).prepend($('#entry-rail'));if(innerWidth>=1000&&document.activeElement===$('#entries-toggle'))$('#title').focus();}if((shellWidth<1280)!==(innerWidth<1280)){presentProperties();}shellWidth=innerWidth;}
if(innerWidth<1000)$('#entries-dialog').append($('#entry-rail'));
window.addEventListener('resize',()=>{reconcileShell();if(view==='editor')updateStage();});
new ResizeObserver(([entry])=>document.documentElement.style.setProperty('--studio-header-height',entry.target.getBoundingClientRect().height+'px')).observe($('.top'));
const barObserver=new ResizeObserver(()=>{for(const [name,selector] of [['toolbar','.main>.toolbar'],['context','.main>.context-row']])document.documentElement.style.setProperty(`--studio-${name}-height`,$(selector).getBoundingClientRect().height+'px');});barObserver.observe($('.main>.toolbar'));barObserver.observe($('.main>.context-row'));
document.addEventListener('focusin',ev=>{if(view==='editor'&&ev.target.matches('#title,.ProseMirror,.inspector input'))lastEditorFocus=ev.target;});
document.querySelectorAll('.studio-menu').forEach(menu=>menu.addEventListener('click',ev=>{if(ev.target.closest('button[id]')&&!ev.target.closest('#paper-control')&&menu.matches(':popover-open'))menu.hidePopover();}));

function updateKeyboardViewport(){const viewport=window.visualViewport,height=viewport?Math.max(0,innerHeight-viewport.height-viewport.offsetTop):0;document.documentElement.style.setProperty('--keyboard-height',height+'px');$('#keyboard-actions').hidden=view!=='editor'||height<80;if(view!=='editor'||!viewport)return;const target=document.activeElement;if(!target?.matches('#title,.inspector input,.ProseMirror'))return;try{const editor=target.matches('.ProseMirror')?editors.get([...selection][0]):null,cursor=editor?editor.view.coordsAtPos(editor.state.selection.from):target.getBoundingClientRect(),bottom=viewport.offsetTop+viewport.height-($('#keyboard-actions').hidden?12:72);if(cursor.bottom>bottom){if(target.closest('dialog'))target.scrollIntoView({block:'center'});else window.scrollBy(0,cursor.bottom-bottom+24);}}catch{}}
window.visualViewport?.addEventListener('resize',updateKeyboardViewport);window.visualViewport?.addEventListener('scroll',updateKeyboardViewport);$('#keyboard-save').onclick=()=>saveOnline('save');
