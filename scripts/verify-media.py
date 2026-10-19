"""Check shipped atlas geometry, bounded decoded working set and video duration/faststart."""
from pathlib import Path
import json
import struct
import subprocess
from PIL import Image

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'src/lib/motion-previews.json').read_text())
decoded = 0
compressed = 0
for name, frames in manifest.items():
    file = root / 'public' / frames['src'].lstrip('/')
    with Image.open(file) as image:
        assert image.size == (frames['columns'] * frames['frameWidth'], frames['rows'] * frames['frameHeight']), name
        decoded += image.width * image.height * 4
    compressed += file.stat().st_size
assert len(manifest) == 7
assert decoded + 1800 * 1600 * 4 <= 128 * 1024 * 1024
for file in (root / 'public/videos-web-v1').glob('*.mp4'):
    source = root / 'public/videos' / file.name
    def probe(path):
        return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', str(path)]))
    assert abs(float(probe(source)['format']['duration']) - float(probe(file)['format']['duration'])) < 0.05, file.name
    atoms = []
    with file.open('rb') as stream:
        while True:
            header = stream.read(8)
            if not header: break
            size, atom = struct.unpack('>I4s', header)
            atoms.append(atom)
            if size == 1:
                size = struct.unpack('>Q', stream.read(8))[0]
                stream.seek(size - 16, 1)
            elif size == 0: break
            else: stream.seek(size - 8, 1)
    assert atoms.index(b'moov') < atoms.index(b'mdat'), file.name
print(f'MEDIA_PASS sequences={len(manifest)} frames={sum(f["count"] for f in manifest.values())} bytes={compressed} decoded_with_detail={decoded + 1800*1600*4}')
