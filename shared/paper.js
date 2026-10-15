export const PAPER_COLORS={cream:'#F6F2DC',blush:'#F9DFE8',mint:'#E3EDCF',blue:'#DDEBF0',lavender:'#EBE2F2'};
import './paper.css';
export function paperControl(root){
 const control=document.createElement('div');control.className='paper-control';
 const toggle=document.createElement('button');toggle.type='button';toggle.className='paper-chip';toggle.ariaLabel='Page color';toggle.setAttribute('aria-expanded','false');
 const palette=document.createElement('div');palette.className='paper-swatches';palette.setAttribute('popover','auto');palette.id='paper-'+crypto.randomUUID();palette.setAttribute('role','group');palette.ariaLabel='Page colors';toggle.setAttribute('popovertarget',palette.id);toggle.setAttribute('aria-controls',palette.id);
 let selected='cream';try{const saved=localStorage.getItem('bbyteeth-paper');if(PAPER_COLORS[saved])selected=saved;}catch{}
 const swatches=[];
 control.addEventListener('keydown',e=>{if(e.key.startsWith('Arrow'))e.stopPropagation();if(e.key==='Escape'&&palette.matches(':popover-open')){e.preventDefault();e.stopPropagation();palette.hidePopover();toggle.focus();}});
 function apply(){root.style.setProperty('--page-color',PAPER_COLORS[selected]);toggle.style.setProperty('--swatch',PAPER_COLORS[selected]);for(const swatch of swatches)swatch.setAttribute('aria-pressed',String(swatch.dataset.color===selected));}
 for(const [name,color] of Object.entries(PAPER_COLORS)){const b=document.createElement('button');b.type='button';b.className='paper-chip';b.dataset.color=name;b.ariaLabel=name+' paper';b.style.setProperty('--swatch',color);b.onclick=()=>{selected=name;apply();try{localStorage.setItem('bbyteeth-paper',selected);}catch{}palette.hidePopover();toggle.focus();};swatches.push(b);palette.append(b);}
 palette.addEventListener('beforetoggle',e=>{toggle.setAttribute('aria-expanded',String(e.newState==='open'));if(e.newState==='open'){const box=toggle.getBoundingClientRect();palette.style.left=Math.max(8,Math.min(box.left,innerWidth-248))+'px';palette.style.top=Math.max(8,box.top>64?box.top-60:box.bottom+8)+'px';}});
 palette.addEventListener('toggle',e=>{if(e.newState==='open')swatches.find(b=>b.dataset.color===selected).focus();});
 control.append(toggle,palette);apply();return control;
}
