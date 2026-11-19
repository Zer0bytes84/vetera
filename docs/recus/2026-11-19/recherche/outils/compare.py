# Compare, état par état et thème par thème, les items de la palette avant et après : valeurs (data-value), groupes, onglets.
import json,sys
a=json.load(open('avant/releve.json')); b=json.load(open('apres/releve.json'))
out=[]
for mode in ['light','dark']:
  for st in a[mode]:
    ia=a[mode][st]['inventaire']; ib=b[mode].get(st,{}).get('inventaire')
    if not ib: out.append(f'{mode} {st}: ABSENT après'); continue
    va=[i['value'] for g in ia['groups'] for i in g['items']]; vb=[i['value'] for g in ib['groups'] for i in g['items']]
    sa,sb=set(va),set(vb)
    ga=[g['titre'] for g in ia['groups']]; gb=[g['titre'] for g in ib['groups']]
    ta=[t['texte'] for t in ia['tabs']]; tb=[t['texte'] for t in ib['tabs']]
    line=f'{mode:5} {st:18} items {len(va):2}→{len(vb):2}'
    if sa-sb: line+=f' | RETIRÉS {sorted(sa-sb)}'
    if sb-sa: line+=f' | AJOUTÉS {sorted(sb-sa)}'
    if ga!=gb: line+=f' | groupes {ga} → {gb}'
    if ta!=tb: line+=f' | onglets {ta}→{tb}'
    if (ia['vide'] or '')!=(ib['vide'] or ''): line+=f' | vide {ia["vide"]!r}→{ib["vide"]!r}'
    if ia['pied']!=ib['pied']: line+=f' | pied {ia["pied"]!r}→{ib["pied"]!r}'
    act_a=[i['value'] for g in ia['groups'] for i in g['items'] if i['actif']]; act_b=[i['value'] for g in ib['groups'] for i in g['items'] if i['actif']]
    if act_a!=act_b: line+=f' | courant {act_a}→{act_b}'
    out.append(line)
print('\n'.join(out))
