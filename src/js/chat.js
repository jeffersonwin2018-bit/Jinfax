// Fer AI — chat con la Vercel Function /api/fer (Gemini, respuesta en streaming NDJSON)
import { $, finePointer, escapeHTML } from './util.js';

const toggle = $('#chatToggle'), panel = $('#chatPanel'), closeBtn = $('#chatClose');
const form = $('#chatForm'), input = $('#chatInput'), list = $('#chatMessages'), sendBtn = $('#chatForm button');
const hist = [];
const API = '/api/fer';
const WA = '<a class="msg__wa" href="https://wa.me/51914300593?text=Hola%20Jinfax" target="_blank" rel="noopener">Escribir por WhatsApp →</a>';
let warmed = false, busy = false;

// Formato ligero y seguro: escapa todo y luego permite ```bloques```, `código` y **negrita**
const inline = (s) => s.replace(/`([^`\n]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|[\s(])\*([^*\s][^*\n]*?)\*(?=[\s.,;:!?)]|$)/gm, '$1<em>$2</em>');
const fmt = (text) => escapeHTML(text).split('```').map((part, i, all) => {
  // texto normal: sin saltos sobrantes pegados a un bloque de código (el bloque ya tiene margen)
  if (i % 2 === 0) {
    let t = part;
    if (i > 0) t = t.replace(/^\n+/, '');
    if (i < all.length - 1) t = t.replace(/\n+$/, '');
    return inline(t);
  }
  const nl = part.indexOf('\n');
  const lang = nl > 0 ? part.slice(0, nl).trim() : '';
  const code = (nl >= 0 && /^[\w+#.-]*$/.test(lang) ? part.slice(nl + 1) : part).replace(/\n$/, '');
  return `<pre class="msg__code"${lang ? ` data-lang="${lang}"` : ''}><code>${code}</code></pre>`;
}).join('');

export function setChat(open) {
  panel.classList.toggle('is-open', open);
  panel.setAttribute('aria-hidden', String(!open));
  toggle.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('chat-open', open);
  if (open && finePointer) setTimeout(() => input.focus(), 180);
  if (open && !warmed) { warmed = true; fetch(API).catch(() => {}); }
}
const bottom = () => list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
const add = (text, who, html = '') => {
  const m = document.createElement('div');
  m.className = `msg msg--${who}`; m.textContent = text;
  if (html) m.insertAdjacentHTML('beforeend', html);
  list.append(m); bottom();
  return m;
};

async function send(text) {
  text = text.trim(); if (!text || busy) return;
  busy = true;
  $('#chatChips')?.remove();
  add(text, 'user'); input.value = ''; sendBtn.disabled = true;
  const typing = document.createElement('div');
  typing.className = 'typing'; typing.setAttribute('aria-label', 'Fer está escribiendo');
  typing.innerHTML = '<i></i><i></i><i></i>'; list.append(typing); bottom();
  let msg = null, reply = '';
  const ctrl = new AbortController();
  let to = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, history: hist.slice(-8) }), signal: ctrl.signal });
    if (!r.ok || !r.body) { const d = await r.json().catch(() => ({})); throw new Error(d.error || 'Fer no pudo responder ahora mismo.'); }
    const reader = r.body.getReader(), dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      clearTimeout(to); to = setTimeout(() => ctrl.abort(), 30000);
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        if (!line) continue;
        let ev; try { ev = JSON.parse(line); } catch { continue; }
        if (ev.error) throw new Error(ev.error);
        if (ev.t) {
          if (!msg) { typing.remove(); msg = add('', 'fer'); msg.classList.add('is-streaming'); }
          reply += ev.t; msg.innerHTML = fmt(reply);
          if (list.scrollHeight - list.scrollTop - list.clientHeight < 120) list.scrollTop = list.scrollHeight;
        }
      }
    }
    if (!reply) throw new Error('Fer no pudo responder ahora mismo.');
    hist.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
  } catch (err) {
    const m = err.name === 'AbortError' ? 'Fer tardó demasiado. Inténtalo otra vez.' : err.message;
    if (msg && reply) msg.insertAdjacentHTML('beforeend', `<br><small>(${m})</small>`);
    else add(m, 'fer', `<br>${WA}`);
  } finally {
    clearTimeout(to); typing.remove(); msg?.classList.remove('is-streaming');
    busy = false; sendBtn.disabled = false; if (finePointer) input.focus();
  }
}
toggle.addEventListener('click', () => setChat(!panel.classList.contains('is-open')));
closeBtn.addEventListener('click', () => setChat(false));
document.addEventListener('click', (e) => { if (e.target.closest('[data-open-chat]')) setChat(true); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('is-open')) setChat(false); });
form.addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });
list.addEventListener('click', (e) => { const b = e.target.closest('#chatChips button'); if (b) send(b.textContent); });
