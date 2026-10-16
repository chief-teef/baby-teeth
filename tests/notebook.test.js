import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatePost,cleanPost} from '../shared/document.js';
import {validateBook,textDoc} from '../src/model.js';
import {geometryOverflow,assertPublicationGeometry} from '../shared/notebook-format.js';
import {spreadFor,sideFor,BookController} from '../shared/book/controller.js';
import {fitCamera,clampBook} from '../shared/book/camera.js';
import {spotifyUrl,spotifyImage,validateMusic} from '../shared/music.js';
import {renderMusic} from '../shared/renderer.js';
const id='11111111-1111-4111-8111-111111111111';
const fixture=()=>({version:2,pageFormat:'notebook-900x1200-v1',id,title:'Remember',created:'2026-10-13T12:00:00Z',elements:[{id:'22222222-2222-4222-8222-222222222222',type:'text',x:0,y:0,w:400,h:100,rotation:0,doc:textDoc('All of the text survives.')} ]});
test('entry music survives cleaning and backup; rejects unsafe, mismatched and malformed fields',()=>{
 const url='https://open.spotify.com/artist/'+'a'.repeat(22),music={artists:[{name:' brakence ',url:url+'?si=test',image:'https://i.scdn.co/image/'+'a'.repeat(40)}],songs:[]};
 const p=fixture();p.music=music;const clean=cleanPost(p);assert.equal(clean.music.artists[0].name,'brakence');assert.equal(clean.music.artists[0].url,url);assert.equal(spotifyUrl(url.replace('/artist/','/intl-es/artist/')),url);assert.deepEqual(validateBook(JSON.parse(JSON.stringify({version:1,posts:[clean]}))).posts[0].music,clean.music);
 clean.music.artists[0].name='<script>bad()</script>';const html=renderMusic(clean);assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('spotify-icon.svg'));assert.ok(!html.includes('<script>'));
 for(const value of [null,0,{},'http://open.spotify.com/artist/'+'a'.repeat(22),'https://open.spotify.com.evil/artist/'+'a'.repeat(22),'https://user@open.spotify.com/artist/'+'a'.repeat(22),'https://spotify.link/test'])assert.throws(()=>spotifyUrl(value));
 for(const item of [{name:''},{name:'a',url:0},{name:'a',url:''},{name:'a',url:url.replace('artist','track')},{name:'a',image:false},{name:'a',url,image:'https://evil.test/image.jpg'}])assert.throws(()=>validateMusic({artists:[item],songs:[]}));
 assert.throws(()=>validateMusic({artists:Array(6).fill({name:'a'}),songs:[]}));assert.throws(()=>validateMusic([]));
 assert.ok(spotifyImage('https://image-cdn-fa.spotifycdn.com/image/'+'a'.repeat(40)));assert.equal(spotifyImage('https://image-cdn-fa.spotifycdn.com.evil/image/'+'a'.repeat(40)),false);
});
test('notebook v2 survives cleaning, archive export/import and repeated server round trips',()=>{
 const p=fixture();assert.deepEqual(cleanPost(cleanPost(p)),p);assert.equal(validateBook({version:1,posts:[JSON.parse(JSON.stringify(p))]}).posts[0].pageFormat,p.pageFormat);
});
test('overflow drafts remain recoverable but cannot publish',()=>{const p=fixture();p.elements[0].y=1000;validateBook({version:1,posts:[p]});assert.equal(geometryOverflow(p).length,1);assert.throws(()=>assertPublicationGeometry(p));});
test('physical faces, odd/even endpapers and a single pending navigation intent',()=>{
 assert.deepEqual([0,1,2,3,4].map(spreadFor),[0,1,1,2,2]);assert.deepEqual([0,1,2,3].map(sideFor),['right','left','right','left']);const c=new BookController(Array.from({length:4},(_,i)=>({...fixture(),id:`0000000${i+1}-1111-4111-8111-111111111111`})),0);assert.deepEqual(c.pages.map(page=>page.faceIndex),[0,1,2,3]);assert.equal(c.pages[0].entryId,c.entries[0].id);c.state='open-idle';assert.equal(c.spreadNeighbor(1),2);c.state='turning';c.request(1);c.request(3);assert.equal(c.pending,3);assert.equal(c.index,0);
});
test('old and unknown formats reject without mutating recovery input',()=>{
 const p=fixture();delete p.pageFormat;p.version=1;p.elements[0].y=2400;assert.throws(()=>cleanPost(p));
 for(const change of [{version:3},{pageFormat:'future'},{version:1,pageFormat:'notebook-900x1200-v1'}]){const bad={...fixture(),...change},before=JSON.stringify(bad);assert.throws(()=>validatePost(bad));assert.throws(()=>validateBook({version:1,posts:[bad]}));assert.equal(JSON.stringify(bad),before);}
});
test('book clamps keep at least 120 screen pixels reachable independently of fit scale',()=>{for(const [w,h] of [[1440,900],[390,844],[320,568]])for(const open of [false,true]){const camera=fitCamera(w,h,open);for(const [x,y] of [[-10000,-10000],[10000,10000]]){const p=clampBook(x,y,camera,w,h,open),left=camera.x+p.x+(open?0:924*camera.scale),top=camera.y+p.y,right=left+(open?1912:988)*camera.scale,bottom=top+1280*camera.scale;assert.ok(right>=119.99&&left<=w-119.99&&bottom>=119.99&&top<=h-119.99);}}});
