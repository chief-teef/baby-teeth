import {defineConfig} from 'astro/config';
import rawSettings from '../config/blog.json' with {type:'json'};
import {validateSettings} from '../shared/settings.js';
const settings=validateSettings(rawSettings);
const url=new URL(settings.publicUrl);
export default defineConfig({site:url.origin,base:url.pathname,publicDir:'../public',output:'static',outDir:'../dist-blog',build:{format:'directory'}});
