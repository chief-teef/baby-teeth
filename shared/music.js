export const MUSIC_SLOTS=3;
export const spotifyImage=value=>typeof value==='string'&&/^https:\/\/(i\.scdn\.co|image-cdn-fa\.spotifycdn\.com)\/image\/[a-f0-9]{20,80}$/.test(value);
export function spotifyUrl(value){
 if(typeof value!=='string'||value.length>2000)throw Error('Paste a Spotify artist or song link.');
 let url;try{url=new URL(value);}catch{throw Error('Paste a Spotify artist or song link.');}
 const path=url.pathname.replace(/^\/intl-[a-z]{2}(?=\/)/,'');
 if(url.origin!=='https://open.spotify.com'||url.username||url.password||!/^\/(artist|track)\/[A-Za-z0-9]{22}$/.test(path))throw Error('Paste a full open.spotify.com artist or song link.');
 return url.origin+path;
}
export function validateMusic(music){
 if(!music||typeof music!=='object'||Array.isArray(music))throw Error('Invalid music lists.');
 for(const kind of ['artists','songs']){
  // Keep older five-row documents recoverable; authoring/display use MUSIC_SLOTS.
  if(!Array.isArray(music[kind])||music[kind].length>5)throw Error('Use up to five artists and five songs.');
  for(const item of music[kind]){
   if(!item||typeof item.name!=='string'||!item.name.trim()||item.name.length>160)throw Error('Music names must be 1–160 characters.');
   if(item.url!==undefined&&(!spotifyUrl(item.url).includes('/'+(kind==='artists'?'artist':'track')+'/')))throw Error('Use an artist link for artists and a song link for songs.');
   if(item.image!==undefined&&(!item.url||!spotifyImage(item.image)))throw Error('Invalid Spotify artwork.');
  }
 }
 return {artists:music.artists.map(clean),songs:music.songs.map(clean)};
}
const clean=item=>({name:item.name.trim(),...(item.url?{url:spotifyUrl(item.url)}:{}),...(item.image?{image:item.image}:{})});
