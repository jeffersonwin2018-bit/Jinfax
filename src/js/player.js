// Biblioteca + motor de audio (adelantos con análisis real si hay CORS) + reproductor inmersivo + mini player.
import { PLAYLISTS, MOODS } from './library.js';
import { $, $$, reduced, lerp, clamp, buzz, escapeHTML, hueOf } from './util.js';
import { onFrame, addBeatSource, state } from './loop.js';

export { PLAYLISTS };
export const moodLabel = (id) => MOODS.find((m) => m.id === id)?.label ?? '';
export const FEATURED = PLAYLISTS.findIndex((p) => p.featured);
const spotifyUrl = (p) => `https://open.spotify.com/playlist/${p.id}`;

/* ---------- Portadas y color ---------- */
export const coverHTML = (p, size = 's', eager = false) => p.cover
  ? `<img src="${p.cover[size]}" alt="" ${eager ? '' : 'loading="lazy"'} decoding="async" onload="this.classList.add('is-loaded')">`
  : `<span class="gen-cover" style="--h:${hueOf(p.name)}">${escapeHTML(p.name)}</span>`;

export const cardHTML = (p, i, extra = '') => `
  <li class="card${p.preview ? '' : ' no-preview'}${extra}" data-index="${i}" data-mood="${p.mood}" style="--i:${i}">
    <button class="card__btn" type="button" aria-label="Abrir ${escapeHTML(p.name)}" data-cursor="PLAY">
      <div class="card__art">${coverHTML(p)}</div>
      <div class="card__name">${escapeHTML(p.name)}</div>
      <div class="card__mood">${moodLabel(p.mood)}</div>
    </button>
    <span class="card__play" role="button" tabindex="-1" aria-hidden="true"><svg><use href="#i-${p.preview ? 'play' : 'spotify'}"/></svg></span>
  </li>`;

// Fila de lista (estilo "Tu biblioteca" de Spotify). Usa las mismas clases que .card → mismo click y syncUI.
export const rowHTML = (p, i, n = 0) => `
  <li class="card card--row${p.preview ? '' : ' no-preview'}" data-index="${i}" data-mood="${p.mood}" style="--i:${n}">
    <button class="card__btn" type="button" aria-label="Abrir ${escapeHTML(p.name)}">
      <span class="card__n" aria-hidden="true">${n + 1}</span>
      <div class="card__art">${coverHTML(p)}</div>
      <span class="card__text"><span class="card__name">${escapeHTML(p.name)}</span><span class="card__mood">${p.preview ? '<i class="card__badge">30 s</i>' : ''}Playlist · ${moodLabel(p.mood)}${p.desc ? ` · ${escapeHTML(p.desc)}` : ''}</span></span>
    </button>
    <span class="card__play" role="button" tabindex="-1" aria-hidden="true"><svg><use href="#i-${p.preview ? 'play' : 'spotify'}"/></svg></span>
  </li>`;

// Acceso rápido 2 columnas (portada pequeña + nombre), como el inicio de Spotify
export const tileHTML = (p, i) => `
  <li class="card card--tile${p.preview ? '' : ' no-preview'}" data-index="${i}" data-mood="${p.mood}">
    <button class="card__btn" type="button" aria-label="Abrir ${escapeHTML(p.name)}">
      <div class="card__art">${coverHTML(p)}</div>
      <span class="card__name">${escapeHTML(p.name)}</span>
    </button>
    <span class="card__play" role="button" tabindex="-1" aria-hidden="true"><svg><use href="#i-${p.preview ? 'play' : 'spotify'}"/></svg></span>
  </li>`;

const tintCache = new Map();
const hsl = (h, s, l) => {
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return `${f(0)}, ${f(8)}, ${f(4)}`;
};
const toTint = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  let h = 0; const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return hsl(Math.round(h * 60 + 360) % 360, Math.max(s, 0.35), clamp(l, 0.16, 0.32));
};
export function getTint(p) {
  if (tintCache.has(p.id)) return Promise.resolve(tintCache.get(p.id));
  const done = (t) => { tintCache.set(p.id, t); return t; };
  const fb = () => done(hsl(hueOf(p.name), 0.45, 0.26));
  if (!p.cover) return Promise.resolve(fb());
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = 24;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(img, 0, 0, 24, 24);
        const d = x.getImageData(0, 0, 24, 24).data;
        let r = 0, g = 0, b = 0, w = 0;
        for (let i = 0; i < d.length; i += 4) {
          const wt = 1 + (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2])) / 32;
          r += d[i] * wt; g += d[i + 1] * wt; b += d[i + 2] * wt; w += wt;
        }
        resolve(done(toTint(r / w, g / w, b / w)));
      } catch { resolve(fb()); }
    };
    img.onerror = () => resolve(fb());
    img.src = p.cover.s;
  });
}
const setTint = (t) => document.documentElement.style.setProperty('--tint', t);

/* ---------- Audio ---------- */
let actx = null, analyser = null, freq = null;
let audio, audioCors = true, connected = false, wantPlay = false;
let current = -1;
const failed = new Set();
export const isPlaying = () => current >= 0 && !audio.paused;

function ensureCtx() {
  if (!audioCors) return;
  if (actx) { actx.resume?.(); return; }
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = actx.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.78;
    freq = new Uint8Array(analyser.frequencyBinCount);
    analyser.connect(actx.destination);
  } catch { actx = null; analyser = null; }
}
function makeAudio(cors) {
  const a = new Audio();
  a.preload = 'none';
  if (cors) a.crossOrigin = 'anonymous';
  a.addEventListener('play', () => { if (a === audio) { dispatchEvent(new CustomEvent('jx:audio', { detail: 'preview' })); syncUI(); } });
  a.addEventListener('pause', () => a === audio && syncUI());
  a.addEventListener('playing', () => {
    if (a !== audio) return;
    if (audioCors && actx && !connected) { try { actx.createMediaElementSource(a).connect(analyser); connected = true; } catch { /* sin análisis */ } }
    actx?.resume?.();
  });
  a.addEventListener('timeupdate', () => {
    if (a !== audio) return;
    const pct = a.duration ? a.currentTime / a.duration : 0;
    if (sheetIndex === current) $('#sheetRing').style.strokeDashoffset = String(188.5 * (1 - pct));
    $('#miniBar').style.transform = `scaleX(${pct})`;
  });
  a.addEventListener('ended', () => {
    if (a !== audio) return;
    const j = nextWithPreview(current);
    if (j < 0) return;
    if (!sheet.hidden && sheetIndex === current) showInSheet(j, 1, true); else play(j);
  });
  a.addEventListener('error', () => {
    if (a !== audio || !a.src) return;
    if (audioCors) { // el CDN no permite CORS → reproducción simple, mismo tema
      const src = a.src;
      audioCors = false; audio = makeAudio(false); audio.src = src;
      if (wantPlay) audio.play().catch(() => {});
      return;
    }
    const p = PLAYLISTS[current]; if (!p) return;
    failed.add(p.id);
    if (sheetIndex === current) { $('#sheetHint').textContent = 'Adelanto no disponible'; $('#sheetPlay').disabled = true; }
    syncUI();
  });
  return a;
}
audio = makeAudio(true);

function play(i) {
  const p = PLAYLISTS[i];
  if (!p.preview || failed.has(p.id)) return;
  if (current !== i) { current = i; audio.src = p.preview; }
  ensureCtx();
  wantPlay = true;
  audio.play().catch(() => {});
  setMediaSession(p);
  buzz(8);
}
export function pause() { wantPlay = false; audio.pause(); }
export function togglePlay(i = current) {
  if (i < 0) return;
  if (current === i && !audio.paused) pause(); else play(i);
}
export { play };
function nextWithPreview(from, dir = 1) {
  for (let k = 1; k <= PLAYLISTS.length; k++) {
    const j = (from + dir * k + PLAYLISTS.length) % PLAYLISTS.length;
    if (PLAYLISTS[j].preview && !failed.has(PLAYLISTS[j].id)) return j;
  }
  return -1;
}
addEventListener('jx:audio', (e) => { if (e.detail !== 'preview' && isPlaying()) pause(); });

// Fuente de "beat" para todo el sitio
addBeatSource((t) => {
  if (!isPlaying()) return null;
  if (analyser && connected && audioCors) {
    analyser.getByteFrequencyData(freq);
    let bass = 0; for (let i = 1; i < 7; i++) bass += freq[i];
    return clamp((bass / (6 * 255) - 0.42) / 0.5, 0, 1) ** 1.6;
  }
  return Math.exp(-((t / 500) % 1) * 6);
});

function setMediaSession(p) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: p.name, artist: 'JinfaX', album: 'Biblioteca JinfaX',
    artwork: p.cover ? [{ src: p.cover.s, sizes: '300x300' }, { src: p.cover.l, sizes: '640x640' }] : [{ src: '/assets/img/icon-192.png', sizes: '192x192' }],
  });
  const nav = (dir) => { const j = nextWithPreview(current, dir); if (j >= 0) (sheet.hidden ? play(j) : showInSheet(j, dir, true)); };
  navigator.mediaSession.setActionHandler('play', () => play(current));
  navigator.mediaSession.setActionHandler('pause', pause);
  navigator.mediaSession.setActionHandler('nexttrack', () => nav(1));
  navigator.mediaSession.setActionHandler('previoustrack', () => nav(-1));
}

/* ---------- UI sincronizada ---------- */
const sheet = $('#sheet');
const mini = $('#mini');
let sheetIndex = -1, lastFocus = null, pushed = false;

export function syncUI() {
  const playing = isPlaying();
  $$('.card').forEach((c) => {
    const on = +c.dataset.index === current && playing;
    c.classList.toggle('is-playing', on);
    const use = $('.card__play use', c);
    if (use && PLAYLISTS[+c.dataset.index].preview) use.setAttribute('href', on ? '#i-pause' : '#i-play');
  });
  $$('[data-feat-play] use').forEach((u) => u.setAttribute('href', playing && current === FEATURED ? '#i-pause' : '#i-play'));
  const sp = playing && sheetIndex === current;
  sheet.classList.toggle('is-playing', sp);
  $('#sheetEq').classList.toggle('is-on', sp);
  $('#sheetPlay .play__icon use').setAttribute('href', sp ? '#i-pause' : '#i-play');
  $('#sheetPlay').setAttribute('aria-label', sp ? 'Pausar adelanto' : 'Escuchar adelanto');
  const showMini = current >= 0 && sheet.hidden && (playing || audio.currentTime > 0);
  mini.hidden = !showMini;
  document.body.classList.toggle('has-mini', showMini);
  if (current >= 0) {
    const p = PLAYLISTS[current];
    $('#miniTitle').textContent = p.name;
    if ($('#miniCover').dataset.id !== p.id) { $('#miniCover').innerHTML = coverHTML(p, 's', true); $('#miniCover').dataset.id = p.id; }
    $('#miniToggle use').setAttribute('href', playing ? '#i-pause' : '#i-play');
    $('#miniToggle').setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
    if (playing && sheet.hidden) getTint(p).then(setTint);
  }
}

/* ---------- Reproductor inmersivo ---------- */
function resetEmbed() {
  $('#sheetEmbedWrap').innerHTML = '<button class="btn btn--ghost btn--block" id="sheetEmbedBtn" type="button"><svg><use href="#i-spotify"/></svg>Ver canciones y escuchar completa</button>';
}
function showInSheet(i, dir = 0, autoplay = false) {
  const p = PLAYLISTS[i];
  sheetIndex = i;
  const cover = $('#sheetCover');
  cover.innerHTML = coverHTML(p, 'l', true);
  cover.classList.remove('slide-l', 'slide-r');
  if (dir && !reduced) { void cover.offsetWidth; cover.classList.add(dir > 0 ? 'slide-l' : 'slide-r'); }
  $('#sheetTitle').textContent = p.name;
  $('#sheetDesc').textContent = p.desc || '';
  $('#sheetMood').textContent = moodLabel(p.mood);
  $('#sheetCount').textContent = `${String(i + 1).padStart(2, '0')} / ${String(PLAYLISTS.length).padStart(2, '0')}`;
  $('#sheetOpen').href = spotifyUrl(p);
  const can = !!p.preview && !failed.has(p.id);
  $('#sheetPlay').disabled = !can;
  $('#sheetHint').textContent = can ? 'Adelanto de 30 s' : 'Sin adelanto · ábrela abajo';
  $('#sheetRing').style.strokeDashoffset = current === i && audio.duration ? String(188.5 * (1 - audio.currentTime / audio.duration)) : '188.5';
  $('#sheetBg').style.setProperty('--bg-img', p.cover ? `url("${p.cover.s}")` : 'none');
  resetEmbed();
  getTint(p).then((t) => { if (sheetIndex === i) setTint(t); });
  if (pushed) history.replaceState({ sheet: p.id }, '', `${location.pathname}#p/${p.id}`);
  if (autoplay) { if (can) play(i); } else if (isPlaying() && current !== i && can) play(i);
  syncUI();
  sizeViz();
}
export function openSheet(i) {
  lastFocus = document.activeElement;
  if (!pushed) { history.pushState({ sheet: PLAYLISTS[i].id }, '', `${location.pathname}#p/${PLAYLISTS[i].id}`); pushed = true; }
  sheet.hidden = false;
  sheet.classList.remove('is-closing');
  sheet.classList.add('is-open');
  document.body.classList.add('is-locked');
  showInSheet(i);
  setTimeout(() => $('#sheetClose').focus({ preventScroll: true }), 60);
}
function hideSheet() {
  if (sheet.hidden) return;
  const done = () => {
    sheet.hidden = true;
    sheet.classList.remove('is-open', 'is-closing');
    document.body.classList.remove('is-locked');
    resetEmbed(); syncUI();
    lastFocus?.focus?.({ preventScroll: true });
  };
  if (reduced) return done();
  sheet.classList.add('is-closing');
  setTimeout(done, 300);
}
export const sheetOpen = () => !sheet.hidden;
function closeSheet() { if (pushed) history.back(); else hideSheet(); }
addEventListener('popstate', () => {
  const m = location.hash.match(/^#p\/(\w+)/);
  if (m) { const i = PLAYLISTS.findIndex((p) => p.id === m[1]); if (i >= 0) { pushed = true; if (sheet.hidden) openSheet(i); else showInSheet(i); return; } }
  pushed = false; hideSheet();
});
const step = (dir) => showInSheet((sheetIndex + dir + PLAYLISTS.length) % PLAYLISTS.length, dir);
$('#sheetClose').addEventListener('click', closeSheet);
$('#sheetPrev').addEventListener('click', () => step(-1));
$('#sheetNext').addEventListener('click', () => step(1));
$('#sheetPlay').addEventListener('click', () => togglePlay(sheetIndex));
document.addEventListener('keydown', (e) => {
  if (sheet.hidden) return;
  if (e.key === 'Escape') closeSheet();
  else if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'ArrowLeft') step(-1);
  else if (e.key === ' ' && e.target === document.body) { e.preventDefault(); togglePlay(sheetIndex); }
  else if (e.key === 'Tab') {
    const f = $$('button:not([disabled]), a[href], iframe', sheet).filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  }
});
{
  const inner = $('#sheetInner');
  let sx = 0, sy = 0, tracking = false;
  inner.addEventListener('touchstart', (e) => { if (e.target.closest('iframe, .sheet__embed')) return; const t = e.touches[0]; sx = t.clientX; sy = t.clientY; tracking = true; }, { passive: true });
  inner.addEventListener('touchend', (e) => {
    if (!tracking) return; tracking = false;
    const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) { step(dx < 0 ? 1 : -1); buzz(6); }
    else if (dy > 110 && Math.abs(dy) > Math.abs(dx) * 1.4 && inner.scrollTop <= 0) closeSheet();
  }, { passive: true });
}
$('#sheetEmbedWrap').addEventListener('click', (e) => {
  if (!e.target.closest('#sheetEmbedBtn')) return;
  const p = PLAYLISTS[sheetIndex];
  pause();
  dispatchEvent(new CustomEvent('jx:audio', { detail: 'embed' }));
  $('#sheetEmbedWrap').innerHTML = `<iframe title="${escapeHTML(p.name)} en Spotify" src="https://open.spotify.com/embed/playlist/${p.id}?utm_source=generator&theme=0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
});
resetEmbed();
$('#miniOpen').addEventListener('click', () => current >= 0 && openSheet(current));
$('#miniToggle').addEventListener('click', () => togglePlay());

// Clicks en cualquier tarjeta de playlist (delegado: sirve en todas las páginas)
document.addEventListener('click', (e) => {
  const card = e.target.closest('.card[data-index]'); if (!card) return;
  const i = +card.dataset.index;
  if (e.target.closest('.card__play') && PLAYLISTS[i].preview) { togglePlay(i); return; }
  if (e.target.closest('.card__btn')) openSheet(i);
});

// Enlace directo /#p/<id>
export function openFromHash() {
  const m = location.hash.match(/^#p\/(\w+)/);
  const i = m ? PLAYLISTS.findIndex((p) => p.id === m[1]) : -1;
  if (i >= 0) { history.replaceState(null, '', location.pathname); setTimeout(() => openSheet(i), 900); }
}

/* ---------- Visualizador alrededor de la portada ---------- */
const viz = $('#sheetViz'), vctx = viz.getContext('2d');
let vizSize = 0;
function sizeViz() {
  const r = viz.getBoundingClientRect(); if (!r.width) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  vizSize = r.width; viz.width = r.width * dpr; viz.height = r.height * dpr;
  vctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', sizeViz);
const PER = 22, BARS = PER * 4, vals = new Float32Array(BARS);
onFrame((t) => {
  if (sheet.hidden || !sheet.classList.contains('is-playing') || !vizSize) return;
  const s = vizSize, half = s / 3, c = s / 2, x0 = c - half, y0 = c - half, side = half * 2;
  vctx.clearRect(0, 0, s, s);
  const real = analyser && connected && audioCors;
  if (real) analyser.getByteFrequencyData(freq);
  for (let i = 0; i < BARS; i++) {
    const k = i % PER, m = Math.min(k, PER - 1 - k);
    const v = real ? freq[2 + Math.floor((m / (PER / 2)) * 40) + (Math.floor(i / PER) % 2) * 6] / 255
      : 0.18 + 0.4 * Math.abs(Math.sin(t / 360 + i * 0.45)) * (0.55 + state.beat) + 0.12 * Math.sin(t / 150 + i * 1.3);
    vals[i] = lerp(vals[i], clamp(v, 0, 1), 0.35);
  }
  vctx.lineCap = 'round'; vctx.lineWidth = Math.max(2, s / 150);
  const gap = s * 0.022, maxLen = s * 0.075;
  for (let i = 0; i < BARS; i++) {
    const edge = Math.floor(i / PER), u = ((i % PER) + 0.5) / PER, len = 2 + vals[i] * maxLen;
    let x, y, dx = 0, dy = 0;
    if (edge === 0) { x = x0 + u * side; y = y0 - gap; dy = -1; }
    else if (edge === 1) { x = x0 + side + gap; y = y0 + u * side; dx = 1; }
    else if (edge === 2) { x = x0 + side - u * side; y = y0 + side + gap; dy = 1; }
    else { x = x0 - gap; y = y0 + side - u * side; dx = -1; }
    vctx.strokeStyle = `rgba(255,255,255,${0.22 + vals[i] * 0.65})`;
    vctx.beginPath(); vctx.moveTo(x, y); vctx.lineTo(x + dx * len, y + dy * len); vctx.stroke();
  }
});

/* ---------- Bloque "destacada" reutilizable ---------- */
export function renderFeatured(el) {
  if (!el) return;
  const p = PLAYLISTS[FEATURED];
  el.innerHTML = `
    <div class="featured__cover">${coverHTML(p, 'l', true)}</div>
    <div class="featured__body">
      <span class="featured__label"><i class="featured__dot"></i>Playlist destacada</span>
      <div class="featured__name">${escapeHTML(p.name)}</div>
      <span class="featured__meta">JinfaX · ${PLAYLISTS.length} playlists en la biblioteca</span>
      <span class="featured__actions">
        <span class="play-big" data-feat-play role="button" aria-label="Escuchar adelanto de ${escapeHTML(p.name)}"><svg><use href="#i-play"/></svg></span>
        <span class="featured__open">Abrir reproductor <svg><use href="#i-arrow"/></svg></span>
      </span>
    </div>`;
  el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', `Abrir ${p.name}`); el.dataset.cursor = 'PLAY';
  const go = () => openSheet(FEATURED);
  el.onclick = (e) => { if (e.target.closest('[data-feat-play]')) { togglePlay(FEATURED); e.stopPropagation(); } else go(); };
  el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
  getTint(p).then((t) => el.style.setProperty('--f-tint', t));
}
