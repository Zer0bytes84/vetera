// Rejoue sur une base synthétique les chemins de données de l'app, avec ses vraies fonctions TS.
// Le passage Rust -> webview de tauri-plugin-sql est figuré par JSON.stringify + JSON.parse
// (le greffon sérialise chaque ligne en objet JSON) ; l'aller-retour IPC lui-même n'est pas compté ici.
// node --no-warnings --experimental-strip-types --import ./outils/alias-loader.mjs bench-donnees.mjs <base>
import { DatabaseSync } from "node:sqlite";
import { performance } from "node:perf_hooks";
const { rankPassages, MODEL_CALIBRATION, SEARCH_INDEX_KEYS } = await import("../../../../src/modules/consultations/local-ai/passage-search.ts");
const { embeddingFromHex } = await import("../../../../src/modules/consultations/local-ai/embedding-index.ts");
const { matchesSearchTerms } = await import("../../../../src/modules/consultations/local-ai/veterinary-lexicon.ts");
const { PATIENTS_WITH_REFERENCE_SQL } = await import("../../../../src/modules/patients/reference/reference.ts");
const db = new DatabaseSync(process.argv[2], { readOnly: true });
const ms = (t) => Math.round((performance.now() - t) * 10) / 10;
const ipc = (rows) => { const t = performance.now(); const s = JSON.stringify(rows); const t1 = ms(t); const t2 = performance.now(); const back = JSON.parse(s); return { back, bytes: s.length, stringifyMs: t1, parseMs: ms(t2) }; };
const camel = (row) => { const o = {}; for (const k of Object.keys(row)) o[k.replace(/_([a-z])/g, (_, l) => l.toUpperCase())] = row[k]; return o; };
const out = {};

// 1. Tables entières lues par les dépôts useSQLite (fiche patient, tableau de bord, agenda).
const TABLES = ["patients", "owners", "appointments", "consultation_soaps", "notes", "weight_entries", "transactions", "users", "prescriptions", "prescription_items", "vaccinations", "hospitalizations"];
let total = { sqlMs: 0, bytes: 0, stringifyMs: 0, parseMs: 0, mapMs: 0, rows: 0 };
out.tables = {};
for (const t of TABLES) {
  let rows; const t0 = performance.now();
  try { rows = db.prepare(t === "patients" ? PATIENTS_WITH_REFERENCE_SQL : "SELECT * FROM " + t).all(); } catch { continue; }
  const sqlMs = ms(t0); const x = ipc(rows); const t3 = performance.now(); x.back.map(camel); const mapMs = ms(t3);
  out.tables[t] = { rows: rows.length, sqlMs, kB: Math.round(x.bytes / 1000), stringifyMs: x.stringifyMs, parseMs: x.parseMs, mapMs };
  total.sqlMs += sqlMs; total.bytes += x.bytes; total.stringifyMs += x.stringifyMs; total.parseMs += x.parseMs; total.mapMs += mapMs; total.rows += rows.length;
}
out.tablesTotal = { ...total, MB: Math.round(total.bytes / 1e5) / 10 };
delete out.tablesTotal.bytes;
// Le même dossier lu par patient (WHERE patient_id = ?), ce que ferait une commande dédiée.
{
  const t0 = performance.now(); let bytes = 0, rows = 0;
  for (const [t, col] of [["appointments", "patient_id"], ["consultation_soaps", "patient_id"], ["notes", "patient_id"], ["weight_entries", "patient_id"], ["invoices", "patient_id"]]) {
    const r = db.prepare("SELECT * FROM " + t + " WHERE " + col + " = ?").all("zz-gros"); rows += r.length; bytes += JSON.stringify(r).length; JSON.parse(JSON.stringify(r));
  }
  out.grosDossierCible = { rows, kB: Math.round(bytes / 1000), totalMs: ms(t0) };
}

// 2. Recherche sémantique « tous les patients » (génération passages, la valeur par défaut), comme searchAllPatientsDocuments.
const filters = { sourceTypes: ["soap"], sections: ["subjective", "objective", "assessment", "plan"] };
const key = SEARCH_INDEX_KEYS.passages;
const q = Array.from({ length: 768 }, () => Math.random() - 0.5);
const queryText = "boiterie postérieur méloxicam";
const stmt = db.prepare("SELECT patient_id AS patientId,source_id AS sourceId,source_type AS sourceType,document_type AS documentType,section,chunk_index AS chunkIndex,chunk_text AS text,source_key AS sourceKey,hex(embedding) AS embedding FROM embeddings WHERE patient_id=? AND model_key=? AND source_type IN (?) AND section IN (?,?,?,?) AND EXISTS(SELECT 1 FROM patients p WHERE p.id=embeddings.patient_id) AND ((source_type='soap' AND EXISTS(SELECT 1 FROM consultation_soaps s WHERE s.id=embeddings.source_id AND s.patient_id=embeddings.patient_id)) OR (source_type!='soap' AND EXISTS(SELECT 1 FROM notes n WHERE n.id=embeddings.source_id AND n.patient_id=embeddings.patient_id))) ORDER BY source_id,chunk_index");
{
  const patients = db.prepare("SELECT id,name FROM patients ORDER BY id").all();
  const s = { sqlMs: 0, stringifyMs: 0, parseMs: 0, hexMs: 0, rankMs: 0, bytes: 0, rows: 0, roundTrips: patients.length + 1 };
  const t0 = performance.now(); const ranked = [];
  for (const p of patients) {
    let t = performance.now();
    const rows = stmt.all(p.id, key, "soap", ...filters.sections); s.sqlMs += performance.now() - t;
    const x = ipc(rows); s.stringifyMs += x.stringifyMs; s.parseMs += x.parseMs; s.bytes += x.bytes; s.rows += rows.length;
    t = performance.now();
    const withVec = x.back.map((r) => ({ ...r, vector: embeddingFromHex(r.embedding) })); s.hexMs += performance.now() - t;
    t = performance.now();
    ranked.push(...rankPassages(withVec, q, { patientId: p.id, ...filters }, queryText, 5, [], MODEL_CALIBRATION.embeddinggemma)); s.rankMs += performance.now() - t;
  }
  ranked.sort((a, b) => b.score - a.score);
  s.totalMs = ms(t0);
  for (const k of ["sqlMs", "hexMs", "rankMs", "stringifyMs", "parseMs"]) s[k] = Math.round(s[k]);
  s.MB = Math.round(s.bytes / 1e5) / 10; delete s.bytes;
  out.rechercheSemantiqueActuelle = s;
}
// Même calcul, découpé comme le ferait une commande native : une requête, vecteurs en binaire, produit scalaire typé,
// seuls les 5 meilleurs extraits traversent la frontière. Mesuré en JS : borne haute d'une version Rust.
{
  const t0 = performance.now();
  const rows = db.prepare("SELECT e.patient_id AS patientId, e.source_id AS sourceId, e.section, e.chunk_index AS chunkIndex, e.embedding FROM embeddings e WHERE e.model_key=? AND e.source_type='soap' AND EXISTS(SELECT 1 FROM consultation_soaps s WHERE s.id=e.source_id AND s.patient_id=e.patient_id)").all(key);
  const sqlMs = ms(t0); const t1 = performance.now();
  const n = Math.hypot(...q); const u = Float32Array.from(q, (v) => v / n);
  const scores = new Float32Array(rows.length);
  for (let i = 0; i < rows.length; i++) { const b = rows[i].embedding; const v = new Float32Array(b.buffer, b.byteOffset, 768); let d = 0; for (let j = 0; j < 768; j++) d += v[j] * u[j]; scores[i] = d; }
  const top = Array.from(scores.keys()).sort((a, b) => scores[b] - scores[a]).slice(0, 5);
  const scoreMs = ms(t1); const x = ipc(top.map((i) => ({ ...rows[i], embedding: undefined, score: scores[i] })));
  out.rechercheSemantiqueRegroupee = { rows: rows.length, sqlMs, scoreMs, sortieKB: Math.round(x.bytes / 100) / 10, totalMs: ms(t0), roundTrips: 1 };
}
// 3. Recherche lexicale rapide (searchAllPatientsFastLexical) : textes des extraits + matchesSearchTerms.
{
  const t0 = performance.now();
  const rows = db.prepare("SELECT e.patient_id AS patientId, p.name AS patientName, e.source_id AS sourceId, e.source_type AS sourceType, e.document_type AS documentType, e.section, e.chunk_index AS chunkIndex, e.chunk_text AS text, e.source_key AS sourceKey FROM embeddings e JOIN patients p ON p.id=e.patient_id WHERE e.model_key=? AND e.source_type IN ('soap') AND e.section IN ('subjective','objective','assessment','plan') AND ((e.source_type='soap' AND EXISTS(SELECT 1 FROM consultation_soaps s WHERE s.id=e.source_id AND s.patient_id=e.patient_id))) ORDER BY e.patient_id, e.source_id, e.chunk_index").all(SEARCH_INDEX_KEYS[process.env.GEN ?? "passages"]);
  const sqlMs = ms(t0); const x = ipc(rows); const t1 = performance.now();
  let hits = 0; for (const r of x.back) if (matchesSearchTerms(queryText, r.text)) hits++;
  out.rechercheLexicale = { rows: rows.length, sqlMs, MB: Math.round(x.bytes / 1e5) / 10, stringifyMs: x.stringifyMs, parseMs: x.parseMs, matchMs: ms(t1), hits, totalMs: ms(t0) };
}
console.log(JSON.stringify(out, null, 1));
