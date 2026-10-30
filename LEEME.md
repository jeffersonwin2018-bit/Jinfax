# Jinfax page — guía rápida

Sitio: Vercel, conectado al repositorio de GitHub `jeffersonwin2018-bit/Jinfax`.
Cada `git push` a `main` publica la web sola (Vercel no compila nada: sirve la carpeta `sitio/` tal cual).

## Publicar un cambio
```bash
npm install          # solo la primera vez (necesitas Node.js 20+ y Python 3)
python build.py      # genera sitio/ minificado
git add -A
git commit -m "lo que cambiaste"
git push
```
En ~30 s Vercel publica la nueva versión.

## Fer AI (API de Claude)
Fer es una función de Vercel en `api/fer.js` que llama a la API de Claude (Anthropic) con tu clave.

1. Crea una clave en https://platform.claude.com → **API Keys** y carga saldo en *Billing*.
2. Vercel → tu proyecto → **Settings → Environment Variables** → agrega:
   - Key: `CLAUDE_API_KEY` · Value: tu clave `sk-ant-...` · Environments: **Production** (y Preview si quieres)
3. Vercel → **Deployments** → en el último, menú **⋯ → Redeploy** (las variables solo se aplican en un deploy nuevo).
4. Prueba: abre `https://TU-DOMINIO/api/fer`. Debe decir `{"status":"ok","key":true}`.
   Si dice `"key":false`, la variable no se cargó (revisa el nombre y vuelve a hacer Redeploy).

Detalles:
- Modelo: `claude-opus-5-5` con esfuerzo bajo (rápido para chat). Para gastar mucho menos, agrega la variable
  `FER_MODEL` = `claude-haiku-5-5`.
- Respuesta en streaming: el texto aparece mientras Fer escribe. Límite: 10 mensajes por minuto por persona.
- Personalidad y datos de JinfaX: constante `SYSTEM` en `api/fer.js`.
- Si la clave falta o es inválida, el chat muestra "en mantenimiento" y un botón a WhatsApp.
- Errores: Vercel → proyecto → **Logs** (filtra por `/api/fer`).

## Agregar fotos a Inspiración o memes a Baje de pepa
```bash
pip install pillow                       # solo la primera vez
python tools/agregar_fotos.py inspiracion "ruta/a/tu/carpeta-de-fotos"
python tools/agregar_fotos.py memes "ruta/a/tu/carpeta-de-memes"
```
El script optimiza cada imagen (WebP, máx. 1400 px), la copia a `sitio/assets/…` y la registra sola.
Luego `git add -A`, `git commit` y `git push`. Los memes aparecen en cuanto haya al menos uno.

## Editar textos sin programar (archivos JSON en `sitio/assets/data/`)
| Archivo | Qué controla |
|---|---|
| `filosofia.json` | Las frases. Agrega las tuyas con `"autor": "JinfaX"`. |
| `inspiracion.json` | Grades, ideas de foto y la galería. |
| `memes.json` | El muro de memes (lo llena el script). |

Respeta comas y comillas. Si te equivocas, la sección no carga: pega el archivo en https://jsonlint.com para revisarlo.

## Cambiar diseño o código
El código fuente está en `src/` (HTML, CSS, JS). Después de editar, `python build.py` y sube con git.
- Playlists y artistas: `src/js/library.js`
- Canción de la isla (arriba al centro): `TRACK` en `src/js/island.js`
- Dominio para enlaces de redes (og:image, canonical): `SITE` en `build.py`

## Secretos (easter eggs)
- Toca el logo **3 veces** → modo concierto.
- `TU-DOMINIO/#p/<id-de-playlist>` abre una playlist directo en el reproductor.
