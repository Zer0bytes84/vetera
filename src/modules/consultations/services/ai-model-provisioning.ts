import { isTauriRuntime } from "@/services/browser-store";
import manifest from "../../../../resources/local-ai/download-manifest.json";
import { nativeDictationEnabled } from "../local-ai/native-dictation";
import {
  type LocalModelStatus, EMPTY_MODEL_STATUS, getLocalModels,
  downloadLocalModels, cancelLocalModelDownload,
} from "../local-ai/models";

export type AIModelId = "whisper" | "generator" | "embeddinggemma";
export type AIModelProgressState = "pending" | "downloading" | "verifying" | "ready" | "error";
export interface AIProvisioningProgress {
  step: "idle" | "preparing" | AIModelId | "finalizing" | "completed" | "error";
  stepMessage: string;
  currentModelId: AIModelId | null;
  totalBytes: number;
  downloadedBytes: number;
  percentage: number;
  speedMbps: number;
  secondsRemaining: number;
  models: Record<AIModelId, AIModelProgressState>;
}

export const AI_ONBOARDING_DISMISSED_KEY = "baitari:ai-models-onboarding-dismissed";
export const AI_ONBOARDING_COMPLETED_KEY = "baitari:ai-models-onboarding-completed";
export const AI_ONBOARDING_OPEN_EVENT = "baitari:open-ai-models-onboarding";
export const AI_MODELS_CHANGED_EVENT = "baitari:local-ai-models-changed";
export const AI_SETTINGS_PENDING_KEY = "baitari:pending-ai-settings";

const sizeOf = (id: AIModelId | "generator4" | "whisper-turbo") => manifest.find(model => model.id === id)!.files.reduce((bytes, file) => bytes + file.size, 0);
const sizeLabel = (bytes: number) => bytes < 1_000_000_000
  ? `${Math.ceil(bytes / 1_000_000)} Mo`
  : `${(bytes / 1_000_000_000).toLocaleString("fr-FR", {maximumFractionDigits: 1})} Go`;
export const AI_MODELS_CATALOG = [
  // On the macOS desktop app the dictation also installs its native model.
  {id: "whisper" as const, name: "Dictée vocale", sizeBytes: sizeOf("whisper") + (nativeDictationEnabled() ? sizeOf("whisper-turbo") : 0), description: "Dictez vos observations, puis relisez leur transcription.", badge: "Français et multilingue"},
  {id: "generator" as const, name: "Assistant IA", sizeBytes: sizeOf("generator"), description: "Préparez une note SOAP à relire et à valider.", badge: "Rédaction locale"},
  {id: "embeddinggemma" as const, name: "Recherche clinique", sizeBytes: sizeOf("embeddinggemma"), description: "Retrouvez vos observations et documents par leur sens clinique.", badge: "Recherche locale"},
].map(model => ({...model, sizeLabel: sizeLabel(model.sizeBytes)}));
export const TOTAL_AI_MODELS_BYTES = AI_MODELS_CATALOG.reduce((bytes, model) => bytes + model.sizeBytes, 0);
/** Optional, offered once the base tools are installed; the current assistant stays as fallback. */
export const NEW_ASSISTANT = {
  id: "generator4" as const,
  name: "Nouvelle version de l’Assistant IA",
  sizeLabel: sizeLabel(sizeOf("generator4")),
  description: "Plus fidèle à vos dictées. Elle s’installe à côté de l’assistant actuel, qui prend le relais si cet ordinateur ne peut pas la charger.",
};
export const NEW_ASSISTANT_DISMISSED_KEY = "baitari:new-assistant-offer-dismissed";
export const TOTAL_AI_MODELS_SIZE_LABEL = sizeLabel(TOTAL_AI_MODELS_BYTES);

function storage() {
  try { return typeof window === "undefined" ? null : window.localStorage; }
  catch { return null; }
}
export function hasDismissedAIOnboarding() { return storage()?.getItem(AI_ONBOARDING_DISMISSED_KEY) === "true"; }
export function hasCompletedAIOnboarding() { return storage()?.getItem(AI_ONBOARDING_COMPLETED_KEY) === "true"; }
export function setAIOnboardingDismissed() { storage()?.setItem(AI_ONBOARDING_DISMISSED_KEY, "true"); }
export function setAIOnboardingCompleted() { storage()?.setItem(AI_ONBOARDING_COMPLETED_KEY, "true"); }
export function resetAIOnboarding() {
  storage()?.removeItem(AI_ONBOARDING_DISMISSED_KEY);
  storage()?.removeItem(AI_ONBOARDING_COMPLETED_KEY);
}
export function triggerOpenAIOnboarding() {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(AI_SETTINGS_PENDING_KEY, "true");
    window.location.hash = "#/parametres";
    window.dispatchEvent(new CustomEvent(AI_ONBOARDING_OPEN_EVENT));
  }
}
/** Dictation ready: on the macOS desktop app it is the native model that transcribes. */
export function dictationModelReady(status: LocalModelStatus, native = nativeDictationEnabled()) {
  return Boolean(status.whisperReady && (!native || status.whisperTurboReady));
}
export function allAIModelsReady(status: LocalModelStatus) {
  return Boolean(dictationModelReady(status) && status.generatorReady && status.embeddingReady);
}
export async function checkAIModelsStatus(): Promise<LocalModelStatus> {
  try { return await getLocalModels(); }
  catch { return EMPTY_MODEL_STATUS; }
}
export async function shouldShowAIOnboarding() {
  // Web access never depends on a native command, local files or an installation flag.
  if (!isTauriRuntime() || hasDismissedAIOnboarding()) return false;
  const actual = await checkAIModelsStatus();
  if (allAIModelsReady(actual)) { setAIOnboardingCompleted(); return false; }
  // Older builds marked simulated downloads complete; disk status is authoritative.
  storage()?.removeItem(AI_ONBOARDING_COMPLETED_KEY);
  return true;
}

export function shouldOfferNewAssistant(status: LocalModelStatus) {
  return isTauriRuntime() && allAIModelsReady(status) && !status.generator4Ready
    && storage()?.getItem(NEW_ASSISTANT_DISMISSED_KEY) !== "true";
}
export function dismissNewAssistantOffer() { storage()?.setItem(NEW_ASSISTANT_DISMISSED_KEY, "true"); }

/** Downloads only the new assistant version; the base tools are not touched. */
export async function provisionNewAssistant(
  onProgress?: (progress: AIProvisioningProgress) => void,
  options?: {signal?: AbortSignal}
): Promise<LocalModelStatus> {
  if (!isTauriRuntime()) throw new Error("Ces outils sont disponibles dans l’application de bureau. La version web reste utilisable sans installation.");
  if (options?.signal?.aborted) throw new Error("Opération annulée");
  const cancel = () => { void cancelLocalModelDownload().catch(() => {}); };
  options?.signal?.addEventListener("abort", cancel, {once: true});
  try {
    await downloadLocalModels(onProgress, undefined, [NEW_ASSISTANT.id]);
    const actual = await getLocalModels();
    if (!actual.generator4Ready) throw new Error("L’installation n’a pas pu être vérifiée. L’assistant actuel reste disponible ; réessayez.");
    window.dispatchEvent(new Event(AI_MODELS_CHANGED_EVENT));
    return actual;
  } finally { options?.signal?.removeEventListener("abort", cancel); }
}

export async function provisionAllAIModels(
  onProgress?: (progress: AIProvisioningProgress) => void,
  options?: {signal?: AbortSignal; accessToken?: string}
): Promise<LocalModelStatus> {
  if (!isTauriRuntime()) throw new Error("Ces outils sont disponibles dans l’application de bureau. La version web reste utilisable sans installation.");
  if (options?.signal?.aborted) throw new Error("Opération annulée");
  const cancel = () => { void cancelLocalModelDownload().catch(() => {}); };
  options?.signal?.addEventListener("abort", cancel, {once: true});
  try {
    await downloadLocalModels(onProgress, options?.accessToken);
    const actual = await getLocalModels();
    if (!allAIModelsReady(actual)) throw new Error("L’installation n’a pas pu être vérifiée. Les outils déjà installés sont conservés ; réessayez.");
    setAIOnboardingCompleted();
    window.dispatchEvent(new Event(AI_MODELS_CHANGED_EVENT));
    return actual;
  } finally { options?.signal?.removeEventListener("abort", cancel); }
}
