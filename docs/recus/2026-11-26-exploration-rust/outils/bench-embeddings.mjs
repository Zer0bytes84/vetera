// Même modèle ONNX, deux moteurs : onnxruntime-web (WASM, celui de la webview)
// et onnxruntime-node (natif, le moteur qu'un portage Rust appellerait via le crate ort).
// Usage : node bench-embeddings.mjs <dossier-modèle> <fichier.onnx> <web|native> <threads> [prefix]
import { performance } from "node:perf_hooks";
import path from "node:path";
const [dir, onnxFile, engine, threadsArg, prefix = ""] = process.argv.slice(2);
const threads = Number(threadsArg);
const { AutoTokenizer, env } = await import("@huggingface/transformers");
env.allowRemoteModels = false;
env.localModelPath = path.dirname(dir) + "/";
const tokenizer = await AutoTokenizer.from_pretrained(path.basename(dir), { local_files_only: true });
const passage = "Chien croisé de 7 ans, 24 kg, présenté pour boiterie du postérieur gauche depuis 5 jours, " +
  "aggravée après une promenade. À l'examen, douleur à l'extension de la hanche gauche, pas de tiroir, " +
  "amyotrophie modérée de la cuisse. Température 38,6 °C, muqueuses roses, TRC < 2 s. Hypothèse : " +
  "arthrose coxo-fémorale ou rupture partielle du ligament croisé. Plan : radiographies du bassin et " +
  "du grasset sous sédation, méloxicam 0,1 mg/kg une fois par jour pendant 7 jours, repos en laisse, " +
  "contrôle dans 10 jours. Propriétaire informé du coût des examens et d'une éventuelle chirurgie.";
// ORT_V4=1 : les moteurs de transformers v4 (ORT plus récent, requis par EmbeddingGemma 2).
import { createRequire } from "node:module";
const req = createRequire(process.cwd() + (process.env.ORT_V4 ? "/node_modules/transformers-v4/package.json" : "/package.json"));
const ort = req(engine === "web" ? "onnxruntime-web" : "onnxruntime-node");
const options = {};
if (engine === "web") { ort.env.wasm.numThreads = threads; ort.env.wasm.simd = true; }
else { options.intraOpNumThreads = threads; options.interOpNumThreads = 1; }
const rss = () => Math.round(process.memoryUsage().rss / 1e6);
const t0 = performance.now();
const session = await ort.InferenceSession.create(path.join(dir, onnxFile), options);
const loadMs = performance.now() - t0;
const encode = async (text) => {
  const enc = await tokenizer(prefix + text, { padding: true, truncation: false });
  const feeds = {};
  for (const name of session.inputNames) {
    const src = name === "token_type_ids" ? enc.input_ids.data.map(() => 0n) : enc[name]?.data;
    if (!src) throw new Error("entrée inconnue " + name);
    feeds[name] = new ort.Tensor("int64", BigInt64Array.from(src, BigInt), enc.input_ids.dims);
  }
  return session.run(feeds);
};
const tokens = (await tokenizer(prefix + passage)).input_ids.dims.at(-1);
const t1 = performance.now(); await encode(passage); const firstMs = performance.now() - t1;
const times = [];
for (let i = 0; i < 8; i++) { const t = performance.now(); await encode(passage + " " + i); times.push(performance.now() - t); }
times.sort((a, b) => a - b);
const t2 = performance.now();
for (let i = 0; i < 20; i++) await encode(passage.slice(i * 7) + i);
const batch20 = performance.now() - t2;
console.log(JSON.stringify({ model: path.basename(dir), engine, threads, tokens, loadMs: Math.round(loadMs), firstMs: Math.round(firstMs),
  medianMs: Math.round(times[4]), batch20Ms: Math.round(batch20), rssMB: rss() }));
