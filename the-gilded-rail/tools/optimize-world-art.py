"""Export generated world art as bounded WebP textures; retain prompts separately.
Usage: python tools/optimize-world-art.py input.json
Input entries: {name, source}. Source PNGs are never shipped.
"""
import json
import re
import sys
from pathlib import Path
from PIL import Image, ImageOps, ImageStat

root = Path(__file__).resolve().parents[1]
dest = root / 'public/assets/world'
dest.mkdir(parents=True, exist_ok=True)
sizes = {'club-rug': (1024, 1024), 'quarter-sawn-walnut': (1024, 1024), 'harbor-nocturne': (768, 512),
         'champions-study': (768, 512), 'worsted-cloth': (256, 256),
         'portrait-railway': (448, 672), 'portrait-botanicals': (448, 672)}
manifest = dest / 'manifest.json'
report = json.loads(manifest.read_text(encoding='utf-8')) if manifest.exists() else []
for entry in json.loads(Path(sys.argv[1]).read_text(encoding='utf-8')):
    name = entry['name']
    if not re.fullmatch(r'[a-z0-9-]+', name):
        raise ValueError(name)
    image = ImageOps.fit(Image.open(entry['source']).convert('RGB'),
                         sizes.get(name, (512, 512)), method=Image.Resampling.LANCZOS)
    if name == 'quarter-sawn-walnut':
        # Neutral albedo prevents brown-on-brown tinting of all catalog finishes.
        image = ImageOps.grayscale(image)
        mean = ImageStat.Stat(image).mean[0]
        image = image.point(lambda v: max(0, min(255, int(194 + (v - mean) * .75)))).convert('RGB')
    output = dest / (name + '.webp')
    image.save(output, 'WEBP', quality=84, method=6)
    report = [item for item in report if item['file'] != output.name]
    report.append({'file': output.name, 'width': image.width, 'height': image.height,
                   'bytes': output.stat().st_size})
(dest / 'manifest.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'assets': len(report), 'bytes': sum(x['bytes'] for x in report)}, indent=2))
