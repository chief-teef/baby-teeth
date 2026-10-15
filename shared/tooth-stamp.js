// A drawing uses the existing move, resize, ink, recovery and publishing paths.
export function toothStamp(id){
 const outline=[[18,8],[30,8],[38,14],[46,8],[58,8],[66,16],[66,34],[60,48],[58,66],[52,74],[46,74],[42,56],[34,56],[30,74],[24,74],[18,66],[16,48],[10,34],[10,16],[18,8]];
 return {id,type:'drawing',x:340,y:340,w:80,h:88,sourceW:80,sourceH:88,rotation:0,strokes:[{color:'#FFFDF0',size:14,points:[[22,18],[22,38],[26,64]]},{color:'#FFFDF0',size:18,points:[[36,24],[40,44]]},{color:'#FFFDF0',size:14,points:[[54,18],[54,38],[50,64]]},{color:'#203524',size:3,points:outline},{color:'#608D3C',size:2,points:[[22,22],[22,28]]},{color:'#608D3C',size:2,points:[[54,22],[54,28]]},{color:'#A9637E',size:2,points:[[32,36],[36,40],[42,40],[46,36]]}]};
}
