// Un solo requestAnimationFrame para todo el sitio. Los módulos se suscriben con onFrame().
import { lerp } from './util.js';

const subs = new Set();
export const state = { beat: 0, scrollVel: 0, t: 0 };
const beatSources = new Set(); // funciones que devuelven 0..1 o null

export function onFrame(fn) { subs.add(fn); return () => subs.delete(fn); }
export function addBeatSource(fn) { beatSources.add(fn); }

function frame(t) {
  requestAnimationFrame(frame);
  state.t = t;
  let target = null;
  for (const s of beatSources) { const v = s(t); if (v != null) target = Math.max(target ?? 0, v); }
  state.beat = target == null ? lerp(state.beat, 0, 0.08) : target > state.beat ? lerp(state.beat, target, 0.6) : lerp(state.beat, target, 0.12);
  state.scrollVel *= 0.9;
  for (const fn of subs) { try { fn(t, state); } catch (e) { console.error(e); } }
}
requestAnimationFrame(frame);

let lastY = scrollY;
addEventListener('scroll', () => { state.scrollVel = scrollY - lastY; lastY = scrollY; }, { passive: true });
