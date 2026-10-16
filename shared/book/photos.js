export function createPhotoViewer(root){
 const dialog=document.createElement('dialog');dialog.className='book-photo-viewer';dialog.ariaLabel='Photo viewer';
 const frame=document.createElement('div'),image=document.createElement('img'),controls=document.createElement('nav'),download=document.createElement('a'),close=document.createElement('button'),error=document.createElement('p');
 frame.className='photo-frame';controls.ariaLabel='Photo controls';download.className='photo-download';download.ariaLabel=download.title='Download photo';download.innerHTML='<span class="photo-download-icon" aria-hidden="true"></span>';
 close.ariaLabel=close.title='Close photo';close.innerHTML='<span class="pixel-control" style="--icon:1"></span>';error.textContent='This photo could not be opened. Try again or download it.';error.hidden=true;error.setAttribute('role','status');
 controls.append(download,close);frame.append(image,error,controls);dialog.append(frame);root.append(dialog);let opener,disposed=false;
 image.onerror=()=>{error.hidden=false;};close.onclick=()=>dialog.close();dialog.onclick=e=>{if(!e.target.closest('img,a,button'))dialog.close();};
 dialog.addEventListener('close',()=>{image.removeAttribute('src');if(!disposed)opener?.focus({preventScroll:true});});
 return {get open(){return dialog.open;},show(source){opener=source.closest('.notebook-photo');opener.tabIndex=0;image.alt=source.alt||'Entry photo';error.hidden=true;image.src=source.currentSrc||source.src;download.href=image.src;download.download=image.src.startsWith('data:')?(image.src.startsWith('data:image/png;')?'photo.png':'photo.jpg'):new URL(image.src).pathname.split('/').at(-1)||'photo.jpg';dialog.showModal();close.focus();},close(){if(dialog.open)dialog.close();},dispose(){disposed=true;dialog.close();dialog.remove();}};
}
