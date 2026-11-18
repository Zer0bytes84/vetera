"""Ajoute a une COPIE de la base (jamais la vraie) cinq proprietaires ZZ-TEST, un animal chacun et un rappel en cours,
pour couvrir les formats de numero et les trois temps du rappel. Usage : python3 -I donnees-essai.py <copie.db>"""
import sqlite3, sys

CAS = [
    # (id, prenom, nom, telephone, email, animal, espece, type de rappel, echeance)
    ("zz-o1", "ZZ-TEST Inès", "Benali", "+213 555 12 34 56", None, "Zoé l’Écureuil", "Chat", "controle_annuel", "2026-12-01"),
    ("zz-o2", "ZZ-TEST Karim", "Haddad", "00213661223344", None, "Médor", "Chien", "vermifuge", "2026-10-01"),
    ("zz-o3", "ZZ-TEST Léa", "Martin", "0555 12 34 56", None, "Rex", "Chien", "vaccin", "2026-11-17"),
    ("zz-o4", "ZZ-TEST Omar", "Saïdi", "à rappeler", None, "Minou", "Chat", "antiparasitaire", "2026-12-10"),
    ("zz-o5", "ZZ-TEST Nadia", "Cherif", "", "zz-test@example.invalid", "Pistache", "Chat", "soin_dentaire", "2026-12-15"),
]

c = sqlite3.connect(sys.argv[1])
assert c.execute("select count(*) from owners where first_name like 'ZZ-TEST%'").fetchone()[0] == 0, "deja rempli"
for i, (oid, first, last, phone, email, animal, species, rtype, due) in enumerate(CAS, 1):
    c.execute("insert into owners (id, first_name, last_name, phone, email, city) values (?,?,?,?,?, 'Alger')", (oid, first, last, phone, email))
    c.execute("insert into patients (id, owner_id, name, species, sex) values (?,?,?,?, 'F')", (f"zz-p{i}", oid, animal, species))
    c.execute("insert into medical_reminders (id, patient_id, client_id, type, intervalle_mois, echeance) values (?,?,?,?, 12, ?)", (f"zz-r{i}", f"zz-p{i}", oid, rtype, due))
c.commit()
print(c.execute("select count(*) from medical_reminders where statut='en_cours'").fetchone()[0], "rappels en cours dans la copie")
