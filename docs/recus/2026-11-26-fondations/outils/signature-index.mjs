// Coût des signatures possibles de l'index de vecteurs (invalidation du cache côté Rust).
import { DatabaseSync } from "node:sqlite";
import { performance } from "node:perf_hooks";
const db = new DatabaseSync(process.argv[2], { readOnly: true });
const key = "embeddinggemma-300m-onnx-fp32-wasm-768-passages800-v3";
const out = {};
for (const [label, sql] of [
  ["count+max(updated_at)", "SELECT count(*) AS n, max(updated_at) AS u FROM embeddings WHERE model_key = ?"],
  ["count+max(updated_at)+sum(rowid)", "SELECT count(*) AS n, max(updated_at) AS u, total(rowid) AS s FROM embeddings WHERE model_key = ?"],
  ["count+sum(rowid)", "SELECT count(*) AS n, total(rowid) AS s FROM embeddings WHERE model_key = ?"],
]) {
  db.prepare(sql).get(key);
  const t = performance.now(); for (let i = 0; i < 5; i++) db.prepare(sql).get(key);
  out[label] = { ms: Math.round((performance.now() - t) / 5 * 10) / 10, plan: db.prepare("EXPLAIN QUERY PLAN " + sql).all(key).map((r) => r.detail).join(" | ") };
}
console.log(JSON.stringify(out, null, 1));
