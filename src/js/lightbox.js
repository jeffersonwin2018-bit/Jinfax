// Lightbox compartido (inspiración y memes): toque para ampliar, deslizar para cambiar.
import { $, buzz } from './util.js';

const box = $('#lightbox'), img = $('#lightboxImg'), cap = $('#lightboxCap');
let items = [], idx = 0, last = null;
function show(i) {
  idx = (i + items.length) % items.length;
  const it = items[idx];
  img.src = it.src; img.alt = it.titulo || '';
  cap.textContent = `${it.titulo || ''}  ${idx + 1}/${items.length}`;
  img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
}
export function openLightbox(list, i) {
  items = list; last = document.activeElement;
  box.hidden = false; document.body.classList.add('is-locked');
  show(i); $('#lightboxClose').focus({ preventScroll: true });
}
function close() { box.hidden = true; document.body.classList.remove('is-locked'); last?.focus?.({ preventScroll: true }); }
$('#lightboxClose').addEventListener('click', close);
$('#lightboxPrev').addEventListener('click', () => show(idx - 1));
$('#lightboxNext').addEventListener('click', () => show(idx + 1));
box.addEventListener('click', (e) => { if (e.target === box) close(); });
document.addEventListener('keydown', (e) => {
  if (box.hidden) return;
  if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') show(idx + 1); else if (e.key === 'ArrowLeft') show(idx - 1);
});
let sx = 0;
box.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
box.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) { show(idx + (dx < 0 ? 1 : -1)); buzz(5); } }, { passive: true });

export function renderMasonry(el, list) {
  el.innerHTML = list.map((it, i) => `<figure data-i="${i}" role="button" tabindex="0" aria-label="Ampliar ${it.titulo || 'imagen'}">
    <img src="${it.src}" alt="${it.titulo || ''}" width="${it.w || ''}" height="${it.h || ''}" loading="lazy" decoding="async" onload="this.classList.add('is-loaded')">
    ${it.titulo ? `<figcaption>${it.titulo}</figcaption>` : ''}</figure>`).join('');
  const open = (e) => { const f = e.target.closest('figure'); if (f) openLightbox(list, +f.dataset.i); };
  el.onclick = open;
  el.onkeydown = (e) => { if (e.key === 'Enter') open(e); };
}
