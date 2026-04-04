import type { IconSvgElement } from "@hugeicons/react"
import {
  CpuIcon,
  SparklesIcon,
  EyeIcon,
  ZapIcon,
  Brain02Icon,
} from "@hugeicons/core-free-icons"

export type ModelTier = "fast" | "smart" | "vision"

export interface AIModel {
  id: string
  name: string
  shortName: string
  description: string
  tier: ModelTier
  vramMB: number
  downloadSizeMB: number
  contextWindow: number
  systemPrompt: string
  icon: IconSvgElement
  recommended?: boolean
}

export const AI_MODELS: AIModel[] = [
  {
    id: "Qwen3-1.7B-q4f16_1-MLC",
    name: "Qwen3 1.7B",
    shortName: "Qwen3 1.7B",
    description: "Ultra-rapide, idéal pour réponses instantanées",
    tier: "fast",
    vramMB: 2037,
    downloadSizeMB: 950,
    contextWindow: 4096,
    systemPrompt: `Tu es l'assistant clinique de Luma Vet. Tu aides une clinique vétérinaire locale à mieux travailler.
Tu es rapide et concis. Réponds en francais.
Si question médicale: structure en "Evaluation", "Hypotheses", "Actions".
Si une info est incertaine, signale-le simplement.`,
    icon: ZapIcon,
  },
  {
    id: "Qwen2.5-3B-Instruct-q4f16_1-MLC",
    name: "Qwen2.5 3B",
    shortName: "Qwen2.5 3B",
    description: "Équilibré — bon compromis vitesse/qualité",
    tier: "fast",
    vramMB: 2505,
    downloadSizeMB: 1400,
    contextWindow: 4096,
    systemPrompt: `Tu es l'assistant clinique de Luma Vet. Tu aides une clinique vétérinaire locale à mieux travailler.

Regles:
- Reponds en francais.
- Sois clair, concis et actionnable.
- Si question medicale: structure en "Evaluation", "Hypotheses", "Actions".
- Si une info est incertaine, signale-le simplement.
- Ne fournis jamais de conseils dangereux.`,
    icon: CpuIcon,
    recommended: true,
  },
  {
    id: "Qwen3-4B-q4f16_1-MLC",
    name: "Qwen3 4B",
    shortName: "Qwen3 4B",
    description: "Plus intelligent — meilleur raisonnement médical",
    tier: "smart",
    vramMB: 3432,
    downloadSizeMB: 2100,
    contextWindow: 4096,
    systemPrompt: `Tu es l'assistant clinique senior de Luma Vet. Tu as une expertise approfondie en médecine vétérinaire.

Regles:
- Reponds en francais avec un ton professionnel.
- Sois detaille, structure et actionnable.
- Pour les questions medicales: "Evaluation clinique", "Diagnostic differentiel", "Examens complementaires", "Protocole therapeutique", "Suivi".
- Cite les references si possible.
- Si une info est incertaine, signale-le clairement.
- Ne fournis jamais de conseils dangereux.
- Adapte tes recommandations au contexte d'une clinique veterinaire locale en Algerie.`,
    icon: Brain02Icon,
  },
  {
    id: "Phi-3.5-vision-instruct-q4f16_1-MLC",
    name: "Phi-3.5 Vision",
    shortName: "Vision IA",
    description: "Analyse d'images — radiographies, photos, documents",
    tier: "vision",
    vramMB: 3952,
    downloadSizeMB: 2200,
    contextWindow: 4096,
    systemPrompt: `Tu es l'assistant visuel de Luma Vet. Tu peux analyser des images veterinaires.

Capacites:
- Analyser des radiographies, photos de lesions, documents
- Decrire ce que tu vois de maniere structuree
- Identifier des anomalies potentielles
- Recommander des examens complementaires

Regles:
- Reponds en francais.
- Sois prudent: tu n'es pas un diagnostic medical.
- Structure: "Observations", "Anomalies potentielles", "Recommandations".
- Signale toujours tes limites.`,
    icon: EyeIcon,
  },
]

export const MODEL_CATEGORIES: {
  key: ModelTier
  label: string
  description: string
  icon: IconSvgElement
  color: string
}[] = [
  {
    key: "fast",
    label: "Rapide",
    description: "Réponses instantanées",
    icon: ZapIcon,
    color: "text-emerald-500",
  },
  {
    key: "smart",
    label: "Intelligent",
    description: "Meilleur raisonnement",
    icon: Brain02Icon,
    color: "text-violet-500",
  },
  {
    key: "vision",
    label: "Vision",
    description: "Analyse d'images",
    icon: EyeIcon,
    color: "text-blue-500",
  },
]

export const DEFAULT_MODEL_ID = "Qwen2.5-3B-Instruct-q4f16_1-MLC"

export function getModelById(id: string): AIModel | undefined {
  return AI_MODELS.find((m) => m.id === id)
}

export function getModelsByTier(tier: ModelTier): AIModel[] {
  return AI_MODELS.filter((m) => m.tier === tier)
}

export function formatVRAM(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} Go`
  return `${mb} Mo`
}

export function formatSizeMB(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} Go`
  return `${mb} Mo`
}

export interface ModelCacheStatus {
  modelId: string
  isCached: boolean
  isLoading: boolean
  progress: number
  progressText: string
}

const CACHE_KEY = "ai-model-preferences"

export interface ModelPreferences {
  defaultModelId: string
  autoLoadOnStartup: boolean
}

export function getModelPreferences(): ModelPreferences {
  try {
    const stored = localStorage.getItem(CACHE_KEY)
    if (stored) return JSON.parse(stored) as ModelPreferences
  } catch {}
  return { defaultModelId: DEFAULT_MODEL_ID, autoLoadOnStartup: false }
}

export function saveModelPreferences(prefs: ModelPreferences) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(prefs))
}
