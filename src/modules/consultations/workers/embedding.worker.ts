/// <reference lib="webworker" />
import type {
  PreTrainedModel,
  PreTrainedTokenizer,
} from "@huggingface/transformers";
import { enforceOfflineWorker } from "../local-ai/offline-policy";
import { normalizedEmbedding } from "../local-ai/embedding-index";
import type {
  SearchModel,
  WorkerRequest,
  WorkerResponse,
} from "../local-ai/worker-protocol";

/** Longest text each model reads without truncation, in tokens. */
const MAX_TOKENS: Record<SearchModel, number> = { embeddinggemma: 2048, embeddinggemma2: 8192 };
/** Precision and engine of v2 in the webview (q8 needs an operator the WASM engine lacks). */
const V2_ENGINE = { dtype: "q8", device: "webgpu" } as const;

// The model stays loaded between requests while the session keeps this
// worker; terminating the worker is what frees it.
let loaded: {
  root: string;
  name: SearchModel;
  tokenizer: PreTrainedTokenizer;
  model: PreTrainedModel;
} | null = null;
const send = (event: WorkerResponse) => self.postMessage(event);
const release = async () => {
  const current = loaded;
  loaded = null;
  try {
    await current?.model.dispose();
  } catch {
    /* Worker disposal still releases memory. */
  }
};
const load = async (modelRoot: string, runtimeRoot: string, name: SearchModel) => {
  if (loaded?.root === modelRoot && loaded.name === name) return loaded;
  await release();
  // v2 needs transformers.js 4 (alias), with its own ONNX runtime files;
  // v1 and Whisper stay on transformers.js 3.
  if (name === "embeddinggemma2") return loadV2(modelRoot, runtimeRoot);
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
    const { tokenizer, model } = await load(data.modelRoot, data.runtimeRoot, name);
    const vectors: number[][] = [];
    for (const text of data.texts) {
      const prefix = data.query
        ? "task: search result | query: "
        : "title: none | text: ";
      const inputs = await tokenizer(prefix + text, {
        padding: true,
        truncation: false,
      });
      if (Number(inputs.input_ids.dims.at(-1)) > MAX_TOKENS[name])
        throw new Error(
          "La rubrique dépasse la capacité de lecture locale. Aucun texte n’a été tronqué."
        );
      const output = await model(inputs);
      const tensor = output.sentence_embedding;
      if (!tensor) throw new Error("Sortie incompatible.");
      vectors.push(
        normalizedEmbedding(Array.from(tensor.data as Float32Array))
      );
      send({
        type: "progress",
        message: "Lecture des extraits validés…",
        stage: "generating",
        progress: vectors.length / data.texts.length,
      });
    }
    send({ type: "embedded", vectors });
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
