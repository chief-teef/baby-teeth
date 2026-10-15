import {allPosts,postUrl,siteOrigin} from '../lib/posts.js';

export function GET(){
  return new Response(JSON.stringify({version:1,commit:process.env.GITHUB_SHA||null,posts:allPosts().map(p=>({id:p.id,title:p.title,url:`${siteOrigin}${postUrl(p)}`,publishedAt:p.publishedAt}))}),{headers:{'Content-Type':'application/json'}});
}
