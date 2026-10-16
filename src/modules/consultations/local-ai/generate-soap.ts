import { SoapFormatError, parseGeneratedSoap } from "./soap-schema";
import type { LocalSoapNote } from "./soap-schema";
import { SoapFidelityError } from "./dictation-scaffold";

interface SoapGenerationOptions {
  prompt: string;
  retryPrompt: string;
  signal: AbortSignal;
  generate: (prompt: string, attempt: 1 | 2) => Promise<string>;
  onRetry: (error: SoapFormatError | SoapFidelityError) => void;
  validate?: (note: LocalSoapNote) => void;
}

export async function generateValidatedSoap({
  prompt,
  retryPrompt,
  signal,
  generate,
  onRetry,
  validate,
}: SoapGenerationOptions) {
  const assertActive = () => {
    if (signal.aborted) throw new DOMException("Tâche annulée.", "AbortError");
  };
  for (const attempt of [1, 2] as const) {
    assertActive();
    const raw = await generate(attempt === 1 ? prompt : retryPrompt, attempt);
    assertActive();
    try {
      const note = parseGeneratedSoap(raw);
      validate?.(note);
      return note;
    } catch (error) {
      if (
        !(
          error instanceof SoapFormatError || error instanceof SoapFidelityError
        ) ||
        attempt === 2
      )
        throw error;
      onRetry(error);
    }
  }
  throw new Error("La préparation de la note a échoué.");
}
