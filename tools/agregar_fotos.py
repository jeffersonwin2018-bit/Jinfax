#!/usr/bin/env python3
"""
Agrega fotos a "Inspiración" o memes a "Baje de pepa" sin tocar código.

Qué hace:
  1. Toma cada imagen de la carpeta que le indiques (jpg, jpeg, png, webp).
  2. La corrige de orientación, la reduce a máx. 1400 px y la convierte a WebP liviano.
  3. La copia a sitio/assets/<inspiracion|memes>/ con un nombre limpio y único.
  4. La registra en sitio/assets/data/<inspiracion|memes>.json (con su tamaño y título).

Uso (desde la carpeta del proyecto):
  pip install pillow                                  # una sola vez
  python tools/agregar_fotos.py inspiracion "C:/Users/tu/Fotos/nuevas"
  python tools/agregar_fotos.py memes ./mis-memes
  python tools/agregar_fotos.py memes ./mis-memes --primero     # ponerlos arriba del todo

El título se saca del nombre del archivo: "contraluz-en-barranco.jpg" → "Contraluz en barranco".
Después solo arrastra la carpeta sitio/ a Netlify (o el zip) y listo.
"""
import argparse, json, re, sys, time, unicodedata
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit('Falta Pillow. Instálalo con:  pip install pillow')

ROOT = Path(__file__).resolve().parent.parent
SITIO = ROOT / 'sitio'
EXTS = {'.jpg', '.jpeg', '.png', '.webp'}
MAX = 1400


def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-') or 'img'


def titulo(nombre):
    t = re.sub(r'[-_]+', ' ', Path(nombre).stem).strip()
    t = re.sub(r'^(img|dsc|pxl|whatsapp image)\s*\d*', '', t, flags=re.I).strip()
    return t[:1].upper() + t[1:] if t else ''


def main():
    ap = argparse.ArgumentParser(description='Agrega fotos o memes optimizados al sitio.')
    ap.add_argument('tipo', choices=['inspiracion', 'memes'])
    ap.add_argument('carpeta', type=Path)
    ap.add_argument('--primero', action='store_true', help='Insertar al inicio de la lista en lugar de al final')
    ap.add_argument('--calidad', type=int, default=80)
    a = ap.parse_args()

    if not a.carpeta.is_dir():
        sys.exit(f'No existe la carpeta: {a.carpeta}')
    destino = SITIO / 'assets' / a.tipo
    destino.mkdir(parents=True, exist_ok=True)
    data_path = SITIO / 'assets' / 'data' / f'{a.tipo}.json'
    data = json.loads(data_path.read_text(encoding='utf-8'))
    key = 'galeria' if a.tipo == 'inspiracion' else 'memes'
    lista = data.setdefault(key, [])

    nuevos = []
    for f in sorted(a.carpeta.iterdir()):
        if f.suffix.lower() not in EXTS:
            continue
        try:
            im = ImageOps.exif_transpose(Image.open(f)).convert('RGB')
        except Exception as e:  # imagen dañada o formato raro
            print(f'  ✗ {f.name}: {e}')
            continue
        im.thumbnail((MAX, MAX), Image.LANCZOS)
        nombre = f'{slug(f.stem)}-{int(time.time() * 1000) % 100000}.webp'
        im.save(destino / nombre, 'WEBP', quality=a.calidad, method=6)
        kb = (destino / nombre).stat().st_size // 1024
        nuevos.append({'src': f'/assets/{a.tipo}/{nombre}', 'w': im.width, 'h': im.height, 'titulo': titulo(f.name)})
        print(f'  ✓ {f.name} → {nombre} ({im.width}×{im.height}, {kb} KB)')

    if not nuevos:
        sys.exit('No encontré imágenes (jpg, png o webp) en esa carpeta.')
    data[key] = nuevos + lista if a.primero else lista + nuevos
    data_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'\nListo: {len(nuevos)} imagen(es) agregadas a {a.tipo}. Ahora sube la carpeta sitio/ a Netlify.')


if __name__ == '__main__':
    main()
