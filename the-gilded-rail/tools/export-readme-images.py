"""Export actual browser captures for the GitHub gallery after world/UI reviews.
Run world-review.mjs and ui-review.mjs --readme first. Requires Pillow.
"""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
dest = root / 'docs/screenshots'
dest.mkdir(parents=True, exist_ok=True)
captures = {'club-room': 'world_room', 'pocket-detail': 'world_pocket',
            'ball-return': 'world_return', 'clock': 'world_clock', 'rain': 'world_window',
            'equipment': 'review_1440x1000_founders-cue', 'club-menu': 'review_1440x1000_menu'}
for name, source in captures.items():
    image = Image.open(root / 'tools' / ('_shot_' + source + '.png')).convert('RGB')
    image.thumbnail((1200, 1000), Image.Resampling.LANCZOS)
    output = dest / (name + '.webp')
    image.save(output, 'WEBP', quality=86, method=6)
    print(f'{output.relative_to(root)}: {output.stat().st_size:,} bytes')
