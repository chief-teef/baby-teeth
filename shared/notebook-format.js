export const PAGE_FORMAT='notebook-900x1200-v1';
export const PAGE=Object.freeze({width:900,height:1200,x:54,y:220,compositionWidth:792,compositionHeight:920});
export const OVERFLOW_MESSAGE='Content exceeds its page. Move, resize, or shorten the highlighted content before publishing.';
export function validateFormat(post){const version=post.version;if(![2,3].includes(version)||post.pageFormat!==PAGE_FORMAT)throw Error('Unsupported entry format. Local content has not been changed.');return version;}
export const isNotebook=p=>[2,3].includes(p?.version)&&p.pageFormat===PAGE_FORMAT;
export function rotatedBounds(e){const r=e.rotation*Math.PI/180,w=Math.abs(e.w*Math.cos(r))+Math.abs(e.h*Math.sin(r)),h=Math.abs(e.w*Math.sin(r))+Math.abs(e.h*Math.cos(r));return {x:e.x+(e.w-w)/2,y:e.y+(e.h-h)/2,w,h};}
export function elementBounds(e){
 if(e.type!=='drawing'||!e.strokes.length)return rotatedBounds(e);
 const scale=Math.min(e.w/e.sourceW,e.h/e.sourceH),offsetX=(e.w-e.sourceW*scale)/2,offsetY=(e.h-e.sourceH*scale)/2;
 let left=0,top=0,right=e.w,bottom=e.h;
 for(const stroke of e.strokes)for(const [x,y] of stroke.points){left=Math.min(left,offsetX+(x-stroke.size/2)*scale);top=Math.min(top,offsetY+(y-stroke.size/2)*scale);right=Math.max(right,offsetX+(x+stroke.size/2)*scale);bottom=Math.max(bottom,offsetY+(y+stroke.size/2)*scale);}
 const angle=e.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),cx=e.x+e.w/2,cy=e.y+e.h/2;
 const corners=[[left,top],[right,top],[right,bottom],[left,bottom]].map(([x,y])=>({x:cx+(x-e.w/2)*c-(y-e.h/2)*s,y:cy+(x-e.w/2)*s+(y-e.h/2)*c}));
 const x=Math.min(...corners.map(p=>p.x)),y=Math.min(...corners.map(p=>p.y));return {x,y,w:Math.max(...corners.map(p=>p.x))-x,h:Math.max(...corners.map(p=>p.y))-y};
}
export function entryPages(post){validateFormat(post);return post.version===2?[{id:post.id,elements:post.elements}]:post.pages;}
export function entryElements(post){return entryPages(post).flatMap(page=>page.elements);}
export function pageGeometry(pageIndex=0){if(!Number.isInteger(pageIndex)||pageIndex<0)throw Error('Invalid page index.');return {x:54,y:pageIndex===0?220:60,width:792,height:pageIndex===0?920:1080};}
export function geometryOverflow(post,{pageIndex}={}){validateFormat(post);return entryPages(post).flatMap((page,index)=>{if(pageIndex!==undefined&&index!==pageIndex)return [];const g=pageGeometry(index);return page.elements.filter(e=>{const b=elementBounds(e);return b.x<-.01||b.y<-.01||b.x+b.w>g.width+.01||b.y+b.h>g.height+.01;}).map(e=>e.id);});}
export function assertPublicationGeometry(post){validateFormat(post);if(!post.title.trim())throw Error('A title is required before publishing.');if(geometryOverflow(post).length)throw Error(OVERFLOW_MESSAGE);}
export function entryDate(post){return new Date(post.publishedAt||post.cloud?.publishedAt||post.created).toLocaleDateString('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric',year:'numeric'}).toLowerCase();}
