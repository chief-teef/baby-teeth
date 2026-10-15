import {mountBook} from '../shared/book/scene.js';
import {blankPost,textDoc,uid} from '../src/model.js';
import {toothStamp} from '../shared/tooth-stamp.js';
// Fictional local-only entries; this module is outside both production builds.
function study(index){
 const canvas=document.createElement('canvas');canvas.width=960;canvas.height=640;const c=canvas.getContext('2d'),sky=c.createLinearGradient(0,0,0,640);
 sky.addColorStop(0,['#90b9a2','#e8afbf','#b7b5dc','#9ec4c8','#e7c091'][index]);sky.addColorStop(1,'#f6edce');c.fillStyle=sky;c.fillRect(0,0,960,640);
 c.fillStyle='#fff3ca';c.beginPath();c.arc(660,210,82,0,Math.PI*2);c.fill();
 for(let layer=0;layer<3;layer++){c.fillStyle=['#7eaa71','#537e53','#2d573d'][layer];c.beginPath();c.moveTo(0,400+layer*70);for(let x=0;x<=960;x+=16)c.lineTo(x,390+layer*75+Math.sin(x/180+index+layer)*65);c.lineTo(960,640);c.lineTo(0,640);c.fill();}
 let seed=19+index;for(let i=0;i<1200;i++){seed=(seed*16807)%2147483647;const x=seed%960;seed=(seed*16807)%2147483647;c.fillStyle=i%2?'#fff8e614':'#20352410';c.fillRect(x,seed%640,2,2);}
 return canvas.toDataURL('image/jpeg',.9);
}
const titles=['pockets of october','a pink afternoon','little things collected','green skies, soft light','the last page for now'];
const notes=['A small collection of ordinary things: a long walk, a warm window, and the color of the sky.','Nothing urgent today. Just a few little details worth keeping on paper.','A photo, a tiny tooth, and room for another thought.','The afternoon went slowly. This is a place to put the pieces.','Five fictional pages for trying the book. Drag the paper, flip back, or tap a photo to open and download it.'];
const music={
  "artists": [
    {
      "name": "brakence",
      "url": "https://open.spotify.com/artist/4kqFrZkeqDfOIEqTWqbOOV",
      "image": "https://image-cdn-fa.spotifycdn.com/image/ab67616100005174e1dce3b56c044ae242ea558f"
    },
    {
      "name": "glaive",
      "url": "https://open.spotify.com/artist/4cJKDGSv4Dz9QycXYmo565",
      "image": "https://image-cdn-fa.spotifycdn.com/image/ab67616100005174c4bdb0035310b2535bdacfa3"
    },
    {
      "name": "Remi Wolf",
      "url": "https://open.spotify.com/artist/0NB5HROxc8dDBXpkIi1v3d",
      "image": "https://image-cdn-fa.spotifycdn.com/image/ab67616100005174a9dae97c76ed2b476d75a1b1"
    }
  ],
  "songs": [
    {
      "name": "crystallized",
      "url": "https://open.spotify.com/track/5yUwlZ1IS6Yg1FqyAqK9Ro",
      "image": "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e0245c218c500f5ef630447a39b"
    },
    {
      "name": "Crooked Elbow",
      "url": "https://open.spotify.com/track/1S231HRUptJrGLNPUF04Gp",
      "image": "https://i.scdn.co/image/ab67616d0000b27396618f018f874b8d56658a21"
    },
    {
      "name": "Dramatic Girl (feat. Che Ecru)",
      "url": "https://open.spotify.com/track/05gychGDaYtqT3sWQhZydb",
      "image": "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e0208a27a15cf37664f0dab6ab7"
    }
  ]
};
const posts=titles.map((title,i)=>{const p=blankPost();p.id=`0000000${i+1}-dddd-4ddd-8ddd-dddddddddddd`;p.title=title;p.created=`2026-10-${String(9+i).padStart(2,'0')}T18:00:00Z`;p.music=structuredClone(music);p.elements=[{id:uid(),type:'text',x:12,y:10,w:740,h:150,rotation:0,doc:textDoc(notes[i])},{id:uid(),type:'photo',x:48,y:200,w:600,h:400,rotation:i%2?4:-3,src:study(i),alt:'Original landscape illustration for this fictional local demo'}, {...toothStamp(uid()),x:640,y:660,rotation:i%2?-8:8}];return p;});
window.bookScene=mountBook(document.querySelector('#demo'),posts,{history:false});
