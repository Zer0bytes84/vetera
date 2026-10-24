/// <reference lib="webworker" />
import type { LlmInference } from "@mediapipe/tasks-genai";
import { enforceOfflineWorker } from "../local-ai/offline-policy";
import { estimateTokenCapacity } from "../local-ai/token-capacity";
import { wrapUserTurn, type GeneratorFamily } from "../local-ai/generator-choice";
import type {
  WorkerRequest,
  WorkerResponse,
} from "../local-ai/worker-protocol";

// One engine per worker: it stays loaded between the requests of a session
// (second attempt included) and is freed when the session terminates the worker.
let model: LlmInference | null = null;
let loadedUrl: string | null = null;
let loadedFamily: GeneratorFamily = "gemma3";
let capacity = 0;
const unavailableGraphics =
  "Cette fenêtre ne permet pas la préparation locale des notes. La saisie manuelle reste disponible ; vérifiez la compatibilité de l’accélération graphique de votre ordinateur.";
const send = (message: WorkerResponse) => self.postMessage(message);
const release = () => {
  model?.close();
  model = null;
  loadedUrl = null;
  capacity = 0;
};
const openWeights = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok || !response.body)
    throw new Error("Fichier de modèle inaccessible.");
  return response.body.getReader();
};
self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  if (data.type !== "generate") return;
  let stage: "load" | "generate" = "load";
  try {
    enforceOfflineWorker([...data.generators.map((candidate) => candidate.url), data.runtimeRoot]);
    // MediaPipe counts BOTH input and output in maxTokens. The reply reserve
    // follows the dictation scaffold plus a small formatting margin, so long
    // inputs can never silently exhaust the reply.
    const reserve = (templateTokens: number) =>
      data.responseTemplate
        ? Math.max(256, templateTokens + 64)
        : data.purpose === "document"
          ? 768
          : 512;
    const candidates = data.generators;
    if (!candidates.length) throw new Error("Aucun modèle de rédaction disponible.");
    if (!model || !candidates.some((candidate) => candidate.url === loadedUrl)) {
      release();
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
      // Only the preferred model is tried here: after a failed load, MediaPipe
      // cannot create another engine in this worker ("ModuleFactory not set").
      {
        const candidate = candidates[0];
        // The tokenizer only exists once the weights are loaded: size the engine
        // from a conservative estimate, then check with the real count below.
        const nextCapacity = estimateTokenCapacity(
          wrapUserTurn(data.prompt, candidate.family),
          reserve(estimateTokenCapacity(data.responseTemplate ?? "", 0))
        );
        try {
          model = await LlmInference.createFromOptions(fileset, {
            baseOptions: { modelAssetBuffer: await openWeights(candidate.url) },
            maxTokens: nextCapacity,
            topK: 1,
            temperature: 0,
            randomSeed: 42,
          });
          // A damaged file can be accepted and only fail at its first use:
          // the tokenizer must answer before the model counts as loaded.
          if (model.sizeInTokens(wrapUserTurn(data.prompt, candidate.family)) === undefined)
            throw new Error("Tokenizer indisponible.");
        } catch (error) {
          // Not enough memory or graphics, or an unusable file: the session
          // moves on silently to the next model (Gemma 3) in a fresh worker.
          release();
          if (candidates.length === 1) throw error;
          send({ type: "generator-unavailable", url: candidate.url });
          return;
        }
        loadedUrl = candidate.url;
        loadedFamily = candidate.family;
        capacity = nextCapacity;
      }
      if (!model) throw new Error("Aucun modèle de rédaction disponible.");
    }
    const prompt = wrapUserTurn(data.prompt, loadedFamily);
    const inputTokens = model.sizeInTokens(prompt);
    const templateTokens = data.responseTemplate
      ? model.sizeInTokens(data.responseTemplate)
      : 448;
    if (inputTokens === undefined || templateTokens === undefined)
      throw new Error("Le moteur local n’a pas pu mesurer la note.");
    const needed = inputTokens + reserve(templateTokens);
    if (needed > capacity) {
      // Rare: unusually dense text. setOptions releases the converted engine
      // before creating its replacement, so one model stays loaded at a time.
      await model.setOptions({
        baseOptions: { modelAssetBuffer: await openWeights(loadedUrl!) },
        maxTokens: needed,
      });
      capacity = needed;
    }
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
    const text = await model.generateResponse(prompt, (partial, done) => {
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
    send({ type: "generated", text, generator: loadedFamily, fellBack: data.fellBack ?? false });
  } catch (error) {
    release();
    send({
      type: "error",
      message:
        error instanceof Error && error.message === unavailableGraphics
          ? error.message
          : stage === "load"
            ? "L’assistant n’a pas pu être chargé. Vérifiez le fichier de préparation des notes installé et la mémoire disponible." +
              // Development builds keep the engine's own message for diagnosis.
              (import.meta.env.DEV ? ` (${String(error instanceof Error ? error.message : error)})` : "")
            : data.purpose === "document"
              ? "La lecture assistée a échoué. Le texte du document reste disponible pour votre relecture."
              : "La préparation locale de la note a échoué. Votre dictée est conservée ; vous pouvez réessayer.",
    });
  }
};
