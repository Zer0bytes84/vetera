// node score.mjs : métriques de chaque configuration à partir du cache d'embeddings.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { loadDataset } from "./embed.mjs";
import * as app from "./app-search.mjs";

const CACHE = new URL("../cache/", import.meta.url).pathname;
const STOP = new Set("le la les un une des du de d l et ou a au aux en dans par pour sur avec sans est sont que qui quoi quel quelle quels quelles ce cet cette ces se sa son ses leur leurs je tu il elle on nous vous ils elles ne pas plus comment pourquoi quand y t il s est".split(" "));
const tokens = (text) => app.normalizeLexical(text).split(" ").filter((w) => w && !STOP.has(w)).map(app.stemFrenchWord);

function bm25Index(docs) {
  const tf = docs.map((d) => { const m = new Map(); for (const t of tokens(d.text)) m.set(t, (m.get(t) ?? 0) + 1); return m; });
  const len = tf.map((m) => [...m.values()].reduce((a, b) => a + b, 0));
  const avg = len.reduce((a, b) => a + b, 0) / len.length;
  const df = new Map();
  for (const m of tf) for (const t of m.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const N = docs.length;
  return (query) => {
    const q = [...new Set(tokens(query))];
    return docs.map((d, i) => {
      let s = 0;
      for (const t of q) {
        const f = tf[i].get(t);
        if (!f) continue;
        const idf = Math.log(1 + (N - df.get(t) + 0.5) / (df.get(t) + 0.5));
        s += idf * (f * 2.2) / (f + 1.2 * (1 - 0.75 + 0.75 * len[i] / avg));
      }
      return { id: d.id, score: s };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).map((x) => x.id);
  };
}
// rankPatientChunks exige 768 dimensions : compléter par des zéros ne change pas le cosinus.
const pad = (v) => (v.length >= 768 ? v.slice(0, 768) : [...v, ...Array(768 - v.length).fill(0)]);
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
const rrf = (lists, k = 60, weights = lists.map(() => 1)) => {
  const s = new Map();
  lists.forEach((list, w) => list.slice(0, 100).forEach((id, r) => s.set(id, (s.get(id) ?? 0) + weights[w] / (k + r + 1))));
  return [...s.entries()].sort((a, b) => b[1] - a[1]).map((x) => x[0]);
};
function metrics(ranked, relevant) {
  const top = ranked.slice(0, 10);
  const first = top.findIndex((id) => relevant.has(id));
  const dcg = top.reduce((s, id, i) => s + (relevant.has(id) ? 1 / Math.log2(i + 2) : 0), 0);
  const ideal = [...Array(Math.min(relevant.size, 10)).keys()].reduce((s, i) => s + 1 / Math.log2(i + 2), 0);
  return { r5: ranked.slice(0, 5).some((id) => relevant.has(id)) ? 1 : 0, mrr: first < 0 ? 0 : 1 / (first + 1), ndcg: dcg / ideal };
}
const mean = (rows, k) => rows.reduce((s, r) => s + r[k], 0) / rows.length;

const datasets = new Map();
const results = [];
for (const file of readdirSync(CACHE).filter((f) => f.endsWith(".json")).sort()) {
  const run = JSON.parse(readFileSync(CACHE + file, "utf8"));
  if (!datasets.has(run.dataset)) {
    const ds = await loadDataset(run.dataset);
    // Correspondances du lexique vétérinaire calculées une fois par jeu (indépendantes du modèle).
    const lex = new Map(ds.queries.map((q) => [q.id, new Set(ds.docs.filter((d) => app.matchesSearchTerms(q.text, d.text)).map((d) => d.id))]));
    datasets.set(run.dataset, { ds, lex, bm25: bm25Index(ds.docs), text: new Map(ds.docs.map((d) => [d.id, d.text])) });
  }
  const { ds, bm25, text, lex } = datasets.get(run.dataset);
  const qtext = new Map(ds.queries.map((q) => [q.id, q.text]));
  const byDocChunks = new Map();
  for (const c of run.chunks) { if (!byDocChunks.has(c.doc)) byDocChunks.set(c.doc, []); byDocChunks.get(c.doc).push(c.vector); }
  const refused = run.docs.filter((d) => d.tokens > 2048).length;
  const hasWhole = run.docs[0].whole !== null;
  const rows = { whole: [], chunk: [], bm25: [], hybrid: [], hybridW: [], bonus: [], app: [] };
  for (const q of run.queries) {
    const rel = ds.rel.get(q.id);
    const whole = !hasWhole ? [] : run.docs.map((d) => ({ id: d.id, s: dot(d.whole, q.vector) })).sort((a, b) => b.s - a.s).map((x) => x.id);
    const chunkScores = [...byDocChunks.entries()].map(([id, vs]) => ({ id, s: Math.max(...vs.map((v) => dot(v, q.vector))) }));
    const chunked = [...chunkScores].sort((a, b) => b.s - a.s).map((x) => x.id);
    // Lexique vétérinaire de l'app gardé comme signal, mais en bonus de score au lieu d'une priorité absolue.
    const bonus = chunkScores.map((x) => ({ id: x.id, s: x.s + (lex.get(q.id).has(x.id) ? 0.05 : 0) })).sort((a, b) => b.s - a.s).map((x) => x.id);
    const lexical = bm25(qtext.get(q.id));
    // Recherche actuelle de l'app : sections > 2 048 tokens non indexées, rankPatientChunks puis correspondances textuelles restantes.
    const indexed = run.docs.filter((d) => d.tokens <= 2048).map((d) => ({ patientId: "p", sourceId: d.id, sourceType: "document", documentType: "document", section: "document", chunkIndex: 0, text: text.get(d.id), sourceKey: d.id, vector: pad(d.whole) }));
    const ranked = !hasWhole ? [] : app.rankPatientChunks(indexed, pad(q.vector), { patientId: "p", sourceTypes: ["document"], sections: ["document"] }, 20, app.MIN_SEARCH_SCORE, qtext.get(q.id)).map((r) => r.sourceId);
    const extra = ds.docs.filter((d) => !ranked.includes(d.id) && lex.get(q.id).has(d.id)).map((d) => d.id);
    if (hasWhole) rows.whole.push(metrics(whole, rel));
    rows.chunk.push(metrics(chunked, rel));
    rows.bm25.push(metrics(lexical, rel));
    rows.hybrid.push(metrics(rrf([lexical, chunked]), rel));
    rows.hybridW.push(metrics(rrf([lexical, chunked], 60, [0.5, 1]), rel));
    rows.bonus.push(metrics(bonus, rel));
    if (hasWhole) rows.app.push(metrics([...ranked, ...extra], rel));
  }
  for (const [mode, list] of Object.entries(rows)) if (list.length)
    results.push({ model: run.key, dataset: run.dataset, mode, n: list.length, r5: mean(list, "r5"), mrr: mean(list, "mrr"), ndcg: mean(list, "ndcg"), refused2048: refused / run.docs.length, maxTokens: Math.max(...run.docs.map((d) => d.tokens)), encodeSeconds: run.seconds });
}
writeFileSync(new URL("../scores.json", import.meta.url).pathname, JSON.stringify(results, null, 1));
const pct = (x) => (100 * x).toFixed(1).padStart(5);
for (const r of results) console.log(`${r.dataset.padEnd(18)} ${r.model.padEnd(11)} ${r.mode.padEnd(7)} R@5 ${pct(r.r5)}  MRR ${pct(r.mrr)}  nDCG ${pct(r.ndcg)}  refus>2048 ${pct(r.refused2048)}`);
