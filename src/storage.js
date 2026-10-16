import {validateBook,migrateBook} from './model.js';
let database;
async function db(){if(database)return database;database=await new Promise((resolve,reject)=>{const req=indexedDB.open('baby-teeth-studio',1);req.onupgradeneeded=()=>req.result.createObjectStore('drafts');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});return database;}
const read=(store,key)=>new Promise((resolve,reject)=>{const req=store.get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
export async function load(){
 const d=await db();return new Promise((resolve,reject)=>{
  const tx=d.transaction('drafts','readwrite'),store=tx.objectStore('drafts');let result,failed;
  const active=store.get('book-v3');active.onsuccess=()=>{
   if(active.result!==undefined){result=active.result;return;}
   const legacy=store.get('book');legacy.onsuccess=()=>{
    if(legacy.result===undefined)return;
    result=legacy.result;
    try{validateBook(result);const migrated=migrateBook(result),original=store.get('book-before-v3');original.onsuccess=()=>{if(original.result===undefined)store.add(result,'book-before-v3');store.add(migrated,'book-v3');result=migrated;};}
    catch{ /* Unknown selected recovery stays raw and exportable. */ }
   };
  };
  tx.oncomplete=()=>resolve(result);tx.onerror=()=>{failed=tx.error;};tx.onabort=()=>reject(failed||tx.error||Error('Recovery initialization interrupted.'));
 });
}
export async function save(book){validateBook(book);if(book.posts.some(post=>post.version!==3))throw Error('Local recovery requires v3 entries.');const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('drafts','readwrite');tx.objectStore('drafts').put(book,'book-v3');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Save interrupted'));});}
export async function recoveryCopies(){const d=await db(),store=d.transaction('drafts').objectStore('drafts');const [current,original,legacy]=await Promise.all([read(store,'book-v3'),read(store,'book-before-v3'),read(store,'book')]);return {current,original,legacy,legacyChanged:original!==undefined&&JSON.stringify(original)!==JSON.stringify(legacy)};}
