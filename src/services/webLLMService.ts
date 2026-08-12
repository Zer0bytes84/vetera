import type { ChatCompletionMessageParam, MLCEngine } from "@mlc-ai/web-llm";

import { APP_NAME } from "@/lib/brand";
import {
  DEFAULT_MODEL_ID,
  getModelPreferences,
  resolveModelId,
} from "@/lib/ai-models";
import { vetKnowledgeService } from "./vetKnowledgeService";

export interface ProgressReport {
  progress: number;
  text: string;
}

export interface LocalChatTurn {
  role: "user" | "assistant";
  text: string;
}

export interface WebGPUStatus {
  available: boolean;
  reason?: string;
}

const DEFAULT_SYSTEM_PROMPT = `Tu es l'assistant clinique de ${APP_NAME}.
Tu aides une clinique veterinaire locale a mieux travailler.

Regles:
- Reponds en francais.
- Sois clair, concis et actionnable.
- Si question medicale: structure en "Evaluation", "Hypotheses", "Actions".
- Si une info est incertaine, signale-le simplement.
- Ne fournis jamais de conseils dangereux.`;

let engine: MLCEngine | null = null;
let activeModelId: string | null = null;
let initPromise: Promise<void> | null = null;
let initializingModelId: string | null = null;
let initializing = false;
let globalProgress: ProgressReport = { progress: 0, text: "Initialisation..." };
let unloadPromise: Promise<void> | null = null;
let webLLMModulePromise: Promise<typeof import("@mlc-ai/web-llm")> | null = null;

// Keep the WebGPU engine alive for the whole duration of a completion. A model
// switch or a view teardown must wait instead of unloading the engine mid-stream.
let activeGenerations = 0;
let generationIdlePromise: Promise<void> | null = null;
let resolveGenerationIdle: (() => void) | null = null;

const MAX_HISTORY_TURNS = 12;
const MAX_HISTORY_TEXT_LENGTH = 5000;

const progressListeners = new Set<(report: ProgressReport) => void>();

const loadWebLLMModule = () => {
  webLLMModulePromise ??= import("@mlc-ai/web-llm");
  return webLLMModulePromise;
};

const waitForGenerationIdle = async (): Promise<void> => {
  if (activeGenerations === 0) return;
  await generationIdlePromise;
};

const beginGeneration = () => {
  activeGenerations += 1;
  if (activeGenerations === 1) {
    generationIdlePromise = new Promise<void>((resolve) => {
      resolveGenerationIdle = resolve;
    });
  }
};

const endGeneration = () => {
  activeGenerations = Math.max(0, activeGenerations - 1);
  if (activeGenerations === 0) {
    resolveGenerationIdle?.();
    resolveGenerationIdle = null;
    generationIdlePromise = null;
  }
};

const throwIfAborted = (signal?: AbortSignal) => {
  if (!signal?.aborted) return;

  const error = new Error("La génération a été annulée.");
  error.name = "AbortError";
  throw error;
};

const notifyProgress = (report: ProgressReport) => {
  globalProgress = report;
  progressListeners.forEach((listener) => {
    try {
      listener(report);
    } catch (error) {
      // A closed view must not break progress delivery to the other views.
      console.warn("[WebLLM] Progress listener failed:", error);
    }
  });
};

const unloadCurrentEngine = async (): Promise<void> => {
  if (unloadPromise) {
    return unloadPromise;
  }

  const currentEngine = engine;
  if (!currentEngine) {
    activeModelId = null;
    return;
  }

  unloadPromise = (async () => {
    try {
      await waitForGenerationIdle();
      await currentEngine.unload();
    } catch (error) {
      // WebGPU contexts can already be lost when a Tauri view is closed.
      console.warn("[WebLLM] Unable to unload the current model:", error);
    } finally {
      if (engine === currentEngine) {
        engine = null;
        activeModelId = null;
      }
    }
  })().finally(() => {
    unloadPromise = null;
  });

  return unloadPromise;
};

export const getLocalModelId = () =>
  activeModelId || DEFAULT_MODEL_ID;

export const getActiveModelId = () => activeModelId;

export const subscribeToProgress = (
  callback: (report: ProgressReport) => void
): (() => void) => {
  progressListeners.add(callback);
  if (initializing || globalProgress.progress > 0) {
    callback(globalProgress);
  }
  return () => progressListeners.delete(callback);
};

export const getCurrentProgress = (): ProgressReport => globalProgress;

export const getWebGPUStatus = async (): Promise<WebGPUStatus> => {
  if (typeof navigator === "undefined") {
    return { available: true };
  }

  const gpu = (
    navigator as Navigator & {
      gpu?: { requestAdapter?: () => Promise<unknown> };
    }
  ).gpu;

  if (!gpu?.requestAdapter) {
    return {
      available: false,
      reason: "WebGPU n'est pas disponible sur cet appareil.",
    };
  }

  try {
    const adapter = await gpu.requestAdapter();
    return adapter
      ? { available: true }
      : {
          available: false,
          reason: "Le moteur graphique local n'a pas pu être initialisé.",
        };
  } catch {
    return {
      available: false,
      reason: "WebGPU a refusé l'accès au moteur graphique local.",
    };
  }
};

export const initializeWebLLM = async (
  modelIdOrCallback?: string | ((report: ProgressReport) => void),
  onProgress?: (report: ProgressReport) => void
): Promise<void> => {
  let modelId: string;
  let callback: ((report: ProgressReport) => void) | undefined;

  if (typeof modelIdOrCallback === "function") {
    modelId = DEFAULT_MODEL_ID;
    callback = modelIdOrCallback;
  } else {
    modelId = resolveModelId(modelIdOrCallback);
    callback = onProgress;
  }

  if (unloadPromise) {
    await unloadPromise;
  }

  if (engine && activeModelId === modelId) {
    return;
  }

  const webGPUStatus = await getWebGPUStatus();
  if (!webGPUStatus.available) {
    const error = new Error(
      webGPUStatus.reason ?? "WebGPU n'est pas disponible sur cet appareil."
    );
    notifyProgress({ progress: 0, text: error.message });
    callback?.({ progress: 0, text: error.message });
    throw error;
  }

  // A model switch must wait for the current download to finish so two GPU
  // initializations never compete for memory at the same time.
  if (initPromise) {
    const pendingInitialization = initPromise;
    if (initializingModelId === modelId) {
      return pendingInitialization;
    }

    try {
      await pendingInitialization;
    } catch {
      // A failed model can be retried, or replaced by the requested model.
    }

    if (engine && activeModelId === modelId) {
      return;
    }
  }

  if (engine && activeModelId !== modelId) {
    // Do not keep two WebGPU pipelines alive during a model switch. This is
    // especially important on integrated GPUs where the second allocation
    // otherwise looks like a frozen white page.
    await unloadCurrentEngine();
  }

  initializing = true;
  initializingModelId = modelId;
  const initialProgress = { progress: 0, text: "Préparation du modèle local..." };
  notifyProgress(initialProgress);
  callback?.(initialProgress);

  const nextInitialization = (async () => {
    try {
      const { CreateMLCEngine } = await loadWebLLMModule();
      const nextEngine = await CreateMLCEngine(modelId, {
        initProgressCallback: (report) => {
          const progress = { progress: report.progress, text: report.text };
          notifyProgress(progress);
          callback?.(progress);
        },
      });
      engine = nextEngine;
      activeModelId = modelId;
      notifyProgress({ progress: 1, text: "Mode local prêt" });
      callback?.({ progress: 1, text: "Mode local prêt" });
    } catch (error) {
      notifyProgress({ progress: 0, text: "Échec du chargement du modèle local" });
      console.error("[WebLLM] Echec du chargement:", error);
      throw error;
    }
  })();

  initPromise = nextInitialization;
  try {
    await nextInitialization;
  } finally {
    if (initPromise === nextInitialization) {
      initializing = false;
      initializingModelId = null;
      initPromise = null;
    }
  }
};

export const generateText = async (
  prompt: string,
  context: string,
  options?: {
    history?: LocalChatTurn[];
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    imageUri?: string;
    onToken?: (text: string) => void;
    signal?: AbortSignal;
  }
): Promise<string> => {
  if (unloadPromise) {
    await unloadPromise;
  }

  if (!engine) {
    const prefs = getModelPreferences();
    await initializeWebLLM(prefs.defaultModelId);
  }

  if (!engine) {
    throw new Error("Le modele IA local n'a pas pu etre initialise.");
  }

  beginGeneration();
  try {
    const currentEngine = engine;
    if (!currentEngine) {
      throw new Error("Le modele IA local n'a pas pu etre initialise.");
    }

    throwIfAborted(options?.signal);

    const knowledge = vetKnowledgeService.getContextForQuery(
      `${prompt}\n${context}`
    );
    const enrichedContext = [context, knowledge].filter(Boolean).join("\n\n");

    const historyMessages: ChatCompletionMessageParam[] = (
      options?.history ?? []
    )
      .slice(-MAX_HISTORY_TURNS)
      .map((turn) => ({
        role: turn.role,
        content: turn.text.slice(-MAX_HISTORY_TEXT_LENGTH),
      }));

    const promptWithContext =
      enrichedContext.length > 0
        ? `${prompt}\n\nContexte:\n${enrichedContext}`
        : prompt;

    const content: any = options?.imageUri
      ? [
          { type: "text", text: promptWithContext },
          { type: "image_url", image_url: { url: options.imageUri } },
        ]
      : promptWithContext;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: options?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT },
      ...historyMessages,
      {
        role: "user",
        content,
      },
    ];

    if (options?.onToken) {
      const responseStream = await currentEngine.chat.completions.create({
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 768,
        // Qwen-style local models can emit a private <think> stream unless
        // this flag is explicit. Never expose that internal trace to the UI.
        extra_body: { enable_thinking: false },
        stream: true,
      });
      let fullText = "";
      for await (const chunk of responseStream) {
        throwIfAborted(options?.signal);
        const token = chunk.choices[0]?.delta?.content || "";
        fullText += token;
        options.onToken(fullText);
      }
      return fullText;
    }

    const response = await currentEngine.chat.completions.create({
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 768,
      // Keep the visible answer focused on the veterinarian's request.
      extra_body: { enable_thinking: false },
    });

    throwIfAborted(options?.signal);
    return response.choices?.[0]?.message?.content?.trim() || "";
  } finally {
    endGeneration();
  }
};

export const isWebLLMReady = (): boolean => engine !== null;

export const isWebLLMLoading = (): boolean => initializing;

export const resetWebLLM = async (): Promise<void> => {
  if (initPromise) {
    try {
      await initPromise;
    } catch {
      // The reset should still clear a failed model initialization.
    }
  }

  await unloadCurrentEngine();
};

export const hasModelInCache = async (modelId: string): Promise<boolean> => {
  try {
    const { hasModelInCache: checkCache } = await loadWebLLMModule();
    return await checkCache(modelId);
  } catch {
    return false;
  }
};
