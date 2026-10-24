import type { LocalModelStatus } from "./models";

/** Generation models the local engine can run (same MediaPipe engine, WebGPU). */
export type GeneratorFamily = "gemma3" | "gemma4";
export interface GeneratorCandidate {
  family: GeneratorFamily;
  url: string;
}

/**
 * Generator used when nothing else is chosen. Phase B: Gemma 4 E2B is installed
 * next to Gemma 3 and only becomes the default once its criteria are met.
 */
export const DEFAULT_GENERATOR: GeneratorFamily = "gemma3";
export const GENERATOR_PREFERENCE_KEY = "baitari.generator";
export const GENERATOR_FILES: Record<GeneratorFamily, string> = {
  gemma3: "generator/gemma3.task",
  gemma4: "generator4/gemma4-e2b.task",
};

const storage = () => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};
export function getGeneratorPreference(): GeneratorFamily {
  // Development builds let the bench compare both models (?generator=…).
  const forced = import.meta.env.DEV
    ? new URLSearchParams(globalThis.location?.search ?? "").get("generator")
    : null;
  if (forced === "gemma3" || forced === "gemma4") return forced;
  const stored = storage()?.getItem(GENERATOR_PREFERENCE_KEY);
  return stored === "gemma3" || stored === "gemma4" ? stored : DEFAULT_GENERATOR;
}
export function setGeneratorPreference(family: GeneratorFamily) {
  storage()?.setItem(GENERATOR_PREFERENCE_KEY, family);
  generatorFellBack = false;
}

// Once Gemma 4 failed to load on this computer, the rest of the run goes
// straight to Gemma 3 instead of paying the failed load again.
let generatorFellBack = false;
export const recordGeneratorFallback = () => {
  generatorFellBack = true;
};
export const hasGeneratorFallenBack = () => generatorFellBack;

/** Models to try, in order: the preferred one first, Gemma 3 as the fallback. */
export function generatorCandidates(
  status: Pick<LocalModelStatus, "generatorReady" | "generator4Ready">,
  modelRoot: string
): GeneratorCandidate[] {
  const candidate = (family: GeneratorFamily) => ({ family, url: modelRoot + GENERATOR_FILES[family] });
  const fallback = status.generatorReady ? [candidate("gemma3")] : [];
  if (status.generator4Ready && getGeneratorPreference() === "gemma4" && !generatorFellBack)
    return [candidate("gemma4"), ...fallback];
  return fallback;
}

/** Wraps one user turn in the chat template of the model actually loaded. */
export function wrapUserTurn(content: string, family: GeneratorFamily) {
  return family === "gemma4"
    ? `<|turn>user\n${content}<turn|>\n<|turn>model\n`
    : `<start_of_turn>user\n${content}<end_of_turn>\n<start_of_turn>model\n`;
}
