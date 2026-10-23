// node embed.mjs <modelKey> [dataset...] : encode les documents (entiers et en extraits) et les requêtes, cache sur disque.
import { parquetReadObjects } from "hyparquet";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const MODELS = "/private/tmp/claude-501/-Users-zohir--claude-spares-spare-RHkxvE/3489ef79-d362-459e-ae84-9e8f85a2fb72/scratchpad/recherche/models/";
const INSTALLED = process.env.HOME + "/Library/Application Support/com.baitari.vetera/local-ai/";
const CACHE = new URL("../cache/", import.meta.url).pathname;
mkdirSync(CACHE, { recursive: true });

const EG = { query: "task: search result | query: ", doc: "title: none | text: " };
const CONFIGS = {
  "eg1-fp32": { lib: 3, root: INSTALLED, id: "embeddinggemma", dtype: "fp32", kind: "eg", max: 2048, ...EG },
  "eg1-q8": { lib: 3, root: MODELS, id: "eg1", dtype: "q8", kind: "eg", max: 2048, ...EG },
  "eg1-q4": { lib: 3, root: MODELS, id: "eg1", dtype: "q4", kind: "eg", max: 2048, ...EG },
  "eg2-q8": { lib: 4, root: MODELS, id: "eg2", dtype: "q8", kind: "eg2", max: 8192, ...EG },
  "e5small-q8": { lib: 3, root: MODELS, id: "e5small", dtype: "q8", kind: "pipe", pooling: "mean", max: 512, query: "query: ", doc: "passage: " },
  "e5base-q8": { lib: 3, root: MODELS, id: "e5base", dtype: "q8", kind: "pipe", pooling: "mean", max: 512, query: "query: ", doc: "passage: " },
  "qwen3-q8": { lib: 3, root: MODELS, id: "qwen3", dtype: "q8", kind: "pipe", pooling: "last_token", max: 8192, query: "Instruct: Given a question, retrieve passages that answer the question\nQuery:", doc: "" },
  "bgem3-q8": { lib: 3, root: MODELS, id: "bgem3", dtype: "q8", kind: "pipe", pooling: "cls", max: 8192, query: "", doc: "" },
  "arctic-q8": { lib: 3, root: MODELS, id: "arctic", dtype: "q8", kind: "pipe", pooling: "cls", max: 8192, query: "query: ", doc: "" },
};

const read = async (path) => {
  const buffer = readFileSync(path);
  return parquetReadObjects({ file: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) });
};
// Graine fixe : le même sous-échantillon d'Alloprof pour tous les modèles.
let seed = 7;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
export async function loadDataset(name) {
  const dir = new URL(`../data/${name}/`, import.meta.url).pathname;
  const [corpus, queries, qrels] = await Promise.all(["corpus", "queries", "qrels"].map((s) => read(dir + s + ".parquet")));
  let qs = queries.map((q) => ({ id: String(q._id), text: q.text }));
  const rel = new Map();
  for (const r of qrels) {
    if (Number(r.score) <= 0) continue;
    const q = String(r["query-id"]);
    if (!rel.has(q)) rel.set(q, new Set());
    rel.get(q).add(String(r["corpus-id"]));
  }
  qs = qs.filter((q) => rel.has(q.id));
  let docs = corpus.map((d) => ({ id: String(d._id), text: (d.title ? d.title + "\n" : "") + (d.text ?? "") }));
  if (name === "AlloprofRetrieval") {
    seed = 7;
    qs = qs.map((q) => [random(), q]).sort((a, b) => a[0] - b[0]).slice(0, 200).map((x) => x[1]);
    const keep = new Set(qs.flatMap((q) => [...rel.get(q.id)]));
    const others = docs.filter((d) => !keep.has(d.id)).map((d) => [random(), d]).sort((a, b) => a[0] - b[0]).slice(0, 500).map((x) => x[1]);
    docs = [...docs.filter((d) => keep.has(d.id)), ...others];
  }
  return { name, docs, queries: qs, rel };
}

// Extraits d'environ 800 caractères (≈ 200 tokens en français), coupés aux fins de phrase, chevauchement d'une phrase.
export function chunk(text, size = 800) {
  const sentences = text.split(/(?<=[.!?;:])\s+|\n+/u).filter((s) => s.trim());
  const chunks = [];
  let current = [];
  let length = 0;
  for (const sentence of sentences) {
    if (length + sentence.length > size && current.length) {
      chunks.push(current.join(" "));
      current = [current.at(-1)];
      length = current[0].length;
    }
    current.push(sentence);
    length += sentence.length + 1;
  }
  if (current.length) chunks.push(current.join(" "));
  return chunks.length ? chunks : [text];
}

async function makeEncoder(key) {
  const c = { ...CONFIGS[key], max: Math.min(CONFIGS[key].max, 2048) };
  const lib = c.lib === 4 ? await import("tjs4") : await import("@huggingface/transformers");
  const { env, AutoTokenizer, AutoModel, AutoConfig, pipeline } = lib;
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = c.root;
  const tokenizer = await AutoTokenizer.from_pretrained(c.id, { local_files_only: true });
  // Au-delà de 12 000 caractères, le compte dépasse de toute façon 2 048 tokens.
  const count = (text) => tokenizer.encode(text.slice(0, 12000)).length;
  if (c.kind === "pipe") {
    const extractor = await pipeline("feature-extraction", c.id, { dtype: c.dtype, local_files_only: true });
    return { count, encode: async (text) => Array.from((await extractor(text, { pooling: c.pooling, normalize: true, truncation: true, max_length: c.max })).data) };
  }
  let config;
  if (c.kind === "eg2") {
    config = await AutoConfig.from_pretrained(c.id, { local_files_only: true });
    config.vision_config = config.audio_config = null;
  }
  const model = await AutoModel.from_pretrained(c.id, { dtype: c.dtype, local_files_only: true, ...(config ? { config } : {}), ...(c.kind === "eg" ? { use_external_data_format: true } : {}) });
  return {
    count,
    encode: async (text) => {
      const inputs = await tokenizer(text, { truncation: true, max_length: c.max });
      const v = Array.from((await model(inputs)).sentence_embedding.data);
      const n = Math.hypot(...v);
      return v.map((x) => x / n);
    },
  };
}

if (process.argv[1]?.endsWith("embed.mjs")) await main();
async function main() {
const key = process.argv[2];
const datasets = process.argv.slice(3).length ? process.argv.slice(3) : ["PublicHealthQA", "SyntecRetrieval", "AlloprofRetrieval"];
const c = CONFIGS[key];
const encoder = await makeEncoder(key);
for (const name of datasets) {
  const file = `${CACHE}${key}--${name}.json`;
  if (existsSync(file)) continue;
  const ds = await loadDataset(name);
  const t0 = Date.now();
  const docs = [];
  for (const d of ds.docs) {
    const tokens = encoder.count(c.doc + d.text);
    docs.push({ id: d.id, tokens, whole: process.env.SKIP_WHOLE ? null : await encoder.encode(c.doc + d.text) });
  }
  const tWhole = Date.now() - t0;
  const t1 = Date.now();
  const chunks = [];
  for (const d of ds.docs) for (const piece of chunk(d.text)) chunks.push({ doc: d.id, vector: await encoder.encode(c.doc + piece) });
  const tChunks = Date.now() - t1;
  const queries = [];
  for (const q of ds.queries) queries.push({ id: q.id, vector: await encoder.encode(c.query + q.text) });
  const round = (v) => v.map((x) => Math.round(x * 1e5) / 1e5);
  writeFileSync(file, JSON.stringify({
    key, dataset: name, digest: createHash("sha1").update(ds.docs.map((d) => d.id).join()).digest("hex"),
    seconds: { whole: tWhole / 1000, chunks: tChunks / 1000 },
    docs: docs.map((d) => ({ ...d, whole: d.whole && round(d.whole) })),
    chunks: chunks.map((x) => ({ ...x, vector: round(x.vector) })),
    queries: queries.map((q) => ({ ...q, vector: round(q.vector) })),
  }));
  console.log(`${key} ${name} : ${ds.docs.length} docs (${tWhole / 1000} s), ${chunks.length} extraits (${tChunks / 1000} s), ${ds.queries.length} requêtes`);
}
}
