import {spotifyUrl,spotifyImage} from '../shared/music.js';
import {limitedBody} from './security.js';
export async function spotifyPreview(value,fetcher=fetch){
 const url=spotifyUrl(value),response=await fetcher('https://open.spotify.com/oembed?url='+encodeURIComponent(url),{redirect:'error',signal:AbortSignal.timeout(7000)});
 if(!response.ok)throw Error('Spotify could not read that link. Enter the name manually.');
 const data=JSON.parse(new TextDecoder().decode(await limitedBody(response,32768)));
 if(typeof data?.title!=='string'||!data.title.trim())throw Error('Spotify returned no title. Enter the name manually.');
 let image=spotifyImage(data.thumbnail_url)?data.thumbnail_url:undefined;
 if(!image){
  try{
   const page=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(7000)});
   if(page.ok){const html=new TextDecoder().decode(await limitedBody(page,1048576)),candidate=html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1];if(spotifyImage(candidate))image=candidate;}
  }catch{/* Keep the linked title when Spotify artwork is unavailable. */}
 }
 return {name:data.title.trim().slice(0,160),url,...(image?{image}:{})};
}
