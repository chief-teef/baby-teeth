import {siteOrigin,base as blogBase} from '../lib/posts.js';
import {allPosts,postUrl} from '../lib/posts.js';
export function GET(){const paths=[blogBase,`${blogBase}about/`,`${blogBase}archive/`,...allPosts().map(postUrl)];return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p=>`<url><loc>${siteOrigin}${p}</loc></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml'}});}
