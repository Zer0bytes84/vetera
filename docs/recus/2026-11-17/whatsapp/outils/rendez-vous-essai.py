"""Ajoute a une COPIE du magasin du navigateur (store.json, jamais la vraie base) sept rendez-vous ZZ-TEST, cinq le 18 novembre 2026
(un par proprietaire ZZ-TEST de donnees-essai.py), un absent la veille et un manque il y a 13 jours, pour la relance. Heures de Paris (UTC+1 en novembre),
le fuseau du banc. Usage : python3 -I rendez-vous-essai.py store.json store-rdv.json"""
import datetime, json, sys

CAS = [
    # (id, animal, proprietaire, debut local, statut, motif)
    ("zz-a1", "zz-p3", "zz-o3", "2026-11-18T14:30:00", "scheduled", "Rappel vaccin"),     # Rex, 0555 12 34 56
    ("zz-a2", "zz-p1", "zz-o1", "2026-11-18T15:00:00", "confirmed", "Contrôle annuel"),   # Zoé, +213 555 12 34 56
    ("zz-a3", "zz-p4", "zz-o4", "2026-11-18T14:45:00", "scheduled", "Antiparasitaire"),   # Minou, « à rappeler »
    ("zz-a4", "zz-p2", "zz-o2", "2026-11-18T14:15:00", "cancelled", "Vermifuge"),         # Médor, annulé
    ("zz-a5", "zz-p5", "zz-o5", "2026-11-18T14:20:00", "arrived", "Détartrage"),          # Pistache, arrivé
    ("zz-a6", "zz-p2", "zz-o2", "2026-11-17T10:00:00", "no_show", "Vaccin"),              # Médor, absent la veille
    ("zz-a7", "zz-p1", "zz-o1", "2026-11-05T09:00:00", "scheduled", "Ancien contrôle"),   # Zoé, manqué il y a 13 jours
]


def utc(local, minutes=0):
    moment = datetime.datetime.fromisoformat(local + "+01:00") + datetime.timedelta(minutes=minutes)
    return moment.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


store = json.load(open(sys.argv[1], encoding="utf8"))
tables = store["tables"]
assert not any(a["id"].startswith("zz-a") for a in tables["appointments"]), "deja rempli"
vet = tables["appointments"][0]["vetId"]
for rid, patient, owner, start, status, reason in CAS:
    tables["appointments"].append({
        "id": rid, "patientId": patient, "ownerId": owner, "vetId": vet, "title": f"ZZ-TEST {reason}",
        "startTime": utc(start), "endTime": utc(start, 30), "status": status, "type": "Consultation",
        "reason": f"ZZ-TEST {reason}", "diagnosis": "", "treatment": "", "notes": "",
        "createdAt": "2026-11-17 10:00:00", "updatedAt": "2026-11-17 10:00:00", "room": "consult-1",
    })
json.dump(store, open(sys.argv[2], "w", encoding="utf8"), ensure_ascii=False)
print(len(tables["appointments"]), "rendez-vous dans", sys.argv[2])
