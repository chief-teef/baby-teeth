import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createHandler} from '../worker/index.js';
import {seal,open,digest,cleanJpeg} from '../worker/security.js';
import {validatePost,textContent,renderText} from '../shared/document.js';
import {renderComposition} from '../shared/renderer.js';
const ID='11111111-1111-4111-8111-111111111111',ELEMENT='22222222-2222-4222-8222-222222222222';
const doc=()=>({id:ID,title:'A little day',created:'2026-10-12T18:00:00.000Z',elements:[{id:ELEMENT,type:'text',x:60,y:70,w:300,h:100,rotation:0,doc:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Hello scrapbook!'}]}]}}]});
const sha=value=>createHash('sha1').update(value).digest('hex');
function fixture(){
  const kv=new Map(),files=new Map(),commits=new Map(),trees=new Map();let head='a'.repeat(40),sequence=0,race=false;
  const env={GITHUB_CLIENT_ID:'test-client',GITHUB_CLIENT_SECRET:'test-secret',SESSION_SECRET:'this-is-a-test-only-session-secret-with-enough-length',SESSIONS:{get:async key=>kv.get(key)||null,put:async(key,value)=>kv.set(key,value),delete:async key=>kv.delete(key)},WRITE_LIMIT:{limit:async()=>({success:true})},ASSETS:{fetch:async()=>new Response('editor')}};
  const fetcher=async(url,options={})=>{
    const u=new URL(url),path=u.pathname,body=options.body?JSON.parse(options.body):null;
    if(path==='/login/oauth/access_token')return Response.json({access_token:'test-only-access-token',expires_in:28800});
    if(path==='/user')return Response.json({id:341668853,login:'chief-teef'});
    if(path==='/repos/chief-teef/baby-teeth')return Response.json({id:1416133666,permissions:{push:true}});
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
test('owner-only writes, CSRF and origin enforced',async()=>{const f=fixture();const body={post:doc(),action:'save',baseRevision:null};assert.equal((await f.request(`/api/posts/${ID}`,{method:'PUT',body,cookie:false})).status,401);await f.signedIn(999);assert.equal((await f.request(`/api/posts/${ID}`,{method:'PUT',body})).status,401);await f.signedIn();assert.equal((await f.request(`/api/posts/${ID}`,{method:'PUT',body,origin:'https://evil.example'})).status,403);assert.equal((await f.request(`/api/posts/${ID}`,{method:'PUT',body,token:'wrong'})).status,403);});
test('draft stays draft, publish is explicit, saving published entry requests update',async()=>{const f=fixture();await f.signedIn();let r=await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:{...doc(),status:'published',updatedBy:123},action:'save',baseRevision:null}});assert.equal(r.status,200);let data=await r.json();assert.equal(data.post.status,'draft');assert.equal(data.publishing,false);assert.equal(data.post.updatedBy,341668853);r=await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:doc(),action:'publish',baseRevision:data.revision}});data=await r.json();assert.equal(data.post.status,'published');assert.equal(data.publishing,true);r=await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:doc(),action:'save',baseRevision:data.revision}});data=await r.json();assert.equal(data.post.status,'published');assert.equal(data.publishing,true);});
test('stale and racing saves never overwrite the latest ref',async()=>{const f=fixture();await f.signedIn();let r=await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:doc(),action:'save',baseRevision:null}});const data=await r.json();r=await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:doc(),action:'save',baseRevision:null}});assert.equal(r.status,409);f.setRace();r=await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:doc(),action:'publish',baseRevision:data.revision}});assert.equal(r.status,409);const saved=JSON.parse(f.files.get(`content/posts/${ID}.json`).content);assert.equal(saved.status,'draft');});
test('cannot save arbitrary media or raw inline image data',async()=>{const f=fixture();await f.signedIn();const p=doc();p.elements.push({id:'33333333-3333-4333-8333-333333333333',type:'photo',x:20,y:200,w:200,h:150,rotation:0,src:`media/${'b'.repeat(40)}.jpg`,alt:'Photo'});assert.equal((await f.request(`/api/posts/${ID}`,{method:'PUT',body:{post:p,action:'save'}})).status,400);p.elements[1].src='data:image/jpeg;base64,ABC';assert.throws(()=>validatePost(p));});
test('safe renderer escapes HTML and rejects script links',()=>{const p=doc();p.elements[0].doc.content[0].content[0].text='<script>alert(1)</script>';validatePost(p);assert.ok(renderText(p.elements[0].doc).includes('&lt;script&gt;'));p.elements[0].doc.content[0].content[0].marks=[{type:'link',attrs:{href:'javascript:alert(1)'}}];assert.throws(()=>validatePost(p));delete p.elements[0].doc.content[0].content[0].marks;assert.ok(renderComposition(p).includes('&lt;script&gt;'));});
test('JPEG upload strips EXIF and comments and rejects non-images',()=>{const bytes=Uint8Array.from([255,216,255,225,0,8,69,88,73,70,0,0,255,192,0,11,8,0,10,0,10,1,1,17,0,255,218,0,8,1,1,0,0,63,0,0,255,217]);const result=cleanJpeg(bytes);assert.ok(result.length<bytes.length);assert.equal(Buffer.from(result).includes(Buffer.from('EXIF')),false);assert.throws(()=>cleanJpeg(new TextEncoder().encode('<svg>not JPEG</svg>')));});
test('unconfigured service is explicit and leaves local editor available',async()=>{const f=fixture();delete f.env.GITHUB_CLIENT_SECRET;const r=await f.request('/api/session');assert.equal((await r.json()).configured,false);assert.equal((await f.request('/auth/login')).status,503);assert.equal(await (await f.request('/')).text(),'editor');});
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
