"""Validate full-resolution mobile frames, fidelity, short GOPs, and desktop faststart."""
from pathlib import Path
import json
import re
import struct
import subprocess

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'src/lib/mobile-motion.json').read_text())

def probe(path):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams',
                                               '-show_format', '-of', 'json', str(path)]))

def faststart(file):
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

scores = {}
for name, motion in manifest.items():
    file = root / 'public' / motion['src'].lstrip('/')
    data = probe(file)
    stream = data['streams'][0]
    assert stream['codec_name'] == 'h264' and stream['has_b_frames'] == 0, name
    assert (stream['width'], stream['height']) == (900, 1600), name
    assert int(stream['nb_frames']) == motion['count'], name
    assert stream['r_frame_rate'] == '18/1', name
    assert file.stat().st_size == motion['bytes'], name
    faststart(file)
    frames = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v',
          '-show_frames', '-show_entries', 'frame=key_frame', '-of', 'json', str(file)]))['frames']
    keys = [i for i, frame in enumerate(frames) if frame['key_frame']]
    assert keys[0] == 0 and max(b - a for a, b in zip(keys, keys[1:])) <= 12, name
    result = subprocess.run(['ffmpeg', '-hide_banner', '-framerate', '9', '-i',
        str(root / 'public/sprites-mobile-v4' / name / 'sheet_%04d.jpg'), '-i', str(file),
        '-filter_complex', '[0:v]untile=2x1,format=yuv420p,setpts=N/(18*TB)[ref];'
        '[1:v]setpts=N/(18*TB)[test];[ref][test]ssim',
        '-frames:v', str(motion['count']), '-f', 'null', '-'], capture_output=True, text=True, check=True)
    score = float(re.search(r'All:([\d.]+)', result.stderr).group(1))
    assert score >= 0.97, (name, score)
    scores[name] = score
assert len(manifest) == 7 and sum(m['count'] for m in manifest.values()) == 771
assert not list((root / 'public/motion-mobile-v1').glob('*')), 'Rejected144px tier must not ship'
for file in (root / 'public/videos-web-v1').glob('*.mp4'):
    source = root / 'public/videos' / file.name
    assert abs(float(probe(source)['format']['duration']) - float(probe(file)['format']['duration'])) < 0.05, file.name
    faststart(file)
print(f'MEDIA_PASS frames=771 resolution=900x1600 bytes={sum(m["bytes"] for m in manifest.values())} min_ssim={min(scores.values()):.6f}')
print(json.dumps(scores, indent=2))
