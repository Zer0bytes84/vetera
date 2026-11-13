# usage: diff.py <dirA> <dirB>  -> pixels differents par capture et boite englobante
import sys, os
from PIL import Image, ImageChops
import numpy as np
a, b = sys.argv[1], sys.argv[2]
for f in sorted(os.listdir(a)):
    if not f.endswith(".png") or not os.path.exists(os.path.join(b, f)): continue
    x, y = Image.open(os.path.join(a, f)).convert("RGB"), Image.open(os.path.join(b, f)).convert("RGB")
    if x.size != y.size: print("TAILLE", f, x.size, y.size); continue
    d = np.asarray(ImageChops.difference(x, y)).sum(axis=2) > 0
    n = int(d.sum()); ys, xs = np.where(d)
    side = int((xs < 248).sum()) if n else 0; head = int(((ys < 68) & (xs >= 248)).sum()) if n else 0
    print(f"{f:34} {n:8} px ({100*n/d.size:5.2f} %)  barre laterale {side:5}  en-tete {head:5}  boite {(xs.min(), ys.min(), xs.max(), ys.max()) if n else '-'}")
