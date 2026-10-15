import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createHandler} from '../worker/index.js';
import {seal,open,digest,cleanJpeg} from '../worker/security.js';
import {validatePost,textContent,renderText} from '../shared/document.js';
import {renderComposition} from '../shared/renderer.js';
import {readPost} from '../worker/github.js';
import {spotifyPreview} from '../worker/spotify.js';
const ID='11111111-1111-4111-8111-111111111111',ELEMENT='22222222-2222-4222-8222-222222222222';
const doc=()=>({version:2,pageFormat:'notebook-900x1200-v1',id:ID,title:'A little day',created:'2026-10-12T18:00:00.000Z',elements:[{id:ELEMENT,type:'text',x:60,y:70,w:300,h:100,rotation:0,doc:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Hello scrapbook!'}]}]}}]});
const sha=value=>createHash('sha1').update(value).digest('hex');
test('entry reads can be pinned to the checked repository revision',async()=>{
  const commit='a'.repeat(40);
  const result=await readPost('test-token',ID,async url=>{
    assert.equal(new URL(url).searchParams.get('ref'),commit);
    return Response.json({sha:'b'.repeat(40),content:Buffer.from(JSON.stringify(doc())).toString('base64')});
  },commit);
  assert.equal(result.post.id,ID);
});
function fixture(push=true){
  const kv=new Map(),files=new Map(),commits=new Map(),trees=new Map();let head='a'.repeat(40),sequence=0,race=false;
  const env={GITHUB_CLIENT_ID:'test-client',GITHUB_CLIENT_SECRET:'test-secret',SESSION_SECRET:'this-is-a-test-only-session-secret-with-enough-length',SESSIONS:{get:async key=>kv.get(key)||null,put:async(key,value)=>kv.set(key,value),delete:async key=>kv.delete(key)},WRITE_LIMIT:{limit:async()=>({success:true})},ASSETS:{fetch:async()=>new Response('editor')}};
  const fetcher=async(url,options={})=>{
    const u=new URL(url),path=u.pathname,body=options.body?JSON.parse(options.body):null;
    if(path==='/login/oauth/access_token')return Response.json({access_token:'test-only-access-token',expires_in:28800});
    if(path==='/user')return Response.json({id:341668853,login:'chief-teef'});
    if(path==='/repos/chief-teef/baby-teeth')return Response.json({id:1416133666,permissions:{push}});
    if(path.endsWith('/git/ref/heads/main'))return Response.json({object:{sha:head}});
    if(path.includes('/git/commits/')&&options.method!=='POST')return Response.json({tree:{sha:'tree-head'}});
    if(path.includes('/git/trees/')&&options.method!=='POST')return Response.json({tree:[...files].map(([path,value])=>({path,type:'blob',sha:value.sha})),truncated:false});
    if(path.endsWith('/git/trees')&&options.method==='POST'){const id=sha(`tree-${++sequence}`);trees.set(id,body.tree);return Response.json({sha:id});}
    if(path.endsWith('/git/commits')&&options.method==='POST'){const id=sha(`commit-${++sequence}`);commits.set(id,body);return Response.json({sha:id});}
    if(path.endsWith('/git/refs/heads/main')&&options.method==='PATCH'){
      assert.equal(body.force,false);const commit=commits.get(body.sha);
      if(race||commit.parents[0]!==head)return Response.json({message:'not fast forward'},{status:422});
      head=body.sha;for(const item of trees.get(commit.tree)){if(item.content!==undefined)files.set(item.path,{sha:sha(item.content),content:item.content});else files.set(item.path,{sha:item.sha,content:'binary-image'});}return Response.json({object:{sha:head}});
    }
    if(path.includes('/contents/')){const key=path.split('/contents/')[1],file=files.get(key);return file?Response.json({sha:file.sha,content:Buffer.from(file.content).toString('base64')}):Response.json({message:'missing'},{status:404});}
    if(path.endsWith('/git/blobs')&&options.method==='POST')return Response.json({sha:sha(body.content)});
    if(path.endsWith('/actions/runs'))return Response.json({workflow_runs:[]});
    if(path.startsWith('/applications/'))return new Response(null,{status:204});
    throw Error(`Unexpected mock endpoint ${path}`);
  };
  const handler=createHandler(fetcher),sessionId='x'.repeat(43),csrf='test-csrf';
  async function signedIn(userId=341668853){await env.SESSIONS.put(`session:${await digest(sessionId)}`,await seal(env.SESSION_SECRET,'session',{token:'test-only-access-token',userId,login:'chief-teef',csrf,exp:Date.now()+60000}));}
  async function request(path,{method='GET',body,cookie=true,origin='https://studio.example',token=csrf}={}){const headers={...(cookie?{cookie:`__Host-bt-session=${sessionId}`}:{})};if(method!=='GET'){headers.origin=origin;headers['x-csrf-token']=token;headers['content-type']='application/json';}return handler(new Request(`https://studio.example${path}`,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),env);}
  return {env,handler,files,request,signedIn,setRace:()=>{race=true;}};
}
test('sealed state expires, rejects tampering, and cannot change purpose',async()=>{const secret='testing-encryption-secret-long-enough',value=await seal(secret,'session',{exp:Date.now()+10000,id:1});assert.equal((await open(secret,'session',value)).id,1);assert.equal(await open(secret,'oauth',value),null);assert.equal(await open(secret,'session',value+'broken'),null);assert.equal(await open(secret,'session',await seal(secret,'session',{exp:Date.now()-1})),null);});
test('Spotify lookup is authenticated, URL errors are 400, provider failures are 502, metadata persists online',async()=>{
 const f=fixture(),url='https://open.spotify.com/artist/'+'a'.repeat(22);assert.equal((await f.request('/api/spotify?url='+encodeURIComponent(url),{cookie:false})).status,401);await f.signedIn();assert.equal((await f.request('/api/spotify?url=https://evil.test')).status,400);assert.equal((await f.request('/api/spotify?url='+encodeURIComponent(url))).status,502);
 const p=doc();p.music={artists:[{name:'brakence',url}],songs:[]};const r=await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:p,action:'save'}});assert.equal(r.status,200);assert.deepEqual((await r.json()).post.music,p.music);assert.deepEqual((await (await f.request(`/api/posts/${ID}`)).json()).post.music,p.music);
 f.env.WRITE_LIMIT.limit=async()=>({success:false});assert.equal((await f.request('/api/spotify?url='+encodeURIComponent(url))).status,429);
 const headers=await f.request('/');assert.ok(headers.headers.get('Content-Security-Policy').includes('https://image-cdn-fa.spotifycdn.com'));assert.ok(!headers.headers.get('Content-Security-Policy').includes('https:;'));
});
test('Spotify preview fixes host, forbids redirects, bounds response and ignores embed HTML',async()=>{
 const url='https://open.spotify.com/track/'+'a'.repeat(22),image='https://i.scdn.co/image/'+'f'.repeat(40);
 const result=await spotifyPreview(url,async(endpoint,options)=>{assert.equal(new URL(endpoint).origin,'https://open.spotify.com');assert.equal(new URL(endpoint).searchParams.get('url'),url);assert.equal(options.redirect,'error');assert.ok(options.signal instanceof AbortSignal);return Response.json({title:'Song',thumbnail_url:image,html:'<script>evil()</script>'});});assert.deepEqual(result,{name:'Song',url,image});
 assert.deepEqual(await spotifyPreview(url,async()=>Response.json({title:'Song',thumbnail_url:'https://evil.test/art'})),{name:'Song',url});
 const cdn='https://image-cdn-fa.spotifycdn.com/image/'+'a'.repeat(40);assert.equal((await spotifyPreview(url,async()=>Response.json({title:'Song',thumbnail_url:cdn}))).image,cdn);
 assert.deepEqual(await spotifyPreview(url,async(endpoint,options)=>{assert.equal(options.redirect,'error');return endpoint===url?new Response(`<meta property="og:image" content="${image}"/>`):Response.json({title:'Song'});}),{name:'Song',url,image});
 assert.deepEqual(await spotifyPreview(url,async endpoint=>endpoint===url?new Response('<meta property="og:image" content="https://evil.test/art"/>'):Response.json({title:'Song'})),{name:'Song',url});
 assert.deepEqual(await spotifyPreview(url,async endpoint=>endpoint===url?new Response('x'.repeat(1048577)):Response.json({title:'Song'})),{name:'Song',url});
 for(const response of [new Response('',{status:404}),Response.json(null),Response.json({title:4}),Response.json({title:'a'.repeat(40000)}),new Response('invalid')])await assert.rejects(spotifyPreview(url,async()=>response));
 await assert.rejects(spotifyPreview('https://evil.test',()=>{throw Error('Should never fetch');}));
 await assert.rejects(spotifyPreview(url,async(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason)))),/timeout/i);
});
test('v2 draft overflow round-trips; publish and live revision updates reject bounds without committing',async()=>{
 const f=fixture();await f.signedIn();const p={...doc(),version:2,pageFormat:'notebook-900x1200-v1'};p.elements[0].y=1000;
 let r=await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:p,action:'save',baseRevision:null}});assert.equal(r.status,200);let saved=await r.json();assert.equal(saved.post.pageFormat,p.pageFormat);assert.equal(saved.post.elements[0].y,1000);
 r=await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:p,action:'publish',baseRevision:saved.revision}});assert.equal(r.status,400);assert.equal(JSON.parse(f.files.get(`content/posts/${ID}.json`).content).status,'draft');
 p.elements[0].y=50;r=await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:p,action:'publish',baseRevision:saved.revision}});assert.equal(r.status,200);saved=await r.json();const before=f.files.get(`content/posts/${ID}.json`).content;p.elements[0].rotation=90;p.elements[0].x=750;
 r=await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:p,action:'save',baseRevision:saved.revision}});assert.equal(r.status,400);assert.equal(f.files.get(`content/posts/${ID}.json`).content,before);
 p.pageFormat='future';r=await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:p,action:'save',baseRevision:saved.revision}});assert.equal(r.status,400);
});
test('write collaborators can save; logged-out writes, CSRF and origin enforced',async()=>{const f=fixture();const body={post:doc(),action:'save',baseRevision:null};assert.equal((await f.request(`/api/posts/${ID}`,{method:'PUT',body,cookie:false})).status,401);await f.signedIn(999);const saved=await f.request(`/api/posts/${ID}`,{method:'PUT',body});assert.equal(saved.status,200);assert.equal((await saved.json()).post.updatedBy,999);assert.equal((await f.request(`/api/posts/${ID}`,{method:'PUT',body,origin:'https://evil.example'})).status,403);assert.equal((await f.request(`/api/posts/${ID}`,{method:'PUT',body,token:'wrong'})).status,403);});
test('read-only or removed collaborators cannot reopen studio or write with old sessions',async()=>{const f=fixture(false);await f.signedIn(999);assert.equal((await (await f.request('/api/session')).json()).signedIn,false);assert.match(await (await f.request('/')).text(),/Sign in with GitHub/);assert.equal((await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:doc(),action:'save'}})).status,401);});
test('draft stays draft, publish is explicit, saving published entry requests update',async()=>{const f=fixture();await f.signedIn();let r=await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:{...doc(),status:'published',updatedBy:123},action:'save',baseRevision:null}});assert.equal(r.status,200);let data=await r.json();assert.equal(data.post.status,'draft');assert.equal(data.publishing,false);assert.equal(data.post.updatedBy,341668853);r=await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:doc(),action:'publish',baseRevision:data.revision}});data=await r.json();assert.equal(data.post.status,'published');assert.equal(data.publishing,true);r=await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:doc(),action:'save',baseRevision:data.revision}});data=await r.json();assert.equal(data.post.status,'published');assert.equal(data.publishing,true);});
test('stale and racing saves never overwrite the latest ref',async()=>{const f=fixture();await f.signedIn();let r=await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:doc(),action:'save',baseRevision:null}});const data=await r.json();r=await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:doc(),action:'save',baseRevision:null}});assert.equal(r.status,409);f.setRace();r=await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:doc(),action:'publish',baseRevision:data.revision}});assert.equal(r.status,409);const saved=JSON.parse(f.files.get(`content/posts/${ID}.json`).content);assert.equal(saved.status,'draft');});
test('cannot save arbitrary media or raw inline image data',async()=>{const f=fixture();await f.signedIn();const p=doc();p.elements.push({id:'33333333-3333-4333-8333-333333333333',type:'photo',x:20,y:200,w:200,h:150,rotation:0,src:`media/${'b'.repeat(40)}.jpg`,alt:'Photo'});assert.equal((await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:p,action:'save'}})).status,400);p.elements[1].src='data:image/jpeg;base64,ABC';assert.throws(()=>validatePost(p));});
test('safe renderer escapes HTML and rejects script links',()=>{const p=doc();p.elements[0].doc.content[0].content[0].text='<script>alert(1)</script>';validatePost(p);assert.ok(renderText(p.elements[0].doc).includes('&lt;script&gt;'));p.elements[0].doc.content[0].content[0].marks=[{type:'link',attrs:{href:'javascript:alert(1)'}}];assert.throws(()=>validatePost(p));delete p.elements[0].doc.content[0].content[0].marks;assert.ok(renderComposition(p).includes('&lt;script&gt;'));});
test('JPEG upload strips EXIF and comments and rejects non-images',()=>{const bytes=Uint8Array.from([255,216,255,225,0,8,69,88,73,70,0,0,255,192,0,11,8,0,10,0,10,1,1,17,0,255,218,0,8,1,1,0,0,63,0,0,255,217]);const result=cleanJpeg(bytes);assert.ok(result.length<bytes.length);assert.equal(Buffer.from(result).includes(Buffer.from('EXIF')),false);assert.throws(()=>cleanJpeg(new TextEncoder().encode('<svg>not JPEG</svg>')));});
test('studio assets are hidden until owner authentication',async()=>{const f=fixture();for(const path of ['/','/assets/editor.js']){const r=await f.request(path,{cookie:false});assert.match(await r.text(),/Sign in with GitHub/);assert.equal(r.headers.get('cache-control'),'no-store');}await f.signedIn();assert.equal(await (await f.request('/')).text(),'editor');});
test('unconfigured service does not expose the editor',async()=>{const f=fixture();delete f.env.GITHUB_CLIENT_SECRET;const r=await f.request('/api/session');assert.equal((await r.json()).configured,false);assert.equal((await f.request('/auth/login')).status,503);assert.equal((await f.request('/')).status,503);});
test('OAuth uses state and PKCE; credentials stay in encrypted server storage',async()=>{
  const f=fixture();const start=await f.request('/auth/login');assert.equal(start.status,302);const target=new URL(start.headers.get('location'));assert.ok(target.searchParams.get('code_challenge'));assert.equal(target.searchParams.get('code_challenge_method'),'S256');assert.ok(!target.searchParams.has('client_secret'));
  const pending=start.headers.get('set-cookie').split(';')[0];
  const bad=await f.handler(new Request('https://studio.example/auth/callback?state=wrong&code=code',{headers:{cookie:pending}}),f.env);assert.equal(bad.status,403);
  const callback=await f.handler(new Request(`https://studio.example/auth/callback?state=${target.searchParams.get('state')}&code=code`,{headers:{cookie:pending}}),f.env);assert.equal(callback.status,302);
  const sessionCookie=callback.headers.getSetCookie().find(c=>c.startsWith('__Host-bt-session='));assert.ok(sessionCookie.includes('HttpOnly'));assert.ok(sessionCookie.includes('Secure'));assert.ok(!sessionCookie.includes('test-only-access-token'));
  const cookieValue=sessionCookie.split(';')[0];const response=await f.handler(new Request('https://studio.example/api/session',{headers:{cookie:cookieValue}}),f.env);const data=await response.json();assert.equal(data.signedIn,true);assert.equal(data.login,'chief-teef');assert.ok(!JSON.stringify(data).includes('access-token'));
  const logout=await f.handler(new Request('https://studio.example/auth/logout',{method:'POST',headers:{cookie:cookieValue,origin:'https://studio.example','x-csrf-token':data.csrf}}),f.env);assert.equal(logout.status,200);const after=await f.handler(new Request('https://studio.example/api/session',{headers:{cookie:cookieValue}}),f.env);assert.equal((await after.json()).signedIn,false);
});
test('uploaded photos require signed receipts and are committed with their entry',async()=>{
  const f=fixture();await f.signedIn();const bytes=Uint8Array.from([255,216,255,192,0,11,8,0,10,0,10,1,1,17,0,255,218,0,8,1,1,0,0,63,0,0,255,217]);
  const response=await f.handler(new Request('https://studio.example/api/assets',{method:'POST',headers:{cookie:`__Host-bt-session=${'x'.repeat(43)}`,origin:'https://studio.example','x-csrf-token':'test-csrf','content-type':'image/jpeg'},body:bytes}),f.env);assert.equal(response.status,200);const photo=await response.json();assert.ok(!f.files.has(photo.path),'Upload is staged, not committed independently');
  const p=doc();p.elements.push({id:'33333333-3333-4333-8333-333333333333',type:'photo',x:10,y:200,w:100,h:100,rotation:0,src:photo.path,alt:'A photo'});
  const saved=await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:p,action:'save',receipts:{[photo.path]:photo.receipt}}});assert.equal(saved.status,200);assert.ok(f.files.has(photo.path));assert.ok(f.files.has(`content/posts/${ID}.json`));
});

test('trash preserves content, prevents stale resurrection, and restores as draft',async()=>{
  const f=fixture();await f.signedIn();
  let response=await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:doc(),action:'publish'}});
  let saved=await response.json();const publishedAt=saved.post.publishedAt;
  const oldRevision=saved.revision;
  response=await f.request(`/api/posts/${ID}/trash`,{method:'POST',body:{baseRevision:oldRevision}});
  assert.equal(response.status,200);saved=await response.json();
  assert.equal(saved.post.status,'trashed');assert.equal(saved.publishing,true);
  assert.deepEqual(saved.post.elements,doc().elements);assert.ok(saved.post.trashedAt);
  const list=await (await f.request('/api/posts')).json();assert.equal(list.posts[0].status,'trashed');
  assert.equal((await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:doc(),action:'save',baseRevision:oldRevision}})).status,409);
  assert.equal((await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:doc(),action:'publish',baseRevision:saved.revision}})).status,409);
  response=await f.request(`/api/posts/${ID}/restore`,{method:'POST',body:{baseRevision:saved.revision}});
  assert.equal(response.status,200);saved=await response.json();assert.equal(saved.post.status,'draft');
  assert.equal(saved.post.publishedAt,publishedAt);assert.equal(saved.publishing,false);assert.equal(saved.post.trashedAt,undefined);
  assert.deepEqual(saved.post.elements,doc().elements);
});
test('CMS lifecycle requires authorization, CSRF, revision and correct transition',async()=>{
  const f=fixture();const url=`/api/posts/${ID}/trash`;
  assert.equal((await f.request(url,{method:'POST',body:{baseRevision:null},cookie:false})).status,401);
  await f.signedIn();assert.equal((await f.request(url,{method:'POST',body:{},token:'bad'})).status,403);
  assert.equal((await f.request(url,{method:'POST',body:{}})).status,404);
  let saved=await (await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:doc(),action:'save'}})).json();
  assert.equal((await f.request(`/api/posts/${ID}/restore`,{method:'POST',body:{baseRevision:saved.revision}})).status,409);
  assert.equal((await f.request(url,{method:'POST',body:{baseRevision:'stale'}})).status,409);
  f.setRace();assert.equal((await f.request(url,{method:'POST',body:{baseRevision:saved.revision}})).status,409);
  assert.equal(JSON.parse(f.files.get(`content/posts/${ID}.json`).content).status,'draft');
});


test('private verification saves drafts but blocks publishing and changes to published entries',async()=>{
 const f=fixture();await f.signedIn();f.env.PRIVATE_VERIFICATION='true';const handwritten=doc();Object.assign(handwritten.elements[0],{font:'handwriting',fontSize:32,fixedHeight:true});
 let response=await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:handwritten,action:'save',baseRevision:null}});assert.equal(response.status,200);const draft=await response.json();assert.equal(draft.post.status,'draft');assert.equal(draft.post.elements[0].font,'handwriting');assert.equal(draft.post.elements[0].fontSize,32);assert.equal(draft.post.elements[0].fixedHeight,true);
 for(const action of ['publish','unpublish'])assert.equal((await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:doc(),action,baseRevision:draft.revision}})).status,403);
 assert.equal(JSON.parse(f.files.get(`content/posts/${ID}.json`).content).status,'draft');
 delete f.env.PRIVATE_VERIFICATION;response=await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:doc(),action:'publish',baseRevision:draft.revision}});assert.equal(response.status,200);const published=await response.json();f.env.PRIVATE_VERIFICATION='true';
 assert.equal((await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:doc(),action:'save',baseRevision:published.revision}})).status,403);
 assert.equal((await f.request(`/api/posts/${ID}/trash`,{method:'POST',body:{baseRevision:published.revision}})).status,403);assert.equal(JSON.parse(f.files.get(`content/posts/${ID}.json`).content).status,'published');
});
