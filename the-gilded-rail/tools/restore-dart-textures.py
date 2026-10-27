"""Restore the supplied dartboard's original color maps without replacing its mesh.
Usage: python tools/restore-dart-textures.py '3D assets/dartboard_cabinet.glb'
Packed geometry and optimized normal/roughness maps are retained. No resampling.
"""
import hashlib
import io
import json
import struct
import sys
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
target = root / 'public/assets/models/dartcab.glb'

def read_glb(path):
    data = Path(path).read_bytes()
    magic, version, size = struct.unpack_from('<III', data)
    assert magic == 0x46546c67 and version == 2 and size == len(data)
    length = struct.unpack_from('<I', data, 12)[0]
    return json.loads(data[20:20+length]), data[28+length:]

if sys.argv[1]=='--check':
    model, binary=read_glb(target)
    provenance=json.loads((root/'docs/dartboard-textures.json').read_text(encoding='utf-8'))
    expected={entry['material']:entry for entry in provenance['colorMaps']}
    for material in model['materials']:
        texture=model['textures'][material['pbrMetallicRoughness']['baseColorTexture']['index']]
        image=model['images'][texture['extensions']['EXT_texture_webp']['source']]
        view=model['bufferViews'][image['bufferView']];offset=view.get('byteOffset',0)
        payload=binary[offset:offset+view['byteLength']];record=expected.pop(material['name'])
        assert hashlib.sha256(payload).hexdigest()==record['shippedSha256']
        assert hashlib.sha256(Image.open(io.BytesIO(payload)).convert('RGBA').tobytes()).hexdigest()==record['decodedPixelSha256']
    assert not expected
    print('4 original dartboard color maps verified from the shipped GLB');sys.exit(0)

original, original_bin = read_glb(sys.argv[1])
current, current_bin = read_glb(target)
assert len(original['materials'])==len(current['materials'])
replacements = {}
report = []
for source, destination in zip(original['materials'], current['materials']):
    assert source['name'] == destination['name']
    source_id = original['textures'][source['pbrMetallicRoughness']['baseColorTexture']['index']]['source']
    destination_texture=current['textures'][destination['pbrMetallicRoughness']['baseColorTexture']['index']]
    destination_id=destination_texture.get('source')
    if destination_id is None:destination_id=destination_texture['extensions']['EXT_texture_webp']['source']
    image = original['images'][source_id]
    view = original['bufferViews'][image['bufferView']]
    offset = view.get('byteOffset', 0)
    payload = original_bin[offset:offset+view['byteLength']]
    original_hash=hashlib.sha256(payload).hexdigest()
    picture=Image.open(io.BytesIO(payload));pixels=picture.convert('RGBA').tobytes()
    optimized=io.BytesIO();picture.save(optimized,'WEBP',lossless=True,quality=100,method=6,exact=True)
    payload=optimized.getvalue()
    assert Image.open(io.BytesIO(payload)).convert('RGBA').tobytes()==pixels
    replacements[current['images'][destination_id]['bufferView']] = payload
    current['images'][destination_id]['mimeType']='image/webp'
    texture=current['textures'][destination['pbrMetallicRoughness']['baseColorTexture']['index']]
    texture.setdefault('extensions',{})['EXT_texture_webp']={'source':destination_id}
    texture.pop('source',None)
    report.append({'material': source['name'], 'bytes': len(payload), 'sourceSha256':original_hash,
                   'shippedSha256':hashlib.sha256(payload).hexdigest(),'decodedPixelSha256':hashlib.sha256(pixels).hexdigest()})

packed = bytearray()
for index, view in enumerate(current['bufferViews']):
    offset = view.get('byteOffset', 0)
    payload = replacements.get(index, current_bin[offset:offset+view['byteLength']])
    packed.extend(b'\0' * (-len(packed) % 4))
    view['byteOffset'], view['byteLength'] = len(packed), len(payload)
    packed.extend(payload)
current['buffers'][0]['byteLength'] = len(packed)
for field in ['extensionsUsed','extensionsRequired']:
    current.setdefault(field,[])
    if 'EXT_texture_webp' not in current[field]:current[field].append('EXT_texture_webp')
packed.extend(b'\0' * (-len(packed) % 4))
metadata = json.dumps(current, separators=(',', ':')).encode('utf-8')
metadata += b' ' * (-len(metadata) % 4)
output = struct.pack('<III', 0x46546c67, 2, 28+len(metadata)+len(packed))
output += struct.pack('<II', len(metadata), 0x4e4f534a) + metadata
output += struct.pack('<II', len(packed), 0x004e4942) + packed
target.write_bytes(output)
(root / 'docs/dartboard-textures.json').write_text(json.dumps({'source': Path(sys.argv[1]).name, 'colorMaps': report}, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'restoredColorMaps': len(report), 'modelBytes': len(output)}, indent=2))
