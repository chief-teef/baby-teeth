import {verifyNotebooks} from '../scripts/verify-notebook.mjs';
import {textDoc} from '../src/model.js';
import assert from 'node:assert/strict';
import path from 'node:path';
const post={version:2,pageFormat:'notebook-900x1200-v1',id:'11111111-1111-4111-8111-111111111111',title:'A quiet afternoon',created:'2026-10-13T12:00:00Z',publishedAt:'2026-10-13T12:00:00Z',elements:[{id:'22222222-2222-4222-8222-222222222222',type:'text',x:20,y:10,w:700,h:110,rotation:0,doc:textDoc('A fitting notebook paragraph with a real line break and room to breathe.')} ]};
await verifyNotebooks([post],path.resolve('.'));
await assert.rejects(()=>verifyNotebooks([{...post,title:'A very long title '.repeat(28)}],path.resolve('.')),/does not fit/);
await assert.rejects(()=>verifyNotebooks([{...post,elements:[{...post.elements[0],h:80,doc:textDoc('An unbroken URL https://example.com/'+ 'longword'.repeat(1500))}]}],path.resolve('.')),/does not fit/);
await assert.rejects(()=>verifyNotebooks([{...post,elements:[{...post.elements[0],y:900}]}],path.resolve('.')),/exceeds its page/);
console.log('PASS canonical production font gate: fitting page, oversized title, unbroken overflowing text, geometric overflow; no measurement artifacts written.');

const dense={...post,title:'A dense page',elements:[]};for(let i=0;i<30;i++)dense.elements.push({...post.elements[0],id:crypto.randomUUID(),x:(i%5)*155,y:Math.floor(i/5)*60,w:150,h:60,doc:textDoc(String(i+1))});for(let i=0;i<20;i++)dense.elements.push({id:crypto.randomUUID(),type:'photo',src:'media/'+ 'a'.repeat(40)+'.jpg',alt:'Local capacity fixture',x:(i%5)*155,y:400+Math.floor(i/5)*120,w:140,h:100,rotation:0});dense.elements.push({id:crypto.randomUUID(),type:'drawing',x:5,y:880,w:100,h:30,sourceW:100,sourceH:30,rotation:0,strokes:[{color:'#203524',size:4,points:[[5,5],[90,20]]}]});await verifyNotebooks([dense],path.resolve('.'));await assert.rejects(()=>verifyNotebooks([{...dense,elements:dense.elements.map(e=>({...e,y:e.y+1000}))}],path.resolve('.')),/exceeds its page/);console.log('PASS fitting 20-photo/30-text/ink composition and overflowing counterpart.');
