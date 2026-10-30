# Jinfax page — guía rápida

## Publicar (lo único que necesitas la mayoría de veces)
1. Entra a Netlify → proyecto **jinfax** → **Deploys**.
2. Arrastra la carpeta **`sitio/`** (o el zip `jinfax-sitio.zip`) a la zona de *drag and drop*.
3. Espera ~30 s. Listo: https://jinfax.netlify.app

## Agregar fotos a Inspiración o memes a Baje de pepa
```bash
pip install pillow                       # solo la primera vez
python tools/agregar_fotos.py inspiracion "ruta/a/tu/carpeta-de-fotos"
python tools/agregar_fotos.py memes "ruta/a/tu/carpeta-de-memes"
```
El script optimiza cada imagen (WebP, máx. 1400 px), la copia a `sitio/assets/…` y la registra sola.
Luego vuelves a arrastrar `sitio/` a Netlify. Los memes aparecen en cuanto haya al menos uno.

## Editar textos sin programar (archivos JSON en `sitio/assets/data/`)
| Archivo | Qué controla |
|---|---|
| `filosofia.json` | Las frases. Agrega las tuyas con `"autor": "JinfaX"`. |
| `inspiracion.json` | Grades, las 8 ideas de foto y la galería. |
| `memes.json` | El muro de memes (lo llena el script). |

Respeta comas y comillas. Si te equivocas, la sección no carga: pega el archivo en https://jsonlint.com para revisarlo.

## Cambiar diseño o código
El código fuente está en `src/` (HTML, CSS, JS). Después de editar:
```bash
npm install          # solo la primera vez (necesitas Node.js 20+)
python build.py      # genera sitio/ minificado (funciona en Windows, Mac y Linux)
```
- Playlists y artistas: `src/js/library.js`
- Canción de la isla (arriba al centro): `TRACK` en `src/js/island.js`
- Personalidad de Fer AI: `fn-src/fer.mjs`

## Fer AI (API de Claude, con tu propia clave)
Fer ya **no usa el AI Gateway de Netlify** (que gastaba tus créditos de Netlify). Ahora llama directo a la
API de Claude (Anthropic) con tu clave y paga tu cuenta de Anthropic.

1. Crea una clave en https://platform.claude.com → **API Keys** (y carga saldo en *Billing*; con unos pocos
   dólares alcanza para miles de mensajes cortos).
2. Netlify → proyecto **jinfax** → **Project configuration → Environment variables** → *Add a variable*:
   - Nombre: `CLAUDE_API_KEY` · Valor: tu clave `sk-ant-...` · Scope: **Functions**
3. Vuelve a publicar (arrastra `sitio/` a Deploys).

Detalles:
- Modelo: `claude-opus-5-5` con esfuerzo bajo (rápido y barato para chat). Para gastar menos aún, agrega
  la variable `FER_MODEL` = `claude-haiku-5-5`.
- La respuesta llega en streaming: el texto aparece mientras Fer escribe.
- Límite: 10 mensajes por minuto por persona. Personalidad y datos de JinfaX: `fn-src/fer.mjs`.
- Si la clave falta o es inválida, el chat muestra "en mantenimiento" y un botón a WhatsApp.
- Usa el nombre `CLAUDE_API_KEY` (no `ANTHROPIC_API_KEY`) para que el AI Gateway de Netlify no se active.

## Secretos (easter eggs)
- Toca el logo **3 veces** → modo concierto.
- `jinfax.netlify.app/#p/<id-de-playlist>` abre una playlist directo en el reproductor.
