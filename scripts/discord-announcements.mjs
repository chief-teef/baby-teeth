import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {validateSettings} from '../shared/settings.js';
import {entryLabel} from '../shared/notebook-format.js';

const SHA=/^[a-f0-9]{40}$/;
const ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const MESSAGE_ID=/^[1-9][0-9]{0,19}$/;
const messageId=v=>typeof v==='string'&&MESSAGE_ID.test(v);
const STATE_BRANCH='codex/discord-announcement-state';
const LIMIT=2*1024*1024;
const date=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
function canonical(id,settings){return new URL(`posts/${id}/`,settings.publicUrl).href;}
function validUrl(url,id,settings){return typeof url==='string'&&url===canonical(id,settings);}
export function validateManifest(value,settings){
  if(!object(value)||value.version!==1||!SHA.test(value.commit)||!Array.isArray(value.posts))throw Error('Invalid live manifest.');
  const ids=new Set();
  for(const p of value.posts){
    if(!object(p)||!ID.test(p.id)||ids.has(p.id)||typeof p.title!=='string'||!date(p.publishedAt)||!validUrl(p.url,p.id,settings))throw Error('Invalid public entry.');
    ids.add(p.id);
  }
  return value;
}
export function validateState(value,settings){
  if(!object(value)||value.version!==1||!date(value.initializedAt)||!object(value.records)||value.rejectedWebhook!==undefined&&!/^[a-f0-9]{64}$/.test(value.rejectedWebhook))throw Error('Invalid announcement ledger.');
  for(const [id,r] of Object.entries(value.records)){
    if(!ID.test(id)||!object(r)||!['baseline','pending','sent'].includes(r.status)||!validUrl(r.url,id,settings)||!SHA.test(r.commit))throw Error('Invalid ledger record.');
    if(r.status!=='baseline'&&(!Number.isSafeInteger(r.attempts)||r.attempts<1||!date(r.attemptedAt)||typeof r.outcome!=='string'))throw Error('Invalid attempt record.');
    if(r.nextAttemptAt!==undefined&&!date(r.nextAttemptAt)||r.status==='sent'&&!messageId(r.messageId)||r.messageId!==undefined&&!messageId(r.messageId))throw Error('Invalid delivery record.');
  }
  return value;
}
export function webhookUrl(value){
  let url;try{url=new URL(value);}catch{throw Error('Invalid Discord webhook configuration.');}
  if(url.protocol!=='https:'||url.host!=='discord.com'||url.username||url.password||url.hash||url.search||!/^\/api(?:\/v[0-9]+)?\/webhooks\/[1-9][0-9]*\/[A-Za-z0-9_-]+$/.test(url.pathname))throw Error('Invalid Discord webhook configuration.');
  url.searchParams.set('wait','true');return url;
}
export function message(post){
  const title=entryLabel({title:Array.from(post.title.replace(/\s+/gu,' ').replace(/[\p{Cc}\p{Cf}]/gu,'').trim()).slice(0,200).join(''),publishedAt:post.publishedAt}).replace(/[\\`*_{}\[\]()<>#+\-.!|~]/g,'\\$&');
  const content=`Anna just posted a new blog entry!\n\n${title}\n\nGo read it here: ${post.url}`;
  if(content.length>2000)throw Error('Announcement exceeds Discord message limit.');
  return {content,allowed_mentions:{parse:[]}};
}

export async function runAnnouncements({env=process.env,event={},settings,fetch=globalThis.fetch,now=Date.now,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),log=console.log}={}){
  if(env.BLOG_PUBLISHING_ENABLED!=='true'||env.DISCORD_ANNOUNCEMENTS_ENABLED!=='true'){log('Announcements disabled.');return;}
  settings=validateSettings(settings);
  const kind=env.GITHUB_EVENT_NAME, mode=env.ANNOUNCEMENT_MODE||event.inputs?.mode||'reconcile';
  if(env.GITHUB_REPOSITORY!==settings.repository||env.GITHUB_REF!==`refs/heads/${env.GITHUB_DEFAULT_BRANCH}`||!['workflow_run','schedule','workflow_dispatch'].includes(kind)||!['initialize','reconcile'].includes(mode)||mode==='initialize'&&kind!=='workflow_dispatch')throw Error('Untrusted announcement execution.');
  const upstream=event.workflow_run;
  if(kind==='workflow_run'&&(!upstream||upstream.name!=='Publish blog'||upstream.status!=='completed'||upstream.conclusion!=='success'||!['push','workflow_dispatch'].includes(upstream.event)||upstream.head_branch!==settings.branch||upstream.head_repository?.full_name!==settings.repository||!SHA.test(upstream.head_sha)))throw Error('Untrusted publishing completion.');
  const hook=webhookUrl(env.DISCORD_WEBHOOK_URL),fingerprint=createHash('sha256').update(env.DISCORD_WEBHOOK_URL).digest('hex');
  const apiBase=`https://api.github.com/repos/${settings.repository}`;
  async function request(url,options={}){
    try{return await fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(15000)});}catch{throw Error('HTTP request failed or timed out.');}
  }
  async function json(response){
    if(Number(response.headers.get('content-length'))>LIMIT){await response.body?.cancel();throw Error('JSON exceeds size limit.');}
    const reader=response.body?.getReader();let length=0;const chunks=[];
    if(!reader)throw Error('Missing JSON response.');
    try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>LIMIT)throw Error('JSON exceeds size limit.');chunks.push(value);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
    catch{await reader.cancel().catch(()=>{});throw Error('Invalid or oversized JSON response.');}
  }
  async function api(path,method='GET',body,allow404=false){
    const response=await request(`${apiBase}/${path}`,{method,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${env.GITHUB_TOKEN}`,'X-GitHub-Api-Version':'2026-03-10',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    if(allow404&&response.status===404)return null;
    if(!response.ok)throw Error(`GitHub ledger/deployment request HTTP ${response.status}.`);
    return json(response);
  }
  async function ancestor(base,head){const comparison=await api(`compare/${base}...${encodeURIComponent(head)}`);if(!['ahead','identical'].includes(comparison.status))throw Error('Deployment ancestry could not be verified.');}
  async function snapshot(){
    const bust=`?announcement_check=${now()}`;
    const manifestResponse=await request(new URL(`notifications.json${bust}`,settings.publicUrl),{cache:'no-store'});
    if(manifestResponse.status!==200)throw Error(`Manifest HTTP ${manifestResponse.status}.`);
    const manifest=validateManifest(await json(manifestResponse),settings);
    const revisionResponse=await request(new URL(`revision.json${bust}`,settings.publicUrl),{cache:'no-store'});
    if(revisionResponse.status!==200||(await json(revisionResponse)).commit!==manifest.commit)throw Error('Public revision mismatch.');
    const runs=await api(`actions/workflows/publish.yml/runs?head_sha=${manifest.commit}&branch=${encodeURIComponent(settings.branch)}&status=completed&per_page=100`);
    if(!Array.isArray(runs.workflow_runs)||!runs.workflow_runs.some(r=>r.name==='Publish blog'&&r.head_sha===manifest.commit&&r.head_branch===settings.branch&&r.head_repository?.full_name===settings.repository&&['push','workflow_dispatch'].includes(r.event)&&r.status==='completed'&&r.conclusion==='success'))throw Error('No successful exact-revision public deployment.');
    await ancestor(manifest.commit,settings.branch);
    if(kind==='workflow_run')await ancestor(upstream.head_sha,manifest.commit);
    return manifest;
  }
  let live;const propagationStart=now();
  for(let attempt=0;attempt<11;attempt++){
    if(attempt>0&&now()-propagationStart>=300000)throw Error('Live deployment verification failed.');
    try{live=await snapshot();break;}catch{if(attempt===10||now()-propagationStart>=300000)throw Error('Live deployment verification failed.');await sleep(Math.min(30000,300000-(now()-propagationStart)));}
  }
  const statePath=`contents/state.json?ref=${encodeURIComponent(STATE_BRANCH)}`;
  let stored=await api(statePath,'GET',undefined,true),state;
  if(stored){
    if(stored.encoding!=='base64'||!SHA.test(stored.sha)||typeof stored.content!=='string')throw Error('Invalid ledger file.');
    try{state=validateState(JSON.parse(Buffer.from(stored.content,'base64').toString('utf8')),settings);}catch{throw Error('Corrupt announcement ledger.');}
  }
  if(mode==='initialize'){
    if(stored||await api(`git/ref/heads/${STATE_BRANCH}`,'GET',undefined,true))throw Error('Refusing to reinitialize announcement history.');
    state={version:1,initializedAt:new Date(now()).toISOString(),records:Object.fromEntries(live.posts.map(p=>[p.id,{status:'baseline',url:p.url,commit:live.commit}]))};
    const tree=await api('git/trees','POST',{tree:[{path:'state.json',mode:'100644',type:'blob',content:JSON.stringify(state)}]});
    const commit=await api('git/commits','POST',{message:'Initialize silent announcement baseline',tree:tree.sha,parents:[]});
    await api('git/refs','POST',{ref:`refs/heads/${STATE_BRANCH}`,sha:commit.sha});log(`Baselined ${live.posts.length} entries; zero announcements.`);return;
  }
  if(!state)throw Error('Announcement ledger missing; explicit initialization required.');
  if(state.rejectedWebhook===fingerprint)throw Error('Discord webhook previously returned HTTP 404; replace repository secret.');
  async function save(){
    validateState(state,settings);
    const result=await api('contents/state.json','PUT',{branch:STATE_BRANCH,sha:stored.sha,message:'Record announcement outcome',content:Buffer.from(JSON.stringify(state)).toString('base64')});
    if(!SHA.test(result.content?.sha))throw Error('Ledger write returned no file SHA.');
    stored.sha=result.content.sha;
  }
  const candidates=live.posts.filter(p=>!state.records[p.id]||state.records[p.id].status==='pending'&&(!state.records[p.id].nextAttemptAt||Date.parse(state.records[p.id].nextAttemptAt)<=now())).sort((a,b)=>Date.parse(a.publishedAt)-Date.parse(b.publishedAt)||a.id.localeCompare(b.id)).slice(0,3);
  log(`Processing ${candidates.length} public candidates.`);
  for(const candidate of candidates){
    const start=now();
    for(let retry=0;retry<=3;retry++){
      if(retry>0&&now()-start>=120000)return;
      live=await snapshot();const post=live.posts.find(p=>p.id===candidate.id);if(!post){log(`${candidate.id}: no longer public.`);break;}
      let route;try{route=await request(post.url,{cache:'no-store'});}catch{log(`${post.id}: public route unavailable.`);break;}
      await route.body?.cancel();if(route.status!==200){log(`${post.id}: public route HTTP ${route.status}.`);break;}
      const payload=message(post);
      if(retry>0&&now()-start>=120000)return;
      const previous=state.records[post.id];
      const record={status:'pending',url:post.url,commit:live.commit,attempts:(previous?.attempts||0)+1,attemptedAt:new Date(now()).toISOString(),outcome:'uncertain'};
      state.records[post.id]=record;await save();
      if(retry>0&&now()-start>=120000)return;
      let response;try{response=await request(hook,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});}catch{log(`${post.id}: uncertain network/timeout.`);break;}
      if(response.ok){
        let result;try{result=await json(response);}catch{}
        if(!messageId(result?.id)){log(`${post.id}: uncertain success response.`);break;}
        record.status='sent';record.outcome='confirmed';record.messageId=result.id;
        try{await save();}catch{log(`${post.id}: confirmation ledger failure; message ID ${result.id}.`);throw Error('Confirmation ledger write failed; possible duplicate on retry.');}
        log(`${post.id}: confirmed message ${result.id}.`);break;
      }
      if(response.status===429){
        let body;try{body=await json(response);}catch{}
        const header=response.headers.get('retry-after');
        const delays=[header?.trim()?Number(header):NaN,body?.retry_after].filter(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0);
        const delay=delays.length?Math.max(...delays)*1000:120000;
        record.outcome='rate-limited';record.nextAttemptAt=new Date(now()+delay).toISOString();await save();
        log(`${post.id}: HTTP 429 deferred.`);
        if(retry===3||now()-start+delay>120000)return;
        await sleep(delay);continue;
      }
      if(response.status>=400&&response.status<500){
        record.outcome=`rejected-${response.status}`;if(response.status===404)state.rejectedWebhook=fingerprint;await save();throw Error(`Discord webhook HTTP ${response.status}; configuration/request rejected.`);
      }
      log(`${post.id}: uncertain HTTP ${response.status}.`);break;
    }
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const settings=JSON.parse(await readFile(new URL('../config/blog.json',import.meta.url),'utf8'));
    const event=process.env.GITHUB_EVENT_PATH?JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8')):{};
    await runAnnouncements({settings,event});
  }catch(error){console.error(error instanceof Error&&/^(Invalid|Untrusted|Announcement|Discord|GitHub|Live|Public|No successful|Deployment|Corrupt|Refusing|Confirmation|JSON|Missing|HTTP)/.test(error.message)?error.message:'Announcement run failed; inspect configuration and permissions.');process.exitCode=1;}
}
