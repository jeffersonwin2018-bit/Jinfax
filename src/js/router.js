// Navegación entre páginas sin recargar: la música, la isla y el chat siguen vivos.
// Cada página sigue siendo un HTML completo (funciona sin JS y es indexable).
import { $, $$, wait, reduced } from './util.js';
import { setMenu, setCurrentNav, scan } from './fx.js';

const PAGES = {
  home: () => import('./pages/home.js'),
  musica: () => import('./pages/musica.js'),
  inspiracion: () => import('./pages/inspiracion.js'),
  baje: () => import('./pages/baje.js'),
  filosofia: () => import('./pages/filosofia.js'),
};
const LABELS = { '/': 'Inicio', '/musica/': 'Música', '/inspiracion/': 'Inspiración', '/baje-de-pepa/': 'Baje de pepa', '/filosofia/': 'Filosofía' };
const cache = new Map();
let destroyCurrent = null, busy = false, currentPath = location.pathname;

const norm = (p) => (p.endsWith('/') ? p : `${p}/`);
const isPage = (url) => url.origin === location.origin && norm(url.pathname) in LABELS;

function fetchPage(href) {
  const key = norm(new URL(href, location.href).pathname);
  if (!cache.has(key)) cache.set(key, fetch(key, { credentials: 'same-origin' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); }).catch((e) => { cache.delete(key); throw e; }));
  return cache.get(key);
}

export async function initPage(main) {
  const name = main.dataset.page;
  destroyCurrent?.();
  destroyCurrent = null;
  scan(main);
  try {
    const mod = await PAGES[name]?.();
    destroyCurrent = mod?.init?.(main) || null;
  } catch (e) { console.error('No se pudo iniciar la página', name, e); }
}

async function go(href, push = true) {
  const url = new URL(href, location.href);
  const path = norm(url.pathname);
  if (busy) return;
  if (path === norm(location.pathname)) { // misma página → arriba
    setMenu(false);
    if (url.hash && document.querySelector(url.hash)) document.querySelector(url.hash).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    else scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    return;
  }
  busy = true;
  const curtain = $('#curtain');
  $('#curtainLabel').textContent = LABELS[path] || 'JinfaX';
  curtain.classList.remove('is-out', 'is-boot');
  void curtain.offsetWidth;
  curtain.classList.add('is-in');
  let html;
  try { [html] = await Promise.all([fetchPage(path), wait(reduced ? 0 : 560)]); }
  catch { location.href = url.href; return; }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const next = doc.querySelector('main#app');
  if (!next) { location.href = url.href; return; }
  setMenu(false);
  const main = $('#app');
  main.replaceWith(next);
  document.title = next.dataset.title || doc.title;
  $('meta[name="description"]')?.setAttribute('content', next.dataset.desc || '');
  document.body.dataset.page = next.dataset.page;
  if (push) history.pushState({ path }, '', path + url.hash);
  currentPath = path;
  setCurrentNav(path);
  scrollTo(0, 0);
  $('#topbar').classList.remove('is-hidden', 'is-solid');
  await initPage(next);
  curtain.classList.remove('is-in');
  curtain.classList.add('is-out');
  setTimeout(() => { curtain.classList.remove('is-out'); busy = false; }, reduced ? 0 : 720);
  next.focus?.({ preventScroll: true });
}

// Interceptar enlaces internos
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href]');
  if (!a || a.target || a.hasAttribute('download')) return;
  const url = new URL(a.href, location.href);
  if (!isPage(url)) return;
  if (url.hash && norm(url.pathname) === norm(location.pathname) && !a.classList.contains('mark')) return; // anclas en la misma página
  e.preventDefault();
  go(url.href);
});
// Prefetch al acercarse a un enlace → la navegación se siente instantánea
const pre = (e) => {
  const a = e.target.closest?.('a[href]'); if (!a) return;
  const url = new URL(a.href, location.href);
  if (isPage(url) && norm(url.pathname) !== norm(location.pathname)) fetchPage(url.href).catch(() => {});
};
document.addEventListener('pointerover', pre, { passive: true });
document.addEventListener('touchstart', pre, { passive: true });
document.addEventListener('focusin', pre);

addEventListener('popstate', () => {
  if (norm(location.pathname) !== norm(currentPath)) go(location.href, false);
});

// Precarga silenciosa de las demás páginas cuando el navegador está libre
export function warmup() {
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1500));
  idle(() => Object.keys(LABELS).forEach((p) => { if (p !== norm(location.pathname)) fetchPage(p).catch(() => {}); }));
}
export const pageLinks = () => $$('a[href]').filter((a) => isPage(new URL(a.href, location.href)));
