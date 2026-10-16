import {cleanPng} from '../shared/png.js';
export default {async fetch(request){try{const bytes=await cleanPng(new Uint8Array(await request.arrayBuffer()));return new Response(bytes,{headers:{'Content-Type':'image/png'}});}catch(error){return new Response(error.message,{status:400});}}};
