import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateManifest, validateState, webhookUrl, message, runAnnouncements} from '../scripts/discord-announcements.mjs';

const settings={repository:'owner/journal',repositoryId:123,ownerId:456,branch:'main',publicUrl:'https://example.org/journal/',title:'Journal',tagline:''};
const commit='a'.repeat(40), older='b'.repeat(40), secret='https://discord.com/api/webhooks/123456789012345678/very_private_webhook_token';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const post=(n,date=`2026-10-${String(n).padStart(2,'0')}T00:00:00.000Z`)=>({id:id(n),title:`Entry ${n}`,url:`${settings.publicUrl}posts/${id(n)}/`,publishedAt:date});
const manifest=posts=>({version:1,commit,posts});
const state=records=>({version:1,initializedAt:'2026-10-01T00:00:00.000Z',records});
const record=(p,status='sent')=>({status,url:p.url,commit,...(status==='sent'?{attempts:1,attemptedAt:'2026-10-02T00:00:00.000Z',outcome:'confirmed',messageId:'123456789012345678'}:{})});
const clone=value=>structuredClone(value);
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json',...headers}});

// Every request is intercepted; no test can reach GitHub, the blog, or Discord.
function harness(options={}) {
  let clock=Date.parse('2026-10-20T00:00:00.000Z'),ledger=options.state===null?null:clone(options.state??state({})),blob='c'.repeat(40);
  let snapshot=manifest(options.posts??[post(1)]),writes=0,manifestReads=0;
  const calls=[],logs=[],sends=[],sleeps=[],bootstrap=[];
  const env={BLOG_PUBLISHING_ENABLED:'true',DISCORD_ANNOUNCEMENTS_ENABLED:'true',DISCORD_WEBHOOK_URL:secret,GITHUB_TOKEN:'mock-github-token',GITHUB_REPOSITORY:settings.repository,GITHUB_DEFAULT_BRANCH:'main',GITHUB_REF:'refs/heads/main',GITHUB_SHA:commit,GITHUB_EVENT_NAME:'schedule',ANNOUNCEMENT_MODE:'reconcile',...options.env};
  const fetch=async(input,init={})=>{
    const url=new URL(input),method=init.method??'GET',body=init.body?JSON.parse(init.body):undefined;
    clock+=options.fetchElapsed?.({url,method,manifestReads,writes,sends:sends.length})??0;
    calls.push({url:String(url),method,body,redirect:init.redirect});
    if(url.hostname==='discord.com'){
      assert.equal(init.redirect,'error'); assert.equal(url.searchParams.get('wait'),'true');
      sends.push(body); const result=options.discord?.(sends.length,body);
      if(result instanceof Error)throw result;
      return result??json({id:String(123456789012345678n+BigInt(sends.length))});
    }
    if(url.origin===new URL(settings.publicUrl).origin){
      assert.equal(init.redirect,'error');
      if(url.pathname.endsWith('/notifications.json')){
        manifestReads++; snapshot=options.snapshot?.(manifestReads,clone(snapshot))??snapshot;
        return options.manifestResponse?.(manifestReads)??json(snapshot);
      }
      if(url.pathname.endsWith('/revision.json'))return json({commit:options.revision??snapshot.commit});
      if(url.pathname.includes('/posts/'))return new Response('entry',{status:options.routeStatus??200});
    }
    if(url.hostname==='api.github.com'){
      const path=url.pathname;
      if(path.includes('/actions/workflows/publish.yml/runs'))return json({total_count:1,workflow_runs:options.proof??[{id:1,name:'Publish blog',head_sha:snapshot.commit,head_branch:settings.branch,head_repository:{full_name:settings.repository},event:'push',status:'completed',conclusion:'success'}]});
      if(path.includes('/compare/'))return options.compare?.(path)??json({status:'ahead'});
      if(path.includes('/contents/state.json')){
        assert.equal(method==='GET'?url.searchParams.get('ref'):body.branch,'codex/discord-announcement-state');
        if(method==='GET')return options.stateResponse?.()??(ledger?json({type:'file',sha:blob,encoding:'base64',content:Buffer.from(JSON.stringify(ledger)).toString('base64')}):json({message:'Not Found'},404));
        writes++; assert.equal(body.sha,blob,'Contents replacement uses the file blob SHA');
        if(options.failWrite===writes)return json({message:'conflict'},409);
        ledger=JSON.parse(Buffer.from(body.content,'base64').toString());blob=createHash('sha1').update(`file-blob-${writes}`).digest('hex');
        return json({content:{sha:blob},commit:{sha:`commit-${writes}`}});
      }
      if(path.endsWith('/git/trees')){bootstrap.push({type:'tree',body});return json({sha:'new-tree'},201);}
      if(path.endsWith('/git/commits')){bootstrap.push({type:'commit',body});return json({sha:'new-root'},201);}
      if(path.endsWith('/git/refs')){bootstrap.push({type:'ref',body});return json({ref:body.ref},options.bootstrapConflict?422:201);}
      if(path.endsWith('/git/ref/heads/codex/discord-announcement-state'))return ledger?json({object:{sha:'state-branch-head'}}):json({message:'Not Found'},404);
      if(path.includes('/branches/')||path.includes('/git/ref/heads/'))return json({commit:{sha:commit},object:{sha:commit}});
      if(path===`/repos/${settings.repository}`)return json({default_branch:'main',full_name:settings.repository});
    }
    throw Error(`Unexpected mocked request ${method} ${url.origin}${url.pathname}`);
  };
  return {env,calls,logs,sends,sleeps,bootstrap,get ledger(){return ledger;},get writes(){return writes;},get snapshot(){return snapshot;},
    run:(event=options.event??{})=>runAnnouncements({env,event,settings,fetch,now:()=>clock,sleep:async ms=>{sleeps.push(ms);clock+=ms;},log:value=>logs.push(String(value))})};
}

test('manifest rejects unsafe identity, fields, duplicates and canonical URL changes',()=>{
  assert.doesNotThrow(()=>validateManifest(manifest([post(1)]),settings));
  for(const change of [{version:2},{commit:null},{commit:'main'},{posts:[post(1),post(1)]},{posts:[{...post(1),id:'bad'}]},{posts:[{...post(1),publishedAt:'never'}]},{posts:[{...post(1),title:3}]}])assert.throws(()=>validateManifest({...manifest([post(1)]),...change},settings));
  for(const url of ['http://example.org/journal/posts/'+id(1)+'/',post(1).url+'?x=1',post(1).url+'#x',post(1).url.replace('example.org','evil.example'),post(1).url.replace('/journal/','/'),post(1).url.replace('https://','https://user:pass@')])assert.throws(()=>validateManifest(manifest([{...post(1),url}]),settings));
  const custom={...settings,publicUrl:'https://my-blog.example/'};
  assert.doesNotThrow(()=>validateManifest(manifest([{...post(1),url:`${custom.publicUrl}posts/${id(1)}/`}]),custom));
});

test('webhook validation never accepts alternate destinations or unsafe URL parts',()=>{
  assert.equal(webhookUrl(secret).hostname,'discord.com');
  for(const value of [secret.replace('https:','http:'),secret.replace('discord.com','discord.com.evil.org'),secret+'#token',secret+'?thread_id=1',secret.replace('https://','https://user:pass@'),'https://discord.com/channels/123'])assert.throws(()=>webhookUrl(value));
});

test('message is exact, mention-safe, whitespace-normalized and markdown-escaped',()=>{
  assert.deepEqual(message(post(1)),{content:`Anna just posted a new blog entry!\n\nEntry 1\n\nGo read it here: ${post(1).url}`,allowed_mentions:{parse:[]}});
  const result=message({...post(1),title:'  *hello*\n\t@everyone\u0000  [x]  '});
  assert.ok(result.content.includes('\\*hello\\* @everyone'));
  assert.ok(!result.content.includes('\u0000'));
  for(const title of ['',' \n\t ','\u0000'])assert.equal(message({...post(16),title}).content,`Anna just posted a new blog entry!\n\noct 15, 2026\n\nGo read it here: ${post(16).url}`);
  const long=message({...post(1),title:'😀'.repeat(300)}).content;
  assert.equal([...long.split('\n\n')[1]].length,200);assert.ok(long.endsWith(post(1).url));assert.ok(long.length<=2000);
});

test('state rejects missing version, corrupt records and foreign URLs',()=>{
  assert.doesNotThrow(()=>validateState(state({[id(1)]:record(post(1),'baseline')}),settings));
  for(const value of [null,{},state({bad:record(post(1))}),state({[id(1)]:{...record(post(1)),status:'unknown'}}),state({[id(1)]:{...record(post(1)),url:'https://evil.example/'}})])assert.throws(()=>validateState(value,settings));
});

test('empty and populated initialization silently create only an independent-root ledger',async()=>{
  for(const posts of [[],[post(1),post(2)]]){
    const h=harness({posts,state:null,env:{ANNOUNCEMENT_MODE:'initialize',GITHUB_EVENT_NAME:'workflow_dispatch'}});await h.run({inputs:{mode:'initialize'}});
    assert.equal(h.sends.length,0);assert.deepEqual(h.bootstrap.map(x=>x.type),['tree','commit','ref']);
    const tree=h.bootstrap[0].body;assert.equal(tree.base_tree,undefined);assert.equal(tree.tree.length,1);assert.equal(tree.tree[0].path,'state.json');
    const saved=JSON.parse(tree.tree[0].content);assert.equal(saved.version,1);assert.equal(Object.keys(saved.records).length,posts.length);assert.ok(Object.values(saved.records).every(r=>r.status==='baseline'));
    assert.deepEqual(h.bootstrap[1].body.parents,[]);assert.equal(h.bootstrap[2].body.ref,'refs/heads/codex/discord-announcement-state');
  }
});

test('missing/corrupt ledger and reinitialization fail with zero sends',async()=>{
  for(const options of [{state:null},{state:{version:1,records:{}}},{env:{ANNOUNCEMENT_MODE:'initialize',GITHUB_EVENT_NAME:'workflow_dispatch'}}]){
    const h=harness(options);await assert.rejects(()=>h.run());assert.equal(h.sends.length,0);assert.equal(h.bootstrap.length,0);
  }
});

test('oldest-first catch-up caps candidates at three and hourly rerun drains remainder',async()=>{
  const h=harness({posts:[post(5),post(3),post(1),post(4),post(2)]});await h.run();
  assert.deepEqual(h.sends.map(x=>x.content.split('\n\n')[1]),['Entry 1','Entry 2','Entry 3']);
  await h.run();assert.equal(h.sends.length,5);assert.equal(Object.values(h.ledger.records).filter(r=>r.status==='sent').length,5);
  await h.run();assert.equal(h.sends.length,5);
});

test('baseline and sent IDs survive editing, backdating and republishing without sends',async()=>{
  const h=harness({posts:[{...post(1),title:'Edited',publishedAt:'2001-01-01'},{...post(2),title:'Republished'}],state:state({[id(1)]:record(post(1),'baseline'),[id(2)]:record(post(2))})});
  await h.run();assert.equal(h.sends.length,0);assert.equal(Object.keys(h.ledger.records).length,2);
});

test('uncertain delivery retries on a later scheduled run and confirmed success stops retries',async()=>{
  for(const response of [()=>json({},500),()=>new Error(secret),()=>json({}),()=>json({id:'bad'})]){
    const h=harness({discord:n=>n===1?response():undefined});await h.run();assert.equal(h.sends.length,1);assert.equal(h.ledger.records[id(1)].status,'pending');
    await h.run();assert.equal(h.sends.length,2);assert.equal(h.ledger.records[id(1)].status,'sent');await h.run();assert.equal(h.sends.length,2);
    assert.ok(!h.logs.join('\n').includes(secret));assert.ok(!h.logs.join('\n').includes('very_private_webhook_token'));
  }
});

test('absent pending entries retain history and resume only after returning publicly',async()=>{
  const pending={...record(post(1),'pending'),attempts:2,attemptedAt:'2026-10-01T00:00:00.000Z',outcome:'uncertain'};
  const h=harness({posts:[],state:state({[id(1)]:pending}),snapshot:(n,s)=>n<3?s:manifest([post(1)])});
  await h.run();assert.equal(h.sends.length,0);assert.equal(h.ledger.records[id(1)].attempts,2);
  await h.run();await h.run();assert.equal(h.sends.length,1);assert.equal(h.ledger.records[id(1)].attempts,3);
});

test('ledger failure before POST sends nothing; failure after POST stops the batch',async()=>{
  for(const failWrite of [1,2]){
    const h=harness({posts:[post(1),post(2)],failWrite});await assert.rejects(()=>h.run());assert.equal(h.sends.length,failWrite-1);
    if(failWrite===2)assert.equal(h.ledger.records[id(1)].status,'pending');
  }
});

test('confirmed but unrecorded delivery can duplicate at the next reconciliation',async()=>{
  const h=harness({failWrite:2});await assert.rejects(()=>h.run());await h.run();assert.equal(h.sends.length,2);assert.equal(h.ledger.records[id(1)].status,'sent');
});

test('fractional rate limits wait as directed; excessive delays defer without shortening',async()=>{
  const short=harness({discord:n=>n===1?json({retry_after:0.25},429):undefined});await short.run();assert.ok(short.sleeps.includes(250));assert.equal(short.sends.length,2);assert.equal(short.ledger.records[id(1)].status,'sent');
  const long=harness({posts:[post(1),post(2)],discord:()=>json({retry_after:180.5},429)});await long.run();assert.equal(long.sends.length,1);assert.ok(!long.sleeps.includes(120000));assert.ok(Date.parse(long.ledger.records[id(1)].nextAttemptAt)>Date.parse('2026-10-20T00:03:00Z'));
  await long.run();assert.equal(long.sends.length,2,'deferred first entry must allow another eligible entry on a later run');
});

test('definitive rejection remains pending and webhook 404 holds only that secret',async()=>{
  for(const status of [400,401,403,404]){
    const h=harness({discord:()=>json({message:secret},status)});await assert.rejects(()=>h.run());assert.equal(h.ledger.records[id(1)].status,'pending');assert.ok(!h.logs.join('\n').includes(secret));
    if(status===404){assert.equal(h.ledger.rejectedWebhook,createHash('sha256').update(secret).digest('hex'));await assert.rejects(()=>h.run());assert.equal(h.sends.length,1);h.env.DISCORD_WEBHOOK_URL=secret+'new';await assert.rejects(()=>h.run());assert.equal(h.sends.length,2);}
  }
});

test('failed routes, disappeared entries and invalid latest snapshots never send',async()=>{
  for(const options of [{routeStatus:404},{routeStatus:302},{snapshot:n=>n===1?manifest([post(1)]):manifest([])},{snapshot:n=>n===1?manifest([post(1)]):{version:1,commit,posts:'bad'}}]){
    const h=harness(options);try{await h.run();}catch{}assert.equal(h.sends.length,0);
  }
  const latest=harness({snapshot:n=>manifest([{...post(1),title:n===1?'Old':'Latest'}])});await latest.run();assert.ok(latest.sends[0].content.includes('Latest'));
});

test('disabled gates and untrusted execution contexts cannot deliver or write state',async()=>{
  const cases=[{BLOG_PUBLISHING_ENABLED:'false'},{DISCORD_ANNOUNCEMENTS_ENABLED:'false'},{GITHUB_REPOSITORY:'attacker/fork'},{GITHUB_EVENT_NAME:'pull_request'},{GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/untrusted'}];
  for(const env of cases){const h=harness({env});try{await h.run();}catch{}assert.equal(h.sends.length,0);assert.equal(h.writes,0);}
});

test('untrusted and unsuccessful upstream completions cannot deliver',async()=>{
  const upstream={name:'Publish blog',head_sha:older,head_branch:'main',head_repository:{full_name:settings.repository},event:'push',status:'completed',conclusion:'success'};
  for(const change of [{conclusion:'failure'},{head_branch:'evil'},{event:'pull_request'},{head_repository:{full_name:'attacker/fork'}},{status:'in_progress'},{name:'Other workflow'}]){
    const h=harness({env:{GITHUB_EVENT_NAME:'workflow_run'}});try{await h.run({workflow_run:{...upstream,...change}});}catch{}assert.equal(h.sends.length,0);
  }
});

test('live deployment needs exact trusted successful proof and branch ancestry',async()=>{
  for(const options of [{proof:[]},{proof:[{name:'Publish blog',head_sha:older,head_branch:'main',head_repository:{full_name:settings.repository},event:'push',status:'completed',conclusion:'success'}]},{compare:()=>json({status:'diverged'})},{compare:()=>json({status:'behind'})},{revision:older}]){
    const h=harness(options);await assert.rejects(()=>h.run());assert.equal(h.sends.length,0);
  }
});

test('oversized and redirected manifest reads fail closed',async()=>{
  for(const manifestResponse of [()=>new Response('x'.repeat(2*1024*1024+1)),()=>new Response('{}',{headers:{'content-length':String(2*1024*1024+1)}}),()=>new Response('',{status:302,headers:{location:'https://evil.example/'}})]){
    const h=harness({manifestResponse});await assert.rejects(()=>h.run());assert.equal(h.sends.length,0);
  }
});

test('numeric message IDs are unconfirmed and corrupt persisted numeric IDs fail closed',async()=>{
  const h=harness({discord:()=>json({id:12345})});await h.run();assert.equal(h.ledger.records[id(1)].status,'pending');
  assert.throws(()=>validateState(state({[id(1)]:{...record(post(1)),messageId:12345}}),settings));
});

test('rate limits honor response headers, retain deferral and cap retries at three',async()=>{
  const h=harness({discord:()=>json({retry_after:0.1},429,{'retry-after':'0.5'})});await h.run();
  assert.equal(h.sends.length,4);assert.deepEqual(h.sleeps,[500,500,500]);
  assert.equal(h.ledger.records[id(1)].status,'pending');assert.equal(h.ledger.records[id(1)].attempts,4);
  assert.equal(h.ledger.records[id(1)].nextAttemptAt,'2026-10-20T00:00:02.000Z');
});

test('corrupt file bytes, missing files on existing branches and bootstrap races cannot reset history',async()=>{
  const corrupt=harness({stateResponse:()=>json({sha:'c'.repeat(40),encoding:'base64',content:Buffer.from('{bad').toString('base64')})});
  await assert.rejects(()=>corrupt.run());assert.equal(corrupt.sends.length,0);assert.equal(corrupt.writes,0);
  const missing=harness({env:{GITHUB_EVENT_NAME:'workflow_dispatch',ANNOUNCEMENT_MODE:'initialize'},stateResponse:()=>json({},404)});
  await assert.rejects(()=>missing.run());assert.equal(missing.bootstrap.length,0);
  const race=harness({state:null,env:{GITHUB_EVENT_NAME:'workflow_dispatch',ANNOUNCEMENT_MODE:'initialize'},bootstrapConflict:true});
  await assert.rejects(()=>race.run());assert.equal(race.sends.length,0);assert.equal(race.bootstrap.filter(x=>x.type==='ref').length,1);
});

test('backdated ties use stable IDs and pending delays do not block newer candidates',async()=>{
  const pending={...record(post(1),'pending'),attempts:1,attemptedAt:'2026-10-19T00:00:00.000Z',nextAttemptAt:'2027-01-01T00:00:00.000Z',outcome:'rate-limited'};
  const same='2000-01-01T00:00:00.000Z';
  const h=harness({posts:[post(3,same),post(1),post(2,same)],state:state({[id(1)]:pending})});await h.run();
  assert.deepEqual(h.sends.map(x=>x.content.split('\n\n')[1]),['Entry 2','Entry 3']);assert.equal(h.ledger.records[id(1)].attempts,1);
});

test('valid newer deployment requires upstream ancestry while stale deployment fails',async()=>{
  const event={workflow_run:{name:'Publish blog',head_sha:older,head_branch:'main',head_repository:{full_name:settings.repository},event:'workflow_dispatch',status:'completed',conclusion:'success'}};
  const good=harness({env:{GITHUB_EVENT_NAME:'workflow_run'}});await good.run(event);assert.equal(good.sends.length,1);
  assert.ok(good.calls.some(c=>c.url.includes(`/compare/${older}...${commit}`)));
  const stale=harness({env:{GITHUB_EVENT_NAME:'workflow_run'},compare:path=>json({status:path.includes(`${older}...${commit}`)?'behind':'ahead'})});
  await assert.rejects(()=>stale.run(event));assert.equal(stale.sends.length,0);
});

test('changed live revision is reproved before delivery and unproved revision stops it',async()=>{
  const changed='d'.repeat(40),proof=[{name:'Publish blog',head_sha:commit,head_branch:'main',head_repository:{full_name:settings.repository},event:'push',status:'completed',conclusion:'success'}];
  const h=harness({proof,snapshot:n=>({...manifest([post(1)]),commit:n===1?commit:changed})});
  await assert.rejects(()=>h.run());assert.equal(h.sends.length,0);assert.ok(h.calls.some(c=>c.url.includes(`head_sha=${changed}`)));
});

test('webhook redirect and network errors never expose credentials or raw provider bodies',async()=>{
  const redirected=harness({discord:()=>new Response(secret,{status:302,headers:{location:'https://evil.example/'}})});
  await redirected.run();assert.equal(redirected.ledger.records[id(1)].status,'pending');assert.equal(redirected.sends.length,1);assert.ok(!redirected.logs.join('\n').includes(secret));
  const failed=harness({discord:()=>new Error(`fetch failed ${secret}`)});await failed.run();
  assert.equal(failed.ledger.records[id(1)].status,'pending');assert.ok(!failed.logs.join('\n').includes('very_private_webhook_token'));
});

test('uncertainty continues other batch candidates and a no-content success is not confirmation',async()=>{
  const h=harness({posts:[post(1),post(2),post(3),post(4)],discord:n=>n===1?new Response(null,{status:204}):undefined});await h.run();
  assert.equal(h.sends.length,3);assert.equal(h.ledger.records[id(1)].status,'pending');assert.equal(h.ledger.records[id(2)].status,'sent');assert.equal(h.ledger.records[id(3)].status,'sent');assert.equal(h.ledger.records[id(4)],undefined);
});

test('propagation retries are bounded and never treat an unavailable manifest as empty',async()=>{
  const h=harness({manifestResponse:()=>json({message:'unavailable'},503)});await assert.rejects(()=>h.run());
  assert.equal(h.sends.length,0);assert.equal(h.writes,0);assert.equal(h.calls.filter(c=>c.url.includes('/notifications.json')).length,10);
  assert.equal(h.sleeps.reduce((a,b)=>a+b,0),300000);
});

test('manual reconciliation uses the same successful-deployment proof and activation gates',async()=>{
  const good=harness({env:{GITHUB_EVENT_NAME:'workflow_dispatch'}});await good.run({inputs:{mode:'reconcile'}});assert.equal(good.sends.length,1);
  const failed=harness({env:{GITHUB_EVENT_NAME:'workflow_dispatch'},proof:[]});await assert.rejects(()=>failed.run({inputs:{mode:'reconcile'}}));assert.equal(failed.sends.length,0);
  const disabled=harness({env:{GITHUB_EVENT_NAME:'workflow_dispatch',DISCORD_ANNOUNCEMENTS_ENABLED:'false'}});await disabled.run({inputs:{mode:'initialize'}});assert.equal(disabled.calls.length,0);assert.equal(disabled.bootstrap.length,0);
});

test('an entry removed during rate-limit backoff is rechecked before another POST',async()=>{
  const h=harness({snapshot:n=>manifest(n<3?[post(1)]:[]),discord:()=>json({retry_after:0.1},429)});await h.run();
  assert.equal(h.sends.length,1);assert.equal(h.ledger.records[id(1)].status,'pending');assert.equal(h.ledger.records[id(1)].attempts,1);
});

test('rate-limit snapshot verification cannot extend the two-minute retry budget',async()=>{
  const h=harness({discord:()=>json({retry_after:119},429),fetchElapsed:({url,manifestReads})=>url.pathname.endsWith('/notifications.json')&&manifestReads===2?2000:0});await h.run();
  assert.equal(h.sends.length,1);assert.equal(h.writes,2);assert.deepEqual(h.sleeps,[119000]);
  const pending=h.ledger.records[id(1)];assert.equal(pending.attempts,1);assert.equal(pending.outcome,'rate-limited');assert.equal(pending.nextAttemptAt,'2026-10-20T00:01:59.000Z');
});

test('headerless malformed rate-limit responses conservatively defer for two minutes',async()=>{
  const h=harness({discord:()=>new Response('{malformed',{status:429})});await h.run();
  assert.equal(h.sends.length,1);assert.deepEqual(h.sleeps,[120000]);assert.equal(h.ledger.records[id(1)].nextAttemptAt,'2026-10-20T00:02:00.000Z');assert.equal(h.ledger.records[id(1)].outcome,'rate-limited');
});
