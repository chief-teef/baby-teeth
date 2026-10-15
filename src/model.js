import {PAGE_FORMAT} from '../shared/notebook-format.js';
import {validatePost} from '../shared/document.js';
export const WIDTH = 900;
export const uid = () => crypto.randomUUID();
export const textDoc = text => ({type:'doc',content:[{type:'paragraph',content:text ? [{type:'text',text}] : []}]});
export const blankPost = () => ({version:2,pageFormat:PAGE_FORMAT,id:uid(),title:'',created:new Date().toISOString(),elements:[]});
export const blankBook = () => ({version:1,posts:[blankPost()]});
export function bounds(e) {
  const radians = (e.rotation || 0) * Math.PI / 180;
  const w = Math.abs(e.w*Math.cos(radians))+Math.abs(e.h*Math.sin(radians));
  const h = Math.abs(e.w*Math.sin(radians))+Math.abs(e.h*Math.cos(radians));
  return {x:e.x+(e.w-w)/2,y:e.y+(e.h-h)/2,w,h};
}
export function validateBook(book) {
 if(book?.version!==1||!Array.isArray(book.posts)||book.posts.length>100)throw Error('Unsupported archive format.');
 const ids=new Set();
 for(const post of book.posts){validatePost(post,{local:true});if(ids.has(post.id))throw Error('Duplicated entry.');ids.add(post.id);}
 return book;
}
