// Corps de script pour le pilote de test (npm run harness), dans la vraie fenêtre Tauri (WKWebView, Rust en release).
// CONFIG est remplacé avant l'envoi : { patients, partie: "temps" | "reference" | "directe", questions, reference }.
const CONFIG = __CONFIG__;
const { invoke } = await import("/node_modules/@tauri-apps/api/core.js");
const { getDatabase } = await import("/src/services/sqlite/database.ts");
const store = await import("/src/modules/consultations/local-ai/embedding-store.ts");
const native = await import("/src/modules/consultations/local-ai/native-vector-search.ts");
const { rankPassages, MODEL_CALIBRATION } = await import("/src/modules/consultations/local-ai/passage-search.ts");
const { PATIENTS_WITH_REFERENCE_SQL } = await import("/src/modules/patients/reference/reference.ts");
const { syncLexicalIndex } = await import("/src/modules/consultations/local-ai/lexical-index.ts");
const db = await getDatabase();
const now = () => performance.now();
const r = (x) => Math.round(x * 10) / 10;
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const p95 = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))]; };
const filters = { sourceTypes: ["soap", "document", "protocol"], sections: ["subjective", "objective", "assessment", "plan", "document", "protocol"] };
const questions = await (await fetch(CONFIG.questions)).json();
const top = (rows) => rows.map((x) => ({ patientId: x.patientId, sourceId: x.sourceId, section: x.section, chunkIndex: x.chunkIndex, score: x.score, match: x.match }));
const same = (a, b) => a.length === b.length && a.every((x, i) => x.patientId === b[i].patientId && x.sourceId === b[i].sourceId && x.section === b[i].section && x.chunkIndex === b[i].chunkIndex && x.match === b[i].match);
const delta = (a, b) => a.reduce((m, x, i) => Math.max(m, Math.abs(x.score - b[i].score)), 0);
const out = { patients: CONFIG.patients, partie: CONFIG.partie, ua: navigator.userAgent.slice(0, 90) };
await syncLexicalIndex(db);

if (CONFIG.partie === "temps") {
  // Frontière IPC.
  await invoke("greet", { name: "x" });
  let t = now(); for (let i = 0; i < 200; i++) await invoke("greet", { name: "x" }); out.invokeVideMs = r((now() - t) / 200);
  t = now(); for (let i = 0; i < 200; i++) await db.select("SELECT 1"); out.select1Ms = r((now() - t) / 200);
  // 1.1 Fiche patient : tables entières contre lecture par patient.
  const RECORD = ["patients", "owners", "users", "transactions", "appointments", "prescriptions", "prescription_items", "vaccinations", "weight_entries", "consultation_soaps", "notes", "tasks", "hospitalizations", "anesthesia_sheets", "consultation_documents"];
  const SCOPED = ["appointments", "prescriptions", "vaccinations", "weight_entries", "consultation_soaps", "notes", "tasks", "hospitalizations", "anesthesia_sheets", "consultation_documents"];
  const courant = (await db.select("SELECT patient_id AS id FROM appointments GROUP BY patient_id HAVING count(*) = 5 LIMIT 1"))[0].id;
  const fiche = async (patientId, scoped) => { const t0 = now(); let rows = 0; for (const table of RECORD) { const s = scoped && SCOPED.includes(table); const sql = table === "patients" ? PATIENTS_WITH_REFERENCE_SQL : "SELECT * FROM " + table + (s ? " WHERE patient_id = ?" : ""); rows += (await db.select(sql, s ? [patientId] : [])).length; } return { ms: r(now() - t0), rows }; };
  out.fiche = {};
  for (const [label, id] of [["grosDossier", "zz-gros"], ["dossierCourant", courant]]) {
    await fiche(id, false);
    const avant = [await fiche(id, false), await fiche(id, false), await fiche(id, false)];
    const apres = [await fiche(id, true), await fiche(id, true), await fiche(id, true)];
    out.fiche[label] = { avantMs: med(avant.map((x) => x.ms)), avantLignes: avant[0].rows, apresMs: med(apres.map((x) => x.ms)), apresLignes: apres[0].rows };
  }
  // 1.2 Chemin actuel (une lecture par patient) : une seule question, il est long.
  if (CONFIG.actuel) {
    const q = questions[0]; t = now();
    const patients = await db.select("SELECT id,name FROM patients ORDER BY id"); const ranked = [];
    for (const p of patients) { const scope = { patientId: p.id, ...filters }; const rows = await store.readPatientSearchRows(db, scope, "passages"); ranked.push(...rankPassages(rows, q.vector, scope, q.text, 5, [], MODEL_CALIBRATION.embeddinggemma)); }
    out.actuelMs = r(now() - t);
  }
  // Fin de phase 1 : chemin TypeScript réparé (référence officielle).
  const repare = [];
  for (const q of questions.slice(0, 5)) { t = now(); await store.rankAllPatientsPassages(db, filters, q.text, q.vector, "passages", true); repare.push(r(now() - t)); }
  out.repare = { runs: repare, medianMs: med(repare) };
  // Phase 2 : commande Rust. Premier appel (index chargé depuis SQLite), puis à chaud.
  t = now();
  await store.rankAllPatientsPassagesNatively(db, filters, questions[0].text, questions[0].vector, "passages", async (request) => { const reply = await native.searchVectorsNatively(request); out.premierRust = { loaded: reply.loaded, loadMs: r(reply.loadMs), searchMs: r(reply.searchMs), indexed: reply.indexed, lignes: reply.rows.length }; return reply; });
  out.premierAppelMs = r(now() - t);
  const chaud = [], rust = [], invokeMs = [], lignes = [];
  for (const q of questions.slice(1, 41)) {
    t = now();
    await store.rankAllPatientsPassagesNatively(db, filters, q.text, q.vector, "passages", async (request) => { const t1 = now(); const reply = await native.searchVectorsNatively(request); invokeMs.push(now() - t1); rust.push(reply.searchMs); lignes.push(reply.rows.length); return reply; });
    chaud.push(now() - t);
  }
  out.natifChaud = { questions: chaud.length, medianMs: r(med(chaud)), p95Ms: r(p95(chaud)), maxMs: r(Math.max(...chaud)), invokeMedianMs: r(med(invokeMs)), rustMedianMs: r(med(rust)), lignesMedian: med(lignes), lignesMax: Math.max(...lignes) };
  // La commande seule, sans termes exacts : ce que coûte le calcul natif et la frontière.
  const seule = [];
  for (const q of questions.slice(1, 41)) { const n = Math.hypot(...q.vector); const t1 = now(); await native.searchVectorsNatively({ modelKey: "embeddinggemma-300m-onnx-fp32-wasm-768-passages800-v3", unitQuery: q.vector.map((v) => v / n), floor: 0.15, extraRows: [] }); seule.push(now() - t1); }
  out.commandeSeule = { medianMs: r(med(seule)), p95Ms: r(p95(seule)) };
  // 1.3 Recherche par mots.
  const lex = [];
  for (const query of ["boiterie", "otite externe", "méloxicam", "Metacam", "créatinine 2", "insuffisance rénale chronique", "œdème", "chat qui ne mange plus", "claudication", "vomissements diarrhée"]) { t = now(); await store.searchAllPatientsFastLexical({ sourceTypes: [...filters.sourceTypes, "patient", "consultation", "product"], sections: [...filters.sections, "patient", "consultation", "product"] }, query); lex.push(r(now() - t)); }
  out.lexical = { runs: lex, medianMs: med(lex) };
}

if (CONFIG.partie === "froid") {
  // Premier appel après le lancement de l'app : l'index est lu depuis SQLite.
  const q = questions[0]; let stats = null; const t = now();
  await store.rankAllPatientsPassagesNatively(db, filters, q.text, q.vector, "passages", async (request) => { const reply = await native.searchVectorsNatively(request); stats ??= { loaded: reply.loaded, loadMs: r(reply.loadMs), searchMs: r(reply.searchMs), indexed: reply.indexed }; return reply; });
  Object.assign(out, { premierAppelMs: r(now() - t), rust: stats });
}

if (CONFIG.partie === "reference") {
  // Égalité contre la référence (200 questions) : celle-ci est le chemin réparé, prouvé identique en phase 1.
  const reference = await (await fetch(CONFIG.reference)).json();
  let identiques = 0, ecart = 0; const differences = [];
  for (const [i, q] of questions.entries()) {
    const got = top(await store.rankAllPatientsPassagesNatively(db, filters, q.text, q.vector, "passages"));
    const expected = reference.results[i].top;
    if (same(got, expected)) { identiques++; ecart = Math.max(ecart, delta(got, expected)); } else differences.push({ i, text: q.text, got, expected });
  }
  Object.assign(out, { questions: questions.length, identiques, ecartScoreMax: ecart, differences: differences.slice(0, 5) });
}

if (CONFIG.partie === "directe") {
  // Égalité directe dans l'app : chemin TypeScript réparé contre chemin natif, mêmes questions.
  let identiques = 0, ecart = 0; const n = CONFIG.directe ?? 20;
  for (const q of questions.slice(0, n)) {
    const ts = top(await store.rankAllPatientsPassages(db, filters, q.text, q.vector, "passages", true));
    const rs = top(await store.rankAllPatientsPassagesNatively(db, filters, q.text, q.vector, "passages"));
    if (same(ts, rs)) { identiques++; ecart = Math.max(ecart, delta(ts, rs)); }
  }
  Object.assign(out, { questions: n, identiques, ecartScoreMax: ecart });
}
return out;
