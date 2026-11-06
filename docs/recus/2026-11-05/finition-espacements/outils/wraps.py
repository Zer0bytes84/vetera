import json,glob,os,collections,sys
A,B=sys.argv[1],sys.argv[2]
for f in sorted(glob.glob(f"{A}/*.json")):
  if f.endswith("_audit.json"): continue
  g=f.replace(A+"/",B+"/")
  if not os.path.exists(g): continue
  def idx(p):
    d=collections.defaultdict(list)
    for e in json.load(open(p)):
      if e["hasText"] and e["zone"]!="sidebar": d[(e["path"],e.get("text"))].append(e)
    return d
  a,b=idx(f),idx(g)
  for k,ea in a.items():
    eb=b.get(k)
    if not eb: continue
    for x,y in zip(ea,eb):
      lh=y["lh"] if isinstance(y["lh"],(int,float)) else y["fs"]*1.2
      ch=lambda e:e["h"]-float(e["pt"])-float(e["pb"])
      if ch(y)-ch(x)>=lh*0.8: print(os.path.basename(f)[:-5], f'{x["h"]}->{y["h"]}', k[1], "|", k[0][-70:])
