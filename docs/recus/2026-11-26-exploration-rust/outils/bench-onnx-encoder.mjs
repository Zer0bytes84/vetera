// Encodeur Whisper (30 s d'audio) : onnxruntime-web (WASM) contre onnxruntime-node (natif).
// Usage : node bench-onnx-encoder.mjs <fichier.onnx> <web|native> <threads> [bandes=80]
import { performance } from "node:perf_hooks";
import { createRequire } from "node:module";
const [file, engine, threadsArg, melsArg = "80"] = process.argv.slice(2);
const threads = Number(threadsArg);
const req = createRequire(process.cwd() + "/package.json");
const ort = req(engine === "web" ? "onnxruntime-web" : "onnxruntime-node");
const options = {};
if (engine === "web") { ort.env.wasm.numThreads = threads; }
else { options.intraOpNumThreads = threads; options.interOpNumThreads = 1; }
const t0 = performance.now();
const session = await ort.InferenceSession.create(file, options);
const loadMs = performance.now() - t0;
const mels = Number(melsArg);
const data = new Float32Array(mels * 3000);
for (let i = 0; i < data.length; i++) data[i] = Math.sin(i * 0.013) * 0.5;
const feeds = { [session.inputNames[0]]: new ort.Tensor("float32", data, [1, mels, 3000]) };
const t1 = performance.now(); await session.run(feeds); const firstMs = performance.now() - t1;
const times = [];
for (let i = 0; i < 5; i++) { const t = performance.now(); await session.run(feeds); times.push(performance.now() - t); }
times.sort((a, b) => a - b);
console.log(JSON.stringify({ file: file.split("/").slice(-3).join("/"), engine, threads, loadMs: Math.round(loadMs),
  firstMs: Math.round(firstMs), medianMs: Math.round(times[2]), rssMB: Math.round(process.memoryUsage().rss / 1e6) }));
process.exit(0);
