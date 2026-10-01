import type { ChatCompletionMessageParam, MLCEngine } from "@mlc-ai/web-llm";

import { APP_NAME } from "@/lib/brand";
import {
  DEFAULT_MODEL_ID,
  getModelPreferences,
  resolveModelId,
} from "@/lib/ai-models";
import { isTauriRuntime } from "./browser-store";
import { vetKnowledgeService } from "./vetKnowledgeService";

export interface ProgressReport {
  progress: number;
  text: string;
  status?: "idle" | "loading" | "ready" | "error";
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
let globalProgress: ProgressReport = { progress: 0, text: "Modèle non chargé", status: "idle" };
let initializationController: AbortController | null = null;
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
  webLLMModulePromise ??= import("@mlc-ai/web-llm").catch((error) => {
    webLLMModulePromise = null;
    throw error;
  });
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
  callback(globalProgress);
  return () => progressListeners.delete(callback);
};

export const getCurrentProgress = (): ProgressReport => globalProgress;

// Bound the GPU preflight and module import as well as the download itself.
const withTimeout = <T>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
};

export const getWebGPUStatus = async (): Promise<WebGPUStatus> => {
  const gpu = typeof navigator === "undefined" ? undefined : (
    navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }
  ).gpu;
  if (!gpu?.requestAdapter) {
    return { available: false, reason: "WebGPU n’est pas disponible dans cette fenêtre. Mettez à jour votre système et Baitari pour utiliser le modèle local." };
  }
  try {
    const adapter = await withTimeout(gpu.requestAdapter(), 15_000,
      "Le moteur graphique ne répond pas. Fermez puis relancez Baitari.");
    return adapter ? { available: true } : {
      available: false, reason: "Aucun GPU compatible n’est accessible. Fermez les applications utilisant le GPU puis réessayez.",
    };
  } catch (error) {
    return { available: false, reason: error instanceof Error ? error.message : "L’accès au GPU a été refusé." };
  }
};

function explainLoadError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/WebGPU|GPU|graphique|ne répond|interrompu|annulée|ne progresse/.test(message)) return message;
  if (/shader.?f16|feature.*support/i.test(message)) return "Ce GPU ne prend pas en charge les fonctions nécessaires à ce modèle. Mettez à jour votre système et Baitari.";
  if (/memory|allocation|out of|device.*lost/i.test(message)) return "La mémoire graphique est insuffisante. Fermez les applications lourdes puis réessayez avec le modèle léger.";
  if (/quota|storage|indexeddb|cache/i.test(message)) return "Le modèle ne peut pas être enregistré sur cet appareil. Vérifiez l’espace disque et l’accès au stockage local.";
  if (/fetch|network|load failed|download|http/i.test(message)) return "Téléchargement impossible. Vérifiez la connexion et l’accès à Hugging Face puis réessayez.";
  return `Le modèle n’a pas pu être chargé : ${message}`;
}

export const initializeWebLLM = async (
  modelIdOrCallback?: string | ((report: ProgressReport) => void),
  onProgress?: (report: ProgressReport) => void
): Promise<void> => {
  const modelId = resolveModelId(typeof modelIdOrCallback === "string" ? modelIdOrCallback : undefined);
  const callback = typeof modelIdOrCallback === "function" ? modelIdOrCallback : onProgress;
  // Every caller follows the same lifecycle, including callers joining a load.
  const unsubscribe = callback ? subscribeToProgress(callback) : () => {};
  try {
    while (initPromise) {
      const pending = initPromise;
      if (initializingModelId === modelId) return await pending;
      try { await pending; } catch { /* The requested model may still load. */ }
    }
    if (unloadPromise) {
      await unloadPromise;
      return await initializeWebLLM(modelId);
    }
    if (engine && activeModelId === modelId) return;

    const controller = new AbortController();
    initializationController = controller;
    initializing = true;
    initializingModelId = modelId;
    notifyProgress({ progress: 0, text: "Vérification du moteur graphique…", status: "loading" });
    // Defer work until the shared promise has been assigned; concurrent clicks
    // must never start two downloads during the GPU preflight.
    const nextInitialization = Promise.resolve().then(async () => {
      const pendingEngine: { current: MLCEngine | null } = { current: null };
      let stalledTimer: ReturnType<typeof setTimeout> | undefined;
      let totalTimer: ReturnType<typeof setTimeout> | undefined;
      const aborted = new Promise<never>((_, reject) => {
        controller.signal.addEventListener("abort", () => reject(controller.signal.reason), { once: true });
      });
      const cancel = (message: string) => controller.abort(new Error(message));
      const armStallTimer = () => {
        clearTimeout(stalledTimer);
        stalledTimer = setTimeout(() => cancel("Le chargement ne progresse plus depuis 3 minutes. Vérifiez votre connexion puis réessayez."), 180_000);
      };
      try {
        const work = (async () => {
          const gpu = await getWebGPUStatus();
          if (!gpu.available) throw new Error(gpu.reason);
          if (controller.signal.aborted) throw controller.signal.reason;
          if (engine) await unloadCurrentEngine();
          notifyProgress({ progress: 0, text: "Préparation du téléchargement…", status: "loading" });
          const { MLCEngine: Engine, prebuiltAppConfig } = await withTimeout(loadWebLLMModule(), 30_000,
            "Le moteur local ne répond pas. Rechargez Baitari puis réessayez.");
          if (controller.signal.aborted) throw controller.signal.reason;
          pendingEngine.current = new Engine({
            appConfig: { ...prebuiltAppConfig, useIndexedDBCache: isTauriRuntime() },
            initProgressCallback: (report) => {
              if (controller.signal.aborted) return;
              const progress = Math.min(0.99, Math.max(0, report.progress));
              if (progress > globalProgress.progress || report.text !== globalProgress.text) armStallTimer();
              notifyProgress({ progress, text: report.text, status: "loading" });
            },
          });
          armStallTimer();
          totalTimer = setTimeout(() => cancel("Installation interrompue après 30 minutes. Réessayez sur une connexion plus rapide."), 1_800_000);
          await pendingEngine.current.reload(modelId);
          if (controller.signal.aborted) {
            await pendingEngine.current.unload();
            throw controller.signal.reason;
          }
          engine = pendingEngine.current;
          activeModelId = modelId;
        })();
        // Ignore late progress/success after cancellation and release its GPU.
        await Promise.race([work, aborted]);
        initializing = false;
        notifyProgress({ progress: 1, text: "Mode local prêt", status: "ready" });
      } catch (error) {
        controller.abort(error);
        if (pendingEngine.current) void pendingEngine.current.unload().catch(() => {});
        initializing = false;
        const message = explainLoadError(error);
        notifyProgress({ progress: 0, text: message, status: "error" });
        console.error("[WebLLM] Échec du chargement:", error);
        const failure = new Error(message, { cause: error });
        failure.name = "LocalModelLoadError";
        throw failure;
      } finally {
        clearTimeout(stalledTimer);
        clearTimeout(totalTimer);
        if (initializationController === controller) initializationController = null;
      }
    });
    initPromise = nextInitialization;
    try { await nextInitialization; } finally {
      if (initPromise === nextInitialization) {
        initializing = false;
        initializingModelId = null;
        initPromise = null;
      }
    }
  } finally { unsubscribe(); }
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
    includeKnowledge?: boolean;
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
  const generationEngine = engine;
  const interrupt = () => { void generationEngine?.interruptGenerate().catch(() => {}); };
  options?.signal?.addEventListener("abort", interrupt, { once: true });
  try {
    const currentEngine = engine;
    if (!currentEngine) {
      throw new Error("Le modele IA local n'a pas pu etre initialise.");
    }

    throwIfAborted(options?.signal);

    const knowledge = options?.includeKnowledge === false ? "" : vetKnowledgeService.getContextForQuery(
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
      throwIfAborted(options?.signal);
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
    options?.signal?.removeEventListener("abort", interrupt);
    endGeneration();
  }
};

export const isWebLLMReady = (): boolean => engine !== null;

export const isWebLLMLoading = (): boolean => initializing;

export const resetWebLLM = async (): Promise<void> => {
  initializationController?.abort(new Error("Installation annulée."));
  if (initPromise) {
    try {
      await initPromise;
    } catch {
      // The reset should still clear a failed model initialization.
    }
  }

  await unloadCurrentEngine();
  notifyProgress({ progress: 0, text: "Modèle non chargé", status: "idle" });
};

export const hasModelInCache = async (modelId: string): Promise<boolean> => {
  try {
    const { hasModelInCache: checkCache } = await loadWebLLMModule();
    return await checkCache(modelId);
  } catch {
    return false;
  }
};
