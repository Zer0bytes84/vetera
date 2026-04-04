import {
  CreateMLCEngine,
  type ChatCompletionMessageParam,
  type MLCEngine,
} from "@mlc-ai/web-llm"

import { vetKnowledgeService } from "./vetKnowledgeService"

export interface ProgressReport {
  progress: number
  text: string
}

export interface LocalChatTurn {
  role: "user" | "assistant"
  text: string
}

const DEFAULT_SYSTEM_PROMPT = `Tu es l'assistant clinique de Luma Vet.
Tu aides une clinique veterinaire locale a mieux travailler.

Regles:
- Reponds en francais.
- Sois clair, concis et actionnable.
- Si question medicale: structure en "Evaluation", "Hypotheses", "Actions".
- Si une info est incertaine, signale-le simplement.
- Ne fournis jamais de conseils dangereux.`

const MODEL_CACHE_KEY = "webllm-active-model"

let engine: MLCEngine | null = null
let activeModelId: string | null = null
let initPromise: Promise<void> | null = null
let initializing = false
let globalProgress: ProgressReport = { progress: 0, text: "Initialisation..." }

const progressListeners = new Set<(report: ProgressReport) => void>()

const notifyProgress = (report: ProgressReport) => {
  globalProgress = report
  progressListeners.forEach((listener) => listener(report))
}

export const getLocalModelId = () =>
  activeModelId || "Qwen2.5-3B-Instruct-q4f16_1-MLC"

export const getActiveModelId = () => activeModelId

export const subscribeToProgress = (
  callback: (report: ProgressReport) => void
): (() => void) => {
  progressListeners.add(callback)
  if (initializing || globalProgress.progress > 0) {
    callback(globalProgress)
  }
  return () => progressListeners.delete(callback)
}

export const getCurrentProgress = (): ProgressReport => globalProgress

export const initializeWebLLM = async (
  modelIdOrCallback?: string | ((report: ProgressReport) => void),
  onProgress?: (report: ProgressReport) => void
): Promise<void> => {
  let modelId: string
  let callback: ((report: ProgressReport) => void) | undefined

  if (typeof modelIdOrCallback === "function") {
    modelId = "Qwen2.5-3B-Instruct-q4f16_1-MLC"
    callback = modelIdOrCallback
  } else {
    modelId = modelIdOrCallback || "Qwen2.5-3B-Instruct-q4f16_1-MLC"
    callback = onProgress
  }

  if (engine && activeModelId === modelId) return
  if (initPromise && activeModelId === modelId) return initPromise

  if (engine && activeModelId !== modelId) {
    engine = null
    activeModelId = null
    initPromise = null
  }

  initializing = true
  activeModelId = modelId
  notifyProgress({ progress: 0, text: "Preparation du modele..." })

  initPromise = (async () => {
    try {
      engine = await CreateMLCEngine(modelId, {
        initProgressCallback: (report) => {
          const progress = { progress: report.progress, text: report.text }
          notifyProgress(progress)
          callback?.(progress)
        },
      })
      notifyProgress({ progress: 1, text: "Termine" })
      callback?.({ progress: 1, text: "Termine" })
      console.log(`[WebLLM] Modele pret: ${modelId}`)
    } catch (error) {
      notifyProgress({ progress: 0, text: "Erreur de chargement" })
      console.error("[WebLLM] Echec du chargement:", error)
      throw error
    } finally {
      initializing = false
      initPromise = null
    }
  })()

  return initPromise
}

export const generateText = async (
  prompt: string,
  context: string,
  options?: {
    history?: LocalChatTurn[]
    systemPrompt?: string
    temperature?: number
    maxTokens?: number
  }
): Promise<string> => {
  if (!engine) {
    const prefs = await import("@/lib/ai-models").then((m) =>
      m.getModelPreferences()
    )
    await initializeWebLLM(prefs.defaultModelId)
  }

  if (!engine) {
    throw new Error("Le modele IA local n'a pas pu etre initialise.")
  }

  const knowledge = vetKnowledgeService.getContextForQuery(
    `${prompt}\n${context}`
  )
  const enrichedContext = [context, knowledge].filter(Boolean).join("\n\n")

  const historyMessages: ChatCompletionMessageParam[] = (
    options?.history ?? []
  ).map((turn) => ({
    role: turn.role,
    content: turn.text,
  }))

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: options?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT },
    ...historyMessages,
    {
      role: "user",
      content:
        enrichedContext.length > 0
          ? `${prompt}\n\nContexte:\n${enrichedContext}`
          : prompt,
    },
  ]

  const response = await engine.chat.completions.create({
    messages,
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 1024,
  })

  return response.choices?.[0]?.message?.content?.trim() || ""
}

export const isWebLLMReady = (): boolean => engine !== null

export const isWebLLMLoading = (): boolean => initializing

export const resetWebLLM = async (): Promise<void> => {
  if (engine) {
    engine = null
    activeModelId = null
    initPromise = null
    initializing = false
  }
}

export const hasModelInCache = async (modelId: string): Promise<boolean> => {
  try {
    const { hasModelInCache: checkCache } = await import("@mlc-ai/web-llm")
    return await checkCache(modelId)
  } catch {
    return false
  }
}
