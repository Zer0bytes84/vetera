// Ouverture d'une fiche patient : les lectures que ses écrans font, rejouées sur une clinique synthétique.
// Mode "tables" : chaque dépôt lit sa table entière (app avant la phase 1.1).
// Mode "patient" : les tables du dossier sont lues avec WHERE patient_id = ? (après).
// Le passage Rust -> webview de tauri-plugin-sql est figuré par JSON.stringify + JSON.parse ; l'IPC réel n'est pas compté.
// node --no-warnings --experimental-strip-types --import ./alias-loader.mjs bench-dossier.mjs <base> <tables|patient> [patient_id]
import { DatabaseSync } from "node:sqlite";
import { performance } from "node:perf_hooks";
const { PATIENTS_WITH_REFERENCE_SQL } = await import("../../../../src/modules/patients/reference/reference.ts");
const [base, mode, patientArg] = process.argv.slice(2);
const db = new DatabaseSync(base, { readOnly: true });
// Les tables que montent la fiche et ses composants (patient-detail-page, patient-timeline, listes, dialogues).
const RECORD_TABLES = ["patients", "owners", "users", "transactions", "appointments", "prescriptions", "prescription_items", "vaccinations", "weight_entries", "consultation_soaps", "notes", "tasks", "hospitalizations", "anesthesia_sheets", "consultation_documents"];
// Lues par patient après la phase 1.1 (toutes ont une colonne patient_id indexée ou non).
const SCOPED = ["appointments", "prescriptions", "vaccinations", "weight_entries", "consultation_soaps", "notes", "tasks", "hospitalizations", "anesthesia_sheets", "consultation_documents"];
const camel = (row) => { const o = {}; for (const k of Object.keys(row)) o[k.replace(/_([a-z])/g, (_, l) => l.toUpperCase())] = row[k]; return o; };
const pick = (id) => id ?? db.prepare("SELECT patient_id AS id FROM appointments GROUP BY patient_id HAVING count(*) = 5 LIMIT 1").get().id;
function open(patientId) {
  const per = {}; let rows = 0, bytes = 0; const t0 = performance.now();
  for (const t of RECORD_TABLES) {
    const scoped = mode === "patient" && SCOPED.includes(t);
    const sql = t === "patients" ? PATIENTS_WITH_REFERENCE_SQL : "SELECT * FROM " + t + (scoped ? " WHERE patient_id = ?" : "");
    const t1 = performance.now();
    const r = scoped ? db.prepare(sql).all(patientId) : db.prepare(sql).all();
    const s = JSON.stringify(r); JSON.parse(s).map(camel);
    per[t] = { rows: r.length, kB: Math.round(s.length / 1000), ms: Math.round((performance.now() - t1) * 10) / 10 };
    rows += r.length; bytes += s.length;
  }
  return { totalMs: Math.round((performance.now() - t0) * 10) / 10, rows, MB: Math.round(bytes / 1e4) / 100, per };
}
const out = { base: base.split("/").pop(), mode, patients: db.prepare("SELECT count(*) AS n FROM patients").get().n };
for (const [label, id] of [["grosDossier", "zz-gros"], ["dossierCourant", pick(patientArg)]]) {
  open(id); // une passe de chauffe (cache de pages SQLite)
  const runs = [1, 2, 3, 4, 5].map(() => open(id));
  const med = runs.map((x) => x.totalMs).sort((a, b) => a - b)[2];
  out[label] = { patientId: id, medianMs: med, rows: runs[0].rows, MB: runs[0].MB, per: runs[0].per };
}
console.log(JSON.stringify(out, null, 1));
