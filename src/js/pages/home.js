// HOME: hero con lente de tinta, partículas, índice, teaser de música, mapa y reloj.
import { $, $$, reduced, finePointer, lerp, buzz, session } from '../util.js';
import { onFrame } from '../loop.js';
import { PLAYLISTS, cardHTML, renderFeatured, syncUI } from '../player.js';
import { bindMarquee } from '../fx.js';

let typedOnce = false;

export function init(root) {
  const off = []; // funciones de limpieza
  const on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); off.push(() => el.removeEventListener(ev, fn, opt)); };
  const firstVisit = session.get('jx-boot') !== '1';
  session.set('jx-boot', '1');
  const startDelay = firstVisit ? 1250 : 450;

  /* ---------- Título que se escribe solo ---------- */
  const h1 = $('[data-typing-text]', root);
  if (h1 && !reduced && !typedOnce) {
    typedOnce = true;
    const text = h1.dataset.typingText.replace('|', '\n');
    h1.setAttribute('aria-label', text.replace('\n', ' '));
    h1.textContent = ''; h1.classList.add('is-typing');
    let i = 0, tid;
    const step = () => {
      if (!h1.isConnected) return;
      h1.textContent += text[i]; i += 1;
      if (i < text.length) tid = setTimeout(step, text[i - 1] === '\n' ? 260 : 62);
      else setTimeout(() => h1.classList.remove('is-typing'), 1500);
    };
    tid = setTimeout(step, startDelay);
    off.push(() => clearTimeout(tid));
  }

  /* ---------- Lente de tinta ---------- */
  const hero = $('.hero', root), media = $('#heroMedia', root), move = $('.hero__move', root);
  let heroVisible = true;
  const hio = new IntersectionObserver((es) => { heroVisible = es[0].isIntersecting; });
  hio.observe(hero); off.push(() => hio.disconnect());
  const TOUR = [[0.50, 0.50], [0.40, 0.56], [0.47, 0.57], [0.59, 0.59], [0.50, 0.64], [0.497, 0.76], [0.497, 0.88]];
  const relToPx = (rx, ry) => {
    const w = media.clientWidth, h = media.clientHeight, D = Math.max(w, h);
    const px = (w - D) * 0.5 + rx * D, py = (h - D) * 0.3 + ry * D;
    return [w / 2 + (px - w / 2) * 1.06, h / 2 + (py - h / 2) * 1.06];
  };
  const lens = { x: -999, y: -999, r: 0, tx: -999, ty: -999, tr: 0 };
  let mode = 'idle', tourStart = 0, lastUser = 0, hinted = false;
  const baseR = () => Math.min(media.clientWidth, media.clientHeight) * (innerWidth < 900 ? 0.19 : 0.15);
  const userLens = (x, y) => {
    const r = media.getBoundingClientRect();
    lens.tx = x - r.left; lens.ty = y - r.top; lens.tr = baseR();
    if (mode !== 'user') { lens.x = lens.tx; lens.y = lens.ty; }
    mode = 'user'; lastUser = performance.now();
    hero.classList.add('has-lens'); $('#heroHint', root).classList.remove('is-on');
  };
  if (!reduced) {
    on(hero, 'pointermove', (e) => { if (e.pointerType === 'mouse') userLens(e.clientX, e.clientY); });
    on(hero, 'pointerleave', (e) => { if (e.pointerType === 'mouse') { lens.tr = 0; lastUser = performance.now(); } });
    on(hero, 'touchstart', (e) => { if (!e.target.closest('a,button')) userLens(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    on(hero, 'touchmove', (e) => userLens(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    on(hero, 'touchend', () => { lens.tr = 0; lastUser = performance.now(); }, { passive: true });
    const t0 = setTimeout(() => { if (mode === 'idle') { mode = 'tour'; tourStart = performance.now(); } }, startDelay + 1900);
    off.push(() => clearTimeout(t0));
  }
  const updateLens = (t, beat) => {
    if (mode === 'tour') {
      const p = Math.max(0, (t - tourStart) / 5200);
      if (p >= 1) {
        mode = 'idle'; lens.tr = 0;
        if (!hinted) {
          hinted = true;
          const hint = $('#heroHint', root);
          hint.textContent = finePointer ? 'Mueve el cursor sobre la foto' : 'Desliza el dedo sobre la foto';
          hint.classList.add('is-on'); setTimeout(() => hint.classList.remove('is-on'), 3200);
        }
      } else {
        const seg = p * (TOUR.length - 1), i = Math.min(Math.floor(seg), TOUR.length - 2), f = seg - i, e = f * f * (3 - 2 * f);
        [lens.tx, lens.ty] = relToPx(lerp(TOUR[i][0], TOUR[i + 1][0], e), lerp(TOUR[i][1], TOUR[i + 1][1], e));
        lens.tr = baseR() * (p < 0.08 ? p / 0.08 : p > 0.92 ? (1 - p) / 0.08 : 1);
        if (lens.x < -500) { lens.x = lens.tx; lens.y = lens.ty; }
        hero.classList.add('has-lens');
      }
    } else if (mode === 'user' && t - lastUser > 5000 && lens.tr === 0) mode = 'idle';
    else if (mode === 'idle' && t - Math.max(lastUser, tourStart) > 14000 && !hero.classList.contains('is-ink') && tourStart) { mode = 'tour'; tourStart = t; }
    const k = mode === 'user' ? 0.35 : 0.2;
    lens.x = lerp(lens.x, lens.tx, k); lens.y = lerp(lens.y, lens.ty, k);
    lens.r = lerp(lens.r, lens.tr * (1 + beat * 0.12), 0.18);
    if (lens.r < 0.5 && lens.tr === 0) hero.classList.remove('has-lens');
    media.style.setProperty('--lx', `${lens.x.toFixed(1)}px`);
    media.style.setProperty('--ly', `${lens.y.toFixed(1)}px`);
    media.style.setProperty('--lr', `${lens.r.toFixed(1)}px`);
  };
  on($('#inkToggle', root), 'click', (e) => {
    const b = e.currentTarget, isOn = !hero.classList.contains('is-ink');
    hero.classList.toggle('is-ink', isOn);
    b.setAttribute('aria-pressed', String(isOn));
    b.lastChild.textContent = isOn ? 'Ocultar tinta' : 'Revelar tinta';
    buzz(isOn ? [10, 40, 10] : 8);
  });
  if (finePointer && !reduced) on(hero, 'pointermove', (e) => {
    move.style.setProperty('--px', `${(-(e.clientX / innerWidth - 0.5) * 18).toFixed(1)}px`);
    move.style.setProperty('--py', `${(-(e.clientY / innerHeight - 0.5) * 12).toFixed(1)}px`);
  });

  /* ---------- Partículas de escenario ---------- */
  const fx = $('#heroFx', root), fctx = fx.getContext('2d');
  const parts = []; let fw = 0, fh = 0;
  const spawn = (any) => ({ x: Math.random() * fw, y: any ? Math.random() * fh : fh + 10, r: 0.6 + Math.random() * 1.8, v: 0.12 + Math.random() * 0.45, d: Math.random() * 6.28, a: 0.2 + Math.random() * 0.55, hot: Math.random() < 0.3 });
  const sizeFx = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    fw = fx.clientWidth; fh = fx.clientHeight; fx.width = fw * dpr; fx.height = fh * dpr;
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    parts.length = 0;
    for (let i = 0, n = reduced ? 0 : fw < 600 ? 30 : 60; i < n; i++) parts.push(spawn(true));
  };
  const sprite = document.createElement('canvas'); sprite.width = sprite.height = 32;
  { const g = sprite.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,220,180,1)'); gr.addColorStop(0.3, 'rgba(233,155,99,.6)'); gr.addColorStop(1, 'rgba(201,122,69,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }
  sizeFx(); on(window, 'resize', sizeFx);
  const drawFx = (t, beat) => {
    fctx.clearRect(0, 0, fw, fh);
    const boost = 1 + beat * 3;
    for (const p of parts) {
      p.y -= p.v * boost; p.x += Math.sin(t / 1400 + p.d) * 0.25;
      if (p.y < -10) Object.assign(p, spawn(false));
      const s = p.r * (p.hot ? 7 : 5) * (1 + beat * 0.6);
      fctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(t / 500 + p.d * 3)) * Math.min(1, p.y / fh / 0.15);
      fctx.drawImage(sprite, p.x - s / 2, p.y - s / 2, s, s);
    }
    fctx.globalAlpha = 1;
  };
  off.push(onFrame((t, s) => {
    if (!heroVisible) return;
    hero.style.setProperty('--beat', s.beat.toFixed(3));
    if (!reduced) { updateLens(t, s.beat); drawFx(t, s.beat); }
  }));

  /* ---------- Índice: imagen flotante que sigue al cursor ---------- */
  const float = $('#indexFloat', root);
  if (finePointer && float) {
    const idx = $('#index', root); const fp = { x: 0, y: 0, tx: 0, ty: 0 };
    on(idx, 'pointermove', (e) => { fp.tx = e.clientX; fp.ty = e.clientY; });
    on(idx, 'pointerover', (e) => {
      const row = e.target.closest('.index__row'); if (!row) return;
      float.classList.add('is-on');
      $$('img', float).forEach((img) => img.classList.toggle('is-on', img.dataset.k === row.dataset.img));
    });
    on(idx, 'pointerleave', () => float.classList.remove('is-on'));
    off.push(onFrame(() => {
      fp.x = lerp(fp.x || fp.tx, fp.tx, 0.12); fp.y = lerp(fp.y || fp.ty, fp.ty, 0.12);
      float.style.left = `${fp.x}px`; float.style.top = `${fp.y}px`;
    }));
  }

  /* ---------- Teaser de música ---------- */
  renderFeatured($('#featured', root));
  const picks = PLAYLISTS.map((p, i) => [p, i]).filter(([p]) => !p.featured && p.cover).slice(0, 10);
  $('#teaserRail', root).innerHTML = picks.map(([p, i]) => cardHTML(p, i)).join('');
  syncUI();

  /* ---------- Servicios: brillo que sigue al cursor ---------- */
  if (finePointer) $$('.service', root).forEach((s) => on(s, 'pointermove', (e) => {
    const r = s.getBoundingClientRect();
    s.style.setProperty('--mx', `${e.clientX - r.left}px`); s.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));

  /* ---------- Mapa + reloj ---------- */
  const sec = $('#ubicacion', root);
  const mio = new IntersectionObserver((es) => { if (es[0].isIntersecting) { sec.classList.add('is-in'); mio.disconnect(); } }, { threshold: 0.2 });
  mio.observe(sec); off.push(() => mio.disconnect());
  const setCity = (c) => {
    $$('.map__pin', sec).forEach((p) => p.classList.toggle('is-active', p.dataset.city === c));
    $$('.place', sec).forEach((p) => p.classList.toggle('is-active', p.dataset.city === c));
  };
  setCity('lima');
  $$('.map__pin', sec).forEach((pin) => on(pin, 'click', () => { setCity(pin.dataset.city); buzz(6); }));
  $$('.place', sec).forEach((pl) => on(pl, 'pointerenter', () => setCity(pl.dataset.city)));
  const fmt = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const hourFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Lima', hour: 'numeric', hour12: false });
  const statusOf = (h) => (h < 6 ? ['Probablemente durmiendo', '#9AA0A6'] : h < 12 ? ['Mañana productiva', '#6FAE8C'] : h < 19 ? ['En modo creación', '#E99B63'] : ['Editando de noche', '#7EA8D8']);
  const tick = () => {
    const now = new Date();
    $('#clockTime', root).textContent = fmt.format(now);
    const [label, color] = statusOf(+hourFmt.format(now) % 24);
    $('#clockStatus', root).innerHTML = `<i style="background:${color};box-shadow:0 0 10px ${color}"></i>${label}`;
  };
  tick(); const iv = setInterval(tick, 1000); off.push(() => clearInterval(iv));

  bindMarquee(root);
  return () => { off.forEach((f) => f()); bindMarquee(null); };
}
