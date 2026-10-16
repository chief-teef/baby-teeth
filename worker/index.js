import {transitionEntry} from './lifecycle.js';
import {spotifyPreview} from './spotify.js';
import {spotifyUrl} from '../shared/music.js';
import {validatePost,cleanPost,parseMediaPath,esc} from '../shared/document.js';
import {assertPublicationGeometry,entryElements} from '../shared/notebook-format.js';
import {cleanPng,PNG_MAX_BYTES} from '../shared/png.js';
import {base64,random,digest,seal,open,cookie,setCookie,HttpError,limitedBody,jsonBody,cleanJpeg} from './security.js';
import {github,verifyRepository,snapshot,readPost,readIndex,commitPost,REPO,REPO_ID,OWNER_ID,postPath,PUBLIC_URL,BRANCH} from './github.js';
const SESSION='__Host-bt-session',LOGIN='__Host-bt-oauth';
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const redirect=(location,cookies=[])=>{const headers=new Headers({Location:location,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});cookies.forEach(c=>headers.append('Set-Cookie',c));return new Response(null,{status:302,headers});};
const ready=env=>!!(env.GITHUB_CLIENT_ID&&env.GITHUB_CLIENT_SECRET&&env.SESSION_SECRET?.length>=32&&env.SESSIONS);
async function session(request,env,fetcher=fetch){const id=cookie(request,SESSION);if(!id||!/^[-\w]{43}$/.test(id))return null;const data=await env.SESSIONS.get(`session:${await digest(id)}`);const value=await open(env.SESSION_SECRET,'session',data);if(!Number.isSafeInteger(value?.userId))return null;try{await verifyRepository(value.token,fetcher);return value;}catch(error){if([401,403,404].includes(error.status))return null;throw error;}}
async function authorize(request,env,fetcher=fetch){const user=await session(request,env,fetcher);if(!user)throw new HttpError(401,'Sign in to GitHub before saving online.');return user;}
async function csrf(request,user){if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('x-csrf-token')!==user.csrf)throw new HttpError(403,'This write request could not be verified. Reload the editor.');}
async function limit(env,key){if(env.WRITE_LIMIT){const {success}=await env.WRITE_LIMIT.limit({key});if(!success)throw new HttpError(429,'Too many requests. Wait a minute before trying again.');}}
function validation(fn){try{return fn();}catch(e){throw new HttpError(400,e.message);}}
const capabilities=env=>({readVersions:[2,3],writeVersion:3,scrapbookWritesEnabled:env.SCRAPBOOK_WRITES_ENABLED==='true'});
export function assertWriteContract(request,env,{version,png=false,previous}={}){
  const enabled=env.SCRAPBOOK_WRITES_ENABLED==='true';
  if(enabled&&request.headers.get('X-Studio-Contract')!=='3')throw new HttpError(409,'This editor tab is out of date. Export local work, then reload before saving online.');
  if(!enabled&&(version===3||png||previous?.version===3))throw new HttpError(409,'Scrapbook online saves are temporarily disabled. Keep editing locally or export a backup and retry after the update.');
  if(previous?.version===3&&version===2)throw new HttpError(409,'A multi-page entry cannot be replaced by an older format. Export local work and reload the editor.');
}
export function createHandler(fetcher=fetch){return async function handle(request,env){
  try{
    const url=new URL(request.url),path=url.pathname;
    if(path==='/api/session'){
      if(!ready(env))return json({configured:false,signedIn:false,repository:REPO,publicUrl:PUBLIC_URL,branch:BRANCH,capabilities:capabilities(env)});
      const user=await session(request,env,fetcher);return json({configured:true,signedIn:!!user,repository:REPO,publicUrl:PUBLIC_URL,branch:BRANCH,capabilities:capabilities(env),...(user?{login:user.login,csrf:user.csrf}:{})});
    }
    if(path.startsWith('/api/')||path.startsWith('/auth/')){if(!ready(env))throw new HttpError(503,'Online saving setup is not complete yet. Local editing and export still work.');}
    if(path==='/auth/login'&&request.method==='GET'){
      await limit(env,`login:${request.headers.get('CF-Connecting-IP')||'unknown'}`);
      const state=random(),verifier=random(),challenge=await digest(verifier);const login=await seal(env.SESSION_SECRET,'oauth',{state,verifier,exp:Date.now()+600000});
      const auth=new URL('https://github.com/login/oauth/authorize');auth.search=new URLSearchParams({client_id:env.GITHUB_CLIENT_ID,redirect_uri:`${url.origin}/auth/callback`,state,code_challenge:challenge,code_challenge_method:'S256'});
      return redirect(auth.toString(),[setCookie(LOGIN,login,600)]);
    }
    if(path==='/auth/callback'&&request.method==='GET'){
      const pending=await open(env.SESSION_SECRET,'oauth',cookie(request,LOGIN));if(!pending||pending.state!==url.searchParams.get('state')||!url.searchParams.get('code'))throw new HttpError(403,'Sign-in could not be verified. Start again.');
      const response=await fetcher('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code:url.searchParams.get('code'),redirect_uri:`${url.origin}/auth/callback`,code_verifier:pending.verifier,repository_id:String(REPO_ID)})});const token=await response.json();if(!response.ok||!token.access_token)throw new HttpError(401,'GitHub sign-in failed. Try again.');
      const user=await github(token.access_token,'/user',{fetcher});await verifyRepository(token.access_token,fetcher);
      const ttl=Math.min(28800,token.expires_in||28800),id=random();const value=await seal(env.SESSION_SECRET,'session',{token:token.access_token,userId:user.id,login:user.login,csrf:random(),exp:Date.now()+ttl*1000});await env.SESSIONS.put(`session:${await digest(id)}`,value,{expirationTtl:ttl});
      return redirect('/',[setCookie(SESSION,id,ttl),setCookie(LOGIN,'',0)]);
    }
    if(path==='/auth/logout'&&request.method==='POST'){
      const user=await authorize(request,env,fetcher);await csrf(request,user);
      const response=await fetcher(`https://api.github.com/applications/${env.GITHUB_CLIENT_ID}/token`,{method:'DELETE',headers:{Authorization:`Basic ${btoa(`${env.GITHUB_CLIENT_ID}:${env.GITHUB_CLIENT_SECRET}`)}`,'Content-Type':'application/json','User-Agent':'Baby-Teeth-Studio'},body:JSON.stringify({access_token:user.token})});
      if(!response.ok&&response.status!==404)throw new HttpError(503,'Could not revoke the GitHub session. Try signing out again.');
      await env.SESSIONS.delete(`session:${await digest(cookie(request,SESSION))}`);return json({signedIn:false},200,{'Set-Cookie':setCookie(SESSION,'',0)});
    }
    if(path==='/api/posts'&&request.method==='GET'){
      const user=await authorize(request,env,fetcher),state=await snapshot(user.token,fetcher),index=await readIndex(user.token,state,fetcher);
      return json({posts:state.entries.filter(e=>/^content\/posts\/[a-f0-9-]{36}\.json$/i.test(e.path)&&e.type==='blob').map(e=>{const id=e.path.split('/').at(-1).slice(0,-5);return {id,revision:e.sha,...index[id]};}),head:state.head});
    }
    if(path==='/api/spotify'&&request.method==='GET'){
      const user=await authorize(request,env,fetcher);await limit(env,`spotify:${user.userId}`);
      const link=validation(()=>spotifyUrl(url.searchParams.get('url')));
      try{return json(await spotifyPreview(link,fetcher));}catch{throw new HttpError(502,'Spotify preview unavailable. Enter the name manually or retry.');}
    }
    const match=path.match(/^\/api\/posts\/([a-f0-9-]{36})$/i);
    if(match&&request.method==='GET'){const user=await authorize(request,env,fetcher);const result=await readPost(user.token,match[1],fetcher);validation(()=>validatePost(result.post));return json(result);}
    const lifecycleMatch=path.match(/^\/api\/posts\/([a-f0-9-]{36})\/(trash|restore)$/i);
    if(lifecycleMatch&&request.method==='POST'){
      const user=await authorize(request,env,fetcher);await csrf(request,user);await limit(env,`save:${user.userId}`);await verifyRepository(user.token,fetcher);
      const body=await jsonBody(request),state=await snapshot(user.token,fetcher);
      const current=state.entries.find(e=>e.path===postPath(lifecycleMatch[1]));
      if(!current)throw new HttpError(404,'Entry not found.');
      if(body.baseRevision!==current.sha)throw new HttpError(409,'Entry changed online. Refresh the CMS before retrying.');
      const previous=(await readPost(user.token,lifecycleMatch[1],fetcher,state.head)).post;
      validation(()=>validatePost(previous));assertWriteContract(request,env,{previous});
      if(env.PRIVATE_VERIFICATION==='true'&&previous.status==='published')throw new HttpError(403,'Public entry changes are disabled during private verification.');
      const doc=transitionEntry(previous,lifecycleMatch[2],new Date().toISOString(),user.userId);
      const index=await readIndex(user.token,state,fetcher);
      const result=await commitPost(user.token,state,doc,[],fetcher,index);
      return json({...result,post:doc,publishing:previous.status==='published'});
    }
    if(path==='/api/assets'&&request.method==='POST'){
      const user=await authorize(request,env,fetcher);await csrf(request,user);await limit(env,`upload:${user.userId}`);await verifyRepository(user.token,fetcher);
      const mime=request.headers.get('content-type'),png=mime==='image/png';assertWriteContract(request,env,{png});
      if(!png&&mime!=='image/jpeg')throw new HttpError(415,'Only processed JPEG or PNG photos can be uploaded.');
      const input=await limitedBody(request,png?PNG_MAX_BYTES:700000);let bytes;
      try{bytes=png?await cleanPng(input):cleanJpeg(input);}catch(error){throw new HttpError(400,error.message);}
      const blob=await github(user.token,`/repos/${REPO}/git/blobs`,{method:'POST',body:{content:base64(bytes),encoding:'base64'},fetcher});
      if(!/^[a-f0-9]{40}$/.test(blob.sha||''))throw new HttpError(503,'Photo upload did not return a valid revision. Retry the upload.');
      const path=`media/${blob.sha}.${png?'png':'jpg'}`,receipt=await seal(env.SESSION_SECRET,'asset',{sha:blob.sha,path,userId:user.userId,exp:Date.now()+7200000});return json({path,receipt});
    }
    if(match&&request.method==='PUT'){
      const user=await authorize(request,env,fetcher);await csrf(request,user);await limit(env,`save:${user.userId}`);await verifyRepository(user.token,fetcher);
      const body=await jsonBody(request);assertWriteContract(request,env,{version:body.post?.version});validation(()=>validatePost(body.post));if(body.post.id!==match[1]||!['save','publish','unpublish'].includes(body.action))throw new HttpError(400,'Invalid save request.');
      const doc=cleanPost(body.post),state=await snapshot(user.token,fetcher);const current=state.entries.find(e=>e.path===postPath(doc.id));
      if((body.baseRevision||null)!==(current?.sha||null))throw new HttpError(409,'A newer version exists online. Load it or save your local work as a copy.',{currentRevision:current?.sha||null});
      let previous=null;if(current)previous=(await readPost(user.token,doc.id,fetcher,state.head)).post;
      if(previous)validation(()=>validatePost(previous));assertWriteContract(request,env,{version:doc.version,previous,png:entryElements(doc).some(e=>e.type==='photo'&&parseMediaPath(e.src)?.extension==='png')});
      if(env.PRIVATE_VERIFICATION==='true'&&(body.action!=='save'||previous?.status==='published'))throw new HttpError(403,'Publishing is disabled during private verification. Save a draft instead.');
      if(previous?.status==='trashed')throw new HttpError(409,'This entry is in trash. Restore it in the CMS before editing.');
      const paths=[...new Set(entryElements(doc).filter(e=>e.type==='photo').map(e=>e.src))];const assets=[];
      for(const path of paths){const expected=parseMediaPath(path)?.sha;if(!expected)throw new HttpError(400,'Invalid photo path.');const existing=state.entries.find(e=>e.path===path&&e.type==='blob');if(existing?.sha===expected)continue;const proof=await open(env.SESSION_SECRET,'asset',body.receipts?.[path]);if(!proof||proof.path!==path||proof.sha!==expected||proof.userId!==user.userId)throw new HttpError(400,'Photo upload expired or is missing. Upload the photo again.');assets.push({path,sha:expected});}
      const now=new Date().toISOString();doc.status=body.action==='unpublish'?'draft':body.action==='publish'||previous?.status==='published'?'published':'draft';doc.publishedAt=previous?.publishedAt||(doc.status==='published'?now:null);doc.updatedAt=now;doc.updatedBy=user.userId;
      if(doc.status==='published')validation(()=>assertPublicationGeometry(doc));
      const index=await readIndex(user.token,state,fetcher);const result=await commitPost(user.token,state,doc,assets,fetcher,index);return json({...result,post:doc,publishing:doc.status==='published'||previous?.status==='published'});
    }
    if(path==='/api/deployment'&&request.method==='GET'){
      const user=await authorize(request,env,fetcher),commit=url.searchParams.get('commit');if(!/^[a-f0-9]{40}$/.test(commit||''))throw new HttpError(400,'Invalid publishing revision.');
      const runs=await github(user.token,`/repos/${REPO}/actions/runs?head_sha=${commit}&per_page=10`,{fetcher});const run=runs.workflow_runs.find(r=>r.path==='.github/workflows/publish.yml');return json({status:run?.status||'queued',conclusion:run?.conclusion||null,url:PUBLIC_URL});
    }
    if(path.startsWith('/api/')||path.startsWith('/auth/'))throw new HttpError(404,'Unknown endpoint.');
    if(!ready(env)||!await session(request,env,fetcher)){
      const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Studio sign-in</title><style>body{background:#ffe0f5;color:#4b0035;font:20px Georgia;margin:0;min-height:100vh;display:grid;place-items:center}main{padding:2rem;max-width:30rem;background:#f0ffb0;border:4px solid #ff1493}a{color:#9b005d;display:inline-block;margin:1rem 1rem 0 0}h1{margin-top:0}</style><main><h1>Baby Teeth Studio</h1><p>Sign in with the a GitHub account with write access to this blog to open the editor.</p>${ready(env)?'<a href="/auth/login">Sign in with GitHub →</a>':'<p>Studio sign-in is temporarily unavailable. Please try again later.</p>'}<a href="${esc(PUBLIC_URL)}">Read the public blog →</a></main></html>`;
      return new Response(html,{status:ready(env)?200:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'"}});
    }
    const asset=await env.ASSETS.fetch(request),headers=new Headers(asset.headers);
    headers.set('Cache-Control','no-store');headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','strict-origin-when-cross-origin');headers.set('X-Frame-Options','DENY');
    headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://i.scdn.co https://image-cdn-fa.spotifycdn.com; connect-src 'self' https://raw.githubusercontent.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    return new Response(asset.body,{status:asset.status,headers});
  }catch(error){const status=error instanceof HttpError?error.status:503;return json({error:error instanceof HttpError?error.message:'The saving service is temporarily unavailable. Local work is safe.',...(error.details||{})},status);}
};}
export default {fetch:createHandler()};
