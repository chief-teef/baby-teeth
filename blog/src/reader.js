import {mountScrapbook} from '../../shared/scrapbook.js';
import '../../shared/scrapbook.css';
import {layoutReading} from '../../shared/reading-layout.js';
function layout(){document.querySelectorAll('.reader-entry:not([hidden]) [data-canvas]').forEach(layoutReading);}
window.addEventListener('resize',layout);window.addEventListener('load',layout);document.fonts?.ready.then(layout);layout();

document.querySelectorAll('[data-scrapbook]').forEach(root=>mountScrapbook(root,page=>page.querySelectorAll('[data-canvas]').forEach(layoutReading)));
