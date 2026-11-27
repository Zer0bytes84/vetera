// L'ancienne requête de la recherche par mots et la même avec l'ordre explicite : mêmes lignes, même ordre ?
import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync(process.argv[2], { readOnly: true });
const base = "SELECT e.rowid AS id FROM embeddings e JOIN patients p ON p.id = e.patient_id WHERE e.model_key = ? AND e.source_type IN ('soap','document','protocol') AND e.section IN ('subjective','objective','assessment','plan','document','protocol') AND ((e.source_type = 'soap' AND EXISTS(SELECT 1 FROM consultation_soaps s WHERE s.id = e.source_id AND s.patient_id = e.patient_id)) OR (e.source_type != 'soap' AND EXISTS(SELECT 1 FROM notes n WHERE n.id = e.source_id AND n.patient_id = e.patient_id)))";
const out = {};
for (const key of ["embeddinggemma-300m-onnx-fp32-wasm-768-passages800-v3", "embeddinggemma-300m-onnx-fp32-wasm-768-sections-v2"]) {
  const a = db.prepare(base + " ORDER BY e.patient_id, e.source_id, e.chunk_index").all(key).map((r) => r.id);
  const b = db.prepare(base + " ORDER BY e.patient_id, e.source_id, e.chunk_index, e.source_type, e.section, e.rowid").all(key).map((r) => r.id);
  out[key.slice(-12)] = { rows: a.length, identical: a.length === b.length && a.every((id, i) => id === b[i]) };
}
console.log(JSON.stringify(out));
