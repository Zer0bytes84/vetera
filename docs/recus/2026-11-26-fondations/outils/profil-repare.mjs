// Coût de chaque étape du chemin réparé, sur toutes les lignes d'une génération.
import { DatabaseSync } from "node:sqlite";
import { performance } from "node:perf_hooks";
const { embeddingBytesFromHex, passageCosine } = await import("../../../../src/modules/consultations/local-ai/embedding-index.ts");
const { matchesExactSearchTerms, matchesSearchTerms } = await import("../../../../src/modules/consultations/local-ai/veterinary-lexicon.ts");
const { SEARCH_INDEX_KEYS } = await import("../../../../src/modules/consultations/local-ai/passage-search.ts");
const db = new DatabaseSync(process.argv[2], { readOnly: true });
const rows = db.prepare("SELECT chunk_text AS text, hex(embedding) AS embedding FROM embeddings WHERE model_key=?").all(SEARCH_INDEX_KEYS.passages);
const q = Array.from({ length: 768 }, (_, i) => Math.sin(i)); const n = Math.hypot(...q); const u = Float64Array.from(q, (v) => v / n);
const time = (label, f) => { const t = performance.now(); let k = 0; for (const r of rows) if (f(r)) k++; console.log(label, Math.round(performance.now() - t), "ms", k); };
const raws = [];
time("hex->Float32Array", (r) => raws.push(embeddingBytesFromHex(r.embedding)));
let i = 0; time("passageCosine", () => passageCosine(raws[i++], u) > 0.15);
i = 0; time("hypot spread x1", () => Math.hypot(...raws[i++]) > 0);
time("matchesExactSearchTerms", (r) => matchesExactSearchTerms("boiterie méloxicam", r.text));
time("matchesSearchTerms", (r) => matchesSearchTerms("boiterie méloxicam", r.text));
