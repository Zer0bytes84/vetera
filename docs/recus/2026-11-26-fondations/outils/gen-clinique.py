"""Clinique synthétique pour les mesures : part d'une copie de la base de test (schéma réel,
migrations comprises) et ajoute propriétaires, patients, rendez-vous, SOAP, notes, poids,
factures et vecteurs de recherche. Un patient « gros dossier » (id zz-gros) concentre l'historique.
Usage : python3 -I gen-clinique.py <base-source> <base-sortie> <patients> <soap_par_patient>
Rien n'est écrit dans la base source (lecture seule, VACUUM INTO)."""
import random, sqlite3, struct, sys, math, uuid

src, out, n_patients, soap_per = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
random.seed(42)
sqlite3.connect(f"file:{src}?mode=ro", uri=True).execute("VACUUM INTO ?", (out,))
db = sqlite3.connect(out)
db.execute("PRAGMA foreign_keys=OFF")
db.execute("PRAGMA journal_mode=WAL")
vet = db.execute("SELECT id FROM users LIMIT 1").fetchone()[0]
SECTIONS = ["subjective", "objective", "assessment", "plan"]
KEYS = ["embeddinggemma-300m-onnx-fp32-wasm-768-sections-v2", "embeddinggemma-300m-onnx-fp32-wasm-768-passages800-v3"]
WORDS = ("boiterie vomissements diarrhée prurit otite dermatite toux fièvre abattement anorexie polyurie "
         "polydipsie amaigrissement douleur abdominale palpation souffle cardiaque tachycardie déshydratation "
         "vaccination rappel CHPPiRL rage antiparasitaire méloxicam amoxicilline clavulanique prednisolone "
         "radiographie échographie hémogramme biochimie créatinine urée ALAT glycémie insuffisance rénale "
         "chronique hyperthyroïdie diabète sucré arthrose luxation rotule otite externe gale démodécie "
         "plaie suture castration stérilisation détartrage extraction dentaire contrôle dans dix jours").split()
def text(n):
    return " ".join(random.choice(WORDS) for _ in range(n)).capitalize() + "."
def vec():
    v = [random.gauss(0, 1) for _ in range(768)]
    s = math.sqrt(sum(x * x for x in v))
    return struct.pack("<768f", *[x / s for x in v])
def uid():
    return str(uuid.UUID(int=random.getrandbits(128)))

owners, patients = [], []
for i in range(max(1, n_patients * 2 // 3)):
    oid = uid(); owners.append(oid)
    db.execute("INSERT INTO owners(id,first_name,last_name,phone,email,city) VALUES(?,?,?,?,?,?)",
               (oid, f"Prénom{i}", f"Nom{i}", f"0550{i:06d}", f"p{i}@exemple.dz", "Alger"))
for i in range(n_patients):
    pid = "zz-gros" if i == 0 else uid(); patients.append(pid)
    db.execute("INSERT INTO patients(id,owner_id,name,species,breed,sex,date_of_birth,general_notes) VALUES(?,?,?,?,?,?,?,?)",
               (pid, random.choice(owners), f"Animal{i}", random.choice(["chien", "chat"]), "croisé",
                random.choice("MF"), "2018-05-01", text(30)))
counts = {"appointments": 0, "consultation_soaps": 0, "embeddings": 0, "notes": 0, "invoices": 0, "invoice_lines": 0, "weight_entries": 0}
for pid in patients:
    n = soap_per * (40 if pid == "zz-gros" else 1)
    owner = db.execute("SELECT owner_id FROM patients WHERE id=?", (pid,)).fetchone()[0]
    for k in range(n):
        aid, sid = uid(), uid()
        day = f"20{random.randint(20, 26)}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}"
        db.execute("INSERT INTO appointments(id,patient_id,owner_id,vet_id,title,start_time,end_time,status,type,reason,diagnosis,treatment,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                   (aid, pid, owner, vet, "Consultation", day + " 10:00:00", day + " 10:30:00", "completed", "Consultation", text(8), text(10), text(14), text(20)))
        secs = {s: text(random.randint(40, 110)) for s in SECTIONS}
        db.execute("INSERT INTO consultation_soaps(id,appointment_id,patient_id,subjective,objective,assessment,plan,content,vet_id) VALUES(?,?,?,?,?,?,?,?,?)",
                   (sid, aid, pid, secs["subjective"], secs["objective"], secs["assessment"], secs["plan"], "{}", vet))
        for key in KEYS:
            for s in SECTIONS:
                db.execute("INSERT INTO embeddings(id,source_type,source_id,patient_id,section,chunk_index,embedding,chunk_text,source_key,model_key,document_type,soap_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                           (uid(), "soap", sid, pid, s, 0, vec(), secs[s], sid + ":" + s, key, "consultation", sid))
                counts["embeddings"] += 1
        iid = uid()
        db.execute("INSERT INTO invoices(id,owner_id,patient_id,appointment_id,document_status,number,subtotal_amount,gross_amount) VALUES(?,?,?,?,?,?,?,?)",
                   (iid, owner, pid, aid, "draft", None, 350000, 350000))  # émise : refusée par les déclencheurs hors service de facturation
        for j in range(3):
            db.execute("INSERT INTO invoice_lines(id,invoice_id,description,quantity_milli,unit_amount,base_amount,gross_amount,sort_order) VALUES(?,?,?,?,?,?,?,?)",
                       (uid(), iid, text(3), 1000, 116667, 116667, 116667, j))
            counts["invoice_lines"] += 1
        db.execute("INSERT INTO weight_entries(id,patient_id,weight_kg,measured_at) VALUES(?,?,?,?)", (uid(), pid, random.uniform(3, 40), day))
        for t in ("appointments", "consultation_soaps", "invoices", "weight_entries"):
            counts[t] += 1
    if pid == "zz-gros" or random.random() < 0.3:
        for k in range(20 if pid == "zz-gros" else 1):
            db.execute("INSERT INTO notes(id,user_id,title,content,patient_id) VALUES(?,?,?,?,?)",
                       (uid(), vet, "Compte rendu", "<p>" + text(150) + "</p>", pid)); counts["notes"] += 1
db.commit()
db.execute("PRAGMA wal_checkpoint(TRUNCATE)")
db.execute("ANALYZE")
db.close()
print({"patients": n_patients, "owners": len(owners), **counts})
