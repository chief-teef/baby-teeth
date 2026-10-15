import {siteOrigin,base as blogBase,blogSettings} from '../lib/posts.js';
import {allPosts,postUrl} from '../lib/posts.js';
import {esc,excerpt} from '../../../shared/document.js';
export function GET(){const items=allPosts().map(p=>`<item><title>${esc(p.title)}</title><link>${siteOrigin}${postUrl(p)}</link><guid isPermaLink="true">${siteOrigin}${postUrl(p)}</guid><pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate><description>${esc(excerpt(p))}</description></item>`).join('');return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(blogSettings.title)}</title><link>${siteOrigin}${blogBase}</link><description>A personal scrapbook</description>${items}</channel></rss>`,{headers:{'Content-Type':'application/rss+xml'}});}
