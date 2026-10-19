"""Produce versioned H.264 web videos; originals remain unchanged. Requires ffmpeg."""
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1]
output = root / 'public/videos-web-v1'
output.mkdir(exist_ok=True)
for source in (root / 'public/videos').glob('*.mp4'):
    target = output / source.name
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source),
                    '-an', '-vf', 'scale=-2:720', '-c:v', 'libx264', '-preset', 'slow',
                    '-crf', '24', '-maxrate', '1600k', '-bufsize', '3200k', '-pix_fmt',
                    'yuv420p', '-movflags', '+faststart', str(target)], check=True)
    print(f'{source.name}: {source.stat().st_size} -> {target.stat().st_size}', flush=True)
