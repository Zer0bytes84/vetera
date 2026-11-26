import { SoapFidelityError } from "./dictation-scaffold";
import type { LocalSoapNote } from "./soap-schema";
import {
  EMPTY_SOAP,
  parseGeneratedSoap,
  SOAP_SECTIONS,
  SoapFormatError,
} from "./soap-schema";

/** One rubric asked on its own on the second attempt. */
export interface SoapRetryPart {
  key: keyof LocalSoapNote;
  prompt: string;
  /** Reply template of this rubric alone (engine sizing). */
  template: string;
}

interface SoapGenerationOptions {
  generate: (
    prompt: string,
    attempt: 1 | 2,
    part?: SoapRetryPart
  ) => Promise<string>;
  /** Rubrics not sent to the model: they come back empty. */
  omittedKeys?: readonly (keyof LocalSoapNote)[];
  onRetry: (error: SoapFormatError | SoapFidelityError) => void;
  prompt: string;
  /**
   * Guided dictation: the second attempt asks each dictated rubric on its own
   * instead of the simplified whole note. A small model may drop a key or fill
   * an empty one in a four-key reply; one key at a time it only has to copy.
   */
  retryParts?: readonly SoapRetryPart[];
  retryPrompt: string;
  signal: AbortSignal;
  validate?: (note: LocalSoapNote) => void;
}

export async function generateValidatedSoap({
  prompt,
  retryPrompt,
  omittedKeys = [],
  retryParts,
  signal,
  generate,
  onRetry,
  validate,
}: SoapGenerationOptions) {
  const assertActive = () => {
    if (signal.aborted) {
      throw new DOMException("Tâche annulée.", "AbortError");
    }
  };
  const byRubric = async (parts: readonly SoapRetryPart[]) => {
    const note: LocalSoapNote = { ...EMPTY_SOAP };
    for (const part of parts) {
      assertActive();
      const raw = await generate(part.prompt, 2, part);
      assertActive();
      // Same strict parsing and dosage refusal; only the asked rubric is kept.
      const others = SOAP_SECTIONS.map(({ key }) => key).filter(
        (key) => key !== part.key
      );
      note[part.key] = parseGeneratedSoap(raw, others)[part.key];
    }
    return note;
  };
  for (const attempt of [1, 2] as const) {
    assertActive();
    const raw =
      attempt === 2 && retryParts?.length
        ? retryParts
        : await generate(attempt === 1 ? prompt : retryPrompt, attempt);
    assertActive();
    try {
      const note =
        typeof raw === "string"
          ? parseGeneratedSoap(raw, omittedKeys)
          : await byRubric(raw);
      validate?.(note);
      return note;
    } catch (error) {
      if (
        !(
          error instanceof SoapFormatError || error instanceof SoapFidelityError
        ) ||
        attempt === 2
      ) {
        throw error;
      }
      onRetry(error);
    }
  }
  throw new Error("La préparation de la note a échoué.");
}
