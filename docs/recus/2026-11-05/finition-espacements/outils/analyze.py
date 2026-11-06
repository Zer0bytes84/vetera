"""Audit of a bench run: histograms of computed values, off-scale list.
usage: python3 analyze.py <dir> [out.json]"""
import json, sys, glob, os, collections, re

D = sys.argv[1]
SPACE = {0, 1, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64}
FONT = {12, 13, 14, 16, 18, 24}
RADIUS = {0, 4, 6, 8, 10, 12, 9999}
CONTROL_H = {20, 24, 28, 32, 36, 40, 44, 48}

def num(v):
    try: return float(v)
    except (TypeError, ValueError): return None

def on_space(v):
    v = abs(v)
    return round(v) in SPACE and abs(v - round(v)) < 0.05 or v > 64

stats = {k: collections.Counter() for k in ["padding", "margin", "gap", "font", "weight", "lh_ratio", "radius", "control_h", "bg", "border", "color", "smoothing", "family", "ls"]}
offs = collections.defaultdict(lambda: collections.Counter())  # kind -> (value, view, path) -> n
per_view = collections.defaultdict(lambda: collections.Counter())
total = collections.Counter()

for f in sorted(glob.glob(os.path.join(D, "*.json"))):
    view = os.path.basename(f)[:-5]
    for e in json.load(open(f)):
        if e.get("zone") == "sidebar":
            continue
        p = e["path"]
        for k, kind in (("pt", "padding"), ("pr", "padding"), ("pb", "padding"), ("pl", "padding"), ("mt", "margin"), ("mr", "margin"), ("mb", "margin"), ("ml", "margin")):
            v = num(e[k])
            if v is None or v == 0: continue
            stats[kind][round(v, 2)] += 1
            total[kind] += 1
            if not on_space(v):
                offs[kind][(round(v, 2), view, p)] += 1
                per_view[view][kind] += 1
        if e["display"] in ("flex", "inline-flex", "grid", "inline-grid"):
            for k in ("rowGap", "colGap"):
                v = num(e[k])
                if v is None or v == 0: continue
                stats["gap"][round(v, 2)] += 1; total["gap"] += 1
                if not on_space(v):
                    offs["gap"][(round(v, 2), view, p)] += 1; per_view[view]["gap"] += 1
        if e["hasText"]:
            fs = num(e["fs"])
            stats["font"][fs] += 1; total["font"] += 1
            stats["weight"][e["fw"]] += 1
            stats["family"][e["ff"]] += 1
            stats["smoothing"][e["smoothing"]] += 1
            stats["ls"][e["ls"]] += 1
            if fs not in FONT:
                offs["font"][(fs, view, p)] += 1; per_view[view]["font"] += 1
            lh = num(e["lh"])
            if lh and fs:
                stats["lh_ratio"][round(lh / fs, 2)] += 1
                if lh % 2 and lh != round(lh) or (lh != round(lh)):
                    offs["lh_frac"][(f"{fs}/{lh}", view, p)] += 1
            stats["color"][e["color"]] += 1
        rr = [num(x) for x in e["radius"]]
        for r in set(rr):
            if r is None or r == 0: continue
            rk = 9999 if r >= 999 or (r >= min(e["w"], e["h"]) / 2 - 0.5) else round(r, 2)
            stats["radius"][rk] += 1; total["radius"] += 1
            if rk not in RADIUS:
                offs["radius"][(rk, view, p)] += 1; per_view[view]["radius"] += 1
        if e["interactive"] and e["tag"] != "a" and e["h"] >= 16:
            stats["control_h"][e["h"]] += 1; total["control_h"] += 1
            if round(e["h"]) not in CONTROL_H or abs(e["h"] - round(e["h"])) > 0.05:
                offs["control_h"][(e["h"], view, p)] += 1; per_view[view]["control_h"] += 1
        if e["bg"] not in ("rgba(0, 0, 0, 0)", "transparent"):
            stats["bg"][(view.rsplit("-", 1)[1], e["bg"])] += 1
        for b in e["border"]:
            if b:
                stats["border"][(view.rsplit("-", 1)[1], b)] += 1

def top_offs(kind, n=40):
    agg = collections.defaultdict(lambda: [0, set()])
    for (v, view, p), c in offs[kind].items():
        key = (v, p)
        agg[key][0] += c; agg[key][1].add(view)
    rows = sorted(agg.items(), key=lambda kv: -kv[1][0])[:n]
    return [{"value": k[0], "path": k[1], "count": a[0], "views": sorted(a[1])} for k, a in rows]

def ratio(kind):
    off = sum(offs[kind].values()); t = total[kind]
    return {"total": t, "off": off, "on_pct": round(100 * (1 - off / t), 1) if t else None}

report = {
    "on_scale": {k: ratio(k) for k in ["padding", "margin", "gap", "font", "radius", "control_h"]},
    "hist": {k: sorted(((str(a), b) for a, b in stats[k].items()), key=lambda x: -x[1])[:30] for k in ["padding", "margin", "gap", "font", "weight", "lh_ratio", "radius", "control_h", "family", "smoothing", "ls", "color"]},
    "bg": sorted(((str(a), b) for a, b in stats["bg"].items()), key=lambda x: -x[1])[:40],
    "border": sorted(((str(a), b) for a, b in stats["border"].items()), key=lambda x: -x[1])[:40],
    "offs": {k: top_offs(k) for k in offs},
    "per_view": {v: dict(c) for v, c in sorted(per_view.items())},
}
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(D, "_audit.json")
json.dump(report, open(out, "w"), indent=1, ensure_ascii=False)
print(json.dumps(report["on_scale"], indent=1))
for k in ["padding", "margin", "gap", "font", "weight", "radius", "control_h", "family", "smoothing", "lh_ratio"]:
    print(k, report["hist"][k][:22])
