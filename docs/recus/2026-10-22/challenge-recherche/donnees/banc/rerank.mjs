// node rerank.mjs <modelKey> [dataset...] : reclasse le top 20 hybride (BM25 + extraits) avec bge-reranker-v2-m3 q8.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { AutoTokenizer, AutoModelForSequenceClassification, env } from "@huggingface/transformers";
import { loadDataset, chunk } from "./embed.mjs";
import * as app from "./app-search.mjs";

const CACHE = new URL("../cache/", import.meta.url).pathname;
env.allowRemoteModels = false;
env.localModelPath = "/private/tmp/claude-501/-Users-zohir--claude-spares-spare-RHkxvE/3489ef79-d362-459e-ae84-9e8f85a2fb72/scratchpad/recherche/models/";
const tokenizer = await AutoTokenizer.from_pretrained("reranker", { local_files_only: true });
const model = await AutoModelForSequenceClassification.from_pretrained("reranker", { dtype: "q8", local_files_only: true });

const STOP = new Set("le la les un une des du de d l et ou a au aux en dans par pour sur avec sans est sont que qui quoi quel quelle quels quelles ce cet cette ces se sa son ses leur leurs je tu il elle on nous vous ils elles ne pas plus comment pourquoi quand y t s".split(" "));
const tokens = (text) => app.normalizeLexical(text).split(" ").filter((w) => w && !STOP.has(w)).map(app.stemFrenchWord);
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
function bm25Index(docs) {
  const tf = docs.map((d) => { const m = new Map(); for (const t of tokens(d.text)) m.set(t, (m.get(t) ?? 0) + 1); return m; });
  const len = tf.map((m) => [...m.values()].reduce((a, b) => a + b, 0));
  const avg = len.reduce((a, b) => a + b, 0) / len.length;
  const df = new Map();
  for (const m of tf) for (const t of m.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  return (query) => docs.map((d, i) => {
    let s = 0;
    for (const t of new Set(tokens(query))) { const f = tf[i].get(t); if (!f) continue; s += Math.log(1 + (docs.length - df.get(t) + 0.5) / (df.get(t) + 0.5)) * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * len[i] / avg)); }
    return { id: d.id, score: s };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).map((x) => x.id);
}
const rrf = (lists, k = 60) => { const s = new Map(); for (const l of lists) l.slice(0, 100).forEach((id, r) => s.set(id, (s.get(id) ?? 0) + 1 / (k + r + 1))); return [...s.entries()].sort((a, b) => b[1] - a[1]).map((x) => x[0]); };
function metrics(ranked, relevant) {
  const top = ranked.slice(0, 10), first = top.findIndex((id) => relevant.has(id));
  const dcg = top.reduce((s, id, i) => s + (relevant.has(id) ? 1 / Math.log2(i + 2) : 0), 0);
  const ideal = [...Array(Math.min(relevant.size, 10)).keys()].reduce((s, i) => s + 1 / Math.log2(i + 2), 0);
  return { r5: ranked.slice(0, 5).some((id) => relevant.has(id)) ? 1 : 0, mrr: first < 0 ? 0 : 1 / (first + 1), ndcg: dcg / ideal };
}
const key = process.argv[2];
const out = [];
for (const name of process.argv.slice(3)) {
  const run = JSON.parse(readFileSync(`${CACHE}${key}--${name}.json`, "utf8"));
  const ds = await loadDataset(name);
  const bm25 = bm25Index(ds.docs);
  const pieces = new Map(ds.docs.map((d) => [d.id, chunk(d.text)]));
  const vectors = new Map();
  for (const c of run.chunks) { if (!vectors.has(c.doc)) vectors.set(c.doc, []); vectors.get(c.doc).push(c.vector); }
  const qtext = new Map(ds.queries.map((q) => [q.id, q.text]));
  const before = [], after = [], times = [];
  for (const q of run.queries) {
    const best = new Map([...vectors.entries()].map(([id, vs]) => { const scores = vs.map((v) => dot(v, q.vector)); const i = scores.indexOf(Math.max(...scores)); return [id, { s: scores[i], i }]; }));
    const chunked = [...best.entries()].sort((a, b) => b[1].s - a[1].s).map((x) => x[0]);
    const hybrid = rrf([bm25(qtext.get(q.id)), chunked]);
    const top = hybrid.slice(0, 20);
    const t0 = performance.now();
    const inputs = tokenizer(top.map(() => qtext.get(q.id)), { text_pair: top.map((id) => pieces.get(id)[best.get(id).i] ?? ""), padding: true, truncation: true, max_length: 512 });
    const logits = Array.from((await model(inputs)).logits.data);
    times.push(performance.now() - t0);
    const reranked = top.map((id, i) => [id, logits[i]]).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
    before.push(metrics(hybrid, ds.rel.get(q.id)));
    after.push(metrics([...reranked, ...hybrid.slice(20)], ds.rel.get(q.id)));
  }
  const mean = (rows, k) => rows.reduce((s, r) => s + r[k], 0) / rows.length;
  const row = { model: key, dataset: name, hybrid: { r5: mean(before, "r5"), mrr: mean(before, "mrr"), ndcg: mean(before, "ndcg") }, reranked: { r5: mean(after, "r5"), mrr: mean(after, "mrr"), ndcg: mean(after, "ndcg") }, rerankMsPerQueryNode: Math.round(times.sort((a, b) => a - b)[times.length >> 1]) };
  out.push(row);
  console.log(JSON.stringify(row));
}
const file = new URL("../rerank.json", import.meta.url).pathname;
writeFileSync(file, JSON.stringify([...(existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : []), ...out], null, 1));
