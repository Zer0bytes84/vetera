import type { DictationLanguage } from "./whisper-language";

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
      modelUrl: string;
      runtimeRoot: string;
      prompt: string;
      responseTemplate?: string;
      purpose?: "document";
      attempt?: 1 | 2;
    }
  | { type: "embed"; modelRoot: string; runtimeRoot: string; texts: string[]; query?: boolean }
  | { type: "dispose" };
export type WorkerResponse =
  | ({ type: "progress" } & LocalAiProgress)
  | { type: "ready" }
  | { type: "transcript"; text: string; language?: string }
  | { type: "generated"; text: string }
  | { type: "embedded"; vectors: number[][] }
  | { type: "disposed" }
  | { type: "error"; message: string };
