// BAJE DE PEPA: app con pestañas — Reflejos, Memoria de portadas, Ruleta, memes y récords.
import { $, $$, buzz, toast, local, getJSON, escapeHTML } from '../util.js';
import { PLAYLISTS, coverHTML, openSheet, play } from '../player.js';
import { renderMasonry } from '../lightbox.js';

const SITE = `${location.origin}/baje-de-pepa/`;
async function shareText(text) {
  try { if (navigator.share) { await navigator.share({ text, url: SITE }); return; } } catch { return; }
  try { await navigator.clipboard.writeText(`${text} ${SITE}`); toast('Copiado. Pégalo donde quieras ✦'); } catch { toast(text); }
}

export function init(root) {
  const off = [];
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); off.push(() => el.removeEventListener(ev, fn, o)); };
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
  off.push(() => timers.forEach(clearTimeout));

  /* ---------- Pestañas (un juego por pantalla) + récords ---------- */
  const tabs = $('#gameTabs', root);
  const show = (id) => {
    $$('.chip', tabs).forEach((c) => {
      const sel = c.dataset.tab === id; c.setAttribute('aria-selected', String(sel));
      if (sel) c.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
    $$('[data-panel]', root).forEach((p) => { p.hidden = p.dataset.panel !== id; });
    buzz(6);
  };
  on(tabs, 'click', (e) => { const b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab); });
  on($('#bajePlay', root), 'click', () => {
    const ids = ['reflex', 'memory', 'wheel'], id = ids[Math.floor(Math.random() * ids.length)];
    show(id); tabs.closest('.section').scrollIntoView({ behavior: 'smooth' });
  });
  const paintRecords = () => {
    $('#recReflex', root).textContent = local.get('jx-reflex') ? `${local.get('jx-reflex')} ms` : '—';
    $('#recMemory', root).textContent = local.get('jx-mem') || '—';
    $('#recWheel', root).textContent = local.get('jx-wheel') || '—';
  };
  paintRecords();

  /* ---------- Reflejos ---------- */
  {
    const pad = $('#reflex', root), bestEl = $('#reflexBest', root), roundEl = $('#reflexRound', root), avgEl = $('#reflexAvg', root), shareBtn = $('#reflexShare', root);
    let st = 'idle', t0 = 0, times = [], waitT = null;
    const best = () => +local.get('jx-reflex') || 0;
    const paintBest = () => { bestEl.textContent = best() ? `Récord: ${best()} ms` : 'Récord: —'; };
    paintBest();
    const msg = (a, b) => { pad.innerHTML = `<div><strong>${a}</strong><small>${b}</small></div>`; };
    const rate = (ms) => (ms < 220 ? 'Reflejos de gamer pro 🔥' : ms < 280 ? 'Rapidísimo' : ms < 350 ? 'Nada mal' : '¿Te quedaste dormido? 😴');
    const arm = () => {
      st = 'wait'; pad.className = 'reflex is-wait'; msg('Espera…', 'Cuando se ponga cobre, toca.');
      waitT = later(() => { st = 'go'; pad.className = 'reflex is-go'; msg('¡YA!', ''); t0 = performance.now(); buzz(15); }, 1100 + Math.random() * 2400);
    };
    const hit = () => {
      if (st === 'idle' || st === 'done') { times = []; roundEl.textContent = '0'; avgEl.textContent = '—'; shareBtn.hidden = true; arm(); return; }
      if (st === 'wait') { clearTimeout(waitT); st = 'early'; pad.className = 'reflex is-early'; msg('¡Muy pronto!', 'Toca para repetir la ronda'); buzz([30, 40, 30]); return; }
      if (st === 'early') { arm(); return; }
      if (st === 'go') {
        const ms = Math.round(performance.now() - t0);
        times.push(ms); roundEl.textContent = String(times.length);
        avgEl.textContent = `${Math.round(times.reduce((a, b) => a + b, 0) / times.length)} ms`;
        if (times.length >= 5) {
          const avg = Math.round(times.reduce((a, b) => a + b, 0) / 5);
          const record = !best() || avg < best();
          if (record) local.set('jx-reflex', String(avg));
          paintBest(); paintRecords(); st = 'done'; pad.className = 'reflex';
          msg(`${avg} ms`, `${rate(avg)}${record ? ' · ¡Nuevo récord!' : ''} · Toca para jugar otra vez`);
          shareBtn.hidden = false; shareBtn.dataset.avg = String(avg);
          buzz(record ? [20, 50, 20, 50, 60] : 20);
        } else { st = 'between'; pad.className = 'reflex'; msg(`${ms} ms`, 'Toca para la siguiente ronda'); }
        return;
      }
      if (st === 'between') arm();
    };
    on(pad, 'pointerdown', (e) => { e.preventDefault(); hit(); });
    on(pad, 'keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hit(); } });
    on(shareBtn, 'click', () => shareText(`Hice ${shareBtn.dataset.avg} ms en Reflejos de JinfaX. ¿Me superas?`));
  }

  /* ---------- Memoria de portadas ---------- */
  {
    const board = $('#memory', root), stats = $('#memStats', root);
    let first = null, lock = false, moves = 0, found = 0, start = 0;
    const deal = () => {
      const pool = PLAYLISTS.filter((p) => p.cover).sort(() => Math.random() - 0.5).slice(0, 6);
      const cards = [...pool, ...pool].sort(() => Math.random() - 0.5);
      board.innerHTML = cards.map((p) => `<button class="mcard" type="button" data-id="${p.id}" aria-label="Carta oculta">
        <span class="mcard__in"><span class="mcard__f"><img src="/assets/img/logo.webp" alt=""></span><span class="mcard__b">${coverHTML(p, 's', true)}</span></span></button>`).join('');
      first = null; lock = false; moves = 0; found = 0; start = 0; stats.textContent = '0 movimientos';
    };
    deal();
    on(board, 'click', (e) => {
      const c = e.target.closest('.mcard');
      if (!c || lock || c === first || c.classList.contains('is-done')) return;
      if (!start) start = performance.now();
      c.classList.add('is-flip'); c.setAttribute('aria-label', PLAYLISTS.find((p) => p.id === c.dataset.id)?.name || 'Carta');
      buzz(5);
      if (!first) { first = c; return; }
      moves += 1; stats.textContent = `${moves} movimientos`;
      if (first.dataset.id === c.dataset.id) {
        first.classList.add('is-done'); c.classList.add('is-done'); first = null; found += 1; buzz(15);
        if (found === 6) {
          const s = Math.round((performance.now() - start) / 1000), prev = +local.get('jx-mem') || 0;
          if (!prev || moves < prev) local.set('jx-mem', String(moves));
          paintRecords();
          later(() => toast(`¡Completado en ${moves} movimientos y ${s} s!${!prev || moves < prev ? ' Nuevo récord ✦' : ''}`, 3500), 400);
        }
      } else {
        lock = true; const a = first; first = null;
        later(() => { a.classList.remove('is-flip'); c.classList.remove('is-flip'); a.setAttribute('aria-label', 'Carta oculta'); c.setAttribute('aria-label', 'Carta oculta'); lock = false; }, 800);
      }
    });
    on($('#memReset', root), 'click', deal);
  }

  /* ---------- Ruleta ---------- */
  {
    const idx = (id) => PLAYLISTS.findIndex((p) => p.id === id);
    const OPTS = [
      { t: 'Pon Liberty Life y baila', a: 'Abrir playlist', fn: () => openSheet(idx('5T126dtUMnYAG0BuUH7Q7d')) },
      { t: 'Lee una frase que te levante', a: 'Ir a Filosofía', href: '/filosofia/' },
      { t: 'Sal a tomar fotos', a: 'Ver ideas', href: '/inspiracion/' },
      { t: 'Edita un video de 15 segundos', a: 'Hoy toca crear' },
      { t: 'Escucha INVICTUS', a: 'Darle play', fn: () => play(idx('3KjrfDd2HlH7y7b3e8AJ3m')) },
      { t: 'Háblale a Fer AI', a: 'Abrir chat', fn: () => document.querySelector('#chatToggle').click() },
      { t: 'Supera tu récord de reflejos', a: 'Ir al juego', fn: () => show('reflex') },
      { t: 'Descansa con Calm My Dear Lady', a: 'Abrir playlist', fn: () => openSheet(idx('2EHR4tGrhCrxfy6jhFIw9R')) },
    ];
    const cv = $('#wheel', root), g = cv.getContext('2d'), N = OPTS.length, R = 320;
    const short = ['Liberty Life', 'Filosofía', 'Fotos', 'Editar', 'INVICTUS', 'Fer AI', 'Reflejos', 'Calma'];
    const drawWheel = () => {
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 640, 640);
      g.translate(R, R);
      for (let i = 0; i < N; i++) {
        const a0 = (i / N) * Math.PI * 2 - Math.PI / 2 - Math.PI / N, a1 = a0 + (Math.PI * 2) / N;
        g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, a0, a1); g.closePath();
        g.fillStyle = i % 2 ? '#1A1D23' : '#C97A45'; g.fill();
        g.strokeStyle = '#0B0C0F'; g.lineWidth = 3; g.stroke();
        const mid = (a0 + a1) / 2, flip = Math.cos(mid) < -0.01; // mitad izquierda: girar el texto para que no quede al revés
        g.save(); g.rotate(flip ? mid + Math.PI : mid); g.textAlign = flip ? 'left' : 'right'; g.fillStyle = i % 2 ? '#EDEAE3' : '#0B0C0F';
        g.font = '600 30px "Space Grotesk", sans-serif'; g.fillText(short[i], flip ? -(R - 26) : R - 26, 10); g.restore();
      }
      g.beginPath(); g.arc(0, 0, 46, 0, Math.PI * 2); g.fillStyle = '#0B0C0F'; g.fill();
      g.font = '700 22px "Space Grotesk", sans-serif'; g.fillStyle = '#E99B63'; g.textAlign = 'center'; g.fillText('JX', 0, 8);
    };
    (document.fonts?.load('600 30px "Space Grotesk"') || Promise.resolve()).catch(() => {}).finally(drawWheel);
    let rot = 0, spinning = false;
    const out = $('#wheelOut', root);
    on($('#wheelSpin', root), 'click', () => {
      if (spinning) return; spinning = true; buzz(10);
      const k = Math.floor(Math.random() * N);
      rot += 360 * (5 + Math.floor(Math.random() * 3)) + (360 - (rot % 360)) - (k * 360) / N;
      cv.style.transform = `rotate(${rot}deg)`;
      out.innerHTML = '';
      later(() => {
        spinning = false; buzz([15, 30, 15]);
        const o = OPTS[k];
        local.set('jx-wheel', short[k]); paintRecords();
        out.innerHTML = `<strong>${escapeHTML(o.t)}</strong>${o.href ? `<a href="${o.href}">${o.a} →</a>` : o.fn ? `<a href="#" data-act="1">${o.a} →</a>` : `<a>${o.a}</a>`}`;
        const act = $('[data-act]', out); if (act) act.onclick = (e) => { e.preventDefault(); o.fn(); };
      }, 4300);
    });
  }

  /* ---------- Memes ---------- */
  getJSON('/assets/data/memes.json').then((d) => {
    if (!root.isConnected || !d.memes?.length) return;
    $('#memesTab', root).hidden = false;
    renderMasonry($('#memes', root), d.memes);
  }).catch(() => {});

  return () => off.forEach((f) => f());
}
