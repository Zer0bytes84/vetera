import {
  LocalInferenceSession,
  abortError,
} from "@/modules/consultations/local-ai/inference-client";
import {
  getLocalModelUrls,
  type LocalModelStatus,
} from "@/modules/consultations/local-ai/models";
import type { LocalAiProgress } from "@/modules/consultations/local-ai/worker-protocol";
import {
  createDocumentReadingPrompt,
  parseDocumentAnswer,
  type ReadDocument,
} from "./document-reading";

export async function readDocumentAnswer(
  source: ReadDocument,
  question: string,
  models: LocalModelStatus,
  signal: AbortSignal,
  onProgress: (event: LocalAiProgress) => void
) {
  if (!models.generatorReady)
    throw new Error(
      "Installez la lecture assistée sur cet ordinateur. Le texte reconnu peut déjà être relu."
    );
  const urls = getLocalModelUrls(models);
  const session = await LocalInferenceSession.create(
    "soap",
    signal,
    onProgress
  );
  try {
    for (const attempt of [1, 2] as const) {
      if (signal.aborted) throw abortError();
      const { prompt, partial } = createDocumentReadingPrompt(
        source,
        question,
        attempt === 2
      );
      const response = await session.request(
        { type: "generate", ...urls, prompt, attempt, purpose: "document" },
        "generated"
      );
      if (response.type !== "generated")
        throw new Error("La lecture assistée a échoué.");
      if (signal.aborted) throw abortError();
      try {
        return { answer: parseDocumentAnswer(response.text, source), partial };
      } catch (error) {
        if (attempt === 2) throw error;
        onProgress({
          stage: "retrying",
          message: "Vérification des extraits : nouvel essai…",
          attempt: 2,
        });
      }
    }
    throw new Error("La lecture assistée n’a pas abouti.");
  } finally {
    session.close();
  }
}
