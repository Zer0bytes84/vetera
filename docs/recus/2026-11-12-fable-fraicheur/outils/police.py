import sys
from fontTools.ttLib import TTFont
f=TTFont(sys.argv[1])
print("axes",[(a.axisTag,a.minValue,a.defaultValue,a.maxValue) for a in f["fvar"].axes])
gsub=f["GSUB"].table
feats={}
for fr in gsub.FeatureList.FeatureRecord: feats.setdefault(fr.FeatureTag,set()).update(fr.Feature.LookupListIndex)
print("features",sorted(feats))
def subs(tag):
    out={}
    for i in feats.get(tag,[]):
        for st in gsub.LookupList.Lookup[i].SubTable:
            st=getattr(st,"ExtSubTable",st)
            if hasattr(st,"mapping"): out.update(st.mapping)
    return out
for t in ("tnum","case","zero","ss01","ss02","ss03","cv01","cv05","cv08","cv10","cv11","frac"):
    m=subs(t); print(t,len(m),list(m.items())[:60])
hm=f["hmtx"]
for g in ("hyphen","hyphen.tf","one","one.tf","zero","zero.tf","space","period","period.tf","colon","colon.tf","uni00A0","uni202F"):
    if g in hm.metrics: print(g,hm[g])
print(f["OS/2"].sxHeight, f["OS/2"].sCapHeight, f["head"].unitsPerEm)
