import {defineConfig} from 'vite';
import {spotifyUrl} from './shared/music.js';
import {spotifyPreview} from './worker/spotify.js';
// Local development only; deployed lookup remains authenticated in the Worker.
export default defineConfig({plugins:[{name:'local-spotify-preview',configureServer(server){server.middlewares.use('/api/spotify',async(req,res)=>{
 if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||req.method!=='GET'){res.statusCode=403;res.end();return;}
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');let link;
 try{link=spotifyUrl(new URL(req.url,'http://localhost').searchParams.get('url'));}catch(e){res.statusCode=400;res.end(JSON.stringify({error:e.message}));return;}
 try{res.end(JSON.stringify(await spotifyPreview(link)));}catch{res.statusCode=502;res.end(JSON.stringify({error:'Spotify preview unavailable. Enter the name manually or retry.'}));}
 });}}]});
