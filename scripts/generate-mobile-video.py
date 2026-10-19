"""Encode the existing771 portrait frames at their original900x1600 resolution.
Short closed GOPs and no B-frames bound decoding work for paused, bidirectional seeks.
No resizing, low-resolution fallback, or changes to the original frame order.
"""
from pathlib import Path
import json
import subprocess

root = Path(__file__).resolve().parents[1]
counts = dict(forestToLake=92, lakeToWaterfall=92, waterfallToHouse=92,
              houseToRoom1=92, room1ToRoom2=127, room2ToRoom3=184, room3ToFinal=92)
output = root / 'public/motion-mobile-v2'
output.mkdir(exist_ok=True)
manifest = {}
for name, count in counts.items():
    target = output / f'{name}.mp4'
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-framerate', '9',
                    '-i', str(root / 'public/sprites-mobile-v4' / name / 'sheet_%04d.jpg'),
                    '-vf', 'untile=2x1,format=yuv420p', '-frames:v', str(count), '-r', '18',
                    '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-g', '12',
                    '-keyint_min', '12', '-sc_threshold', '0', '-bf', '0',
                    '-movflags', '+faststart', str(target)], check=True)
    manifest[name] = dict(src=f'/motion-mobile-v2/{name}.mp4', count=count, fps=18,
                          width=900, height=1600, bytes=target.stat().st_size)
    print(f'{name}: {target.stat().st_size}', flush=True)
(root / 'src/lib/mobile-motion.json').write_text(json.dumps(manifest, indent=2) + '\n')
