const INTERNAL_BLOCK_PATTERN =
  /<\s*(think|analysis|reasoning|reflection)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const UNCLOSED_INTERNAL_BLOCK_PATTERN =
  /<\s*(think|analysis|reasoning|reflection)\b[^>]*>[\s\S]*$/i;
const XML_CONTROL_BLOCK_PATTERN =
  /<\s*(tool_call|tool_result|function_call|function)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const SPECIAL_TOKEN_PATTERN =
  /<\|(?:assistant|analysis|think|tool_call|tool_result|function_call|function|user|system|im_start|im_end|endoftext)\|>/gi;
const XML_CONTROL_TAG_PATTERN =
  /<\/?\s*(?:think|analysis|reasoning|reflection|tool_call|tool_result|function_call|function)\b[^>]*>/gi;
const TOOL_NAMES = [
  "search_patients",
  "get_patient_record",
  "get_patient_history",
  "get_owner_contact",
  "get_appointments",
  "search_stock",
  "search_notes",
  "create_reminder",
  "save_patient_note",
  "add_note",
] as const;
const RAW_TOOL_REFERENCE_PATTERN =
  new RegExp(
    `\\[(?:${TOOL_NAMES.join("|")})(?:\\s*\\([^\\]]*\\))?\\]`,
    "gi"
  );
const RAW_TOOL_NAME_PATTERN = new RegExp(
  `\\b(?:${TOOL_NAMES.join("|")})\\b(?:\\s*\\([^\\n)]*\\))?`,
  "gi"
);
const INTERNAL_MONOLOGUE_PATTERN =
  /(?:let['’]s start|the user(?:['’]s)? wants|i need to|i should|wait[,.:]|maybe there(?:['’]s| is)|using the tools|looking at the context|the request is|let me check|chain of thought|private reasoning)/gi;
const FINAL_SECTION_PATTERN =
  /(?:^|\n)\s*(?:final answer|final response|réponse finale|synthèse finale)\s*[:-]\s*/i;
const CONTROL_MARKERS = ["[TOOL:", "[TOOL_RESULT:", "[ACTION_CARD:"];

const isQuote = (character: string): character is "'" | '"' =>
  character === "'" || character === '"';

/** Remove a bracketed protocol block while respecting nested arrays and strings. */
const stripControlMarkers = (value: string): string => {
  let result = "";
  let cursor = 0;

  while (cursor < value.length) {
    const markerIndex = CONTROL_MARKERS.reduce((nearest, marker) => {
      const index = value.indexOf(marker, cursor);
      return index >= 0 && (nearest < 0 || index < nearest) ? index : nearest;
    }, -1);

    if (markerIndex < 0) {
      result += value.slice(cursor);
      break;
    }

    result += value.slice(cursor, markerIndex);
    let depth = 1;
    let quote: "'" | '"' | null = null;
    let escaped = false;
    let endIndex = -1;

    for (let index = markerIndex + 1; index < value.length; index += 1) {
      const character = value[index];

      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (character === "\\") {
          escaped = true;
        } else if (character === quote) {
          quote = null;
        }
        continue;
      }

      if (isQuote(character)) {
        quote = character;
      } else if (character === "[") {
        depth += 1;
      } else if (character === "]") {
        depth -= 1;
        if (depth === 0) {
          endIndex = index + 1;
          break;
        }
      }
    }

    if (endIndex < 0) {
      break;
    }

    cursor = endIndex;
  }

  return result;
};

/**
 * Keep model protocol and private reasoning out of the veterinarian-facing UI.
 * This is intentionally applied at render and persistence boundaries as well
 * as in the prompt contract, because old conversations can contain raw output.
 */
export const sanitizeAssistantOutput = (value: string): string => {
  let text = String(value ?? "");

  text = text.replace(INTERNAL_BLOCK_PATTERN, "\n");
  text = text.replace(UNCLOSED_INTERNAL_BLOCK_PATTERN, "");
  text = text.replace(XML_CONTROL_BLOCK_PATTERN, "\n");
  text = text.replace(SPECIAL_TOKEN_PATTERN, "\n");
  text = text.replace(XML_CONTROL_TAG_PATTERN, "\n");
  text = stripControlMarkers(text);
  text = text.replace(RAW_TOOL_REFERENCE_PATTERN, "");
  text = text.replace(RAW_TOOL_NAME_PATTERN, "");
  text = text.replace(/`(?:search_|get_|create_|save_|add_note)[^`]*`/gi, "");
  text = text.replace(/^\s*(?:assistant|analysis|thought|chain of thought)\s*:\s*/gim, "");

  // Some local checkpoints omit the XML wrapper and emit their deliberation
  // as ordinary prose. Prefer an explicit final section when available;
  // otherwise reject a clear internal monologue instead of showing it.
  const internalMatches = text.match(INTERNAL_MONOLOGUE_PATTERN) ?? [];
  const finalSection = text.match(FINAL_SECTION_PATTERN);
  if (finalSection) {
    text = text.slice((finalSection.index ?? 0) + finalSection[0].length);
  } else if (internalMatches.length >= 2) {
    text = "";
  }

  text = text.replace(/\n[ \t]*\n[ \t]*\n+/g, "\n\n");
  text = text.replace(/[ \t]+\n/g, "\n").trim();

  return text;
};

/** Convert local-model failures into a useful, non-technical recovery message. */
export const getAssistantErrorMessage = (error: unknown): string => {
  const detail = error instanceof Error ? error.message.trim() : String(error ?? "");
  const normalized = detail.toLocaleLowerCase("fr-FR");

  if (normalized.includes("webgpu") || normalized.includes("gpu")) {
    return "Le moteur IA local n’est pas disponible sur cet appareil. Vérifiez que WebGPU est activé, puis relancez Baitari.";
  }

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("réseau") ||
    normalized.includes("download") ||
    normalized.includes("télécharg")
  ) {
    return "Le modèle IA n’a pas pu être téléchargé. Vérifiez la connexion Internet, puis réessayez.";
  }

  if (
    normalized.includes("out of memory") ||
    normalized.includes("memory") ||
    normalized.includes("mémoire") ||
    normalized.includes("allocation")
  ) {
    return "La mémoire disponible est insuffisante pour ce modèle. Sélectionnez le mode Vénus, puis réessayez.";
  }

  if (detail) {
    return `L’assistant local n’a pas pu répondre : ${detail}`;
  }

  return "L’assistant local n’a pas pu répondre. Réessayez ou sélectionnez un autre modèle.";
};
