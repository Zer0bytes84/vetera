#!/usr/bin/env python3
"""planche-pages.py AVANT APRES SORTIE : par écran et par thème, 2 × 2 à mi-taille : pendant la lecture (haut), données
arrivées (bas) ; avant à gauche, après à droite."""
import os, sys
from PIL import Image, ImageDraw, ImageFont
avant, apres, sortie = sys.argv[1:4]
os.makedirs(sortie, exist_ok=True)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
noms = sorted({f.rsplit("-pendant-", 1)[0] for f in os.listdir(apres) if "-pendant-" in f})
for nom in noms:
    for mode in ("light", "dark"):
        files = [os.path.join(d, f"{nom}-{t}-{mode}.jpg") for t in ("pendant", "apres") for d in (avant, apres)]
        if not all(os.path.exists(f) for f in files): continue
        ims = [Image.open(f) for f in files]
        w, h = ims[0].width // 2, ims[0].height // 2
        out = Image.new("RGB", (w * 2 + 12, (h + 36) * 2 + 12), "white")
        d = ImageDraw.Draw(out)
        labels = ["Avant · pendant la lecture", "Après · pendant la lecture", "Avant · données arrivées", "Après · données arrivées"]
        for i, im in enumerate(ims):
            x = (i % 2) * (w + 12); y = (i // 2) * (h + 48)
            d.text((x + 6, y + 6), f"{labels[i]} · {nom} · {'clair' if mode == 'light' else 'sombre'}", fill="black", font=font)
            out.paste(im.resize((w, h)), (x, y + 36))
        out.save(os.path.join(sortie, f"{nom}-{'clair' if mode == 'light' else 'sombre'}.jpg"), quality=82)
print("ok", len(os.listdir(sortie)))
