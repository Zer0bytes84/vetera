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
# Rappels manuels d'essai (page Rappels) : un en retard, un du jour, deux a venir.
T = d["tables"]["tasks"]; ref_task = T[-1]
for i, (title, due, prio) in enumerate([("Relancer le paiement de la consultation", "2026-11-10", "high"),
        ("Appeler pour le contrôle post-opératoire", "2026-11-12", "medium"),
        ("Commander les vaccins antirabiques", "2026-11-14", "medium"), ("Préparer le dossier de la ferme pilote", "2026-11-18", "low")]):
    r = copy.deepcopy(ref_task); r.update(id=f"banc-essai-tache-{i}", title=title, dueDate=due, status="todo", priority=prio, description="", startTime=None); T.append(r)
# Membres d'essai (page Equipe) : un adjoint, deux assistants, une stagiaire au compte inactif.
U = d["tables"]["users"]; ref_user = U[-1]
for i, (name, role, st) in enumerate([("Dr Samia Benali", "vet_adjoint", "active"), ("Nadia Haddad", "assistant", "active"),
        ("Yacine Merabet", "assistant", "active"), ("Lina Touati", "stagiaire", "inactive")]):
    r = copy.deepcopy(ref_user); r.update(id=f"banc-essai-membre-{i}", displayName=name, role=role, status=st, email=f"essai{i}@banc.invalid", phone=None, avatarUrl=None, specialty=None); U.append(r)
json.dump(d, open(out, "w"), ensure_ascii=False)
