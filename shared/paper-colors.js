export const PAPER_COLORS=Object.freeze({cream:'#F6F2DC',blush:'#F9DFE8',mint:'#E3EDCF',blue:'#DDEBF0',lavender:'#EBE2F2'});
export const orderedEntries=entries=>[...entries].sort((a,b)=>Date.parse(a.publishedAt||a.cloud?.publishedAt||a.created)-Date.parse(b.publishedAt||b.cloud?.publishedAt||b.created)||a.id.localeCompare(b.id));
export const paperColor=index=>Object.values(PAPER_COLORS)[((index%5)+5)%5];
