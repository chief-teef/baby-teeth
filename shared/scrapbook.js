export function mountScrapbook(root, onShow = () => {}) {
  const pages = [...root.querySelectorAll('.reader-entry')];
  if (!pages.length) return;
  root.classList.add('scrapbook');
  const nav = document.createElement('nav');
  nav.className = 'scrapbook-nav';
  nav.setAttribute('aria-label', 'Scrapbook pages');
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  let index = pages.length - 1;
  const buttons = [];
  function show(next) {
    index = Math.max(0, Math.min(pages.length - 1, next));
    pages.forEach((page, position) => { page.hidden = position !== index; });
    const page = pages[index];
    status.textContent = `Page ${index + 1} of ${pages.length}`;
    buttons[0].disabled = buttons[1].disabled = index === 0;
    buttons[2].disabled = buttons[3].disabled = index === pages.length - 1;
    onShow(page);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      page.animate([{opacity:.4, transform:'perspective(1400px) rotateY(-12deg)'},{opacity:1,transform:'perspective(1400px) rotateY(0deg)'}], {duration:320,easing:'ease-out'});
    }
  }
  for (const [label, target] of [['First',()=>0],['Previous',()=>index-1],['Next',()=>index+1],['Last',()=>pages.length-1]]) {
    const button = document.createElement('button');
    button.textContent = label;
    button.onclick = () => show(target());
    buttons.push(button);
    nav.append(button);
  }
  nav.append(status);
  root.prepend(nav);
  show(index);
}
