/// <reference lib="webworker" />
import type { PreTrainedModel } from "@huggingface/transformers";
import { enforceOfflineWorker } from "../local-ai/offline-policy";
import { normalizedEmbedding } from "../local-ai/embedding-index";
import type {
  WorkerRequest,
  WorkerResponse,
} from "../local-ai/worker-protocol";
const send = (event: WorkerResponse) => self.postMessage(event);
self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  if (data.type !== "embed") return;
  let model: PreTrainedModel | null = null;
  try {
    if (
      data.texts.length > 100 ||
      data.texts.some((text) => text.length > 100000)
    )
      throw new Error("Lot trop long.");
    enforceOfflineWorker([data.modelRoot, data.runtimeRoot]);
    const { env, AutoTokenizer, AutoModel } = await import(
      "@huggingface/transformers"
    );
    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    env.useBrowserCache = false;
    env.useFSCache = false;
    env.localModelPath = data.modelRoot;
    const wasm = env.backends.onnx.wasm;
    if (!wasm) throw new Error("Runtime indisponible.");
    wasm.wasmPaths = data.runtimeRoot + "onnx/";
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
    model = await AutoModel.from_pretrained("embeddinggemma", {
      local_files_only: true,
      device: "wasm",
      dtype: "fp32",
      use_external_data_format: true,
    });
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
    await model.dispose();
    model = null;
    send({ type: "embedded", vectors });
  } catch (error) {
    try {
      await model?.dispose();
    } catch {
      /* Worker disposal still releases memory. */
    }
    send({
      type: "error",
      message:
        error instanceof Error &&
        error.message.startsWith("La rubrique dépasse")
          ? error.message
          : "La recherche locale n’a pas pu être préparée. Vos documents sont conservés.",
    });
  }
};
