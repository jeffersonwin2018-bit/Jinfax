// MÚSICA: biblioteca estilo Spotify — accesos rápidos, estantes por vibra, lista/cuadrícula y artistas.
import { $, $$, reduced, finePointer, buzz, escapeHTML, local } from '../util.js';
import { PLAYLISTS, cardHTML, rowHTML, tileHTML, coverHTML, getTint, syncUI, play, openSheet, FEATURED, moodLabel } from '../player.js';
import { MOODS, ARTISTS, PROFILE_URL } from '../library.js';

const idx = PLAYLISTS.map((p, i) => [p, i]);
const inMood = (m) => idx.filter(([p]) => m === 'all' || p.mood === m);

export function init(root) {
  const off = [];
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); off.push(() => el.removeEventListener(ev, fn, o)); };
  const withPrev = PLAYLISTS.filter((p) => p.preview).length;

  /* ---------- Cabecera tipo playlist ---------- */
  const feat = PLAYLISTS[FEATURED];
  $('#libCover', root).innerHTML = `<div class="mosaic">${idx.filter(([p]) => p.cover).slice(0, 4).map(([p]) => coverHTML(p, 'l', true)).join('')}</div>`;
  $('#libStats', root).innerHTML = `<span class="by"><img src="/assets/img/logo.webp" alt="" width="20" height="26"><b>JinfaX</b></span><span>${PLAYLISTS.length} playlists · ${ARTISTS.length} artistas · ${withPrev} con adelanto</span>`;
  $('#profileLink', root).href = PROFILE_URL; $('#profileLink2', root).href = PROFILE_URL;
  getTint(feat).then((t) => root.isConnected && $('#libHero', root).style.setProperty('--h-tint', t));
  const randomWithPreview = () => { const c = idx.filter(([p]) => p.preview); return c[Math.floor(Math.random() * c.length)][1]; };
  on($('#libPlay', root), 'click', () => { play(randomWithPreview()); buzz([8, 30, 8]); });
  on($('#libShuffle', root), 'click', () => openSheet(Math.floor(Math.random() * PLAYLISTS.length)));

  /* ---------- Inicio: accesos rápidos + estantes ---------- */
  $('#quick', root).innerHTML = idx.filter(([p]) => p.cover && !p.featured).slice(0, 6).map(([p, i]) => tileHTML(p, i)).join('');
  $('#shelves', root).innerHTML = MOODS.filter((m) => m.id !== 'all').map((m) => {
    const items = inMood(m.id);
    return `<div class="shelf">
      <div class="shelf__head"><div><h3>${m.label}</h3><p>${items.length} playlist${items.length === 1 ? '' : 's'}</p></div>${items.length > 2 ? `<button class="shelf__more" type="button" data-mood-go="${m.id}">Mostrar todo</button>` : ''}</div>
      <ul class="rail">${items.map(([p, i]) => cardHTML(p, i)).join('')}</ul>
    </div>`;
  }).join('');

  /* ---------- Filtro por vibra + vista lista/cuadrícula ---------- */
  const chips = $('#chips', root), home = $('#libHome', root), moodBox = $('#libMood', root), col = $('#collection', root), toggle = $('#viewToggle', root);
  let mood = 'all', view = local.get('jx-view') || (innerWidth < 900 ? 'list' : 'grid');
  chips.innerHTML = MOODS.map((m) => `<button class="chip" role="tab" type="button" data-mood="${m.id}" aria-selected="${m.id === 'all'}">${m.label}<small>${inMood(m.id).length}</small></button>`).join('');
  const render = () => {
    const items = inMood(mood);
    col.className = view === 'grid' ? 'grid' : 'tracklist';
    col.innerHTML = items.map(([p, i], n) => (view === 'grid' ? cardHTML(p, i, ' is-entering') : rowHTML(p, i, n))).join('');
    $$('.card', col).forEach((c, n) => { c.style.setProperty('--i', n); if (view === 'list') c.classList.add('is-entering'); });
    $$('button', toggle).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    syncUI();
  };
  const setMood = (m) => {
    if (m === mood) return;
    mood = m; buzz(6);
    $$('.chip', chips).forEach((c) => {
      const sel = c.dataset.mood === m; c.setAttribute('aria-selected', String(sel));
      if (sel) c.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    });
    const all = m === 'all';
    home.hidden = !all; moodBox.hidden = all; toggle.hidden = all;
    if (!all) {
      $('#moodTitle', root).textContent = moodLabel(m);
      const n = inMood(m).length, pv = inMood(m).filter(([p]) => p.preview).length;
      $('#moodMeta', root).textContent = `${n} playlist${n === 1 ? '' : 's'} · ${pv} con adelanto`;
      render();
    }
    const bar = $('.lib-bar', root);
    if (bar.getBoundingClientRect().top < 0) scrollTo({ top: scrollY + bar.getBoundingClientRect().top - 70, behavior: reduced ? 'auto' : 'smooth' });
  };
  on(chips, 'click', (e) => { const b = e.target.closest('.chip'); if (b) setMood(b.dataset.mood); });
  on(root, 'click', (e) => {
    const g = e.target.closest('[data-mood-go]'); if (g) { setMood(g.dataset.moodGo); return; }
    if (e.target.closest('[data-mood-reset]')) setMood('all');
  });
  on(toggle, 'click', (e) => {
    const b = e.target.closest('[data-view]'); if (!b || b.dataset.view === view) return;
    view = b.dataset.view; local.set('jx-view', view); buzz(6); render();
  });

  /* ---------- Tilt 3D en escritorio ---------- */
  if (finePointer && !reduced) {
    on(root, 'pointermove', (e) => {
      const art = e.target.closest('.card:not(.card--row):not(.card--tile) .card__art'); if (!art) return;
      const r = art.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      art.style.setProperty('--ry', `${(x - 0.5) * 12}deg`); art.style.setProperty('--rx', `${(0.5 - y) * 12}deg`);
      art.style.setProperty('--mx', `${x * 100}%`); art.style.setProperty('--my', `${y * 100}%`);
    });
    on(root, 'pointerout', (e) => {
      const art = e.target.closest('.card__art');
      if (art && !art.contains(e.relatedTarget)) { art.style.setProperty('--rx', '0deg'); art.style.setProperty('--ry', '0deg'); }
    });
  }
  const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { PLAYLISTS.forEach(getTint); io.disconnect(); } }, { rootMargin: '300px' });
  io.observe($('#shelves', root)); off.push(() => io.disconnect());

  $('#artists', root).innerHTML = ARTISTS.map((a) => `
    <li class="artist${a.saved ? ' is-saved' : ''}"><a href="https://open.spotify.com/artist/${a.id}" target="_blank" rel="noopener" data-cursor="OPEN">
      <div class="artist__img"><img src="${a.img}" alt="" loading="lazy" decoding="async"></div>
      <div class="artist__name">${escapeHTML(a.name)}</div><div class="artist__role">Artista</div></a></li>`).join('');
  syncUI();
  return () => off.forEach((f) => f());
}
