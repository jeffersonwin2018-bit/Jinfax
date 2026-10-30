// Fer AI — Netlify Function + API de Claude (Anthropic) con TU propia clave.
// No usa el AI Gateway de Netlify: la clave va en la variable CLAUDE_API_KEY y las llamadas
// salen directo a api.anthropic.com, así que no se consumen créditos de IA de Netlify.
// Respuesta en streaming (NDJSON): el texto aparece en el chat mientras Claude escribe.
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM = `Eres Fer, el asistente de JinfaX (Jefferson), con base en Lima y Arequipa, Perú.
JinfaX integra tecnología, automatización, desarrollo de software, edición de video y conocimiento humano
para impulsar la libertad individual y el crecimiento estratégico.

Servicios:
- Automatización: bots, IA aplicada, flujos de procesos y ventas que trabajan solos.
- Exposición digital: páginas web, contenido, Google Maps, SEO y redes sociales.
- Soporte técnico: servidores, equipos y redes informáticas.
Para cotizar o contratar, invita a escribir por WhatsApp (botón verde de la página). No inventes precios:
explica de qué depende el costo y ofrece cotizar por WhatsApp.

El sitio también tiene: Música (20 playlists de Jefferson), Inspiración (grades e ideas de foto),
Baje de pepa (juegos y memes) y Filosofía (frases estoicas y de Nietzsche para no rendirse).

Estilo: responde en el idioma del usuario, como un consultor cercano, directo y claro. Prioriza hechos
y pasos concretos; si algo es incierto, dilo. Respuestas cortas (2 a 4 oraciones) salvo que pidan detalle.
Texto plano, sin markdown ni listas con asteriscos.`;

const MODEL = 'claude-opus-5-5';
const json = (body, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
const clean = (s, n = 1500) => (typeof s === 'string' ? s.trim().slice(0, n) : '');

// Límite simple por IP (por instancia) para proteger tu saldo de abuso.
const hits = new Map();
const limited = (ip) => {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  arr.push(now); hits.set(ip, arr);
  return arr.length > 10;
};

let client;
export default async (req, context) => {
  if (req.method === 'GET') return json({ status: 'ok' }); // precalentado
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  if (limited(context.ip || 'x')) return json({ error: 'Vas muy rápido. Espera un minuto y seguimos.' }, 429);

  const key = Netlify.env.get('CLAUDE_API_KEY');
  if (!key) {
    console.error('Falta CLAUDE_API_KEY en las variables de entorno de Netlify.');
    return json({ error: 'Fer está en mantenimiento. Escríbenos por WhatsApp mientras tanto.' }, 503);
  }

  let payload;
  try { payload = await req.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }
  const message = clean(payload?.message);
  if (!message) return json({ error: 'Escribe un mensaje.' }, 400);

  // Historial corto y alternado (user/assistant) para que el costo por mensaje se mantenga bajo
  const history = (Array.isArray(payload?.history) ? payload.history : [])
    .slice(-8)
    .filter((h) => (h?.role === 'user' || h?.role === 'assistant') && clean(h?.content))
    .map((h) => ({ role: h.role, content: clean(h.content, 2000) }));
  while (history.length && history[0].role !== 'user') history.shift();
  const messages = [...history, { role: 'user', content: message }];

  // baseURL explícito: ignora el ANTHROPIC_BASE_URL que inyecta el AI Gateway de Netlify
  client ??= new Anthropic({ apiKey: key, baseURL: 'https://api.anthropic.com', maxRetries: 1, timeout: 25_000 });

  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(ctrl) {
      const send = (o) => ctrl.enqueue(enc.encode(`${JSON.stringify(o)}\n`));
      let wrote = false;
      try {
        const stream = client.beta.messages.stream({
          model: Netlify.env.get('FER_MODEL') || MODEL,
          max_tokens: 8000,
          system: SYSTEM,
          output_config: { effort: 'low' }, // chat corto: respuestas rápidas y baratas
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default', // si un filtro de seguridad rechaza, Anthropic reintenta con otro modelo
          messages,
        });
        for await (const ev of stream) {
          if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta' && ev.delta.text) {
            send({ t: ev.delta.text }); wrote = true;
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === 'refusal' && !wrote) send({ t: 'Sobre eso no puedo ayudarte. ¿Te cuento algo de los servicios de JinfaX?' });
        send({ done: true });
      } catch (e) {
        console.error('Fer falló:', e?.status || '', e?.message || e);
        const msg = e instanceof Anthropic.RateLimitError ? 'Hay mucha demanda ahora mismo. Inténtalo en unos segundos.'
          : e instanceof Anthropic.AuthenticationError ? 'Fer está en mantenimiento. Escríbenos por WhatsApp mientras tanto.'
          : 'Fer no puede responder ahora mismo. Inténtalo en unos segundos.';
        send({ error: msg });
      } finally { ctrl.close(); }
    },
  });
  return new Response(body, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no' } });
};

export const config = { path: '/api/fer', method: ['GET', 'POST'] };
