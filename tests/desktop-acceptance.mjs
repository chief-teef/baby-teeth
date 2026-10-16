import {spawnSync} from 'node:child_process';
const base=process.env.STUDIO_URL||'http://127.0.0.1:5175/';
const suites=['desktop-pages','desktop-text','desktop-shell','desktop-reader','desktop-media-browser','desktop-integrated','auto-text-fit','text-image-studio','text-fonts','notebook-studio','reliability-browser','cloud-browser','drawing','browser'];
for(const suite of suites){const result=spawnSync(process.execPath,[`tests/${suite}.mjs`,base],{stdio:'inherit',env:{...process.env,STUDIO_URL:base,STUDIO_TEST_URL:new URL(base).origin}});if(result.status!==0)process.exit(result.status||1);}
console.log(`PASS ${suites.length} desktop/browser regression suites.`);
