import {
  getActiveModelId,
  generateText,
  initializeWebLLM,
  isWebLLMReady,
} from "@/services/webLLMService";
import { resolveModelId } from "@/lib/ai-models";
import type { SoapSectionKey } from "@/types/db";

export type SoapDraft = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  confidence: number | null;
  groundingScore?: number | null;
};

export const EMPTY_SOAP_DRAFT: SoapDraft = {
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
  confidence: null,
  groundingScore: null,
};

const SOAP_SYSTEM_PROMPT = `Tu es un assistant vétérinaire expert. Ton rôle est de transformer une dictée libre (ou des notes en langage naturel) d'un vétérinaire clinicien en une note SOAP structurée, prête à être intégrée dans un dossier patient.

RÈGLES STRICTES :
1. Tu dois répondre UNIQUEMENT avec un objet JSON valide.
2. Aucun texte avant ou après le JSON. Pas de markdown, pas de commentaire.
3. Le JSON doit avoir ces 4 clés : "subjective", "objective", "assessment", "plan". La clé optionnelle "confidence" est autorisée si elle est demandée.
4. Chaque valeur est une chaîne de caractères. Chaîne vide si la section n'a pas d'information disponible.
5. Tu peux reformuler pour rendre la note professionnelle, mais tu ne dois JAMAIS inventer de faits cliniques qui ne sont pas dans la dictée.
6. Fonctionne en extraction conservatrice : si une information n'est pas explicitement dite, laisse la section vide.
7. Ne déduis jamais une maladie, une cause, une race, une mesure, un traitement ou un pronostic à partir d'un signe isolé.
8. La section Objective ne contient que les examens, mesures ou observations explicitement dictés.
9. La section Assessment ne contient une interprétation que si elle est explicitement formulée par le vétérinaire.
10. La section Plan ne contient que les actions, traitements ou suivis explicitement formulés.
11. En cas de doute, recopie le fait dans la section la plus proche et laisse les autres vides. La sécurité prime sur la complétude.

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
  // Les petits modèles entourent parfois le JSON de markdown ou d'une phrase.
  // On récupère chaque objet équilibré en respectant les accolades dans les
  // chaînes, puis on retient le premier objet réellement parseable.
  for (let start = 0; start < trimmed.length; start += 1) {
    if (trimmed[start] !== "{") {
      continue;
    }
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let end = start; end < trimmed.length; end += 1) {
      const character = trimmed[end];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (character === "\\") {
          escaped = true;
        } else if (character === '"') {
          inString = false;
        }
        continue;
      }
      if (character === '"') {
        inString = true;
      } else if (character === "{") {
        depth += 1;
      } else if (character === "}") {
        depth -= 1;
        if (depth === 0) {
          try {
            const parsed = JSON.parse(trimmed.slice(start, end + 1));
            if (parsed && typeof parsed === "object") {
              return parsed as Record<string, unknown>;
            }
          } catch {
            // Continue with a later candidate if this object was malformed.
          }
          break;
        }
      }
    }
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

const STOP_WORDS = new Set([
  "avec",
  "dans",
  "pour",
  "sans",
  "mais",
  "chez",
  "une",
  "des",
  "les",
  "elle",
  "lui",
  "nous",
  "vous",
  "sont",
  "être",
  "avoir",
  "plus",
  "très",
  "patient",
  "présente",
  "depuis",
  "cette",
  "cela",
  "comme",
  "ainsi",
]);

function tokenize(value: string) {
  return new Set(
    value
      .toLocaleLowerCase("fr-FR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .match(/[a-zàâçéèêëîïôûùüÿœæ]{4,}/g)
      ?.filter((token) => !STOP_WORDS.has(token)) ?? []
  );
}

function groundedRatio(source: Set<string>, value: string) {
  const tokens = tokenize(value);
  if (tokens.size === 0) {
    return 1;
  }
  let grounded = 0;
  tokens.forEach((token) => {
    if (source.has(token)) {
      grounded += 1;
    }
  });
  return grounded / tokens.size;
}

/**
 * Convertit un JSON libre en `SoapDraft` normalisé.
 * Remplit les sections manquantes avec des chaînes vides.
 */
export function normalizeSoapDraft(
  raw: Record<string, unknown>,
  sourceText = ""
): SoapDraft {
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
  if (sourceText.trim()) {
    const sourceTokens = tokenize(sourceText);
    const populatedRatios: number[] = [];
    for (const key of sectionKeys) {
      if (!draft[key]) {
        continue;
      }
      const ratio = groundedRatio(sourceTokens, draft[key]);
      if (ratio < 0.2) {
        // A section with no meaningful lexical evidence is almost certainly
        // an unsupported inference from a small local model.
        draft[key] = "";
        continue;
      }
      populatedRatios.push(ratio);
    }
    draft.groundingScore = populatedRatios.length
      ? Math.min(...populatedRatios)
      : 0;
    if (
      draft.confidence != null &&
      draft.groundingScore < draft.confidence
    ) {
      draft.confidence = draft.groundingScore;
    }
  }
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
  const targetModelId = resolveModelId(options.modelId);
  if (!isWebLLMReady() || getActiveModelId() !== targetModelId) {
    await initializeWebLLM(targetModelId);
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
    temperature: 0,
    maxTokens: 768,
  });
  const parsed = extractJsonObject(raw);
  if (!parsed) {
    return null;
  }
  return normalizeSoapDraft(parsed, cleaned);
}
