import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {validatePost,cleanPost,cleanText,renderText,excerpt,parseMediaPath} from '../shared/document.js';
import {blankPost,textDoc,migratePost,validateBook} from '../src/model.js';
import {entryPages,entryElements,pageGeometry,geometryOverflow} from '../shared/notebook-format.js';
import {renderNotebook} from '../shared/notebook-renderer.js';
import {renderComposition} from '../shared/renderer.js';
import {FONT_REGISTRY} from '../shared/font-registry.js';
const id=n=>`${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
const text=(n,value='hello')=>({id:id(n),type:'text',x:0,y:0,w:300,h:180,rotation:0,doc:textDoc(value)});
const legacy=()=>({version:2,pageFormat:'notebook-900x1200-v1',id:id(1),title:'Scraps',created:'2026-10-15T12:00:00Z',elements:[text(2)]});
test('v2 migration preserves IDs, geometry and local metadata, and is repeatable',()=>{
 const old=legacy();old.cloud={revision:'old'};old.receipts={a:'b'};old.elements[0].assetPath='local';const before=structuredClone(old),next=migratePost(old);
 assert.deepEqual(old,before);assert.equal(next.pages[0].id,old.id);assert.deepEqual(next.pages[0].elements,old.elements);assert.deepEqual(next.cloud,old.cloud);assert.deepEqual(next.receipts,old.receipts);assert.deepEqual(migratePost(next),next);assert.equal(next.elements,undefined);assert.equal(cleanPost(next).cloud,undefined);
 assert.equal(entryPages(old)[0].elements,old.elements);assert.deepEqual(entryElements(next),old.elements);assert.equal(blankPost().version,3);
});
test('v3 validates page/object identity, groups and aggregate capacity before mutation',()=>{
 const post=migratePost(legacy());post.pages.push({id:id(3),elements:[text(4)]});assert.equal(validatePost(post),post);
 for(const mutate of [p=>p.elements=[],p=>p.pages[1].id=p.pages[0].id,p=>p.pages[1].elements[0].id=p.pages[0].elements[0].id,p=>{p.pages[0].elements[0].group=id(9);p.pages[1].elements[0].group=id(9);},p=>p.pages[1].elements=Array.from({length:500},(_,i)=>text(i+10))]){const bad=structuredClone(post);mutate(bad);const before=JSON.stringify(bad);assert.throws(()=>validatePost(bad));assert.equal(JSON.stringify(bad),before);}
 const unsupported={...post,version:4};assert.throws(()=>migratePost(unsupported));assert.throws(()=>validateBook({version:1,posts:[unsupported]}));
});
test('page-local geometry and every-page rendering preserve first-page furniture',()=>{
 const post=migratePost(legacy());post.pages.push({id:id(3),elements:[{...text(4,'last page tail'),y:950,h:100}]});
 assert.deepEqual(pageGeometry(0),{x:54,y:220,width:792,height:920});assert.equal(pageGeometry(1).height,1080);assert.deepEqual(geometryOverflow(post),[]);
 assert.match(renderNotebook(post,'/',{pageIndex:1}),/last page tail/);assert.doesNotMatch(renderNotebook(post,'/',{pageIndex:1}),/notebook-header/);assert.throws(()=>renderNotebook(post,'/',{pageIndex:2}));assert.match(renderComposition(post),/Page 2 of 2/);assert.match(excerpt(post),/last page tail/);
 post.pages[1].elements[0].y=1100;assert.deepEqual(geometryOverflow(post),[id(4)]);
});
test('rich typography is cleaned recursively and rendered through trusted styles',()=>{
 const doc=textDoc('<tail>');doc.content[0].attrs={textAlign:'justify',lineHeight:1.3,spaceBefore:14,spaceAfter:20,letterSpacing:-1,onload:'bad'};doc.content[0].content[0].marks=[{type:'textStyle',attrs:{font:'orbitron',fontSize:72,color:'#112233',highlight:'#AABBCC',style:'bad'}},{type:'bold'}];
 const clean=cleanText(doc),html=renderText(clean);assert.equal(clean.content[0].attrs.onload,undefined);assert.equal(clean.content[0].content[0].marks[0].attrs.style,undefined);assert.match(html,/calc\(72px \* var\(--text-scale,1\)\)/);assert.match(html,/&lt;tail&gt;/);assert.match(html,/text-align:justify/);
 for(const marks of [[{type:'bold'},{type:'bold'}],[{type:'textStyle',attrs:{font:'remote'}}],[{type:'textStyle',attrs:{fontSize:145}}],[{type:'textStyle',attrs:{color:'url(evil)'}}],[{type:'link',attrs:{href:'javascript:alert(1)'}}]]){const bad=textDoc('x');bad.content[0].content[0].marks=marks;assert.throws(()=>cleanText(bad));}
 assert.throws(()=>cleanText({type:'doc',content:[{type:'text',text:'invalid block'}]}));assert.equal(FONT_REGISTRY.length,20);
});
test('media paths bind exact canonical extension and SHA',()=>{
 assert.deepEqual(parseMediaPath('media/'+'a'.repeat(40)+'.png'),{storage:'git',sha:'a'.repeat(40),extension:'png',mime:'image/png'});assert.equal(parseMediaPath('media/'+'a'.repeat(40)+'.jpg').mime,'image/jpeg');assert.deepEqual(parseMediaPath('r2/'+'b'.repeat(64)+'.jpg'),{storage:'r2',sha:'b'.repeat(64),extension:'jpg',mime:'image/jpeg'});for(const bad of ['media/x.png','media/'+'A'.repeat(40)+'.png','r2/'+'b'.repeat(63)+'.jpg','r2/'+'B'.repeat(64)+'.png','https://evil/image.png','media/'+'a'.repeat(40)+'.svg'])assert.equal(parseMediaPath(bad),null);
 const post=migratePost(legacy()),src='r2/'+'c'.repeat(64)+'.png';post.pages[0].elements.push({id:id(5),type:'photo',src,alt:'R2 photo',x:0,y:0,w:100,h:100,rotation:0});assert.equal(validatePost(post),post);assert.match(renderNotebook(post,'/baby-teeth/'),new RegExp('/baby-teeth/'+src));assert.match(renderComposition(post,'/baby-teeth/'),new RegExp('/baby-teeth/'+src));
});
test('recovery migrates transactionally without replacing active or original data',async()=>{
 const records=new Map();let failKey;
 globalThis.indexedDB={open(){const req={};queueMicrotask(()=>{req.result={transaction(_name,mode){const writes=new Map(records),tx={error:null},store={};let pending=0,aborted=false;
 const request=(operation)=>{pending++;const r={};queueMicrotask(()=>{try{r.result=operation();r.onsuccess?.();}catch(error){aborted=true;tx.error=error;tx.onerror?.();tx.onabort?.();}finally{if(!--pending&&!aborted)queueMicrotask(()=>{if(pending||aborted)return;if(mode==='readwrite'){records.clear();for(const [key,value] of writes)records.set(key,value);}tx.oncomplete?.();});}});return r;};
 store.get=key=>request(()=>structuredClone(writes.get(key)));store.add=(value,key)=>request(()=>{if(key===failKey)throw Error('storage full');if(writes.has(key))throw Error('duplicate');writes.set(key,structuredClone(value));});store.put=(value,key)=>request(()=>{if(key===failKey)throw Error('storage full');writes.set(key,structuredClone(value));});tx.objectStore=()=>store;return tx;}};req.onsuccess?.();});return req;}};
 const {load,save,recoveryCopies}=await import('../src/storage.js');
 const old={version:1,posts:[legacy()]};records.set('book',structuredClone(old));failKey='book-before-v3';await assert.rejects(load(),/storage full/);assert.equal(records.has('book-v3'),false);assert.deepEqual(records.get('book'),old);
 failKey=undefined;const current=await load();assert.equal(current.posts[0].version,3);assert.deepEqual(records.get('book-before-v3'),old);assert.deepEqual(records.get('book'),old);
 current.posts[0].title='Newer';await save(current);records.get('book').posts[0].title='Old tab';assert.equal((await load()).posts[0].title,'Newer');const copies=await recoveryCopies();assert.equal(copies.legacyChanged,true);assert.deepEqual(copies.original,old);
 const unknown={version:99,keep:'raw'};records.set('book-v3',unknown);assert.deepEqual(await load(),unknown);assert.deepEqual(records.get('book-v3'),unknown);
 records.delete('book-v3');records.set('book',unknown);assert.deepEqual(await load(),unknown);assert.equal(records.has('book-v3'),false);assert.deepEqual(records.get('book-before-v3'),old);
 delete globalThis.indexedDB;
});
test('notebook header uses VT323 at the agreed sizes with a serif, never handwriting, fallback',()=>{
 const css=readFileSync(new URL('../shared/notebook.css',import.meta.url),'utf8'),rule=s=>css.match(new RegExp(`\.notebook-header ${s}\{([^}]*)\}`))[1];
 assert.match(rule('h2'),/font:400 52px\/52px VT323,Georgia,Gelasio,serif;/);assert.match(rule('time'),/top:112px;.*font:400 28px\/32px VT323,Georgia,Gelasio,serif/);
 for(const s of ['h2','time'])assert.doesNotMatch(rule(s),/Kalam|Caveat|cursive/);
 assert.match(readFileSync(new URL('../shared/book/theme.css',import.meta.url),'utf8'),/font-family:'VT323';src:url\('..\/..\/public\/editor\/fonts\/vt323\.woff2'\)/);
});
test('desk toys: Teletubby and paw sprites ship, and the huddle runs Po to Tinky Winky front to back',async()=>{
 const {deskAssets}=await import('../scripts/desk-art.mjs'),{deskLayout,HUDDLE}=await import('../shared/book/camera.js');
 const sprites=Object.fromEntries(deskAssets().map(([name,w,h])=>[name,[w,h]])),manifest=JSON.parse(readFileSync('public/book/manifest.json','utf8')).map(a=>a.file);
 for(const name of ['tinky','dipsy','po','paw'])assert.ok(sprites[name]&&manifest.includes(`${name}.png`),name);
 assert.ok(sprites.tinky[1]>sprites.dipsy[1]&&sprites.dipsy[1]>sprites.figurine[1]&&sprites.figurine[1]>sprites.po[1],'Heights follow the line-up');
 assert.deepEqual(HUDDLE,['po','figurine','dipsy','tinky']);
 for(const [w,h] of [[1440,900],[1024,768],[390,844],[320,568],[844,390]]){const {positions}=deskLayout(w,h);for(let i=1;i<HUDDLE.length;i++){const front=positions[HUDDLE[i-1]],back=positions[HUDDLE[i]];assert.ok(back.x>front.x&&back.y<front.y,`${w}x${h}: ${HUDDLE[i]} sits right of and behind ${HUDDLE[i-1]}`);}}
});
test('desk toys 2: six toy sprites ship and appear only in the larger-screen layout',async()=>{
 const {deskAssets}=await import('../scripts/desk-art.mjs'),{deskLayout}=await import('../shared/book/camera.js');
 const sprites=deskAssets().map(([name])=>name),manifest=JSON.parse(readFileSync('public/book/manifest.json','utf8')).map(a=>a.file),toys=['thomas','muscle','hotrod','note','ashtray','geekbar'];
 for(const name of [...toys,'steam','geekbar-screen'])assert.ok(sprites.includes(name)&&manifest.includes(`${name}.png`),name);
 for(const [w,h] of [[1440,900],[1280,800],[1024,768],[834,1194],[768,600]]){const {positions}=deskLayout(w,h);for(const k of toys)assert.ok(positions[k],`${w}x${h}: ${k} placed`);const {thomas,muscle,hotrod}=positions;assert.ok(thomas.x<muscle.x&&(muscle.x<hotrod.x||muscle.x===hotrod.x&&muscle.y<hotrod.y),'Toy lane runs Thomas, orange, blue (cars stack when the row would reach the menu)');}
 for(const [w,h] of [[390,844],[320,568],[844,390],[600,400]]){const {positions}=deskLayout(w,h);for(const k of toys)assert.equal(positions[k],undefined,`${w}x${h}: ${k} hidden`);}
 // Round 2: ashtray and Geek Bar life-size against the ~8cm lighter; upright Geek Bar; note between jar and grinder.
 const {sizes,positions}=deskLayout(1440,900),cm=sizes.lighter[1]/8;
 assert.ok(sizes.ashtray[0]>sizes.pipe[0],'Ashtray is wider than the pipe');assert.ok(Math.abs(sizes.geekbar[1]/cm-9.2)<.5&&sizes.geekbar[1]>sizes.geekbar[0],'Geek Bar stands about 9cm tall');
 assert.ok(positions.note.y>=positions.jar.y+sizes.jar[1]&&positions.note.y+sizes.note[1]<=positions.grinder.y,'Note sits between jar and grinder');
});
