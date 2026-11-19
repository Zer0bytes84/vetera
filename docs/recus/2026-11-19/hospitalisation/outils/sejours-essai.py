"""Fait une COPIE de la base du banc (jamais la vraie) avec des emplacements et des sejours ZZ-TEST pour regarder
Hospitalisation avec du contenu. Heures de Paris, horloge du banc le 18 novembre 2026.
Usage : python3 -I sejours-essai.py <base-test.db> <base-hospi.db>"""
import shutil, sqlite3, sys
src, dst = sys.argv[1], sys.argv[2]
shutil.copyfile(src, dst)
c = sqlite3.connect(dst)
assert c.execute("select count(*) from stays").fetchone()[0] == 0, "la copie a deja des sejours"
now = "2026-11-18T09:00:00.000Z"
L = [("zz-l1", "ZZ Box 1", "box", "Chien"), ("zz-l2", "ZZ Box 2", "box", None), ("zz-l3", "ZZ Cage 1", "cage", "Chat"), ("zz-l4", "ZZ Chenil", "chenil", "Chien")]
for i, n, t, s in L:
    c.execute("insert into locations(id,name,type,species,active,note,created_at,updated_at) values(?,?,?,?,1,'',?,?)", (i, n, t, s, now, now))
S = [  # id, patient, emplacement, statut, admis, sortie prevue, sorti, motif
    ("zz-s1", "zz-p3", "zz-l1", "en_cours", "2026-11-16T08:30:00.000Z", None, None, "ZZ-TEST Gastro-enterite, perfusion"),
    ("zz-s2", "zz-p4", "zz-l3", "admis", "2026-11-18T07:45:00.000Z", None, None, "ZZ-TEST Surveillance post-operatoire"),
    ("zz-s3", "zz-p2", "zz-l4", "sortie_prevue", "2026-11-15T10:00:00.000Z", "2026-11-18T16:00:00.000Z", None, "ZZ-TEST Fracture, contention"),
    ("zz-s4", "zz-p1", None, "sorti", "2026-11-10T09:00:00.000Z", None, "2026-11-12T11:00:00.000Z", "ZZ-TEST Deshydratation"),
]
for i, p, l, st, a, pd, d, r in S:
    c.execute("insert into stays(id,patient_id,location_id,status,admitted_at,planned_discharge_at,discharged_at,reason,discharge_summary,author_id,created_at,updated_at) values(?,?,?,?,?,?,?,?,?,'zz-banc',?,?)", (i, p, l, st, a, pd, d, r, 'ZZ-TEST Rentre a la maison, bon etat' if st == 'sorti' else '', now, now))
for k, (t, hr, rr, w) in enumerate([(39.4, 120, 28, 24.1), (39.0, 112, 26, 24.0), (38.6, 104, 24, 24.2)]):
    c.execute("insert into vital_signs(id,stay_id,recorded_at,temperature_c,heart_rate,respiratory_rate,weight_kg,general_state,appetite,note,author_id,created_at,updated_at) values(?,?,?,?,?,?,?,'stable','faible','ZZ-TEST','zz-banc',?,?)",
              (f"zz-v{k}", "zz-s1", f"2026-11-1{6+k}T09:00:00.000Z", t, hr, rr, w, now, now))
c.commit()
print(c.execute("select count(*) from stays").fetchone()[0], "sejours,", c.execute("select count(*) from locations").fetchone()[0], "emplacements")
