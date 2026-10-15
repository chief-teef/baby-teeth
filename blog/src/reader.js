import {mountBook} from '../../shared/book/scene.js';
import {layoutReading} from '../../shared/reading-layout.js';
const root=document.querySelector('[data-book]'),data=document.querySelector('#book-data');
if(root&&data&&!new URLSearchParams(location.search).has('reading')){
 try{const options=JSON.parse(data.textContent);window.bookScene=mountBook(root,options.posts,options);document.documentElement.classList.add('book-ready');}
 catch(error){document.documentElement.classList.remove('book-js');root.remove();console.error(error);}
}else{
 document.documentElement.classList.remove('book-js');
 const layout=()=>document.querySelectorAll('[data-canvas]').forEach(layoutReading);
 window.addEventListener('resize',layout);document.fonts.ready.then(layout);layout();
}
