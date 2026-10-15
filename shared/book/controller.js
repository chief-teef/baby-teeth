export const spreadFor=index=>Math.floor((index+1)/2);
export const sideFor=index=>(index+1)%2?'right':'left';
export function orderedEntries(posts){return [...posts].sort((a,b)=>Date.parse(a.publishedAt||a.cloud?.publishedAt||a.created)-Date.parse(b.publishedAt||b.cloud?.publishedAt||b.created)||a.id.localeCompare(b.id));}
export class BookController{
 constructor(entries,index=entries.length-1){this.entries=entries;this.index=Math.max(0,index);this.state='closed';this.camera='overview';this.pending=null;this.closePending=false;}
 request(index){index=Math.max(0,Math.min(this.entries.length-1,index));if(this.state!=='open-idle'){if(this.state==='turning'||this.state==='zooming')this.pending=index;return null;}return index;}
 spreadNeighbor(direction){const spread=spreadFor(this.index)+direction;return direction>0?Math.min(this.entries.length-1,spread*2):Math.max(0,spread*2-1);}
 get current(){return this.entries[this.index];}
 get spread(){return spreadFor(this.index);}
}
