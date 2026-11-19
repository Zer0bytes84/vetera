# Tous les cycles entre morceaux d'un build (composantes fortement connexes de plus d'un morceau), et les imports du point d'entree.
import os, re, sys
d = sys.argv[1] + "/assets"
src = {f: open(os.path.join(d, f), encoding="utf8", errors="replace").read() for f in os.listdir(d) if f.endswith(".js")}
g = {f: set(re.findall(r'(?:from|import)\s*["\']\./([^"\']+\.js)["\']', s)) & set(src) for f, s in src.items()}
index, low, st, on, sccs, n = {}, {}, [], set(), [], [0]
import sys as _s; _s.setrecursionlimit(10000)
def visit(v):
    index[v] = low[v] = n[0]; n[0] += 1; st.append(v); on.add(v)
    for w in g[v]:
        if w not in index: visit(w); low[v] = min(low[v], low[w])
        elif w in on: low[v] = min(low[v], index[w])
    if low[v] == index[v]:
        comp = []
        while True:
            w = st.pop(); on.discard(w); comp.append(w)
            if w == v: break
        if len(comp) > 1: sccs.append(comp)
for v in g:
    if v not in index: visit(v)
print("cycles :", sccs if sccs else "aucun")
entry = [f for f in src if f.startswith("index-")]
for e in entry:
    print("entree", e, "importe vendor-charts :", any(x.startswith("vendor-charts") for x in g[e]))
