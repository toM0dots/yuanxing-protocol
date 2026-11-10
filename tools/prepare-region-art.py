"""Encode the approved region artwork for the game without changing full-size pixels."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / 'output/nine-regions-multiview-v1'
DEST = ROOT / 'dist/assets/region-archive-v1'
DEST.mkdir(parents=True, exist_ok=True)
source_manifest = json.loads((SOURCE / 'manifest.json').read_text())

def encode(item):
    region, image = item
    stem = f"{region['number']:02d}-{image['view']}"
    source = SOURCE / image['file']
    full, thumb = DEST / (stem + '.webp'), DEST / (stem + '-thumb.webp')
    subprocess.run(['cwebp', '-quiet', '-lossless', '-m', '4', str(source), '-o', str(full)], check=True)
    subprocess.run(['cwebp', '-quiet', '-q', '84', '-resize', '480', '0', str(source), '-o', str(thumb)], check=True)
    return {'region': region['number'] - 1, 'view': image['view'], 'src': 'assets/region-archive-v1/' + full.name,
            'thumb': 'assets/region-archive-v1/' + thumb.name, 'width': image['width'], 'height': image['height'],
            'bytes': full.stat().st_size, 'thumbnailBytes': thumb.stat().st_size,
            'source': image['file'], 'sourceSHA256': hashlib.sha256(source.read_bytes()).hexdigest()}

with ThreadPoolExecutor(max_workers=3) as pool:
    images = list(pool.map(encode, [(r, i) for r in source_manifest['regions'] for i in r['images']]))
regions = [{'id': r['number'] - 1, 'name': r['name'], 'views': [i for i in images if i['region'] == r['number'] - 1]}
           for r in source_manifest['regions']]
catalog = {'generator': 'built-in image_gen', 'fullSizeEncoding': 'lossless WebP, original dimensions',
           'sourceManifest': str(SOURCE / 'manifest.json'), 'regions': regions}
(DEST / 'manifest.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
(ROOT / 'dist/exo-region-data.js').write_text('/* Approved nine-region image catalog. No image preloads. */\nconst ExoRegionData = '
    + json.dumps(regions, ensure_ascii=False, separators=(',', ':'))
    + ';\nif(typeof module!=="undefined")module.exports=ExoRegionData;\n')
print(json.dumps({'images': len(images), 'fullBytes': sum(i['bytes'] for i in images),
                  'thumbnailBytes': sum(i['thumbnailBytes'] for i in images)}))
