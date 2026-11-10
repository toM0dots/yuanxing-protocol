"""Losslessly repack existing 2K scan channels; no resizing/re-encoding loss."""
from pathlib import Path
from PIL import Image, ImageChops
ROOT=Path(__file__).resolve().parents[1]/'dist/assets'
for folder,prefix,kind in [('hangar-v1','panel','normal'),('hangar-v1','metal','normal'),('ashland-v1','ash','normal'),('canyon-v2','rock','diff'),('canyon-v2','trail','diff')]:
    rgb=Image.open(ROOT/folder/f'{prefix}-{kind}.jpg').convert('RGB')
    channel='rough' if kind=='normal' else 'height'
    scalar=Image.open(ROOT/folder/f'{prefix}-{channel}.jpg').convert('RGB').getchannel('G' if channel=='rough' else 'R')
    assert rgb.size==scalar.size
    packed=Image.merge('RGBA',(*rgb.split(),scalar))
    path=ROOT/folder/f'{prefix}-{kind}-{channel}.png'
    packed.save(path,compress_level=9)
    check=Image.open(path)
    assert ImageChops.difference(check.convert('RGB'),rgb).getbbox() is None
    assert ImageChops.difference(check.getchannel('A'),scalar).getbbox() is None
    print(path.name, path.stat().st_size, 'all source bytes retained')
