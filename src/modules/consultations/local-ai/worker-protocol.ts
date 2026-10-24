import type { DictationLanguage } from "./whisper-language";
import type { GeneratorCandidate, GeneratorFamily } from "./generator-choice";

/** Local search model: v1 (EmbeddingGemma 300M fp32), v2 (EmbeddingGemma 2 text, q8) or arctic-embed-l-v2 (q8). */
export type SearchModel = "embeddinggemma" | "embeddinggemma2" | "arctic";

export type LocalAiProgress = {
  message: string;
  progress?: number;
  stage?: "loading" | "generating" | "validating" | "retrying";
  characters?: number;
  attempt?: 1 | 2;
};
export type WorkerRequest =
  | { type: "load-whisper"; modelRoot: string; runtimeRoot: string }
  | { type: "transcribe"; audio: Float32Array; language?: DictationLanguage }
  | {
      type: "generate";
      /** Models to try in order: a load failure moves on to the next one (Gemma 3). */
      generators: GeneratorCandidate[];
      runtimeRoot: string;
      /** One user turn, without chat template: the worker wraps it for the loaded model. */
      prompt: string;
      /** Set by the session when a preferred model already failed on this request. */
      fellBack?: boolean;
      responseTemplate?: string;
      purpose?: "document";
      attempt?: 1 | 2;
    }
  // threads: ONNX threads asked for arctic (applied only in a cross-origin isolated page).
  | { type: "embed"; modelRoot: string; runtimeRoot: string; texts: string[]; query?: boolean; model?: SearchModel; threads?: number }
  | { type: "dispose" };
export type WorkerResponse =
  | ({ type: "progress" } & LocalAiProgress)
  | { type: "ready" }
  | { type: "transcript"; text: string; language?: string }
  | { type: "generated"; text: string; generator?: GeneratorFamily; fellBack?: boolean }
  // The engine cannot load this model here; MediaPipe is unusable in that worker
  // afterwards, so the session retries the request in a fresh one without it.
  | { type: "generator-unavailable"; url: string }
  | { type: "embedded"; vectors: number[][]; engine?: { threads: number; isolated: boolean; sharedMemory: boolean } }
  | { type: "disposed" }
  | { type: "error"; message: string };
