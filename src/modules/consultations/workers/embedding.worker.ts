/// <reference lib="webworker" />
import type {
  PreTrainedModel,
  PreTrainedTokenizer,
} from "@huggingface/transformers";
import { enforceOfflineWorker } from "../local-ai/offline-policy";
import { normalizedEmbedding } from "../local-ai/embedding-index";
import { exposeSharedMemory } from "../local-ai/shared-memory";
import type {
  SearchModel,
  WorkerRequest,
  WorkerResponse,
} from "../local-ai/worker-protocol";

/** Longest text each model reads without truncation, in tokens. */
const MAX_TOKENS: Record<SearchModel, number> = { embeddinggemma: 2048, embeddinggemma2: 8192, arctic: 8192 };
/** Folder and query/document prefixes of each model (arctic: CLS pooling, "query: " prefix only). */
const PREFIX: Record<SearchModel, { query: string; document: string }> = {
  embeddinggemma: { query: "task: search result | query: ", document: "title: none | text: " },
  embeddinggemma2: { query: "task: search result | query: ", document: "title: none | text: " },
  arctic: { query: "query: ", document: "" },
};
/** Precision and engine of v2 in the webview (q8 needs an operator the WASM engine lacks). */
const V2_ENGINE = { dtype: "q8", device: "webgpu" } as const;

// The model stays loaded between requests while the session keeps this
// worker; terminating the worker is what frees it.
let loaded: {
  root: string;
  name: SearchModel;
  threads?: number;
  tokenizer: PreTrainedTokenizer;
  model: PreTrainedModel;
} | null = null;
const send = (event: WorkerResponse) => self.postMessage(event);
// Threads ONNX actually runs with: none without SharedArrayBuffer, whatever was asked.
let onnxWasm: { numThreads?: number } | undefined;
const engineState = () => ({
  threads: typeof SharedArrayBuffer === "function" ? (onnxWasm?.numThreads ?? 1) : 1,
  isolated: self.crossOriginIsolated,
  sharedMemory: typeof SharedArrayBuffer === "function",
});
const release = async () => {
  const current = loaded;
  loaded = null;
  try {
    await current?.model.dispose();
  } catch {
    /* Worker disposal still releases memory. */
  }
};
const load = async (modelRoot: string, runtimeRoot: string, name: SearchModel, threads = 1) => {
  if (loaded?.root === modelRoot && loaded.name === name && (name !== "arctic" || loaded.threads === threads)) return loaded;
  await release();
  // v2 needs transformers.js 4 (alias), with its own ONNX runtime files;
  // v1 and Whisper stay on transformers.js 3.
  if (name === "embeddinggemma2") return loadV2(modelRoot, runtimeRoot);
  if (name === "arctic") return loadArctic(modelRoot, runtimeRoot, threads);
  const { env, AutoTokenizer, AutoModel } = await import(
    "@huggingface/transformers"
  );
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.useBrowserCache = false;
  env.useFSCache = false;
  env.localModelPath = modelRoot;
  const wasm = env.backends.onnx.wasm;
  if (!wasm) throw new Error("Runtime indisponible.");
  wasm.wasmPaths = runtimeRoot + "onnx/";
  wasm.numThreads = 1;
  wasm.proxy = false;
  send({
    type: "progress",
    message: "Préparation de la recherche locale…",
    stage: "loading",
  });
  const tokenizer = await AutoTokenizer.from_pretrained("embeddinggemma", {
    local_files_only: true,
  });
  const model = await AutoModel.from_pretrained("embeddinggemma", {
    local_files_only: true,
    device: "wasm",
    dtype: "fp32",
    use_external_data_format: true,
  });
  loaded = { root: modelRoot, name, tokenizer, model };
  return loaded;
};
const loadArctic = async (modelRoot: string, runtimeRoot: string, threads: number) => {
  const { env, AutoTokenizer, AutoModel } = await import("@huggingface/transformers");
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.useBrowserCache = false;
  env.useFSCache = false;
  env.localModelPath = modelRoot;
  const wasm = env.backends.onnx.wasm;
  if (!wasm) throw new Error("Runtime indisponible.");
  wasm.wasmPaths = runtimeRoot + "onnx/";
  // Threads need SharedArrayBuffer, i.e. a cross-origin isolated page.
  if (threads > 1) exposeSharedMemory();
  wasm.numThreads = typeof SharedArrayBuffer === "function" ? threads : 1;
  onnxWasm = wasm;
  wasm.proxy = false;
  send({ type: "progress", message: "Préparation de la recherche locale…", stage: "loading" });
  const tokenizer = await AutoTokenizer.from_pretrained("arctic-embed-l-v2", { local_files_only: true });
  const model = await AutoModel.from_pretrained("arctic-embed-l-v2", { local_files_only: true, device: "wasm", dtype: "q8" });
  loaded = { root: modelRoot, name: "arctic", threads, tokenizer, model };
  return loaded;
};
const loadV2 = async (modelRoot: string, runtimeRoot: string) => {
  const { env, AutoTokenizer, AutoModel, AutoConfig } = await import("transformers-v4");
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.useBrowserCache = false;
  env.useFSCache = false;
  env.localModelPath = modelRoot;
  const wasm = env.backends.onnx.wasm;
  if (!wasm) throw new Error("Runtime indisponible.");
  wasm.wasmPaths = runtimeRoot + "onnx-v4/";
  wasm.numThreads = 1;
  wasm.proxy = false;
  send({
    type: "progress",
    message: "Préparation de la recherche locale…",
    stage: "loading",
  });
  const tokenizer = await AutoTokenizer.from_pretrained("embeddinggemma2", {
    local_files_only: true,
  });
  // Text component only: the vision and audio encoders are not loaded.
  const config = await AutoConfig.from_pretrained("embeddinggemma2", { local_files_only: true });
  const text = config as unknown as { vision_config: unknown; audio_config: unknown };
  text.vision_config = text.audio_config = null;
  const model = await AutoModel.from_pretrained("embeddinggemma2", {
    config,
    local_files_only: true,
    device: V2_ENGINE.device,
    dtype: V2_ENGINE.dtype,
  });
  loaded = {
    root: modelRoot,
    name: "embeddinggemma2",
    tokenizer: tokenizer as unknown as PreTrainedTokenizer,
    model: model as unknown as PreTrainedModel,
  };
  return loaded;
};
self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  if (data.type !== "embed") return;
  try {
    if (
      data.texts.length > 100 ||
      data.texts.some((text) => text.length > 100000)
    )
      throw new Error("Lot trop long.");
    enforceOfflineWorker([data.modelRoot, data.runtimeRoot]);
    const name = data.model ?? "embeddinggemma";
    const { tokenizer, model } = await load(data.modelRoot, data.runtimeRoot, name, data.threads);
    const vectors: number[][] = [];
    for (const text of data.texts) {
      const prefix = data.query ? PREFIX[name].query : PREFIX[name].document;
      const inputs = await tokenizer(prefix + text, {
        padding: true,
        truncation: false,
      });
      if (Number(inputs.input_ids.dims.at(-1)) > MAX_TOKENS[name])
        throw new Error(
          "La rubrique dépasse la capacité de lecture locale. Aucun texte n’a été tronqué."
        );
      const output = await model(inputs);
      if (name === "arctic") {
        // CLS pooling (first token), unless the export already pools it, then L2.
        const pooled = output.sentence_embedding;
        const hidden = output.last_hidden_state ?? output.token_embeddings;
        const source = pooled ?? hidden;
        if (!source) throw new Error(`Sortie incompatible (${Object.keys(output).join(", ")}).`);
        const size = Number(source.dims.at(-1));
        const cls = Array.from((source.data as Float32Array).subarray(0, size));
        const norm = Math.hypot(...cls);
        vectors.push(cls.map((value) => value / norm));
      } else {
        const tensor = output.sentence_embedding;
        if (!tensor) throw new Error("Sortie incompatible.");
        vectors.push(
          normalizedEmbedding(Array.from(tensor.data as Float32Array))
        );
      }
      send({
        type: "progress",
        message: "Lecture des extraits validés…",
        stage: "generating",
        progress: vectors.length / data.texts.length,
      });
    }
    send({ type: "embedded", vectors, engine: engineState() });
  } catch (error) {
    // A too-long section is a property of the input: keep the loaded model.
    const tooLong =
      error instanceof Error && error.message.startsWith("La rubrique dépasse");
    if (!tooLong) await release();
    send({
      type: "error",
      message: tooLong
        ? (error as Error).message
        : "La recherche locale n’a pas pu être préparée. Vos documents sont conservés." +
          // Development builds keep the engine's own message for diagnosis.
          (import.meta.env.DEV ? ` (${error instanceof Error ? error.message : String(error)})` : ""),
    });
  }
};
