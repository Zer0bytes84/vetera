export type DictationLanguage = "fr" | "auto";

export const DICTATION_LANGUAGE_KEY = "baitari.local-dictation.language";
export function readDictationLanguage(): DictationLanguage {
  try {
    return localStorage.getItem(DICTATION_LANGUAGE_KEY) === "auto"
      ? "auto"
      : "fr";
  } catch {
    return "fr";
  }
}
export function saveDictationLanguage(language: DictationLanguage) {
  try {
    localStorage.setItem(DICTATION_LANGUAGE_KEY, language);
  } catch {
    // A session can still dictate when persistent preferences are unavailable.
  }
}

// Transformers.js 3.x defaults to English when language is omitted. Detect
// using Whisper's first decoder step, constrained to its actual language IDs.
export function selectWhisperLanguage(
  logits: ArrayLike<number>,
  languageTokens: Record<string, number>
) {
  let language: string | null = null;
  let highest = -Infinity;
  for (const [token, index] of Object.entries(languageTokens)) {
    const code = /^<\|([a-z]{2,3})\|>$/.exec(token)?.[1];
    const value = logits[index];
    if (
      code &&
      Number.isInteger(index) &&
      index >= 0 &&
      Number.isFinite(value) &&
      value > highest
    ) {
      highest = value;
      language = code;
    }
  }
  if (!language)
    throw new Error(
      "La langue n’a pas pu être reconnue. Choisissez Français et réessayez."
    );
  return language;
}
