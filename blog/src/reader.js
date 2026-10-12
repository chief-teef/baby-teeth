import {layoutReading} from '../../shared/reading-layout.js';
function layout(){document.querySelectorAll('[data-canvas]').forEach(layoutReading);}
window.addEventListener('resize',layout);window.addEventListener('load',layout);document.fonts?.ready.then(layout);layout();
