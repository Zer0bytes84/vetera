# usage: bande.py <sortie> <echelle> <etiquette:image> ...  -> bande de film horizontale reduite
import sys
from PIL import Image, ImageDraw, ImageFont
out, scale = sys.argv[1], float(sys.argv[2]); items = [a.split(":", 1) for a in sys.argv[3:]]
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 13)
tiles = []
for label, path in items:
    im = Image.open(path).convert("RGB"); im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    t = Image.new("RGB", (im.width, im.height + 22), (20, 20, 22)); ImageDraw.Draw(t).text((6, 3), label, fill=(255, 255, 255), font=font); t.paste(im, (0, 22)); tiles.append(t)
W = sum(t.width for t in tiles) + 4 * (len(tiles) - 1); sheet = Image.new("RGB", (W, tiles[0].height), (120, 120, 120)); x = 0
for t in tiles: sheet.paste(t, (x, 0)); x += t.width + 4
sheet.save(out, quality=88)
