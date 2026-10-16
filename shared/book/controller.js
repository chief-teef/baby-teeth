import {entryPages} from '../notebook-format.js';
export {orderedEntries} from '../paper-colors.js';
export const spreadFor=index=>Math.floor((index+1)/2);
export const sideFor=index=>(index+1)%2?'right':'left';
export class BookController{
 constructor(entries,index){this.entries=entries;this.pages=entries.flatMap((entry,entryIndex)=>entryPages(entry).map((page,pageIndex)=>({entry,entryId:entry.id,entryIndex,pageIndex,pageId:page.id}))).map((face,faceIndex)=>({...face,faceIndex}));this.entryById=new Map(entries.map(entry=>[entry.id,entry]));this.firstFaceByEntry=new Map(entries.map(entry=>[entry.id,this.pages.findIndex(page=>page.entryId===entry.id)]));this.index=Math.max(0,Math.min(this.pages.length-1,index??this.firstFace(entries.length-1)));this.state='closed';this.camera='overview';this.pending=null;this.closePending=false;}
 firstFace(entryIndex){return Math.max(0,this.firstFaceByEntry.get(this.entries[entryIndex]?.id)??0);}
 entryNeighbor(direction){const entryIndex=Math.max(0,Math.min(this.entries.length-1,(this.page?.entryIndex??0)+direction));return this.firstFace(entryIndex);}
 request(index){index=Math.max(0,Math.min(this.pages.length-1,index));if(this.state!=='open-idle'){if(this.state==='turning'||this.state==='zooming')this.pending=index;return null;}return index;}
 spreadNeighbor(direction){const spread=spreadFor(this.index)+direction;return direction>0?Math.min(this.pages.length-1,spread*2):Math.max(0,spread*2-1);}
 get page(){return this.pages[this.index];}
 get current(){return this.page?.entry;}
 get spread(){return spreadFor(this.index);}
}
