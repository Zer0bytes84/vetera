// L'ordre des sections d'un même extrait (ex æquo de l'ORDER BY de la recherche par mots) avec et sans l'index.
import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync(process.argv[2], { readOnly: true });
const key = "embeddinggemma-300m-onnx-fp32-wasm-768-passages800-v3";
const base = "SELECT e.rowid AS id, e.patient_id AS patientId, e.source_id AS sourceId, e.section, e.chunk_index AS chunkIndex FROM embeddings e JOIN patients p ON p.id = e.patient_id WHERE e.model_key = ? AND e.source_type IN ('soap') AND e.section IN ('subjective','objective','assessment','plan') AND ((e.source_type = 'soap' AND EXISTS(SELECT 1 FROM consultation_soaps s WHERE s.id = e.source_id AND s.patient_id = e.patient_id)) OR (e.source_type != 'soap' AND EXISTS(SELECT 1 FROM notes n WHERE n.id = e.source_id AND n.patient_id = e.patient_id)))";
const order = " ORDER BY e.patient_id, e.source_id, e.chunk_index";
const fts = " AND e.rowid IN (SELECT rowid FROM embeddings_lexical WHERE embeddings_lexical MATCH ?)";
const plan = (sql, ...p) => db.prepare("EXPLAIN QUERY PLAN " + sql).all(...p).map((r) => r.detail).join(" | ");
const tiesBy = (rows) => { let rowidOrder = 0, other = 0; for (let i = 1; i < rows.length; i++) { const a = rows[i - 1], b = rows[i]; if (a.patientId === b.patientId && a.sourceId === b.sourceId && a.chunkIndex === b.chunkIndex) { if (a.id < b.id) rowidOrder++; else other++; } } return { rowidOrder, other }; };
const old = db.prepare(base + order).all(key);
const withIndex = db.prepare(base + fts + order).all(key, '"boit"*');
console.log(JSON.stringify({ oldPlan: plan(base + order, key), ftsPlan: plan(base + fts + order, key, '"x"'), oldTies: tiesBy(old), ftsTies: tiesBy(withIndex), firstOld: old.slice(0, 4).map((r) => r.section), firstFts: withIndex.slice(0, 4).map((r) => r.section) }, null, 1));
