import {MUSIC_SLOTS,validateMusic} from '../music.js';
export function mountMusicPlayer(element,base){
 const screen=document.createElement('section');screen.className='mp3-screen';screen.ariaLabel='This entry’s favorite music';element.append(screen);let kind='artists',music={artists:[],songs:[]},id=Symbol();
 function dismiss(){element.classList.remove('awake');const control=element.querySelector('.mp3-handle');control.setAttribute('aria-expanded','false');control.focus();}
 screen.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dismiss();}});
 function render(){screen.replaceChildren();const close=document.createElement('button');close.className='mp3-close';close.textContent='Close player';close.onclick=dismiss;screen.append(close);const indicators=document.createElement('div');indicators.className='mp3-indicators';indicators.ariaHidden='true';indicators.innerHTML='<span class="mp3-heart">♥</span><span class="mp3-signal"><i></i><i></i><i></i><i></i></span><span class="mp3-battery"><i></i><i></i><i></i></span>';screen.append(indicators);const nav=document.createElement('div');nav.className='mp3-tabs';
  for(const tab of ['artists','songs']){const b=document.createElement('button');b.textContent=tab==='artists'?'Artists':'Songs';b.setAttribute('aria-pressed',String(kind===tab));b.onclick=()=>{kind=tab;render();screen.querySelector(`[data-kind="${tab}"]`).focus();};b.dataset.kind=tab;nav.append(b);}screen.append(nav);
  const list=document.createElement('ol');for(const item of music[kind].slice(0,MUSIC_SLOTS)){const row=document.createElement('li'),link=document.createElement(item.url?'a':'span'),title=document.createElement('span');title.className='mp3-title';title.textContent=item.name;link.title=item.name;link.append(title);if(item.url){link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';}if(item.image){const image=document.createElement('img');image.src=item.image;image.alt='';image.loading='lazy';image.referrerPolicy='no-referrer';image.onerror=()=>image.remove();link.prepend(image);}row.append(link);list.append(row);}screen.append(list);
  if(!music[kind].length){const empty=document.createElement('p');empty.textContent=kind==='artists'?'No artists for this entry.':'No songs for this entry.';screen.append(empty);}
  if(music[kind].some(item=>item.url)){const attribution=document.createElement('a');attribution.className='spotify-attribution';attribution.href='https://open.spotify.com';attribution.target='_blank';attribution.rel='noopener noreferrer';attribution.innerHTML=`<img src="${base}book/spotify-logo.svg" alt="Spotify">`;screen.append(attribution);}
 }
 return {update(post){if(post?.id===id)return;id=post?.id;try{music=post?.music?validateMusic(post.music):{artists:[],songs:[]};}catch{music={artists:[],songs:[]};}render();}};
}


