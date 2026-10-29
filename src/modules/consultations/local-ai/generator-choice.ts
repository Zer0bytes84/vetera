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
/**
 * Gemma 4 is suspended until its generation is fixed: on the dictated Plan it
 * returns no token before the 480 s timeout (docs/recus/2026-10-28/port-dictee-original).
 * Its download and the stored preference stay in place; every computer writes
 * with Gemma 3 meanwhile. Set to false to bring it back.
 */
export const GEMMA4_SUSPENDED = true;
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
// Development builds let the bench compare both models (?generator=…), suspended or not.
function benchGenerator(): GeneratorFamily | null {
  const forced = import.meta.env.DEV
    ? new URLSearchParams(globalThis.location?.search ?? "").get("generator")
    : null;
  return forced === "gemma3" || forced === "gemma4" ? forced : null;
}
/** The generator that writes the notes; a stored Gemma 4 choice gives way while it is suspended. */
export function getGeneratorPreference(suspended = GEMMA4_SUSPENDED): GeneratorFamily {
  const forced = benchGenerator();
  if (forced) return forced;
  const stored = storage()?.getItem(GENERATOR_PREFERENCE_KEY);
  if (stored === "gemma4") return suspended ? DEFAULT_GENERATOR : stored;
  return stored === "gemma3" ? stored : DEFAULT_GENERATOR;
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
  modelRoot: string,
  suspended = GEMMA4_SUSPENDED
): GeneratorCandidate[] {
  const candidate = (family: GeneratorFamily) => ({ family, url: modelRoot + GENERATOR_FILES[family] });
  const fallback = status.generatorReady ? [candidate("gemma3")] : [];
  if (status.generator4Ready && getGeneratorPreference(suspended) === "gemma4" && !generatorFellBack)
    return [candidate("gemma4"), ...fallback];
  return fallback;
}

/** Wraps one user turn in the chat template of the model actually loaded. */
export function wrapUserTurn(content: string, family: GeneratorFamily) {
  return family === "gemma4"
    ? `<|turn>user\n${content}<turn|>\n<|turn>model\n`
    : `<start_of_turn>user\n${content}<end_of_turn>\n<start_of_turn>model\n`;
}
