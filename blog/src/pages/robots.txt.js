import {siteOrigin,base as blogBase} from '../lib/posts.js';
export function GET(){return new Response(`User-agent: *\nAllow: /\nSitemap: ${siteOrigin}${blogBase}sitemap.xml\n`,{headers:{'Content-Type':'text/plain'}});}
