export const WIDTH = 900;
export const uid = () => crypto.randomUUID();
export const textDoc = text => ({type:'doc',content:[{type:'paragraph',content:text ? [{type:'text',text}] : []}]});
export const blankPost = () => ({id:uid(),title:'Untitled entry',created:new Date().toISOString(),elements:[]});
export const blankBook = () => ({version:1,posts:[blankPost()]});
export function bounds(e) {
  const radians = (e.rotation || 0) * Math.PI / 180;
  const w = Math.abs(e.w*Math.cos(radians))+Math.abs(e.h*Math.sin(radians));
  const h = Math.abs(e.w*Math.sin(radians))+Math.abs(e.h*Math.cos(radians));
  return {x:e.x+(e.w-w)/2,y:e.y+(e.h-h)/2,w,h};
}
export function height(elements) { return Math.max(1100,...elements.map(e=>{const b=bounds(e);return b.y+b.h+90;})); }
export function phoneLayout(elements, width=350) {
  const units = []; const groups = new Map();
  elements.forEach(e=>{
    if(e.group){if(!groups.has(e.group)){const unit=[];groups.set(e.group,unit);units.push(unit);}groups.get(e.group).push(e);}
    else units.push([e]);
  });
  let y=24;const result=[];
  units.forEach(unit=>{
    // Reflow text outside collage groups so it remains readable.
    const visual=unit.filter(e=>e.type!=='text');
    if(visual.length){
      const boxes=visual.map(bounds);const left=Math.min(...boxes.map(b=>b.x));const top=Math.min(...boxes.map(b=>b.y));
      const right=Math.max(...boxes.map(b=>b.x+b.w));const bottom=Math.max(...boxes.map(b=>b.y+b.h));
      const scale=Math.min(1,(width-32)/(right-left));
      visual.forEach(e=>result.push({...e,x:16+(e.x-left)*scale,y:y+(e.y-top)*scale,w:e.w*scale,h:e.h*scale}));
      y+=(bottom-top)*scale+22;
    }
    unit.filter(e=>e.type==='text').forEach(e=>{result.push({...e,x:16,y,w:width-32,rotation:0,flow:true});y+=e.h+24;});
  });
  return {elements:result,height:y+24};
}
export function validateBook(book) {
  if(book?.version!==1||!Array.isArray(book.posts)||book.posts.length>100)throw Error('Unsupported archive format.');
  const ids=new Set();
  for(const p of book.posts){
    if(typeof p.id!=='string'||ids.has(p.id)||typeof p.title!=='string'||p.title.length>500||!Array.isArray(p.elements)||p.elements.length>500)throw Error('Invalid entry.');
    ids.add(p.id);
    const elementIds=new Set();
    for(const e of p.elements){
      if(typeof e.id!=='string'||elementIds.has(e.id)||!['text','photo','drawing'].includes(e.type))throw Error('Invalid object.');
      elementIds.add(e.id);
      for(const key of ['x','y','w','h','rotation'])if(!Number.isFinite(e[key])||Math.abs(e[key])>100000)throw Error('Invalid object position.');
      if(e.w<20||e.h<1)throw Error('Invalid object size.');
      if(e.type==='photo'&&(!/^data:image\/(jpeg|png|webp);base64,/.test(e.src)||typeof e.alt!=='string'))throw Error('Unsupported photo.');
      if(e.type==='text'&&(e.doc?.type!=='doc'||JSON.stringify(e.doc).length>1000000))throw Error('Invalid text.');
      if(e.type==='drawing'){
        if(!Array.isArray(e.strokes)||e.strokes.length>2000)throw Error('Invalid drawing.');
        for(const s of e.strokes){if(!/^#[a-f0-9]{6}$/i.test(s.color)||!Number.isFinite(s.size)||s.size<1||s.size>40||!Array.isArray(s.points)||s.points.length>50000)throw Error('Invalid stroke.');for(const pt of s.points)if(pt.length!==2||!pt.every(n=>Number.isFinite(n)&&Math.abs(n)<100000))throw Error('Invalid point.');}
      }
    }
  }
  return book;
}
