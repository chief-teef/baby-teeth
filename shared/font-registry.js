// Trusted self-hosted families only; document values are registry IDs.
const bundled=[['inter','Inter','sans'],['source-sans','Source Sans 3','sans'],['ibm-plex-mono','IBM Plex Mono','mono'],['patrick-hand','Patrick Hand','handwriting'],['permanent-marker','Permanent Marker','handwriting'],['press-start-2p','Press Start 2P','pixel'],['vt323','VT323','computer'],['orbitron','Orbitron','futuristic'],['audiowide','Audiowide','futuristic'],['fredoka','Fredoka','bubbly'],['pacifico','Pacifico','script'],['lobster','Lobster','script'],['playfair-display','Playfair Display','editorial'],['special-elite','Special Elite','typewriter'],['unifrakturmaguntia','UnifrakturMaguntia','gothic'],['rubik-dirt','Rubik Dirt','distressed'],['dm-serif-display','DM Serif Display','editorial']];
export const FONT_REGISTRY=Object.freeze([
 {id:'serif',label:'Georgia / Gelasio',category:'serif',family:'Georgia,Gelasio,serif',faces:[{weight:'400 700',style:'normal',src:'book/Gelasio-latin.woff2'},{weight:'400 700',style:'italic',src:'book/Gelasio-italic-latin.woff2'}],fallbackId:'serif',aliases:['Georgia','Gelasio','Times New Roman','Times'],license:'book/Gelasio-OFL.txt',source:'https://github.com/google/fonts/tree/main/ofl/gelasio'},
 {id:'handwriting',label:'Caveat',category:'handwriting',family:'Caveat',faces:[{weight:'400 700',style:'normal',src:'book/Caveat-latin.woff2'}],fallbackId:'serif',aliases:['Caveat'],license:'book/Caveat-OFL.txt',source:'https://github.com/google/fonts/tree/main/ofl/caveat'},
 {id:'kalam',label:'Kalam',category:'handwriting',family:'Kalam',faces:[{weight:400,style:'normal',src:'book/Kalam-latin.woff2'}],fallbackId:'serif',aliases:['Kalam'],license:'book/OFL.txt',source:'https://github.com/google/fonts/tree/main/ofl/kalam'},
 ...bundled.map(([id,label,category])=>({id,label,category,family:label,faces:[{weight:400,style:'normal',src:`editor/fonts/${id}.woff2`}],fallbackId:'serif',aliases:[label],license:`editor/fonts/${id}-OFL.txt`,licenseId:['permanent-marker','special-elite'].includes(id)?'Apache-2.0':'OFL-1.1',source:`https://github.com/google/fonts/tree/main/${['permanent-marker','special-elite'].includes(id)?'apache':'ofl'}/${label.toLowerCase().replaceAll(' ','')}`}))
]);
export const FONTS=FONT_REGISTRY;
export const fontById=id=>FONT_REGISTRY.find(font=>font.id===id);
export const fontFamily=id=>fontById(id??'serif')?.family||fontById('serif').family;
export function resolveFont(value){const normalized=String(value).replace(/["']/g,'').split(',')[0].trim().toLowerCase();return FONT_REGISTRY.find(font=>font.id===normalized||font.aliases.some(alias=>alias.toLowerCase()===normalized))?.id||null;}
export const FONT_SYNTHESIS='weight style';


