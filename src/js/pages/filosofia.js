// FILOSOFÍA estilo Spotify: frases como canciones, autores como artistas, lector a pantalla completa
// (como la vista de letras) y "compartir en mi estado" (imagen 1080×1920).
import { $, $$, getJSON, buzz, toast, escapeHTML, reduced, lerp, hueOf } from '../util.js';
import { onFrame } from '../loop.js';

let logoImg = null;
const loadLogo = () => logoImg || (logoImg = new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = '/assets/img/logo.png'; }));

function wrap(g, text, maxW) {
  const words = text.split(' '), lines = []; let line = '';
  for (const w of words) { const test = line ? `${line} ${w}` : w; if (g.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test; }
  if (line) lines.push(line);
  return lines;
}
async function storyImage(q) {
  await document.fonts?.load('700 80px "Space Grotesk"').catch(() => {});
  const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#0B0C0F'; g.fillRect(0, 0, W, H);
  const rg = g.createRadialGradient(W * 0.25, H * 0.3, 0, W * 0.25, H * 0.3, W * 1.1);
  rg.addColorStop(0, 'rgba(201,122,69,.35)'); rg.addColorStop(1, 'rgba(201,122,69,0)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`; g.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
  g.fillStyle = '#C97A45'; g.font = '400 30px "IBM Plex Mono", monospace'; g.fillText('// filosofía', 96, 300);
  let size = 92; g.font = `700 ${size}px "Space Grotesk", sans-serif`;
  let lines = wrap(g, `«${q.texto}»`, W - 192);
  while (lines.length > 8 && size > 56) { size -= 6; g.font = `700 ${size}px "Space Grotesk", sans-serif`; lines = wrap(g, `«${q.texto}»`, W - 192); }
  const lh = size * 1.08, top = H / 2 - (lines.length * lh) / 2;
  g.fillStyle = '#EDEAE3';
  lines.forEach((l, i) => g.fillText(l, 96, top + i * lh + size * 0.8));
  const y = top + lines.length * lh + 70;
  g.fillStyle = '#C97A45'; g.fillRect(96, y - 10, 60, 3);
  g.fillStyle = 'rgba(237,234,227,.75)'; g.font = '500 36px "Space Grotesk", sans-serif'; g.fillText(q.autor, 180, y);
  g.fillStyle = 'rgba(237,234,227,.4)'; g.font = '400 26px "IBM Plex Mono", monospace'; g.fillText(q.obra || '', 180, y + 46);
  const logo = await loadLogo();
  if (logo) { const lw = 90, lhh = lw * logo.height / logo.width; g.globalAlpha = 0.9; g.drawImage(logo, 96, H - 260, lw, lhh); g.globalAlpha = 1; }
  g.fillStyle = '#EDEAE3'; g.font = '700 40px "Space Grotesk", sans-serif'; g.fillText('JINFAX', 210, H - 190);
  g.fillStyle = 'rgba(237,234,227,.5)'; g.font = '400 26px "IBM Plex Mono", monospace'; g.fillText('jinfax.netlify.app/filosofia', 210, H - 148);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}
async function share(q) {
  buzz(10); toast('Creando tu imagen…', 1500);
  const blob = await storyImage(q);
  const file = new File([blob], 'jinfax-filosofia.png', { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text: `«${q.texto}» — ${q.autor}` }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'jinfax-filosofia.png';
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Imagen descargada: súbela a tu estado ✦', 3200);
}

export function init(root) {
  const off = [];
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); off.push(() => el.removeEventListener(ev, fn, o)); };
  const bg = $('#philoBg', root), list = $('#quotes', root), chips = $('#authorChips', root), reader = $('#reader', root);
  let quotes = [], view = [], author = 'all', cur = 0, auto = false, autoStart = 0;
  const initials = (n) => n.split(' ').filter((w) => /^[A-ZÁÉÍÓÚ]/.test(w)).slice(0, 2).map((w) => w[0]).join('');
  const AUTO_MS = 9000;

  const renderList = () => {
    view = quotes.map((q, i) => [q, i]).filter(([q]) => author === 'all' || q.autor === author);
    list.innerHTML = view.map(([q, i], n) => `
      <li class="qrow" data-n="${n}" style="--i:${n};--h:${hueOf(q.autor)}">
        <button class="qrow__btn" type="button" data-open="${n}" aria-label="Leer: ${escapeHTML(q.texto)}">
          <span class="qrow__n"><b>${n + 1}</b><svg><use href="#i-play"/></svg></span>
          <span class="qrow__avatar" aria-hidden="true">${initials(q.autor)}</span>
          <span class="qrow__text"><span class="qrow__q">«${escapeHTML(q.texto)}»</span><span class="qrow__a">${escapeHTML(q.autor)}</span></span>
          <span class="qrow__obra">${escapeHTML(q.obra || '')}</span>
        </button>
        <button class="qrow__share" type="button" data-share="${i}" aria-label="Compartir frase ${n + 1}"><svg><use href="#i-share"/></svg></button>
      </li>`).join('');
  };
  const setAuthor = (a) => {
    author = author === a ? 'all' : a; buzz(6);
    $$('.chip', chips).forEach((c) => {
      const sel = c.dataset.author === author; c.setAttribute('aria-selected', String(sel));
      if (sel) c.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    });
    $$('.artist', root).forEach((el) => el.classList.toggle('is-saved', el.dataset.author === author));
    renderList();
  };

  getJSON('/assets/data/filosofia.json').then((d) => {
    if (!root.isConnected) return;
    quotes = d.frases;
    const authors = [...new Set(quotes.map((q) => q.autor))].map((a) => [a, quotes.filter((q) => q.autor === a).length]).sort((x, y) => y[1] - x[1]);
    $('#philoStats', root).innerHTML = `<span class="by"><img src="/assets/img/logo.webp" alt="" width="20" height="26"><b>JinfaX</b></span><span>${quotes.length} frases · ${authors.length} autores · ${Math.ceil((quotes.length * 9) / 60)} min de lectura</span>`;
    chips.innerHTML = [['all', quotes.length], ...authors].map(([a, n]) => `<button class="chip" role="tab" type="button" data-author="${escapeHTML(a)}" aria-selected="${a === 'all'}">${a === 'all' ? 'Todas' : escapeHTML(a)}<small>${n}</small></button>`).join('');
    $('#authors', root).innerHTML = authors.map(([a, n]) => `
      <li class="artist" data-author="${escapeHTML(a)}"><button type="button" data-author="${escapeHTML(a)}">
        <div class="artist__img avatar-gen" style="--h:${hueOf(a)}"><span>${initials(a)}</span></div>
        <div class="artist__name">${escapeHTML(a)}</div><div class="artist__role">${n} frase${n === 1 ? '' : 's'}</div></button></li>`).join('');
    renderList();
  });

  /* ---------- Lector a pantalla completa (como la vista de letras) ---------- */
  const paint = (dir = 0) => {
    const [q, i] = view[cur];
    reader.style.setProperty('--h', hueOf(q.autor));
    $('#readerCount', root).textContent = `${String(cur + 1).padStart(2, '0')} / ${String(view.length).padStart(2, '0')}`;
    $('#readerTag', root).textContent = `// frase ${String(i + 1).padStart(2, '0')}`;
    const rq = $('#readerQ', root);
    rq.textContent = `«${q.texto}»`;
    rq.dataset.size = q.texto.length > 90 ? 's' : q.texto.length > 50 ? 'm' : 'l';
    $('#readerCite', root).innerHTML = `${escapeHTML(q.autor)}<small>${escapeHTML(q.obra || '')}</small>`;
    const st = $('#readerStage', root);
    st.classList.remove('in-l', 'in-r', 'in'); void st.offsetWidth;
    st.classList.add(dir > 0 ? 'in-l' : dir < 0 ? 'in-r' : 'in');
    $('#readerBar', root).style.transform = auto ? 'scaleX(0)' : `scaleX(${(cur + 1) / view.length})`;
    $$('.qrow', list).forEach((r) => r.classList.toggle('is-current', +r.dataset.n === cur));
    autoStart = performance.now();
  };
  const go = (dir) => { if (!view.length) return; cur = (cur + dir + view.length) % view.length; paint(dir); buzz(6); };
  const openReader = (n, playMode = false) => {
    if (!view.length) return;
    cur = n; auto = playMode && !reduced;
    reader.hidden = false; reader.classList.toggle('is-auto', auto);
    document.body.classList.add('is-locked');
    requestAnimationFrame(() => reader.classList.add('is-open'));
    paint();
    setTimeout(() => $('[data-r="close"]', reader).focus({ preventScroll: true }), 60);
  };
  const closeReader = () => {
    if (reader.hidden) return;
    auto = false; reader.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    setTimeout(() => { reader.hidden = true; }, reduced ? 0 : 320);
  };
  off.push(() => document.body.classList.remove('is-locked'));
  off.push(onFrame((t) => {
    if (!auto || reader.hidden) return;
    const p = Math.min(1, (t - autoStart) / AUTO_MS);
    $('#readerBar', root).style.transform = `scaleX(${p})`;
    if (p >= 1) go(1);
  }));
  const stopAuto = () => { if (auto) { auto = false; reader.classList.remove('is-auto'); } };
  on(reader, 'click', (e) => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    const r = b.dataset.r;
    if (r === 'close') closeReader();
    else if (r === 'next') { stopAuto(); go(1); }
    else if (r === 'prev') { stopAuto(); go(-1); }
    else if (r === 'share') { stopAuto(); share(view[cur][0]); }
    else if (r === 'copy') { const q = view[cur][0]; navigator.clipboard?.writeText(`«${q.texto}» — ${q.autor}`).then(() => toast('Frase copiada ✦'), () => {}); }
  });
  on(document, 'keydown', (e) => {
    if (reader.hidden) return;
    if (e.key === 'Escape') closeReader();
    else if (e.key === 'ArrowRight') { stopAuto(); go(1); }
    else if (e.key === 'ArrowLeft') { stopAuto(); go(-1); }
  });
  let sx = 0, sy = 0;
  on(reader, 'touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  on(reader, 'touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) { stopAuto(); go(dx < 0 ? 1 : -1); }
    else if (dy > 100 && Math.abs(dy) > Math.abs(dx) * 1.3) closeReader();
  }, { passive: true });

  on(list, 'click', (e) => {
    const s = e.target.closest('[data-share]'); if (s) { share(quotes[+s.dataset.share]); return; }
    const o = e.target.closest('[data-open]'); if (o) openReader(+o.dataset.open);
  });
  on(chips, 'click', (e) => { const b = e.target.closest('[data-author]'); if (b) setAuthor(b.dataset.author); });
  on($('#authors', root), 'click', (e) => {
    const b = e.target.closest('[data-author]'); if (!b) return;
    setAuthor(b.dataset.author);
    chips.closest('.section').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });
  on($('#philoRead', root), 'click', () => openReader(0, true));
  on($('#oracle', root), 'click', () => {
    if (!view.length) return;
    buzz([10, 30, 10]);
    openReader(Math.floor(Math.random() * view.length));
    toast('El oráculo eligió esta para ti ✦');
  });

  // La luz de fondo sigue al dedo/cursor
  const p = { x: 30, y: 30, tx: 30, ty: 30 };
  on(window, 'pointermove', (e) => { p.tx = (e.clientX / innerWidth) * 100; p.ty = (e.clientY / innerHeight) * 100; }, { passive: true });
  off.push(onFrame((t) => {
    p.x = lerp(p.x, p.tx + Math.sin(t / 3000) * 8, 0.04); p.y = lerp(p.y, p.ty + Math.cos(t / 3500) * 8, 0.04);
    bg.style.setProperty('--gx', `${p.x.toFixed(1)}%`); bg.style.setProperty('--gy', `${p.y.toFixed(1)}%`);
  }));
  document.body.classList.add('is-philo');
  off.push(() => document.body.classList.remove('is-philo'));
  return () => off.forEach((f) => f());
}
