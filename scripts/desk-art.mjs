// Original low-resolution sprites; all contours and highlights use whole pixels.
export function deskAssets(){
 const r=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`,p=(d,c)=>`<path d="${d}" fill="${c}"/>`;
 const outline='#85435d',pink='#e59ebc',light='#ffe0ed',shade='#b76e90',metal='#c9d9be';
 let wood=r(0,0,256,128,'#886349');
 for(let y=0;y<128;y+=4)for(let x=0;x<256;x+=8){const offset=Math.round(Math.sin(x/27+y/9)*2);wood+=r(x,y+offset,6+(x*y%5),1,['#785439','#996f50','#a47c59'][(x/8+y/4)%3]);if((x+y)%24===0)wood+=r(x+3,y+2,2,1,'#946c4e');}
 wood+=r(0,31,256,1,'#664931')+r(0,96,256,1,'#664931')+p('M20 107 H43 V108 H31 V109 H20 Z','#b38b66')+p('M176 19 H189 V20 H196 V22 H200 V27 H196 V29 H187 V30 H174 V29 H167 V27 H164 V23 H168 V21 H176 Z','#775439')+p('M175 22 H190 V23 H194 V26 H187 V27 H174 V26 H170 V24 H175 Z','#946c4d');
 const lighter=p('M1 0 H13 V2 H14 V21 H13 V23 H1 V21 H0 V2 H1 Z','#5b7152')+r(1,1,12,20,'#aac28b')+r(2,2,2,18,'#e0edbd')+r(11,3,2,17,'#7f9d69')+r(3,0,8,5,metal)+r(4,1,1,1,'#526748')+r(7,1,1,1,'#526748')+r(10,1,1,1,'#526748')+p('M7 9 H8 V12 H11 V13 H9 V16 H7 V14 H4 V12 H7 Z',pink);
 const lid=p('M2 0 H12 V1 H14 V7 H0 V1 H2 Z','#5b7152')+r(1,1,12,5,metal)+r(2,1,2,4,'#f3f7e6')+r(11,2,2,4,'#94a589');
 const grinder=p('M5 4 H23 V5 H26 V7 H28 V17 H26 V20 H23 V22 H5 V20 H2 V17 H0 V7 H2 V5 H5 Z',outline)+r(2,7,24,10,pink)+r(4,8,3,9,light)+r(22,8,4,9,shade)+r(2,11,24,1,outline)+r(5,18,18,2,shade)+Array.from({length:7},(_,i)=>r(3+i*3,13,1,4,i%2?light:shade)).join('');
 const top=p('M5 1 H23 V2 H26 V4 H28 V8 H26 V10 H23 V11 H5 V10 H2 V8 H0 V4 H2 V2 H5 Z',outline)+p('M6 2 H22 V3 H25 V5 H26 V7 H23 V9 H5 V8 H2 V5 H4 V3 H6 Z',pink)+r(6,3,13,1,light)+r(4,4,3,2,light)+r(21,7,3,1,shade)+p('M14 3 H16 V5 H18 V6 H16 V8 H14 V6 H12 V5 H14 Z',light);
 const pipe=p('M3 4 H9 V6 H22 V2 H25 V0 H30 V2 H33 V4 H34 V14 H32 V18 H28 V20 H24 V18 H22 V13 H8 V11 H3 V10 H0 V7 H3 Z',outline)+p('M3 5 H8 V7 H24 V3 H29 V2 H32 V5 H33 V13 H30 V17 H26 V18 H24 V15 H24 V11 H7 V9 H2 V7 H3 Z','#edaccbbb')+r(4,6,15,1,light)+r(26,3,3,1,light)+r(31,6,1,7,light)+r(26,6,5,3,'#844e66')+r(25,12,2,4,'#c277ad')+r(8,8,2,2,'#d789b5')+r(18,8,2,2,'#ba79a7');
 const herbs=Array.from({length:14},(_,i)=>r(25+i%6,6+Math.floor(i/6),1,1,['#657a39','#a6b85d','#425c2a'][i%3])).join('');
 const figure=p('M9 5 V2 H10 V0 H14 V1 H15 V3 H13 V2 H11 V5 Z','#b79332')+r(10,1,3,1,'#ffe88b')
  +p('M5 6 H15 V7 H17 V9 H19 V8 H20 V12 H18 V14 H16 V15 H17 V16 H19 V18 H20 V22 H18 V23 H16 V22 H16 V25 H17 V27 H16 V29 H12 V28 H11 V26 H9 V26 H8 V28 H4 V29 H3 V27 H4 V25 H4 V22 H2 V23 H0 V22 H1 V18 H3 V16 H4 V15 H2 V14 H0 V12 H0 V8 H1 V9 H3 V7 H5 Z','#9c7f31')
  +p('M5 7 H15 V8 H16 V14 H14 V16 H16 V17 H18 V19 H19 V21 H17 V22 H15 V20 H15 V25 H16 V27 H13 V27 H12 V24 H8 V24 H7 V27 H4 V28 H4 V26 H5 V24 H5 V20 H3 V22 H1 V21 H2 V18 H5 V16 H6 V15 H4 V13 H3 V10 H4 V8 H5 Z','#f3d34f')
  +r(1,10,2,3,'#ffe88b')+r(17,10,2,3,'#ffe88b')
  +p('M7 8 H13 V9 H15 V13 H13 V15 H7 V14 H5 V12 H5 V10 H7 Z','#f8ddad')
  +r(7,10,1,1,'#51482d')+r(12,10,1,1,'#51482d')+r(9,11,2,1,'#d5a77e')+p('M7 12 H8 V13 H12 V12 H13 V14 H7 Z','#b47753')
  +r(6,17,8,6,'#9c914f')+r(7,18,6,4,'#80979a')+r(8,18,4,3,'#cbdcda')+r(8,18,2,1,'#f0f4e9')+r(5,17,1,4,'#fff0a2')+r(14,18,1,5,'#c3a239');
 const bud=p('M3 0 H8 V2 H11 V5 H13 V9 H11 V12 H8 V14 H3 V12 H1 V9 H0 V5 H2 V2 H3 Z','#486338')+r(3,2,5,2,'#9daf68')+r(2,5,4,3,'#78984d')+r(7,6,3,4,'#678c45')+r(4,10,3,2,'#b7c681')+r(6,4,1,1,'#cfb58c')+r(3,8,1,1,'#cfb58c');
 const jar=p('M4 1 H18 V3 H20 V7 H19 V10 H21 V27 H19 V30 H3 V27 H1 V10 H3 V7 H2 V3 H4 Z','#80958f')+r(3,7,16,20,'#c8dfcb88')+r(4,1,14,5,metal)+r(5,2,2,3,'#eff2dc')+r(15,2,2,3,'#94a78e')+r(3,10,2,15,'#f4f5ddaa')+r(18,12,1,12,'#eaf1d8')+`<g transform="translate(4 13) scale(.7)">${bud}</g><g transform="translate(9 19) scale(.7)">${bud}</g>`+r(6,26,10,1,'#8aa477');
 const dust=p('M2 10 H20 V8 H17 V6 H15 V4 H12 V2 H10 V4 H8 V5 H6 V7 H4 V8 H2 Z','#8fa267')+r(3,9,16,1,'#637947')+r(9,5,1,1,'#e0dec1')+r(11,3,1,1,'#ece8d0')+r(12,6,2,1,'#cbd09b')+r(7,7,1,1,'#dfe0b6')+r(15,8,1,1,'#ece8d0')+r(5,9,2,1,'#cbd09b')+r(10,8,1,1,'#ece8d0')+r(13,9,1,1,'#b6c182');
 const mp3=p('M5 0 H50 V1 H53 V3 H55 V72 H53 V74 H50 V75 H5 V74 H2 V72 H0 V3 H2 V1 H5 Z',outline)+p('M5 2 H50 V3 H53 V71 H50 V73 H5 V72 H2 V5 H4 V3 H5 Z','#eca9c9')+r(4,5,2,63,light)+r(49,6,3,63,'#bf749e')+r(6,4,42,1,'#fff0f3')+r(7,5,39,1,'#facedd')+r(7,7,41,47,'#935576')+r(8,8,39,44,'#657963')+r(9,9,37,42,'#1b332d')+r(11,10,32,1,'#4b6a58')+p('M4 8 H6 V20 H5 V23 H4 Z','#ffffff90')+r(48,10,1,39,'#ffe3ef')+r(9,55,37,1,'#b46d93')+p('M9 61 H11 V59 H13 V61 H15 V63 H13 V65 H11 V63 H9 Z',light)+p('M40 61 H42 V59 H44 V61 H46 V63 H44 V65 H42 V63 H40 Z',light)+r(18,59,19,13,outline)+r(19,60,17,11,shade)+r(20,60,15,1,light)+r(21,62,13,8,pink)+r(24,64,7,1,light)+r(5,68,5,1,shade)+r(45,68,5,1,shade)+r(22,1,10,1,'#b66b92');
 const well=p('M5 2 H23 V3 H26 V5 H28 V9 H26 V11 H23 V12 H5 V11 H2 V9 H0 V5 H2 V3 H5 Z',outline)+p('M5 3 H23 V4 H25 V6 H26 V8 H23 V10 H5 V9 H2 V7 H4 V5 H5 Z',light)+p('M7 4 H21 V5 H24 V8 H21 V10 H7 V9 H4 V7 H7 Z','#704257')+r(7,4,13,1,shade);
 const corner=Array.from({length:14},(_,i)=>r(14-i,i+1,i+1,1,i%2?'#ddd9b9':'#e5dfc4')+r(14-i,i+1,1,1,shade)).join('')+r(2,15,14,1,outline)+r(15,2,1,14,outline)+r(10,8,1,1,'#355c29')+r(11,9,1,1,'#355c29')+r(12,10,1,1,'#355c29')+r(11,11,1,1,'#355c29')+r(10,12,1,1,'#355c29');
 // Masked sprites: edge pixels outline, left rim lit, right rim shaded; rows are [y,from,to] spans with optional holes.
 const sprite=(rows,holes,[edge,shade,main,lit],extra=[])=>{const on=new Set();for(const [y,a,b] of rows)for(let x=a;x<=b;x++)on.add(x+','+y);for(const [x,y] of holes)on.delete(x+','+y);const color=new Map();for(const k of on){const [x,y]=k.split(',').map(Number),has=(i,j)=>on.has(i+','+j);color.set(k,!has(x-1,y)||!has(x+1,y)||!has(x,y-1)||!has(x,y+1)?edge:!has(x-2,y)?lit:!has(x+2,y)?shade:main);}for(const [x,y,w,h,c] of extra)for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)color.set(i+','+j,c);let out='';const ys=[...new Set([...color.keys()].map(k=>+k.split(',')[1]))].sort((a,b)=>a-b);for(const y of ys){const xs=[...color.keys()].filter(k=>+k.split(',')[1]===y).map(k=>+k.split(',')[0]).sort((a,b)=>a-b);for(let i=0;i<xs.length;){let j=i;const c=color.get(xs[i]+','+y);while(j+1<xs.length&&xs[j+1]===xs[j]+1&&color.get(xs[j+1]+','+y)===c)j++;out+=r(xs[i],y,j-i+1,1,c);i=j+1;}}return out;};
 // Original line-up beside Laa-Laa: body length n sets height (15 head rows + n + 4 leg rows).
 const tubby=(n,palette,antenna,holes=[])=>{const rows=[...antenna,[6,6,13],[7,4,15],[8,3,16],[9,1,18],[10,1,18],[11,1,18],[12,3,16],[13,4,15],[14,5,14]],arms=n>=10?5:3,leg=15+n;for(let y=15;y<leg;y++){const arm=y>15&&y<16+arms,edge=y===16||y===15+arms;rows.push([y,arm?(edge?1:0):y===15?3:2,arm?(edge?18:19):y===15?16:17]);}for(let y=leg;y<leg+4;y++)rows.push([y,y===leg+3?2:3,8],[y,11,y===leg+3?17:16]);const t=Math.max(4,n-6),skin='#f8ddad';return sprite(rows,holes,palette,[[7,8,6,1,skin],[6,9,8,4,skin],[7,13,6,1,skin],[7,10,1,1,'#51482d'],[12,10,1,1,'#51482d'],[9,11,2,1,'#d5a77e'],[7,12,1,1,'#b47753'],[12,12,1,1,'#b47753'],[8,13,4,1,'#b47753'],[6,18,8,t,'#9c914f'],[7,19,6,t-2,'#80979a'],[8,19,4,t-3,'#cbdcda'],[8,19,2,1,'#f0f4e9']]);};
 const stem=[[4,9,10],[5,9,10]];
 const tinky=tubby(14,['#4f3474','#7f5bab','#a37ad0','#c9a7ee'],[[0,9,10],[1,8,11],[2,7,12],[3,6,13],...stem],[[9,1],[10,1],[8,2],[9,2],[10,2],[11,2]]);
 const dipsy=tubby(12,['#3e6127','#5e8a36','#83b94c','#b6dd7f'],[[0,9,10],[1,9,10],[2,9,10],[3,9,10],...stem]);
 const po=tubby(7,['#7e2424','#b33a34','#e0554a','#f6988a'],[[0,8,11],[1,7,12],[2,7,12],[3,8,11],...stem],[[9,1],[10,1],[9,2],[10,2]]);
 // Orange paw reaching left; notches split the toes and the arm runs off the right edge.
 const bean='#f6a3b5',fur='#8f4518';
 const paw=sprite([[1,3,6],[2,1,8],[3,0,10],[4,0,23],[5,1,23],[6,0,23],[7,0,23],[8,0,23],[9,1,23],[10,0,23],[11,0,23],[12,0,23],[13,1,23],[14,2,23],[15,4,23],[16,6,12]],[],[fur,'#d6702a','#f39a3d','#ffc983'],[[2,2,2,2,bean],[2,6,2,2,bean],[2,10,2,2,bean],[6,5,2,1,bean],[5,6,4,6,bean],[6,12,2,1,bean],[6,7,1,1,'#ffd3dc'],[2,5,2,1,fur],[2,9,2,1,fur],[3,13,2,1,fur],[14,6,2,8,'#d6702a'],[18,6,2,8,'#d6702a']]);
 return [['desk-wood',256,128,wood],['lighter',14,23,lighter],['lighter-lid',14,7,lid],['grinder',28,22,grinder],['grinder-top',28,22,top],['grinder-well',28,22,well],['page-corner',16,16,corner],['pipe',34,20,pipe],['oregano',34,20,herbs],['jar',22,30,jar],['buds',14,14,bud],['dust',22,12,dust],['figurine',20,29,figure],['mp3',55,75,mp3],['tinky',20,33,tinky],['dipsy',20,31,dipsy],['po',20,26,po],['paw',24,18,paw],...toyAssets(r,sprite)].map(a=>[...a,[0,0]]);
}
// Second desk-toy set: original whole-pixel drawings, no traced art or logo files.
function toyAssets(r,sprite){
 const ink='#2b2b33',red='#c8312c',yellow='#f6d54a';
 const wheels=[3,10,17].map(x=>r(x,14,4,3,'#2a5bb0')+r(x+1,17,2,1,'#1d3c78')+r(x+1,14,2,1,'#7fb0f0')).join('');
 const thomas=sprite([[0,6,9],[1,7,8],[2,7,8],[3,7,8],[1,16,25],[2,17,24],[3,17,24],[3,12,14],...Array.from({length:9},(_,i)=>[4+i,1,24]),[13,0,25]],[],['#1d3c78','#2a5bb0','#3b78d8','#7fb0f0'],[[6,0,4,1,ink],[7,1,2,3,ink],[16,1,10,1,ink],[17,2,8,1,'#3a3a44'],[19,4,4,3,'#bfe3ff'],[1,4,5,8,'#8d8f96'],[2,5,4,6,'#e3e1dc'],[2,6,1,1,'#222'],[4,6,1,1,'#222'],[2,9,3,1,'#6b4a3c'],[1,12,24,1,red],[0,13,26,1,red],[0,12,1,2,ink],[21,8,1,4,yellow],[20,9,1,1,yellow],[20,11,3,1,yellow]])+wheels+r(4,15,16,1,'#b9bcc4');
 const steam=sprite([[0,3,6],[1,1,8],[2,0,9],[3,0,9],[4,1,9],[5,2,8],[6,3,6]],[],['#c4ccd4','#dde3e8','#f2f4f6','#ffffff']);
 const tire=(x,y,w,h)=>r(x,y,w,h,'#1c1c1c')+r(x+1,y+1,w-2,1,'#c8c8c8');
 const muscle=sprite([[0,8,13],[1,7,14],[2,6,15],[3,1,20],[4,0,21],[5,0,21],[6,1,20]],[],['#7a3208','#c4520f','#f47a20','#ffb35c'],[[8,1,3,1,'#a8d8ff'],[12,1,2,1,'#a8d8ff'],[0,4,1,1,'#fff3a0'],[21,4,1,1,'#e8321e'],[2,4,5,1,'#ffd23f'],[7,4,1,1,'#e8321e'],[2,5,3,1,'#ffd23f'],[5,5,2,1,'#e8321e']])+tire(3,6,4,3)+tire(15,6,4,3);
 const hotrod=sprite([[0,9,13],[1,8,14],[2,7,20],[3,1,21],[4,0,21],[5,0,21],[6,2,13]],[],['#0b4f4a','#12857b','#18b5a8','#7fe3d8'],[[9,1,4,1,'#a8d8ff'],[0,4,1,1,'#fff3a0'],[21,4,1,1,'#e8321e'],[1,4,20,1,'#f4f7f4']])+tire(3,6,3,3)+tire(14,5,6,4);
 const pen='#2f3f9c',pink='#f4a6c0';
 const note=r(0,0,16,16,'#f7e463')+r(0,0,16,3,'#efd552')+r(15,1,1,15,'#d9bf3d')+r(1,15,15,1,'#d9bf3d')+r(13,13,2,2,'#e9d24f')
  +r(5,3,1,3,pen)+r(10,3,1,3,pen)+r(5,6,6,1,pen)+r(4,7,1,4,pen)+r(11,7,1,4,pen)+r(5,11,6,1,pen)+r(5,7,6,4,pink)+r(5,7,2,2,'#fff')+r(9,7,2,2,'#fff')+r(6,8,1,1,pen)+r(9,8,1,1,pen)+r(7,9,2,2,'#7a2a3a')
  +r(6,12,4,2,pink)+r(5,12,1,2,pen)+r(10,12,1,2,pen)+r(4,12,1,1,pen)+r(3,10,1,2,pen)+r(11,12,1,1,pen)+r(12,10,1,2,pen)+r(6,14,1,1,pen)+r(9,14,1,1,pen)+r(2,4,1,2,pen)+r(13,4,1,2,pen)+r(13,7,1,1,'#7ab8e8');
 const glass='#56707c',ashtray=r(4,0,10,1,glass)+r(2,1,14,1,glass)+r(4,1,10,1,'#d8e8ee')+r(1,2,16,4,'#9fb7c2')+r(0,2,1,4,glass)+r(17,2,1,4,glass)+r(3,2,12,2,'#6e8791')+r(5,3,3,1,'#c9c4bd')+r(10,2,2,1,'#b5afa6')+r(6,2,3,1,'#f4efe6')+r(9,2,2,1,'#d99a4e')+r(5,2,1,1,'#8a8580')+r(3,4,3,1,'#e3f0f4')+r(1,6,16,1,glass)+r(3,7,12,1,'#3f5560');
 // Geek Bar Pulse on its side: gradient body, hand-lettered name, small screen.
 const glyph={G:['111','100','101','101','111'],E:['111','100','110','100','111'],K:['101','101','110','101','101'],B:['110','101','110','101','110'],A:['010','101','111','101','101'],R:['110','101','110','101','101']};
 const lettering=[['G',8],['E',12],['E',16],['K',20],['B',26],['A',30],['R',34]].map(([c,x])=>glyph[c].map((row,y)=>[...row].map((p,i)=>p==='1'?r(x+i,4+y,1,1,'#fff4fb'):'').join('')).join('')).join('');
 const geekbar=r(1,2,5,8,'#2b2430')+r(0,3,1,6,'#2b2430')+r(1,3,4,1,'#5a5263')+r(0,5,1,2,'#141018')
  +r(7,0,38,1,'#4a2350')+r(6,1,1,10,'#4a2350')+r(45,1,1,10,'#4a2350')+r(7,11,38,1,'#4a2350')+r(7,1,10,10,'#f27bb5')+r(17,1,10,10,'#d971c2')+r(27,1,10,10,'#b766cd')+r(37,1,8,10,'#9459d4')+r(8,1,36,1,'#ffd0ec')+r(7,10,38,1,'#5d2a6e')
  +lettering+r(38,3,7,6,'#2e2236')+r(39,4,5,4,'#141018');
 const screen=r(39,4,5,4,'#16302a')+r(39,4,4,1,'#9ff07a')+r(43,4,1,1,'#3e6b33')+r(39,6,3,1,'#7ad7f0')+r(42,6,2,1,'#2d5f6e');
 return [['thomas',26,18,thomas],['steam',10,7,steam],['muscle',22,9,muscle],['hotrod',22,9,hotrod],['note',16,16,note],['ashtray',18,8,ashtray],['geekbar',46,12,geekbar],['geekbar-screen',46,12,screen]];
}
