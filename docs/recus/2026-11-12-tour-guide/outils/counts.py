import sqlite3, sys, json
db = sqlite3.connect("file:/home/parallels/.config/com.baitari.vetera/baitari.db?mode=ro", uri=True)
tables = [r[0] for r in db.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name")]
out = {t: db.execute(f'select count(*) from "{t}"').fetchone()[0] for t in tables}
marked = {}
for t in tables:
    cols = [c[1] for c in db.execute(f'pragma table_info("{t}")')]
    txt = [c for c in cols if c in ("name","title","reason","notes","firstName","lastName","subjective","number","description","label")]
    if txt:
        w = " or ".join(f'"{c}" like \'%ZZ-TEST%\'' for c in txt)
        n = db.execute(f'select count(*) from "{t}" where {w}').fetchone()[0]
        if n: marked[t] = n
json.dump({"counts": out, "zz": marked}, open(sys.argv[1], "w"), indent=1)
print(len(tables), "tables;", "lignes ZZ-TEST:", marked)
