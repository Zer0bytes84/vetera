/// <reference lib="webworker" />
import type {
  PreTrainedModel,
  PreTrainedTokenizer,
} from "@huggingface/transformers";
import { enforceOfflineWorker } from "../local-ai/offline-policy";
import { normalizedEmbedding } from "../local-ai/embedding-index";
import type {
  WorkerRequest,
  WorkerResponse,
} from "../local-ai/worker-protocol";

// The model stays loaded between requests while the session keeps this
// worker; terminating the worker is what frees it.
let loaded: {
  root: string;
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
const load = async (modelRoot: string, runtimeRoot: string) => {
  if (loaded?.root === modelRoot) return loaded;
  await release();
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
  loaded = { root: modelRoot, tokenizer, model };
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
    const { tokenizer, model } = await load(data.modelRoot, data.runtimeRoot);
    const vectors: number[][] = [];
    for (const text of data.texts) {
      const prefix = data.query
        ? "task: search result | query: "
        : "title: none | text: ";
      const inputs = await tokenizer(prefix + text, {
        padding: true,
        truncation: false,
      });
      if (Number(inputs.input_ids.dims.at(-1)) > 2048)
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
        : "La recherche locale n’a pas pu être préparée. Vos documents sont conservés.",
    });
  }
};
