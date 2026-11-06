import json,glob,os,sys
S={0,1,2,4,6,8,12,16,20,24,32,40,48,56,64}
D=sys.argv[1]
def ok(v): v=abs(v); return v>64 or (abs(v-round(v))<0.05 and round(v) in S)
rows=[]
for f in sorted(glob.glob(f"{D}/*-light.json")):
  t=o=0
  for e in json.load(open(f)):
    if e["zone"] in("sidebar","header"): continue
    vals=[e[k] for k in("pt","pr","pb","pl","mt","mr","mb","ml")]
    if e["display"] in("flex","inline-flex","grid","inline-grid"): vals+=[e["rowGap"],e["colGap"]]
    for v in vals:
      try: v=float(v)
      except: continue
      if v==0: continue
      t+=1; o+= not ok(v)
  rows.append((os.path.basename(f)[:-11],t,o,round(100*(1-o/t),1)))
for r in sorted(rows,key=lambda r:-r[3]): print(f"{r[0]:20} {r[1]:5} {r[2]:4} {r[3]}%")
