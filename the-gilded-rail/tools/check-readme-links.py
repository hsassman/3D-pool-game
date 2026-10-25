"""Check repository-relative Markdown links and HTML image sources in both READMEs."""
import re
from pathlib import Path
from urllib.parse import unquote, urlsplit

root = Path(__file__).resolve().parents[2]
count = 0
for readme in [root / 'README.md', root / 'the-gilded-rail/README.md']:
    source = readme.read_text(encoding='utf-8')
    links = re.findall(r'\]\(([^)]+)\)', source) + re.findall(r'<img[^>]+src="([^"]+)"', source)
    for link in links:
        path = urlsplit(link).path
        if not path or urlsplit(link).scheme:
            continue
        target = readme.parent / unquote(path)
        if not target.exists():
            raise SystemExit(f'Broken README link: {readme.relative_to(root)} -> {link}')
        count += 1
print(f'{count} local README links and image references passed')
