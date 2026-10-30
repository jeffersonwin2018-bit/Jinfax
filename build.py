#!/usr/bin/env python3
"""Compila Jinfax page: arma las páginas HTML y minifica CSS/JS con esbuild.
Uso:  python build.py        (requiere `npm install` una vez)
Salida: carpeta sitio/ (la sirve Vercel). La IA vive aparte en api/fer.js (Vercel Function).
Después de compilar: git add -A && git commit && git push → Vercel publica solo.
"""
import json, os, subprocess, shutil, re
ROOT = os.path.dirname(os.path.abspath(__file__))
SRC, OUT = os.path.join(ROOT, 'src'), os.path.join(ROOT, 'sitio')
SITE = 'https://jinfax.vercel.app'  # cámbialo si usas otro dominio
read = lambda p: open(os.path.join(SRC, p), encoding='utf-8').read()

PAGES = [
    # slug, archivo, título, descripción, data-page
    ('', 'home.html', 'JinfaX — entra en la frecuencia', 'Música, código, inspiración y filosofía desde Lima y Arequipa. «Lo que no me mata me hace más fuerte.»', 'home'),
    ('musica/', 'musica.html', 'Música — JinfaX', 'La biblioteca de JinfaX al estilo Spotify: 20 playlists por vibra, adelantos de 30 s y un reproductor que se tiñe con cada portada.', 'musica'),
    ('inspiracion/', 'inspiracion.html', 'Inspiración — JinfaX', 'Grades, ideas y referencias para la próxima foto.', 'inspiracion'),
    ('baje-de-pepa/', 'baje.html', 'Baje de pepa — JinfaX', 'Juegos rápidos, memes y una ruleta para cuando no sabes qué hacer.', 'baje'),
    ('filosofia/', 'filosofia.html', 'Filosofía — JinfaX', 'Frases de Nietzsche, Marco Aurelio, Séneca y más para no rendirse. Léelas a pantalla completa y compártelas en tu estado.', 'filosofia'),
]
NAV = [('/', '00', 'Inicio', 'Hero, índice y mapa'), ('/musica/', '01', 'Música', '20 playlists'),
       ('/inspiracion/', '02', 'Inspiración', 'Grades e ideas'), ('/baje-de-pepa/', '03', 'Baje de pepa', 'Juegos y memes'),
       ('/filosofia/', '04', 'Filosofía', 'Frases que sostienen')]
SOCIAL = [('https://www.instagram.com/jinfaxzz/', 'instagram', 'Instagram'), ('https://open.spotify.com/user/31gklt2b5hemwskot6hznydvma3q', 'spotify', 'Spotify'),
          ('https://www.tiktok.com/@jinfaxzz', 'tiktok', 'TikTok'), ('https://www.youtube.com/@JeffDaloi-H2O', 'youtube', 'YouTube'),
          ('https://x.com/JeffersonluneIC', 'x', 'X'), ('https://www.facebook.com/profile.php?id=61574070666802', 'facebook', 'Facebook')]
YIN = '<svg class="yin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M12 2a5 5 0 1 1 0 10a5 5 0 1 0 0 10a10 10 0 0 0 0-20Z" fill="#0A0A0C"/><circle cx="12" cy="7" r="1.5" fill="#0A0A0C"/><circle cx="12" cy="17" r="1.5" fill="currentColor"/></svg>'
TABS = [('/', 'home', 'Inicio'), ('/musica/', 'music', 'Música'), ('/inspiracion/', 'camera', 'Inspira'),
        ('/baje-de-pepa/', 'game', 'Relajo'), ('/filosofia/', 'quote', 'Filosofía')]
socials = ''.join(f'<a href="{u}" target="_blank" rel="noopener" aria-label="{l}"><svg><use href="#i-{i}"/></svg></a>' for u, i, l in SOCIAL)


def layout(slug, body, title, desc, page):
    path = '/' + slug
    cur = ' aria-current="page"'
    nav = ''.join(f'<a href="{h}" style="--i:{k}"{cur if h == path else ""}><small>{n}</small><span>{t}</span><em>{d}</em></a>' for k, (h, n, t, d) in enumerate(NAV))
    tabs = ''.join(f'<a href="{h}"{cur if h == path else ""}><svg><use href="#i-{i}"/></svg><span>{t}</span></a>' for h, i, t in TABS)
    foot_nav = ''.join(f'<a href="{h}">{t}</a>' for h, _, t, _ in NAV)
    preload = ('<link rel="preload" as="image" type="image/webp" href="/assets/img/hero-dark-720.webp" '
               'imagesrcset="/assets/img/hero-dark-480.webp 480w, /assets/img/hero-dark-720.webp 720w, /assets/img/hero-dark-1080.webp 1080w" imagesizes="(min-width: 900px) 64vw, 100vw">') if page == 'home' else ''
    return f'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#0B0C0F">
<link rel="canonical" href="{SITE}{path}">
<meta property="og:type" content="website"><meta property="og:url" content="{SITE}{path}">
<meta property="og:title" content="{title}"><meta property="og:description" content="{desc}">
<meta property="og:image" content="{SITE}/assets/img/og.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/assets/img/favicon.png"><link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/space-grotesk-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/space-grotesk-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/ibm-plex-mono-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
{preload}
<link rel="preconnect" href="https://i.scdn.co" crossorigin>
<link rel="stylesheet" href="/assets/css/app.css?v={VERSION}">
<script type="module" src="/assets/js/core.js?v={VERSION}"></script>
</head>
<body data-page="{page}">
{read('partials/sprite.svg')}
<a class="skip" href="#app">Saltar al contenido</a>
<div class="progress" aria-hidden="true"></div>

<header class="topbar" id="topbar">
  <a class="mark" href="/" aria-label="JinfaX, inicio"><img src="/assets/img/logo.webp" alt="" width="120" height="158"><span class="mark__name">JinfaX</span></a>
  <div class="island" id="island">
    <button class="island__pill" id="islandPill" type="button" aria-label="Reproducir Les — Instrumental Slowed">
      <span class="island__orb" id="islandOrb"><svg><use href="#i-play"/></svg></span>
      <span class="island__name">Les<small>· slowed</small></span>
      <span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    </button>
    <div class="island__panel" aria-hidden="true">
      <div class="island__cover" id="islandCover"></div>
      <div class="island__meta"><strong>Les — Instrumental Slowed</strong><span>Fironn</span></div>
      <div class="island__ctrl">
        <button class="icon-btn island__play" id="islandPlay" type="button" aria-label="Reproducir"><svg><use href="#i-play"/></svg></button>
        <a class="icon-btn" href="https://open.spotify.com/track/1PCFkWkIq8IYxvF70RlA0E" target="_blank" rel="noopener" aria-label="Abrir en Spotify"><svg><use href="#i-spotify"/></svg></a>
      </div>
      <div class="island__bar"><i id="islandBar"></i></div>
    </div>
    <div class="island__embed"><div id="islandEmbed"></div></div>
  </div>
  <button class="menu-btn" id="menuBtn" type="button" aria-expanded="false" aria-controls="menu"><span class="menu-btn__label">Menú</span><span class="menu-btn__lines"><i></i><i></i></span></button>
</header>

<nav class="menu" id="menu" aria-label="Menú principal" aria-hidden="true">
  <div class="menu__links">{nav}</div>
  <div class="menu__foot">
    <div class="socials">{socials}</div>
    <div class="menu__meta"><span>Lima — Arequipa</span><span id="menuClock"></span></div>
  </div>
</nav>

<nav class="tabbar" id="tabbar" aria-label="Navegación rápida">{tabs}</nav>

<main id="app" data-page="{page}" data-title="{title}" data-desc="{desc}">
{body}
</main>

<footer class="footer">
  <div class="footer__cta">
    <span class="eyebrow">// ¿hablamos?</span>
    <p class="footer__big">Creemos algo<br><em>que no se olvide.</em></p>
    <div style="display:flex;flex-wrap:wrap;gap:10px">
      <a class="btn btn--solid" href="https://wa.me/51914300593?text=Hola%20Jinfax%2C%20quiero%20hablar%20contigo." target="_blank" rel="noopener" data-magnetic><svg><use href="#i-whatsapp"/></svg>Escribir por WhatsApp</a>
      <button class="btn btn--ghost" type="button" data-open-chat data-magnetic>{YIN.replace('class="yin"', 'class="yin" style="width:18px;height:18px"')}Preguntarle a Fer</button>
    </div>
  </div>
  <div class="footer__row">
    <nav aria-label="Pie de página">{foot_nav}</nav>
    <div class="socials">{socials}</div>
    <span>© JinfaX — programación &amp; automatización</span>
  </div>
  <img class="footer__logo" src="/assets/img/logo.webp" alt="" loading="lazy" width="120" height="158">
</footer>

<div class="sheet" id="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" hidden>
  <div class="sheet__bg" id="sheetBg" aria-hidden="true"></div>
  <div class="sheet__inner" id="sheetInner">
    <div class="sheet__top">
      <button class="icon-btn" id="sheetClose" type="button" aria-label="Cerrar"><svg><use href="#i-close"/></svg></button>
      <span class="sheet__count" id="sheetCount"></span>
      <a class="icon-btn" id="sheetOpen" target="_blank" rel="noopener" aria-label="Abrir en Spotify"><svg><use href="#i-spotify"/></svg></a>
    </div>
    <div class="sheet__stage">
      <button class="icon-btn sheet__nav sheet__nav--prev" id="sheetPrev" type="button" aria-label="Playlist anterior"><svg><use href="#i-prev"/></svg></button>
      <div class="sheet__disc"><canvas class="sheet__viz" id="sheetViz" aria-hidden="true"></canvas><div class="sheet__cover" id="sheetCover"></div></div>
      <button class="icon-btn sheet__nav sheet__nav--next" id="sheetNext" type="button" aria-label="Playlist siguiente"><svg><use href="#i-next"/></svg></button>
    </div>
    <div class="sheet__meta"><span class="sheet__mood" id="sheetMood"></span><h3 id="sheetTitle"></h3><p id="sheetDesc"></p></div>
    <div class="sheet__controls">
      <button class="play" id="sheetPlay" type="button" aria-label="Escuchar adelanto">
        <svg class="play__ring" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30"/><circle class="play__progress" id="sheetRing" cx="32" cy="32" r="30"/></svg>
        <svg class="play__icon"><use href="#i-play"/></svg>
      </button>
      <div class="eq" id="sheetEq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <span class="sheet__hint" id="sheetHint">Adelanto de 30 s</span>
    </div>
    <div class="sheet__embed" id="sheetEmbedWrap"></div>
  </div>
</div>

<div class="mini" id="mini" hidden>
  <button class="mini__open" id="miniOpen" type="button"><span class="mini__cover" id="miniCover"></span><span class="mini__text"><strong id="miniTitle"></strong><small>Adelanto · JinfaX</small></span></button>
  <button class="icon-btn" id="miniToggle" type="button" aria-label="Pausar"><svg><use href="#i-pause"/></svg></button>
  <span class="mini__bar" id="miniBar"></span>
</div>

<div class="lightbox" id="lightbox" hidden role="dialog" aria-modal="true" aria-label="Imagen ampliada">
  <img id="lightboxImg" alt="">
  <button class="icon-btn lightbox__close" id="lightboxClose" type="button" aria-label="Cerrar"><svg><use href="#i-close"/></svg></button>
  <div class="lightbox__nav"><button class="icon-btn" id="lightboxPrev" type="button" aria-label="Anterior"><svg><use href="#i-prev"/></svg></button><span id="lightboxCap"></span><button class="icon-btn" id="lightboxNext" type="button" aria-label="Siguiente"><svg><use href="#i-next"/></svg></button></div>
</div>

<div class="fabs" id="fabs">
  <button class="fab fab--chat" id="chatToggle" type="button" aria-label="Abrir chat con Fer AI" aria-controls="chatPanel" aria-expanded="false">{YIN}<span>Fer AI</span></button>
  <a class="fab fab--wa" href="https://wa.me/51914300593?text=Hola%20Jinfax%2C%20quiero%20hablar%20contigo." target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp"><svg><use href="#i-whatsapp"/></svg><span>WhatsApp</span></a>
</div>
<aside class="chat" id="chatPanel" aria-hidden="true" aria-label="Chat con Fer AI">
  <div class="chat__head">
    <div class="chat__id">{YIN}<div><strong>Fer AI</strong><small><i class="dot"></i>En línea · con Claude</small></div></div>
    <div class="chat__actions">
      <a class="icon-btn chat__wa" href="https://wa.me/51914300593?text=Hola%20Jinfax%2C%20quiero%20hablar%20contigo." target="_blank" rel="noopener" aria-label="Escribir por WhatsApp"><svg><use href="#i-whatsapp"/></svg></a>
      <button class="icon-btn" id="chatClose" type="button" aria-label="Cerrar chat"><svg><use href="#i-close"/></svg></button>
    </div>
  </div>
  <div class="chat__body" id="chatMessages" aria-live="polite">
    <div class="msg msg--fer">Hola, soy Fer, el asistente de JinfaX. Pregúntame por automatización, webs, soporte técnico o lo que necesites.</div>
    <div class="chat__chips" id="chatChips"><button type="button">¿Qué servicios ofrecen?</button><button type="button">Quiero automatizar mi negocio</button><button type="button">¿Cuánto cuesta una web?</button><button type="button">Recomiéndame una playlist</button></div>
  </div>
  <form class="chat__foot" id="chatForm">
    <label class="sr-only" for="chatInput">Escribe tu mensaje</label>
    <input id="chatInput" type="text" placeholder="Escribe un mensaje..." autocomplete="off" maxlength="1500" enterkeyhint="send">
    <button type="submit" aria-label="Enviar mensaje"><svg><use href="#i-send"/></svg></button>
  </form>
</aside>

<div class="toast" id="toast" role="status" aria-live="polite"></div>
<div class="cursor" id="cursor" aria-hidden="true"><span class="cursor__ring"><b id="cursorLabel"></b></span><span class="cursor__dot"></span></div>
<div class="curtain is-boot" id="curtain" aria-hidden="true"><div class="curtain__label"><img src="/assets/img/logo.webp" alt=""><span id="curtainLabel">JinfaX</span></div></div>
</body>
</html>
'''


def esbuild(args):
    exe = os.path.join(ROOT, 'node_modules', '.bin', 'esbuild.cmd' if os.name == 'nt' else 'esbuild')
    subprocess.run([exe, *args], check=True, cwd=ROOT)


if __name__ == '__main__':
    import hashlib, time
    # JS: núcleo + páginas en módulos separados (se cargan solo cuando hacen falta)
    shutil.rmtree(os.path.join(OUT, 'assets/js'), ignore_errors=True)
    esbuild(['src/js/core.js', '--bundle', '--splitting', '--format=esm', '--minify', '--target=es2020',
             '--outdir=sitio/assets/js', '--entry-names=[name]', '--chunk-names=c/[name]-[hash]', '--legal-comments=none'])
    esbuild(['src/css/main.css', '--bundle', '--minify', '--outfile=sitio/assets/css/app.css', '--external:/assets/*'])
    h = hashlib.sha1()
    for p in ('sitio/assets/css/app.css', 'sitio/assets/js/core.js'):
        h.update(open(os.path.join(ROOT, p), 'rb').read())
    VERSION = h.hexdigest()[:8]
    mp = read('partials/map.svg')
    for slug, f, title, desc, page in PAGES:
        body = read('pages/' + f).replace('<!--MAP-->', mp)
        d = os.path.join(OUT, slug)
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(layout(slug, body, title, desc, page))
    nf = '''<header class="page-head" style="min-height:70vh;align-content:center">
  <span class="eyebrow">// error 404</span>
  <h1 class="display">Te <em>perdiste.</em></h1>
  <p class="lead">Esta página no existe, pero la música sigue. Vuelve al inicio o elige un mundo.</p>
  <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px"><a class="btn btn--solid" href="/">Volver al inicio</a><a class="btn btn--ghost" href="/musica/">Ir a Música</a></div>
</header>'''
    open(os.path.join(OUT, '404.html'), 'w', encoding='utf-8').write(layout('404', nf, 'Página no encontrada — JinfaX', 'Esta página no existe.', 'notfound'))
    print('OK · versión', VERSION)
