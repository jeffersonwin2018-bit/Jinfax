// Fer AI — Vercel Function (/api/fer) + Gemini (Google AI Studio) con TU propia clave gratuita.
// La clave va en la variable de entorno GEMINI_API_KEY (Vercel → Settings → Environments → Production).
// Nivel gratuito de Google: sin tarjeta, con límite de mensajes por minuto/día; si un modelo se queda
// sin cupo o no existe, se prueba el siguiente de la lista.
// Respuesta en streaming (NDJSON): el texto aparece en el chat mientras Fer escribe.
import { GoogleGenAI } from '@google/genai';

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

// El primero que responda gana (todos tienen nivel gratuito en Google AI Studio).
const MODELS = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];

const json = (body, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
const clean = (s, n = 1500) => (typeof s === 'string' ? s.trim().slice(0, n) : '');

// Límite simple por IP (por instancia) para no agotar tu cupo gratuito.
const hits = new Map();
const limited = (ip) => {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  arr.push(now); hits.set(ip, arr);
  return arr.length > 10;
};
const ipOf = (req) => (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'x').split(',')[0].trim();

let ai;

// GET: precalentado / prueba rápida (dice si la clave está configurada, sin revelarla)
export function GET() {
  return json({ status: 'ok', key: Boolean(process.env.GEMINI_API_KEY) });
}

export async function POST(req) {
  if (limited(ipOf(req))) return json({ error: 'Vas muy rápido. Espera un minuto y seguimos.' }, 429);

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('Falta GEMINI_API_KEY en las variables de entorno de Vercel.');
    return json({ error: 'Fer está en mantenimiento. Escríbenos por WhatsApp mientras tanto.' }, 503);
  }

  let payload;
  try { payload = await req.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }
  const message = clean(payload?.message);
  if (!message) return json({ error: 'Escribe un mensaje.' }, 400);

  // Historial corto (Gemini usa los roles "user" y "model")
  const history = (Array.isArray(payload?.history) ? payload.history : [])
    .slice(-8)
    .filter((h) => (h?.role === 'user' || h?.role === 'assistant') && clean(h?.content))
    .map((h) => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: clean(h.content, 2000) }] }));
  while (history.length && history[0].role !== 'user') history.shift();
  const contents = [...history, { role: 'user', parts: [{ text: message }] }];

  ai ??= new GoogleGenAI({ apiKey: key });
  const models = [process.env.FER_MODEL, ...MODELS].filter(Boolean);

  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(ctrl) {
      const send = (o) => ctrl.enqueue(enc.encode(`${JSON.stringify(o)}\n`));
      let lastErr;
      for (const model of models) {
        let wrote = false;
        try {
          const stream = await ai.models.generateContentStream({
            model,
            contents,
            config: { systemInstruction: SYSTEM, temperature: 0.5, maxOutputTokens: 1024 },
          });
          for await (const chunk of stream) {
            const t = chunk.text;
            if (t) { send({ t }); wrote = true; }
          }
          if (wrote) { send({ done: true }); ctrl.close(); return; }
          lastErr = new Error('respuesta vacía');
        } catch (e) {
          lastErr = e;
          console.warn(`Modelo ${model} falló:`, e?.status || '', e?.message || e);
          if (wrote) break; // ya se mostró texto: no mezclar con otro modelo
          if (e?.status === 400 || e?.status === 401 || e?.status === 403) break; // clave inválida: no insistir
        }
      }
      console.error('Fer sin respuesta', lastErr?.status || '', lastErr?.message || lastErr);
      const s = lastErr?.status;
      send({ error: s === 429 ? 'Fer llegó a su límite gratuito por ahora. Inténtalo en un rato o escríbenos por WhatsApp.'
        : s === 400 || s === 401 || s === 403 ? 'Fer está en mantenimiento. Escríbenos por WhatsApp mientras tanto.'
        : 'Fer no puede responder ahora mismo. Inténtalo en unos segundos.' });
      ctrl.close();
    },
  });
  return new Response(body, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no' } });
}
