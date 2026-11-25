import sys,json
for l in sys.stdin:
  try: n,m,j=l.split(' ',2); d=json.loads(j)
  except Exception: print(l.strip()[:300]); continue
  print(n, m, d['squelette'], '| faux:',[e for e in d['etatsFauxPendant'] if 'Baitari' not in e and 'module' not in e], '| bandes pendant',d['bandesPendant'],'après',d['bandesApres'], '| régions pendant', d.get('regionsPendant'), 'après', d.get('regionsApres'), '| H',d['hauteurPendantSquelette'], d['hauteurApres'], '| CLS',d['decalageCumule'], [ (x['t'],x['v'],(x['n'] or [''])[0][:40]) for x in d['decalages']], d['erreurs'][:1])
