// Corps de script pour le pilote de test (npm run harness -- ce-fichier) : mesure dans la vraie
// fenêtre Tauri (WebKitGTK, tauri-plugin-sql) le coût de la frontière IPC et des chemins de données.
const { invoke } = await import("/node_modules/@tauri-apps/api/core.js").catch(() => import("@tauri-apps/api/core"));
const { getDatabase } = await import("/src/services/sqlite/database.ts");
const { rankPassages, MODEL_CALIBRATION, SEARCH_INDEX_KEYS } = await import("/src/modules/consultations/local-ai/passage-search.ts");
const { embeddingFromHex } = await import("/src/modules/consultations/local-ai/embedding-index.ts");
const { matchesSearchTerms } = await import("/src/modules/consultations/local-ai/veterinary-lexicon.ts");
const db = await getDatabase();
const now = () => performance.now();
const r = (x) => Math.round(x * 10) / 10;
const out = { ua: navigator.userAgent.slice(0, 80) };
// 1. Appel vide : commande Rust « greet », puis SELECT 1 par le greffon SQL.
await invoke("greet", { name: "x" });
let t = now(); for (let i = 0; i < 300; i++) await invoke("greet", { name: "x" }); out.invokeVideMs = r((now() - t) / 300);
await db.select("SELECT 1");
t = now(); for (let i = 0; i < 300; i++) await db.select("SELECT 1"); out.select1Ms = r((now() - t) / 300);
// 2. Tables entières (dépôts useSQLite).
out.tables = {};
for (const tb of ["patients", "owners", "appointments", "consultation_soaps", "notes", "weight_entries", "invoices"]) {
  t = now(); const rows = await db.select("SELECT * FROM " + tb); out.tables[tb] = { rows: rows.length, ms: r(now() - t) };
}
out.tablesTotalMs = r(Object.values(out.tables).reduce((s, x) => s + x.ms, 0));
t = now(); const g = await db.select("SELECT * FROM appointments WHERE patient_id = ?", ["zz-gros"]); const g2 = await db.select("SELECT * FROM consultation_soaps WHERE patient_id = ?", ["zz-gros"]);
out.grosDossierCibleMs = r(now() - t); out.grosDossierLignes = g.length + g2.length;
// 3. Recherche sémantique tous patients, chemin actuel (une requête par patient, vecteurs en hex).
const filters = { sourceTypes: ["soap"], sections: ["subjective", "objective", "assessment", "plan"] };
const key = SEARCH_INDEX_KEYS.passages;
const q = Array.from({ length: 768 }, (_, i) => Math.sin(i));
const patients = await db.select("SELECT id,name FROM patients ORDER BY id");
const sql = "SELECT patient_id AS patientId,source_id AS sourceId,source_type AS sourceType,document_type AS documentType,section,chunk_index AS chunkIndex,chunk_text AS text,source_key AS sourceKey,hex(embedding) AS embedding FROM embeddings WHERE patient_id=? AND model_key=? AND source_type IN (?) AND section IN (?,?,?,?) AND EXISTS(SELECT 1 FROM patients p WHERE p.id=embeddings.patient_id) AND ((source_type='soap' AND EXISTS(SELECT 1 FROM consultation_soaps s WHERE s.id=embeddings.source_id AND s.patient_id=embeddings.patient_id)) OR (source_type!='soap' AND EXISTS(SELECT 1 FROM notes n WHERE n.id=embeddings.source_id AND n.patient_id=embeddings.patient_id))) ORDER BY source_id,chunk_index";
let ioMs = 0, hexMs = 0, rankMs = 0, rows = 0; const t0 = now();
for (const p of patients) {
  let s = now(); const rs = await db.select(sql, [p.id, key, "soap", ...filters.sections]); ioMs += now() - s; rows += rs.length;
  s = now(); const withVec = rs.map((x) => ({ ...x, vector: embeddingFromHex(x.embedding) })); hexMs += now() - s;
  s = now(); rankPassages(withVec, q, { patientId: p.id, ...filters }, "boiterie postérieur méloxicam", 5, [], MODEL_CALIBRATION.embeddinggemma); rankMs += now() - s;
}
out.rechercheActuelle = { patients: patients.length, rows, totalMs: r(now() - t0), sqlEtIpcMs: r(ioMs), hexMs: r(hexMs), rankMs: r(rankMs) };
// 4. Lexicale rapide : tous les textes d'extraits en une requête, puis matchesSearchTerms.
t = now(); const texts = await db.select("SELECT e.patient_id AS patientId, e.chunk_text AS text FROM embeddings e WHERE e.model_key=? AND e.source_type='soap'", [key]); const lexIo = now() - t;
t = now(); let hits = 0; for (const x of texts) if (matchesSearchTerms("boiterie postérieur méloxicam", x.text)) hits++;
out.lexicale = { rows: texts.length, sqlEtIpcMs: r(lexIo), matchMs: r(now() - t), hits };
// 5. Les vecteurs de tous les patients en une seule requête hex (ce que la webview recevrait sans commande dédiée).
t = now(); const all = await db.select("SELECT hex(embedding) AS e FROM embeddings WHERE model_key=?", [key]); out.vecteursEnUneRequete = { rows: all.length, sqlEtIpcMs: r(now() - t) };
return out;
