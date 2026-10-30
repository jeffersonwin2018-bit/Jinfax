// Isla musical: "Les — Instrumental Slowed" (Fironn) vía Spotify IFrame API.
// Se carga de forma diferida (no afecta la velocidad inicial) y sigue sonando al cambiar de página.
import { $, buzz, toast } from './util.js';
import { addBeatSource } from './loop.js';

const TRACK = '1PCFkWkIq8IYxvF70RlA0E';
const island = $('#island'), pill = $('#islandPill'), playBtn = $('#islandPlay'), orb = $('#islandOrb');
let ctrl = null, ready = false, playing = false, pending = false, apiLoading = false, want = false;
let collapseT, fallbackT, lastPos = 0, lastDur = 0;

function loadApi() {
  if (apiLoading) return;
  apiLoading = true;
  window.onSpotifyIframeApiReady = (API) => {
    API.createController($('#islandEmbed'), { uri: `spotify:track:${TRACK}`, width: '100%', height: 80 }, (c) => {
      ctrl = c;
      c.addListener('ready', () => {
        ready = true;
        if (pending) { pending = false; c.togglePlay(); armFallback(); }
      });
      c.addListener('playback_update', (e) => {
        const d = e.data || {};
        const now = !d.isPaused && !d.isBuffering;
        if (now !== playing) {
          playing = now;
          island.classList.toggle('is-playing', playing);
          setIcons();
          if (playing) { dispatchEvent(new CustomEvent('jx:audio', { detail: 'island' })); island.classList.remove('needs-embed'); clearTimeout(fallbackT); }
        }
        lastPos = d.position || 0; lastDur = d.duration || lastDur;
        if (lastDur) $('#islandBar').style.setProperty('--p', String(Math.min(1, lastPos / lastDur)));
      });
    });
  };
  const s = document.createElement('script');
  s.src = 'https://open.spotify.com/embed/iframe-api/v1';
  s.async = true;
  s.onerror = () => { apiLoading = false; if (pending) { pending = false; toast('No se pudo cargar Spotify. Ábrelo en la app ↗'); } };
  document.head.append(s);
}

// Portada vía oEmbed de Spotify (si falla, queda el degradado cobre)
fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${TRACK}`)
  .then((r) => r.json()).then((d) => {
    if (!d.thumbnail_url) return;
    $('#islandCover').innerHTML = `<img src="${d.thumbnail_url}" alt="">`;
    orb.insertAdjacentHTML('afterbegin', `<img src="${d.thumbnail_url}" alt="">`);
  }).catch(() => {});

function setIcons() {
  const icon = playing ? '#i-pause' : '#i-play';
  playBtn.querySelector('use').setAttribute('href', icon);
  orb.querySelector('svg use').setAttribute('href', icon);
  orb.querySelector('svg').style.opacity = playing ? '0' : '1';
  playBtn.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
  pill.setAttribute('aria-label', playing ? 'Pausar Les — Instrumental Slowed' : 'Reproducir Les — Instrumental Slowed');
}
function armFallback() {
  clearTimeout(fallbackT);
  fallbackT = setTimeout(() => {
    if (want && !playing) { // el navegador bloqueó el autoplay del iframe → mostramos el reproductor para tocar play ahí
      island.classList.add('is-open', 'needs-embed');
      clearTimeout(collapseT);
    }
  }, 2600);
}
function expand(ms = 3800) {
  island.classList.add('is-open');
  clearTimeout(collapseT);
  if (ms) collapseT = setTimeout(collapse, ms);
}
function collapse() { if (!island.classList.contains('needs-embed')) island.classList.remove('is-open'); }

function toggle() {
  buzz(10);
  want = !playing;
  if (!ctrl || !ready) { pending = true; loadApi(); armFallback(); expand(0); return; }
  ctrl.togglePlay();
  if (want) armFallback();
}
pill.addEventListener('click', () => { toggle(); expand(); });
playBtn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); expand(); });
island.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && playing) expand(0); });
island.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') collapseT = setTimeout(collapse, 900); });
document.addEventListener('click', (e) => { if (!island.contains(e.target)) { island.classList.remove('needs-embed'); collapse(); } });
addEventListener('jx:audio', (e) => { if (e.detail !== 'island' && playing && ctrl) { want = false; ctrl.pause(); } });

// Precarga la API cuando el usuario interactúa por primera vez (así el primer toque suena al instante)
['pointerdown', 'scroll', 'keydown'].forEach((ev) => addEventListener(ev, () => setTimeout(loadApi, 600), { once: true, passive: true }));
setTimeout(() => ('requestIdleCallback' in window ? requestIdleCallback(loadApi) : loadApi()), 6000);

// Beat simulado (~70 bpm, ideal para slowed)
addBeatSource((t) => (playing ? Math.exp(-((t / 860) % 1) * 5) * 0.8 : null));
export const islandPlaying = () => playing;
