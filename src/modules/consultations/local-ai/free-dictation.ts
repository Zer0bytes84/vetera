import { buildDictationScaffold } from "./dictation-scaffold";
import { mergeProtectedDictation, prepareModelDictation } from "./treatment-routing";

/** The offline fallback shares the same verbatim protection as generation.
 * Human treatment instructions are removed before drafting, then restored by
 * deterministic code. No dose is calculated or invented. */
export function buildFreeDictationDraft(transcript: string) {
  const protectedInput = prepareModelDictation(transcript);
  return mergeProtectedDictation(buildDictationScaffold(protectedInput.text), protectedInput);
}
