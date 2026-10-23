"""Convert imagegen outputs into bounded, metadata-free UI WebP assets.

Usage: python tools/optimize-ui-art.py path/to/input.json
Input: [{"name": "portrait-bk1", "source": "absolute/path/to/output.png"}, ...]
Requires Pillow. Raw generation outputs remain outside the shipped application.
"""
import json
import re
import sys
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "public/assets/ui/collection"


def optimize(entries):
    DEST.mkdir(parents=True, exist_ok=True)
    manifest = DEST / "manifest.json"
    report = {item["file"]: item for item in json.loads(manifest.read_text(encoding="utf-8"))} if manifest.exists() else {}
    for entry in entries:
        name = entry["name"]
        if not re.fullmatch(r"[a-z0-9_-]+", name):
            raise ValueError(f"Invalid asset name: {name}")
        portrait = name.startswith("portrait-")
        size = (448, 448) if portrait else (384, 256) if "detail-v3" in name else (768, 512)
        with Image.open(entry["source"]) as original:
            image = ImageOps.exif_transpose(original).convert("RGB")
            image = ImageOps.fit(image, size, method=Image.Resampling.LANCZOS)
            output = DEST / f"{name}.webp"
            image.save(output, "WEBP", quality=79 if portrait else 80, method=6)
        report[output.name] = {"file": output.name, "width": size[0], "height": size[1], "bytes": output.stat().st_size}
    manifest.write_text(json.dumps(list(report.values()), indent=2) + "\n", encoding="utf-8")
    print(f"Collection: {len(report)} images, {sum(item['bytes'] for item in report.values()) / 1024:.0f} KiB total")


if __name__ == "__main__":
    optimize(json.loads(Path(sys.argv[1]).read_text(encoding="utf-8")))
