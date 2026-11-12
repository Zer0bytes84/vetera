import sys, os
from PIL import Image, ImageChops
a, b = sys.argv[1], sys.argv[2]
out = sys.argv[3] if len(sys.argv) > 3 else None
bad = 0; n = 0
for f in sorted(os.listdir(a)):
    if not f.endswith(".png") or not os.path.exists(os.path.join(b, f)): continue
    n += 1
    x, y = Image.open(os.path.join(a, f)).convert("RGB"), Image.open(os.path.join(b, f)).convert("RGB")
    if x.size != y.size: print("SIZE", f, x.size, y.size); bad += 1; continue
    d = ImageChops.difference(x, y)
    for xx in range(300,312):
        for yy in range(26,50): d.putpixel((xx,yy),(0,0,0))  # masked: baseline sub-pixel noise of the header divider (measured master vs master)
    bbox = d.getbbox()
    if bbox:
        px = sum(1 for p in d.getdata() if p != (0,0,0))
        print("DIFF", f, "pixels:", px, "bbox:", bbox); bad += 1
        if out: os.makedirs(out, exist_ok=True); d.point(lambda v: 255 if v else 0).save(os.path.join(out, f))
    else: print("same", f)
print(f"{n} compared, {bad} differing")
