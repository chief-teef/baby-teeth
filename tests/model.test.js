import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateBook,blankPost,uid,textDoc,bounds} from '../src/model.js';
import {toothStamp} from '../shared/tooth-stamp.js';
import {cleanPost} from '../shared/document.js';
const fixture=()=>({version:1,posts:[{version:2,pageFormat:'notebook-900x1200-v1',id:uid(),title:'',created:new Date().toISOString(),elements:[{id:uid(),type:'text',x:20,y:30,w:200,h:100,rotation:0,doc:textDoc('hello')}]}]});
test('archive rejects unsafe drawings, photos, duplicate entries and ink',()=>{
 const book=fixture();assert.equal(validateBook(book),book);assert.throws(()=>validateBook({...book,posts:[book.posts[0],book.posts[0]]}));
 const p=book.posts[0];p.elements=[{...toothStamp(uid()),sourceW:'100 invalid attribute'}];assert.throws(()=>validateBook(book),/drawing/);
 p.elements=[{id:uid(),type:'photo',x:0,y:0,w:100,h:100,rotation:0,src:'javascript:alert(1)',alt:''}];assert.throws(()=>validateBook(book),/photo/);
 p.elements=[toothStamp(uid())];p.elements[0].strokes[0].color='red';assert.throws(()=>validateBook(book),/stroke/);
});
test('tooth stamp uses valid recoverable drawing geometry',()=>{const book=fixture(),stamp=toothStamp(uid());book.posts[0].elements=[stamp];assert.equal(validateBook(book),book);assert.deepEqual(JSON.parse(JSON.stringify(stamp)),stamp);assert.equal(bounds(stamp).w,80);});
test('text font, size and fixed height survive saves without changing legacy defaults',()=>{
 const book=fixture(),post=book.posts[0],text=post.elements[0];
 assert.equal(cleanPost(post).elements[0].font,undefined);
 Object.assign(text,{font:'handwriting',fontSize:32,fixedHeight:true});
 assert.equal(validateBook(JSON.parse(JSON.stringify(book))).posts[0].elements[0].font,'handwriting');
 assert.deepEqual(cleanPost(post).elements[0],text);
 for(const invalid of [{font:'external'},{fontSize:17},{fontSize:61},{fontSize:'32'},{fontSize:NaN},{fixedHeight:false}]){
  const next=structuredClone(book);Object.assign(next.posts[0].elements[0],invalid);assert.throws(()=>validateBook(next),/text/);
 }
 text.font='serif';text.fontSize=60;assert.equal(validateBook(book),book);
});
