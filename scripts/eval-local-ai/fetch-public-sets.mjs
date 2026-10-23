#!/usr/bin/env node
// Downloads the three public French retrieval sets of the search challenge
// (MTEB-French: Alloprof, Syntec, PublicHealthQA) into one JSON file for the bench.
// Usage: node scripts/eval-local-ai/fetch-public-sets.mjs --out <folder>
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parquetReadObjects } from "hyparquet";

const outIndex = process.argv.indexOf("--out");
if (outIndex < 0) {
  console.error("Usage : --out <dossier>");
  process.exit(1);
}
const out = resolve(process.argv[outIndex + 1]);
const SETS = [
  { name: "PublicHealthQA", dataset: "mteb/PublicHealthQA", prefix: "french-" },
  { name: "SyntecRetrieval", dataset: "mteb/SyntecRetrieval", prefix: "" },
  { name: "AlloprofRetrieval", dataset: "mteb/AlloprofRetrieval", prefix: "" },
];

// Official parquet files of each set, read with hyparquet (dev dependency).
async function rows(dataset, config) {
  const [part, prefix] = config.startsWith("french-") ? [config.slice(7), "french-"] : [config, ""];
  const url = `https://huggingface.co/datasets/${dataset}/resolve/main/${prefix}${part}/test-00000-of-00001.parquet`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${dataset} ${config} : HTTP ${response.status}`);
  return parquetReadObjects({ file: await response.arrayBuffer() });
}

// Same fixed-seed subsample as the challenge: 200 Alloprof questions, their
// relevant documents and 500 others.
let seed = 7;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const sets = [];
for (const set of SETS) {
  const corpus = await rows(set.dataset, set.prefix + "corpus");
  const queries = await rows(set.dataset, set.prefix + "queries");
  const qrels = await rows(set.dataset, set.prefix + "qrels");
  const relevant = {};
  for (const item of qrels) {
    if (Number(item.score) <= 0) continue;
    (relevant[String(item["query-id"])] ??= []).push(String(item["corpus-id"]));
  }
  let questions = queries.map((q) => ({ id: String(q._id), text: q.text })).filter((q) => relevant[q.id]);
  let docs = corpus.map((d) => ({ id: String(d._id), text: (d.title ? d.title + "\n" : "") + (d.text ?? "") }));
  if (set.name === "AlloprofRetrieval") {
    seed = 7;
    questions = questions.map((q) => [random(), q]).sort((a, b) => a[0] - b[0]).slice(0, 200).map((x) => x[1]);
    const keep = new Set(questions.flatMap((q) => relevant[q.id]));
    const others = docs.filter((d) => !keep.has(d.id)).map((d) => [random(), d]).sort((a, b) => a[0] - b[0]).slice(0, 500).map((x) => x[1]);
    docs = [...docs.filter((d) => keep.has(d.id)), ...others];
  }
  sets.push({
    name: set.name,
    docs,
    queries: questions,
    relevant: Object.fromEntries(questions.map((q) => [q.id, relevant[q.id]])),
  });
  console.log(`${set.name} : ${docs.length} documents, ${questions.length} questions`);
}
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "public-sets.json"), JSON.stringify({ createdAt: new Date().toISOString(), sets }));
console.log(`Écrit dans ${join(out, "public-sets.json")}`);
