# usage: python3 journee-essai.py base.json base-charge.json
# Ajoute six rendez-vous d'essai le 12 novembre 2026 (patients reels de la base, statuts varies) a une copie
# du magasin navigateur. Banc seulement : jamais dans l'app ni dans le depot.
import copy, json, sys
src, out = sys.argv[1:3]
d = json.load(open(src)); A = d["tables"]["appointments"]
ref = [a for a in A if a["status"] == "completed"][-6:]
slots = [("07:00", "07:30", "scheduled"), ("08:00", "08:30", "confirmed"), ("08:30", "09:00", "no_show"),
         ("10:30", "11:00", "confirmed"), ("14:00", "14:30", "scheduled"), ("15:30", "16:00", "scheduled")]
for i, (s, e, st) in enumerate(slots):
    r = copy.deepcopy(ref[i % len(ref)]); r["id"] = f"banc-essai-{i}"; r["status"] = st
    r["startTime"] = f"2026-11-12T{s}:00.000Z"; r["endTime"] = f"2026-11-12T{e}:00.000Z"
    r["title"] = r["title"].split(" - ")[0] + " - Consultation"; A.append(r)
json.dump(d, open(out, "w"), ensure_ascii=False)
