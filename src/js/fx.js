// Efectos globales: header, menú, revelados, títulos, cursor, magnetismo, marquee, modo concierto.
import { $, $$, reduced, finePointer, lerp, buzz, toast } from './util.js';
import { onFrame, state } from './loop.js';
import { play, FEATURED } from './player.js';

/* ---------- Header: se oculta al bajar, aparece al subir ---------- */
const bar = $('#topbar');
let lastY = scrollY;
addEventListener('scroll', () => {
  const y = scrollY, d = y - lastY;
  bar.classList.toggle('is-solid', y > 40);
  if (d > 6 && y > innerHeight * 0.5 && !document.body.classList.contains('menu-open')) { bar.classList.add('is-hidden'); document.body.classList.add('is-scrolling-down'); }
  else if (d < -6) { bar.classList.remove('is-hidden'); document.body.classList.remove('is-scrolling-down'); }
  lastY = y;
}, { passive: true });

/* ---------- Progreso ---------- */
const prog = $('.progress');
onFrame(() => {
  const max = document.documentElement.scrollHeight - innerHeight;
  prog.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
});

/* ---------- Menú fullscreen ---------- */
const menuBtn = $('#menuBtn'), menu = $('#menu');
export function setMenu(open) {
  document.body.classList.toggle('menu-open', open);
  document.body.classList.toggle('is-locked', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-hidden', String(!open));
  if (open) { bar.classList.remove('is-hidden'); setTimeout(() => $('.menu__links a', menu)?.focus({ preventScroll: true }), 500); }
}
menuBtn.addEventListener('click', () => { setMenu(!document.body.classList.contains('menu-open')); buzz(6); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false); });
{
  const fmt = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false });
  const tick = () => { $('#menuClock').textContent = `${fmt.format(new Date())} PE`; };
  tick(); setInterval(tick, 20000);
}
export function setCurrentNav(path) {
  $$('.menu__links a, .tabbar a').forEach((a) => (a.getAttribute('href') === path ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
}

/* ---------- Revelado + títulos por palabras (se re-escanea en cada página) ---------- */
const revealIO = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('is-visible', 'is-in'); revealIO.unobserve(e.target); }
}), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
function splitWords(h) {
  let wi = 0;
  const walk = (node) => [...node.childNodes].forEach((n) => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.append(' '); return; }
        const w = document.createElement('span'); w.className = 'w';
        const s = document.createElement('span'); s.textContent = part; s.style.setProperty('--wi', wi++);
        w.append(s); frag.append(w);
      });
      n.replaceWith(frag);
    } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
  });
  h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
  walk(h); h.classList.add('split');
}
export function scan(root = document) {
  $$('.reveal, .reveal-card', root).forEach((el) => revealIO.observe(el));
  if (!reduced) $$('.section__head h2, .display, [data-split]', root).forEach((h) => { if (!h.classList.contains('split')) { splitWords(h); revealIO.observe(h); } });
  if (finePointer && !reduced) $$('[data-magnetic]', root).forEach(magnet);
}

/* ---------- Botones magnéticos ---------- */
function magnet(b) {
  if (b.dataset.mag) return; b.dataset.mag = '1';
  b.addEventListener('pointermove', (e) => {
    const r = b.getBoundingClientRect();
    b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px, ${(e.clientY - r.top - r.height / 2) * 0.32}px)`;
  });
  b.addEventListener('pointerleave', () => { b.style.transform = ''; });
}

/* ---------- Cursor ---------- */
if (finePointer && !reduced) {
  document.body.classList.add('has-cursor');
  const el = $('#cursor'), ring = $('.cursor__ring', el), dot = $('.cursor__dot', el), label = $('#cursorLabel');
  const c = { x: innerWidth / 2, y: innerHeight / 2, rx: innerWidth / 2, ry: innerHeight / 2 };
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    c.x = e.clientX; c.y = e.clientY;
    dot.style.transform = `translate(${c.x}px, ${c.y}px)`;
  }, { passive: true });
  document.addEventListener('pointerover', (e) => {
    const lab = e.target.closest('[data-cursor]');
    const hov = e.target.closest('a, button, input, .map__pin, [role="button"], .compare');
    el.classList.toggle('is-label', !!lab);
    el.classList.toggle('is-hover', !lab && !!hov);
    label.textContent = lab ? lab.dataset.cursor : '';
    el.classList.toggle('is-hidden', !!e.target.closest('iframe, .chat, .island'));
  });
  document.addEventListener('pointerleave', () => el.classList.add('is-hidden'));
  document.addEventListener('pointerenter', () => el.classList.remove('is-hidden'));
  onFrame((t, s) => {
    c.rx = lerp(c.rx, c.x, 0.2); c.ry = lerp(c.ry, c.y, 0.2);
    ring.style.transform = `translate(${c.rx}px, ${c.ry}px) scale(${1 + s.beat * 0.25})`;
  });
}

/* ---------- Marquee reacciona a la velocidad del scroll ---------- */
let mq = null, mqRate = 1;
export function bindMarquee(root) { mq = root ? ($('.marquee__track', root)?.getAnimations?.()[0] || null) : null; }
onFrame((t, s) => {
  if (!mq) return;
  mqRate = lerp(mqRate, 1 + Math.min(Math.abs(s.scrollVel) / 5, 6), 0.08);
  mq.playbackRate = mqRate;
});

/* ---------- Isla brilla con el beat ---------- */
const island = $('#island');
onFrame((t, s) => { if (island.classList.contains('is-playing')) island.style.setProperty('--beat', s.beat.toFixed(3)); });

/* ---------- Modo concierto: toca el logo 3 veces ---------- */
{
  const mark = $('.mark');
  let taps = 0, tapT, offT;
  const confetti = () => {
    const r = mark.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const glyphs = ['✦', '✧', '♪', '♫'], colors = ['#E99B63', '#6FAE8C', '#7EA8D8', '#FF5A8C', '#EDEAE3'];
    for (let i = 0; i < 30; i++) {
      const s = document.createElement('span');
      s.className = 'confetti'; s.textContent = glyphs[i % 4];
      s.style.left = `${cx}px`; s.style.top = `${cy}px`; s.style.color = colors[i % 5];
      document.body.append(s);
      const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 260;
      s.animate([
        { transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 180}px)) scale(${0.8 + Math.random()}) rotate(${Math.random() * 720 - 360}deg)`, opacity: 0 },
      ], { duration: 1200 + Math.random() * 800, easing: 'cubic-bezier(.16,1,.3,1)' }).onfinish = () => s.remove();
    }
  };
  const setConcert = (on) => {
    document.body.classList.toggle('concert', on);
    clearTimeout(offT);
    if (on) { toast('Modo concierto activado ✦'); if (!reduced) confetti(); buzz([20, 60, 20, 60, 40]); play(FEATURED); offT = setTimeout(() => setConcert(false), 30000); }
    else toast('Modo concierto apagado');
  };
  mark.addEventListener('click', (e) => {
    taps += 1;
    mark.classList.remove('is-tapped'); void mark.offsetWidth; mark.classList.add('is-tapped');
    clearTimeout(tapT); tapT = setTimeout(() => { taps = 0; }, 650);
    if (taps >= 2) e.preventDefault(); // evita navegar mientras cuentas toques
    if (taps >= 3) { taps = 0; setConcert(!document.body.classList.contains('concert')); }
  });
}
export { state };
