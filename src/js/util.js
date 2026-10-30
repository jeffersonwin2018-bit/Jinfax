export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const hueOf = (s) => [...s].reduce((h, c) => (h * 31 + c.codePointAt(0)) % 360, 7);
export const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const buzz = (p = 10) => { try { navigator.vibrate?.(p); } catch { /* sin vibración */ } };

// Almacenamiento tolerante a modo privado / WebViews
const safe = (s) => ({
  get(k) { try { return s().getItem(k); } catch { return null; } },
  set(k, v) { try { s().setItem(k, v); } catch { /* nada */ } },
});
export const session = safe(() => sessionStorage);
export const local = safe(() => localStorage);

let toastT;
export function toast(msg, ms = 2600) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('is-on'), ms);
}

// Carga JSON con caché en memoria
const jcache = new Map();
export function getJSON(url) {
  if (!jcache.has(url)) jcache.set(url, fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(r.status))).catch((e) => { jcache.delete(url); throw e; }));
  return jcache.get(url);
}

// Cargar imágenes con fundido
export function fadeImg(img) {
  if (img.complete && img.naturalWidth) img.classList.add('is-loaded');
  else img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
}
