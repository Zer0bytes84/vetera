import {
  Brain02Icon,
  CpuIcon,
  EyeIcon,
  ZapIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

import { APP_NAME } from "@/lib/brand";

export type ModelTier = "fast" | "smart" | "vision";

export interface AIModel {
  contextWindow: number;
  description: string;
  displayName: string;
  downloadSizeMB: number;
  icon: IconSvgElement;
  id: string;
  modeLabel: string;
  name: string;
  recommended?: boolean;
  shortName: string;
  systemPrompt: string;
  tier: ModelTier;
  vramMB: number;
  provider?: "google" | "qwen" | "phi" | "meta";
}

export const AI_MODELS: AIModel[] = [
  {
    id: "gemma-2-2b-it-q4f16_1-MLC",
    displayName: "Vega",
    modeLabel: "Réactif",
    name: "Vega",
    shortName: "Vega",
    description: "Le compagnon clinique rapide pour les demandes quotidiennes.",
    tier: "fast",
    vramMB: 1800,
    downloadSizeMB: 1350,
    contextWindow: 8192,
    provider: "qwen",
    systemPrompt: `Tu es le copilote clinique vétérinaire d'élite de ${APP_NAME}, exécuté localement sur l'appareil.
Tu rédiges des synthèses parfaites, prépares les rendez-vous, rédiges les notes de consultation SOAP et assistes le vétérinaire avec une précision médicale remarquable.
Réponds toujours en français professionnel, concis et structuré.`,
    icon: SparklesIcon,
  },
  {
    id: "Qwen3-0.6B-q4f16_1-MLC",
    displayName: "Vénus",
    modeLabel: "Léger",
    name: "Vénus",
    shortName: "Vénus",
    description: "Une présence légère et efficace pour les appareils modestes.",
    tier: "fast",
    vramMB: 1500,
    downloadSizeMB: 1100,
    contextWindow: 4096,
    provider: "google",
    recommended: true,
    systemPrompt: `Tu es le copilote clinique vétérinaire de ${APP_NAME}, exécuté localement sur l'appareil.
Tu assistes le praticien dans sa gestion quotidienne. Réponds en français avec concision et précision.`,
    icon: SparklesIcon,
  },
  {
    id: "Qwen2.5-3B-Instruct-q4f16_1-MLC",
    displayName: "Nova",
    modeLabel: "Équilibré",
    name: "Nova",
    shortName: "Nova",
    description: "Équilibré — bon compromis vitesse/qualité",
    tier: "fast",
    vramMB: 2505,
    downloadSizeMB: 1400,
    contextWindow: 4096,
    provider: "qwen",
    systemPrompt: `Tu es l'assistant clinique de ${APP_NAME}. Tu aides une clinique vétérinaire locale à mieux travailler.

Règles:
- Réponds en français.
- Sois clair, concis et actionnable.
- Si question médicale: structure en "Évaluation", "Hypothèses", "Actions".`,
    icon: CpuIcon,
  },
  {
    id: "Qwen3-4B-q4f16_1-MLC",
    displayName: "Orion",
    modeLabel: "Approfondi",
    name: "Orion",
    shortName: "Orion",
    description: "Raisonnement médical approfondi",
    tier: "smart",
    vramMB: 3432,
    downloadSizeMB: 2100,
    contextWindow: 4096,
    provider: "qwen",
    systemPrompt: `Tu es l'assistant clinique senior de ${APP_NAME}. Tu as une expertise approfondie en médecine vétérinaire.
Structure: Évaluation clinique, Diagnostic différentiel, Examens complémentaires, Protocole thérapeutique, Suivi.`,
    icon: Brain02Icon,
  },
  {
    id: "Phi-3.5-vision-instruct-q4f16_1-MLC",
    displayName: "Aster",
    modeLabel: "Vision",
    name: "Aster",
    shortName: "Aster",
    description: "Analyse d'images — radiographies, photos, documents",
    tier: "vision",
    vramMB: 3952,
    downloadSizeMB: 2200,
    contextWindow: 4096,
    provider: "phi",
    systemPrompt: `Tu es l'assistant visuel de ${APP_NAME}. Tu peux analyser des images vétérinaires et radiographies.`,
    icon: EyeIcon,
  },
];

export const MODEL_CATEGORIES: {
  key: ModelTier;
  label: string;
  description: string;
  icon: IconSvgElement;
  color: string;
}[] = [
  {
    key: "fast",
    label: "Rapide & agile",
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
];

// Favor the lighter local mode for faster first launch on modest machines.
// Heavier modes remain available from the model picker.
export const DEFAULT_MODEL_ID = "Qwen3-0.6B-q4f16_1-MLC";

export function isSupportedModelId(id: string): boolean {
  return AI_MODELS.some((model) => model.id === id);
}

export function resolveModelId(id?: string | null): string {
  return id && isSupportedModelId(id) ? id : DEFAULT_MODEL_ID;
}

export function getModelById(id: string): AIModel {
  return AI_MODELS.find((model) => model.id === id) ?? AI_MODELS[0];
}

export function getModelsByTier(tier: ModelTier): AIModel[] {
  return AI_MODELS.filter((m) => m.tier === tier);
}

export function formatVRAM(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} Go`;
  }
  return `${mb} Mo`;
}

export function formatSizeMB(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} Go`;
  }
  return `${mb} Mo`;
}

export interface ModelCacheStatus {
  isCached: boolean;
  isLoading: boolean;
  modelId: string;
  progress: number;
  progressText: string;
}

const CACHE_KEY = "ai-model-preferences";

export interface ModelPreferences {
  autoLoadOnStartup: boolean;
  defaultModelId: string;
}

export function getModelPreferences(): ModelPreferences {
  try {
    if (typeof window === "undefined") {
      return { defaultModelId: DEFAULT_MODEL_ID, autoLoadOnStartup: false };
    }

    const stored = window.localStorage.getItem(CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<ModelPreferences>;

      return {
        defaultModelId: resolveModelId(parsed.defaultModelId),
        autoLoadOnStartup: parsed.autoLoadOnStartup ?? false,
      };
    }
  } catch {}
  return { defaultModelId: DEFAULT_MODEL_ID, autoLoadOnStartup: false };
}

export function saveModelPreferences(prefs: ModelPreferences) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          ...prefs,
          defaultModelId: resolveModelId(prefs.defaultModelId),
        })
      );
    }
  } catch {
    // Storage can be unavailable in a restricted WebView; preferences are optional.
  }
}
