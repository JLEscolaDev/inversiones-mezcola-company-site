"""Rebuild complete, same-frame-count mobile atlases from the production sheets.
Requires Pillow already present on the build machine; no runtime dependency.
"""
from pathlib import Path
import json
import math
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / 'public/sprites-mobile-v4'
destination = root / 'public/motion-mobile-v1'
destination.mkdir(exist_ok=True)
counts = dict(forestToLake=92, lakeToWaterfall=92, waterfallToHouse=92,
              houseToRoom1=92, room1ToRoom2=127, room2ToRoom3=184, room3ToFinal=92)
manifest = {}
for name, count in counts.items():
    width, height, columns = 144, 256, 10
    rows = math.ceil(count / columns)
    atlas = Image.new('RGB', (width * columns, height * rows))
    for index in range(count):
        with Image.open(source / name / f'sheet_{index // 2 + 1:04}.jpg') as sheet:
            frame = sheet.crop(((index % 2) * 900, 0, (index % 2 + 1) * 900, 1600))
            frame = frame.resize((width, height), Image.Resampling.LANCZOS)
            atlas.paste(frame, ((index % columns) * width, (index // columns) * height))
    output = destination / f'{name}.avif'
    atlas.save(output, 'AVIF', quality=32, speed=6)
    manifest[name] = dict(src=f'/motion-mobile-v1/{name}.avif', count=count,
                          frameWidth=width, frameHeight=height, columns=columns, rows=rows)
    print(f'{name}: {count} frames, {output.stat().st_size} bytes', flush=True)
(root / 'src/lib/motion-previews.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('Complete motion bytes:', sum(f.stat().st_size for f in destination.glob('*.avif')))
