/// <reference lib="webworker" />
import type { LlmInference } from "@mediapipe/tasks-genai";
import { enforceOfflineWorker } from "../local-ai/offline-policy";
import type {
  WorkerRequest,
  WorkerResponse,
} from "../local-ai/worker-protocol";

let model: LlmInference | null = null;
const unavailableGraphics =
  "Cette fenêtre ne permet pas la préparation locale des notes. La saisie manuelle reste disponible ; vérifiez la compatibilité de l’accélération graphique de votre ordinateur.";
// MediaPipe counts BOTH input and output in maxTokens. Measure the prompt with
// its own tokenizer, then reserve the size of the dictation scaffold plus a
// small formatting margin. Long inputs must not silently exhaust the reply.
const send = (message: WorkerResponse) => self.postMessage(message);
self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  if (data.type !== "generate") return;
  let stage: "load" | "generate" = "load";
  try {
    enforceOfflineWorker([data.modelUrl, data.runtimeRoot]);
    const gpu = (
      navigator as Navigator & {
        gpu?: { requestAdapter: () => Promise<unknown> };
      }
    ).gpu;
    if (!gpu || !(await gpu.requestAdapter())) {
      throw new Error(unavailableGraphics);
    }
    const { FilesetResolver, LlmInference } = await import(
      "@mediapipe/tasks-genai"
    );
    send({
      type: "progress",
      message: "Chargement de l’assistant depuis cet ordinateur…",
      stage: "loading",
      attempt: data.attempt ?? 1,
    });
    const fileset = await FilesetResolver.forGenAiTasks(
      `${data.runtimeRoot}mediapipe`,
      true
    );
    const response = await fetch(data.modelUrl);
    if (!response.ok || !response.body)
      throw new Error("Fichier de modèle inaccessible.");
    model = await LlmInference.createFromOptions(fileset, {
      baseOptions: { modelAssetBuffer: response.body.getReader() },
      maxTokens: 1024,
      topK: 1,
      temperature: 0,
      randomSeed: 42,
    });
    const inputTokens = model.sizeInTokens(data.prompt);
    const templateTokens = data.responseTemplate
      ? model.sizeInTokens(data.responseTemplate)
      : 448;
    if (inputTokens === undefined || templateTokens === undefined)
      throw new Error("Le moteur local n’a pas pu mesurer la note.");
    const outputTokens = data.responseTemplate
      ? Math.max(256, templateTokens + 64)
      : data.purpose === "document"
        ? 768
        : 512;
    const weights = await fetch(data.modelUrl);
    if (!weights.ok || !weights.body)
      throw new Error("Fichier de modèle inaccessible.");
    // setOptions releases the converted model engine before creating its
    // replacement. Keep one model instance and one loaded model at a time.
    await model.setOptions({
      baseOptions: { modelAssetBuffer: weights.body.getReader() },
      maxTokens: inputTokens + outputTokens,
    });
    stage = "generate";
    send({
      type: "progress",
      message:
        data.purpose === "document"
          ? "Lecture des extraits…"
          : "Rédaction de la note…",
      stage: "generating",
      characters: 0,
      attempt: data.attempt ?? 1,
    });
    let characters = 0;
    let lastUpdate = 0;
    const text = await model.generateResponse(data.prompt, (partial, done) => {
      characters += partial.length;
      const now = performance.now();
      if (done || now - lastUpdate >= 150) {
        lastUpdate = now;
        send({
          type: "progress",
          message:
            data.purpose === "document"
              ? "Lecture des extraits…"
              : "Rédaction de la note…",
          stage: "generating",
          characters,
          attempt: data.attempt ?? 1,
        });
      }
    });
    model.close();
    model = null;
    send({ type: "generated", text });
  } catch (error) {
    model?.close();
    model = null;
    send({
      type: "error",
      message:
        error instanceof Error && error.message === unavailableGraphics
          ? error.message
          : stage === "load"
            ? "L’assistant n’a pas pu être chargé. Vérifiez le fichier de préparation des notes installé et la mémoire disponible."
            : data.purpose === "document"
              ? "La lecture assistée a échoué. Le texte du document reste disponible pour votre relecture."
              : "La préparation locale de la note a échoué. Votre dictée est conservée ; vous pouvez réessayer.",
    });
  }
};
