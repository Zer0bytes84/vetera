import {
  generateText,
  initializeWebLLM,
  isWebLLMReady,
} from "@/services/webLLMService";
import type { SoapSectionKey } from "@/types/db";

export type SoapDraft = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  confidence: number | null;
};

export const EMPTY_SOAP_DRAFT: SoapDraft = {
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
  confidence: null,
};

const SOAP_SYSTEM_PROMPT = `Tu es un assistant vétérinaire expert. Ton rôle est de transformer une dictée libre (ou des notes en langage naturel) d'un vétérinaire clinicien en une note SOAP structurée, prête à être intégrée dans un dossier patient.

RÈGLES STRICTES :
1. Tu dois répondre UNIQUEMENT avec un objet JSON valide.
2. Aucun texte avant ou après le JSON. Pas de markdown, pas de commentaire.
3. Le JSON doit avoir exactement ces 4 clés : "subjective", "objective", "assessment", "plan".
4. Chaque valeur est une chaîne de caractères. Chaîne vide si la section n'a pas d'information disponible.
5. Tu peux reformuler pour rendre la note professionnelle, mais tu ne dois JAMAIS inventer de faits cliniques qui ne sont pas dans la dictée.
6. Si la dictée est ambiguë, complète prudemment avec du vocabulaire vétérinaire standard, sans ajouter de diagnostic fictif.

Format de sortie (exemple) :
{"subjective":"...","objective":"...","assessment":"...","plan":"..."}`;

const CONFIDENCE_SYSTEM_PROMPT = `En plus de la note SOAP, tu dois estimer ta confiance globale dans la qualité de la structuration (0.0 = très incertain, 1.0 = parfaitement structuré). Ajoute une clé supplémentaire "confidence" (nombre entre 0 et 1).

Réponds UNIQUEMENT avec un objet JSON valide de la forme :
{"subjective":"...","objective":"...","assessment":"...","plan":"...","confidence":0.85}`;

/**
 * Extrait le premier objet JSON valide d'une chaîne. Le LLM peut parfois
 * ajouter du texte autour (surtout les modèles < 2B paramètres), donc on
 * tente d'abord un parse direct, puis une extraction par regex.
 */
export function extractJsonObject(
  input: string
): Record<string, unknown> | null {
  const trimmed = input.trim();
  try {
    const direct = JSON.parse(trimmed);
    if (direct && typeof direct === "object") {
      return direct as Record<string, unknown>;
    }
  } catch {
    // pas du JSON direct
  }
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    return null;
  }
  try {
    const parsed = JSON.parse(match[0]);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }
  if (value == null) {
    return fallback;
  }
  return String(value);
}

function asConfidence(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(1, value));
  }
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    if (Number.isFinite(n)) {
      return Math.max(0, Math.min(1, n));
    }
  }
  return null;
}

/**
 * Convertit un JSON libre en `SoapDraft` normalisé.
 * Remplit les sections manquantes avec des chaînes vides.
 */
export function normalizeSoapDraft(raw: Record<string, unknown>): SoapDraft {
  const sectionKeys: SoapSectionKey[] = [
    "subjective",
    "objective",
    "assessment",
    "plan",
  ];
  const draft: SoapDraft = {
    ...EMPTY_SOAP_DRAFT,
  };
  for (const key of sectionKeys) {
    draft[key] = asString(raw[key]).trim();
  }
  draft.confidence = asConfidence(raw.confidence);
  return draft;
}

export interface StructureOptions {
  /** Prompt optionnel ajouté après la dictée (ex : instructions espèce). */
  extraUserHint?: string;
  /** Modèle explicite à utiliser (sinon celui par défaut). */
  modelId?: string;
  /** Active l'estimation de confiance (JSON avec clé "confidence"). */
  withConfidence?: boolean;
}

/**
 * Demande au moteur WebLLM local de structurer une dictée libre en SOAP.
 * Retourne un `SoapDraft` ou `null` si la réponse n'a pas pu être parsée.
 */
export async function structureDictationIntoSoap(
  transcript: string,
  options: StructureOptions = {}
): Promise<SoapDraft | null> {
  const cleaned = transcript.trim();
  if (!cleaned) {
    return EMPTY_SOAP_DRAFT;
  }
  if (!isWebLLMReady()) {
    await initializeWebLLM(options.modelId);
  }
  const systemPrompt = options.withConfidence
    ? `${SOAP_SYSTEM_PROMPT}\n\n${CONFIDENCE_SYSTEM_PROMPT}`
    : SOAP_SYSTEM_PROMPT;
  const userPrompt = `Dictée du vétérinaire à structurer :

"""
${cleaned}
"""

${options.extraUserHint ?? ""}

Renvoie UNIQUEMENT l'objet JSON SOAP.`.trim();

  const raw = await generateText(userPrompt, "", {
    systemPrompt,
    temperature: 0.2,
    maxTokens: 1024,
  });
  const parsed = extractJsonObject(raw);
  if (!parsed) {
    return null;
  }
  return normalizeSoapDraft(parsed);
}
