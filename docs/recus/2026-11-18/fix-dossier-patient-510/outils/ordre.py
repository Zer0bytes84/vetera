# Pour chaque morceau qui importe (directement) vendor-charts ou le morceau en cycle, l'ordre dans lequel il les importe.
import os, re, sys
d = sys.argv[1] + "/assets"
src = {f: open(os.path.join(d, f), encoding="utf8", errors="replace").read() for f in os.listdir(d) if f.endswith(".js")}
order = {f: re.findall(r'(?:from|import)\s*["\']\./([^"\']+\.js)["\']', s) for f, s in src.items()}
c = [f for f in src if f.startswith("vendor-charts")][0]
p = [f for f in src if f.startswith("isPlainObject")][0]
for f, o in sorted(order.items()):
    if f in (c, p): continue
    hits = [x for x in o if x in (c, p)]
    if hits:
        print(f"{f[:40]:40} {' puis '.join('CHARTS' if h == c else 'CYCLE' for h in hits)}")
