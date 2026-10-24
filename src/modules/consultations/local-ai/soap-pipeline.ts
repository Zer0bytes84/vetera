import { LocalInferenceSession } from "./inference-client";
import { getLocalModelUrls, type LocalModelStatus } from "./models";
import { generateValidatedSoap } from "./generate-soap";
import {
  assertFaithfulSoap,
  buildDictationScaffold,
  SoapFidelityError,
} from "./dictation-scaffold";
import {
  localSoapSchema,
  SOAP_SECTIONS,
  type LocalSoapNote,
} from "./soap-schema";
import {
  mergeProtectedDictation,
  prepareModelDictation,
  routeGuidedTreatments,
} from "./treatment-routing";
import { createSoapPrompt, type LocalPatientContext } from "./patient-context";
import type { LocalAiProgress } from "./worker-protocol";

interface SoapDraftOptions {
  models: LocalModelStatus;
  transcript: string;
  context: LocalPatientContext;
  guidedSource?: LocalSoapNote;
  signal: AbortSignal;
  onProgress: (event: LocalAiProgress) => void;
  /** Receives the session as soon as it exists, so the caller can cancel it. */
  onSession?: (session: LocalInferenceSession) => void;
  /** Each raw model output and the model that produced it (evaluation bench). */
  onAttempt?: (attempt: { number: 1 | 2; text: string; generator?: string; fellBack?: boolean }) => void;
}

/**
 * Dictation → validated SOAP draft, shared by the consultation screen and the
 * evaluation bench so both measure exactly the same safeguards.
 */
export async function prepareSoapDraft({
  models,
  transcript,
  context,
  guidedSource,
  signal,
  onProgress,
  onSession,
  onAttempt,
}: SoapDraftOptions): Promise<LocalSoapNote> {
  const protectedInput = prepareModelDictation(transcript);
  const routed = guidedSource ? routeGuidedTreatments(guidedSource) : null;
  const scaffold = routed
    ? (Object.fromEntries(
        SOAP_SECTIONS.map(({ key }) => [
          key,
          prepareModelDictation(routed[key]).text,
        ])
      ) as LocalSoapNote)
    : buildDictationScaffold(protectedInput.text);
  // Treatment-only dictations need no model: still only a draft for review.
  if (
    !protectedInput.text &&
    (protectedInput.planSentences.length || protectedInput.protectedSections)
  )
    return localSoapSchema.parse(
      mergeProtectedDictation(scaffold, protectedInput)
    );
  const prompt = createSoapPrompt(transcript, context, false, scaffold);
  const retryPrompt = createSoapPrompt(transcript, context, true, scaffold);
  const urls = getLocalModelUrls(models);
  if (!models.generatorReady)
    throw new Error(
      "Installez la préparation des notes sur cet ordinateur avant de continuer."
    );
  onProgress({
    message: "Préparation de l’assistant…",
    stage: "loading",
    attempt: 1,
  });
  const session = await LocalInferenceSession.create(
    "soap",
    signal,
    onProgress
  );
  onSession?.(session);
  try {
    const note = await generateValidatedSoap({
      prompt,
      retryPrompt,
      signal,
      generate: async (nextPrompt, number) => {
        const result = await session.request(
          {
            type: "generate",
            generators: urls.generators,
            runtimeRoot: urls.runtimeRoot,
            prompt: nextPrompt,
            responseTemplate: JSON.stringify(scaffold),
            attempt: number,
          },
          "generated"
        );
        if (result.type !== "generated")
          throw new Error("La préparation locale de la note a échoué.");
        onAttempt?.({ number, text: result.text, generator: result.generator, fellBack: result.fellBack });
        onProgress({
          message: "Vérification des quatre sections…",
          stage: "validating",
          attempt: number,
        });
        return result.text;
      },
      onRetry: (failure) => {
        onProgress({
          message:
            failure instanceof SoapFidelityError
              ? "Les observations ne sont pas fidèlement reprises. Je prépare un nouvel essai…"
              : "Le format n’est pas conforme. Je prépare un nouvel essai…",
          stage: "retrying",
          attempt: 2,
        });
      },
      validate: (note) => assertFaithfulSoap(note, scaffold),
    });
    // Merge only after strict format, dosage and fidelity validation of LLM output.
    return localSoapSchema.parse(mergeProtectedDictation(note, protectedInput));
  } finally {
    session.close();
  }
}
