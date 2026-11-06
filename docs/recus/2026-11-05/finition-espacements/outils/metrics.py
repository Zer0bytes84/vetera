import sys
from fontTools.ttLib import TTFont
for label, p in [a.split("=",1) for a in sys.argv[1:]]:
    f = TTFont(p); upm = f["head"].unitsPerEm; os2 = f["OS/2"]
    xh = getattr(os2, "sxHeight", 0); cap = getattr(os2, "sCapHeight", 0)
    cmap = f.getBestCmap(); hm = f["hmtx"]
    w = lambda s: sum(hm[cmap[ord(c)]][0] for c in s if ord(c) in cmap) / upm
    sample = "Consultation de suivi, vaccin 12/03 : 4 500 DA"
    feats = set()
    if "GSUB" in f:
        feats = {r.FeatureTag for r in f["GSUB"].table.FeatureList.FeatureRecord}
    axes = [a.axisTag for a in f["fvar"].axes] if "fvar" in f else []
    print(f"{label:16} upm={upm} xh/em={xh/upm:.3f} cap/em={cap/upm:.3f} xh@12={12*xh/upm:.2f}px xh@13={13*xh/upm:.2f}px width@13={13*w(sample):.0f}px axes={axes} tnum={'tnum' in feats} ss={sorted(x for x in feats if x.startswith(('ss','cv')))[:12]}")
