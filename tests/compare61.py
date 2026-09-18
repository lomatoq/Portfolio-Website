"""Compare visual61.cjs output; requires Pillow. Allows one 8-bit rounding level."""
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
import sys

folder = Path(sys.argv[1] if len(sys.argv) > 1 else 'flow61-visual')
originals = sorted(folder.glob('*-baseline.png'))
assert originals, f'No comparison frames in {folder}'
failures = []
for original in originals:
    candidate = original.with_name(original.name.replace('-baseline', '-current'))
    with Image.open(original) as a, Image.open(candidate) as b:
        assert a.size == b.size, original.name
        diff = ImageChops.difference(a.convert('RGB'), b.convert('RGB'))
        maximum = max(v[1] for v in diff.getextrema())
        mean = sum(ImageStat.Stat(diff).mean) / 3
        print(f'{original.name}: max={maximum}, mean={mean:.8f}')
        if maximum > 1:
            failures.append(original.name)
assert not failures, f'Visual differences require inspection: {failures}'
print(f'{len(originals)} pairs passed (maximum channel difference <= 1/255).')
