#!/usr/bin/env python3
"""planche.py AVANT APRES SORTIE : une image « avant | après » par modale, à mi-taille, légendée."""
import os, sys
from PIL import Image, ImageDraw, ImageFont
avant, apres, sortie = sys.argv[1:4]
os.makedirs(sortie, exist_ok=True)
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)
except OSError:
    font = ImageFont.load_default()
for nom in sorted(os.listdir(apres)):
    if not nom.endswith(".jpg") or "-sombre" in nom: continue
    a = os.path.join(avant, nom); b = os.path.join(apres, nom)
    if not os.path.exists(a): continue
    ia, ib = Image.open(a), Image.open(b)
    w, h = ia.width // 2, ia.height // 2
    out = Image.new("RGB", (w * 2 + 12, h + 40), "white")
    out.paste(ia.resize((w, h)), (0, 40)); out.paste(ib.resize((w, h)), (w + 12, 40))
    d = ImageDraw.Draw(out)
    d.text((8, 8), f"Avant (master) · {nom[:-4]}", fill="black", font=font)
    d.text((w + 20, 8), "Après", fill="black", font=font)
    out.save(os.path.join(sortie, nom), quality=78)
print("ok")
