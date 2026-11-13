import json, sys, collections, re
d = json.load(open(sys.argv[1])); C = collections.Counter
def lum(c):
    p=[float(x) for x in re.findall(r"[\d.]+", c)[:3]]
    f=lambda v:(v/255/12.92) if v/255<=0.03928 else ((v/255+0.055)/1.055)**2.4
    return 0.2126*f(p[0])+0.7152*f(p[1])+0.0722*f(p[2])
def ratio(a,b):
    x,y=lum(a),lum(b); return (max(x,y)+0.05)/(min(x,y)+0.05)
light=[(k,e) for k,v in d.items() if k.startswith("light") for e in v]
print("== familles", C(e["fam"] for _,e in light).most_common())
print("== tailles", sorted(C(e["size"] for _,e in light).items(), key=lambda x: float(x[0][:-2])))
print("== taille/graisse", sorted(C((e["size"],e["weight"]) for _,e in light).items(), key=lambda x:(float(x[0][0][:-2]),x[0][1])))
print("== tracking par taille"); 
for (s,ls),n in sorted(C((e["size"],e["ls"]) for _,e in light).items(), key=lambda x:(float(x[0][0][:-2]),x[0][1])): print("  ",s,ls,n)
print("== interligne par taille")
for (s,lh),n in sorted(C((e["size"],e["lh"]) for _,e in light).items(), key=lambda x:(float(x[0][0][:-2]),x[0][1])): print("  ",s,lh,n)
print("== num", C(e["num"] for _,e in light).most_common(), "feat", C(e["feat"] for _,e in light).most_common(), "opsz", C(e["opsz"] for _,e in light).most_common(), "vari", C(e["vari"] for _,e in light).most_common(5), "tr", C(e["tr"] for _,e in light).most_common(), "wrap", C(e["wrap"] for _,e in light).most_common())
print("== chiffres sans tabular, par zone", C((k.split("/")[1],e["zone"]) for k,e in light if e["digits"] and "tabular" not in e["num"] and "tnum" not in e["feat"]).most_common(30))
for mode in ("light","dark"):
    low=collections.defaultdict(list)
    for k,v in d.items():
        if not k.startswith(mode): continue
        for e in v:
            r=ratio(e["color"],e["bg"]); big=float(e["size"][:-2])>=18.66 or (float(e["size"][:-2])>=14 and int(e["weight"])>=700)
            if r < (3 if big else 4.5): low[(e["color"],e["bg"],e["size"])].append((round(r,2),k.split("/")[1],e["t"]))
    print("== contraste sous AA", mode, len(low))
    for key,v in sorted(low.items(), key=lambda x:-len(x[1]))[:18]: print("  ",key,len(v),v[0])
print("== couleurs texte clair", C(e["color"] for _,e in light).most_common(25))
