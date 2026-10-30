// INSPIRACIÓN: cabecera tipo playlist, comparador antes/después con grades, carrusel de ideas y galería.
import { $, $$, getJSON, buzz, escapeHTML } from '../util.js';
import { renderMasonry, openLightbox } from '../lightbox.js';

export function init(root) {
  const off = [];
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); off.push(() => el.removeEventListener(ev, fn, o)); };

  /* ---------- Comparador ---------- */
  const cmp = $('#compare', root), handle = $('#compareHandle', root);
  let pos = 50, dragging = false;
  const setPos = (p) => { pos = Math.max(0, Math.min(100, p)); cmp.style.setProperty('--pos', `${pos}%`); handle.setAttribute('aria-valuenow', String(Math.round(pos))); };
  const fromEvent = (x) => { const r = cmp.getBoundingClientRect(); setPos(((x - r.left) / r.width) * 100); };
  on(cmp, 'pointerdown', (e) => { dragging = true; cmp.setPointerCapture?.(e.pointerId); fromEvent(e.clientX); });
  on(cmp, 'pointermove', (e) => { if (dragging || e.pointerType === 'mouse') fromEvent(e.clientX); });
  on(cmp, 'pointerup', () => { dragging = false; });
  on(cmp, 'pointercancel', () => { dragging = false; });
  on(handle, 'keydown', (e) => { if (e.key === 'ArrowLeft') setPos(pos - 5); if (e.key === 'ArrowRight') setPos(pos + 5); });
  // Pequeña animación inicial para que se entienda que se puede arrastrar
  const intro = new IntersectionObserver((es) => {
    if (!es[0].isIntersecting) return; intro.disconnect();
    const t0 = performance.now();
    const anim = (t) => { const p = (t - t0) / 1600; if (p > 1 || dragging) return; setPos(50 + Math.sin(p * Math.PI * 2) * 22 * (1 - p)); requestAnimationFrame(anim); };
    requestAnimationFrame(anim);
  }, { threshold: 0.6 });
  intro.observe(cmp); off.push(() => intro.disconnect());

  getJSON('/assets/data/inspiracion.json').then((data) => {
    if (!root.isConnected) return;
    $('#inspStats', root).insertAdjacentHTML('beforeend', `<span>${data.grades.length} grades · ${data.ideas.length} ideas · ${data.galeria.length} referencias</span>`);

    /* Grades: miniaturas con la foto real de cada grade */
    const after = $('#compareAfter', root), tag = $('#compareTag', root), note = $('#gradeNote', root), wrap = $('#grades', root);
    wrap.innerHTML = data.grades.map((g, i) => `<li><button class="grade-tile" type="button" data-id="${g.id}" aria-pressed="${i === 0}">
      <img src="/assets/inspiracion/grades/${g.id}.webp" alt="" decoding="async"><span>${escapeHTML(g.nombre)}</span></button></li>`).join('');
    note.textContent = data.grades[0].nota;
    on(wrap, 'click', (e) => {
      const b = e.target.closest('.grade-tile'); if (!b || b.getAttribute('aria-pressed') === 'true') return;
      const g = data.grades.find((x) => x.id === b.dataset.id);
      $$('.grade-tile', wrap).forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
      after.style.opacity = '0';
      setTimeout(() => { after.src = `/assets/inspiracion/grades/${g.id}.webp`; after.onload = () => { after.style.opacity = '1'; }; }, 180);
      tag.textContent = g.nombre; note.textContent = g.nota; buzz(6);
    });

    /* Ideas: carrusel de tarjetas; la "portada" es la paleta de la toma */
    const ideas = $('#ideas', root);
    ideas.innerHTML = data.ideas.map((it, i) => `
      <li class="idea" data-i="${i}">
        <div class="idea__art" style="--c1:${it.paleta[0]};--c2:${it.paleta[1]};--c3:${it.paleta[2]};--c4:${it.paleta[3] || it.paleta[2]}">
          <span class="idea__num">${String(i + 1).padStart(2, '0')}</span>
          <div class="idea__palette">${it.paleta.map((c) => `<i style="background:${c}" title="${c}"></i>`).join('')}</div>
        </div>
        <h3>${escapeHTML(it.titulo)}</h3>
        <p>${escapeHTML(it.texto)}</p>
        <div class="idea__specs">${it.specs.map((x) => `<span>${escapeHTML(x)}</span>`).join('')}</div>
      </li>`).join('');
    $('#ideasMeta', root).textContent = `${data.ideas.length} ideas con ajustes de cámara y paleta`;
    on($('#inspShuffle', root), 'click', () => {
      const cards = $$('.idea', ideas), k = Math.floor(Math.random() * cards.length);
      cards.forEach((c, j) => c.classList.toggle('is-picked', j === k));
      ideas.closest('.section').scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => ideas.scrollTo({ left: cards[k].offsetLeft - ideas.offsetLeft - 16, behavior: 'smooth' }), 350);
      buzz([8, 30, 8]);
    });

    /* Galería */
    renderMasonry($('#gallery', root), data.galeria);
    on($('#inspPlay', root), 'click', () => data.galeria.length && openLightbox(data.galeria, 0));
  }).catch(() => { $('#ideas', root).textContent = 'No se pudieron cargar las ideas.'; });

  return () => off.forEach((f) => f());
}
