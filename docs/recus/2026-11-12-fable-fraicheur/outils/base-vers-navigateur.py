"""Convertit la base de test de la VM (lecture seule) en etat du magasin navigateur.
Rien n'est invente : chaque ligne vient de la base. Exclus : mots de passe, sessions,
journal d'audit, reglages de licence. Usage : python3 base-vers-navigateur.py <base.db> <sortie.json>"""
import sqlite3, json, re, sys
src, out = sys.argv[1], sys.argv[2]
TABLES = ["users","owners","patients","appointments","products","stock_movements","transactions","notes","consultation_documents","library_items","document_templates","documents","document_events","document_versions","tasks","app_settings","weight_entries","vaccinations","consultation_soaps","prescriptions","prescription_items","hospitalizations","hospitalization_vitals","anesthesia_sheets","anesthesia_drug_log","anesthesia_monitoring","appointment_recurrences","reminders","notification_state"]
BOOLS = {"products":["stockTracked"],"notes":["isFavorite","isPinned"],"library_items":["isFavorite","isPinned"],"tasks":["isReminder"],"patients":["sterilized"]}
camel = lambda s: re.sub(r"_([a-z])", lambda m: m.group(1).upper(), s)
c = sqlite3.connect(f"file:{src}?mode=ro", uri=True); c.row_factory = sqlite3.Row
have = {r[0] for r in c.execute("select name from sqlite_master where type='table'")}
tables = {}
for t in TABLES:
    rows = []
    if t in have:
        sql = "select patients.*, (select reference from patient_references r where r.patient_id = patients.id) as reference from patients" if t == "patients" and "patient_references" in have else f"select * from {t}"
        try: cur = c.execute(sql)
        except sqlite3.Error: cur = c.execute(f"select * from {t}")
        for r in cur:
            row = {camel(k): r[k] for k in r.keys()}
            for b in BOOLS.get(t, []):
                if row.get(b) in (0, 1): row[b] = row[b] == 1
            rows.append(row)
    tables[t] = rows
for u in tables["users"]: u.pop("passwordHash", None)
tables["app_settings"] = [dict(id=s["key"], **s) for s in tables["app_settings"] if not s["key"].startswith("license") and not s["key"].startswith("updates.")]
for k, v in (("setup_complete","true"),("demo_data_disabled","true")):
    tables["app_settings"] = [s for s in tables["app_settings"] if s["key"] != k] + [{"id":k,"key":k,"value":v}]
admin = next(u for u in tables["users"] if u["role"] == "admin")
tables["sessions"] = [{"id":"banc","userId":admin["id"],"token":"banc","expiresAt":"2030-01-01T00:00:00.000Z"}]
tables["audit_log"] = []; tables["migrations"] = []
json.dump({"tables": tables}, open(out, "w"), ensure_ascii=False)
print({t: len(r) for t, r in tables.items() if r})
