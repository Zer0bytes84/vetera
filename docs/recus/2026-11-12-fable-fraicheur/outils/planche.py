# usage: planche.py <sortie> <h|v> <etiquette:image> ...  -> planche etiquetee (AVANT / APRES)
import sys
from PIL import Image, ImageDraw, ImageFont
out, sens = sys.argv[1], sys.argv[2]; items = [a.split(":", 1) for a in sys.argv[3:]]
try: font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15)
except Exception: font = ImageFont.load_default()
tiles = []
for label, path in items:
    im = Image.open(path).convert("RGB"); t = Image.new("RGB", (im.width, im.height + 26), (20, 20, 22)); ImageDraw.Draw(t).text((8, 4), label, fill=(255, 255, 255), font=font); t.paste(im, (0, 26)); tiles.append(t)
gap = 6
if sens == "h": W = sum(t.width for t in tiles) + gap * (len(tiles) - 1); H = max(t.height for t in tiles)
else: W = max(t.width for t in tiles); H = sum(t.height for t in tiles) + gap * (len(tiles) - 1)
sheet = Image.new("RGB", (W, H), (120, 120, 120)); x = y = 0
for t in tiles:
    sheet.paste(t, (x, y))
    if sens == "h": x += t.width + gap
    else: y += t.height + gap
sheet.save(out, quality=90) if out.endswith(".jpg") else sheet.save(out)
