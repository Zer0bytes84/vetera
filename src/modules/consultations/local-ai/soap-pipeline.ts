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
  prepareGuidedSections,
  prepareModelDictation,
  routeGuidedTreatments,
} from "./treatment-routing";
import { guidedDictationTranscript } from "./guided-soap";
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

/** The sections the model receives and the fidelity check compares against. */
export function modelScaffold(
  transcript: string,
  guidedSource?: LocalSoapNote
): LocalSoapNote {
  if (!guidedSource)
    return buildDictationScaffold(prepareModelDictation(transcript).text);
  const sections = prepareGuidedSections(routeGuidedTreatments(guidedSource), guidedSource);
  return Object.fromEntries(
    SOAP_SECTIONS.map(({ key }) => [key, sections[key].model])
  ) as LocalSoapNote;
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
  const scaffold = modelScaffold(transcript, guidedSource);
  // Guided: the rubric answers are the sections; kept sentences return to their own rubric.
  const routed = guidedSource ? routeGuidedTreatments(guidedSource) : null;
  const sections = routed && guidedSource ? prepareGuidedSections(routed, guidedSource) : null;
  const restore = (note: LocalSoapNote) =>
    sections
      ? (Object.fromEntries(
          SOAP_SECTIONS.map(({ key }) => [key, sections[key].restore(note[key])])
        ) as LocalSoapNote)
      : mergeProtectedDictation(note, protectedInput);
  // A rubric the code emptied is never sent: the model would fill it.
  const omitted = sections
    ? SOAP_SECTIONS.filter(({ key }) => sections[key].mode === "exclue").map(({ key }) => key)
    : [];
  // Clause filtering: the model reads the same filtered rubrics as the frame.
  const promptOptions = {
    omitted,
    dictation:
      sections && SOAP_SECTIONS.some(({ key }) => sections[key].mode === "proposition")
        ? guidedDictationTranscript(scaffold)
        : undefined,
  };
  const template = Object.fromEntries(
    SOAP_SECTIONS.filter(({ key }) => !omitted.includes(key)).map(({ key }) => [key, scaffold[key]])
  );
  const nothingForModel = routed
    ? SOAP_SECTIONS.every(({ key }) => !scaffold[key].trim())
    : !protectedInput.text;
  const somethingKept = routed
    ? SOAP_SECTIONS.some(({ key }) => routed[key].trim())
    : protectedInput.planSentences.length || protectedInput.protectedSections;
  // Treatment-only dictations need no model: still only a draft for review.
  if (nothingForModel && somethingKept) {
    const draft = restore(scaffold);
    return localSoapSchema.parse(draft);
  }
  const prompt = createSoapPrompt(transcript, context, false, scaffold, promptOptions);
  const retryPrompt = createSoapPrompt(transcript, context, true, scaffold, promptOptions);
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
      omittedKeys: omitted,
      signal,
      generate: async (nextPrompt, number) => {
        const result = await session.request(
          {
            type: "generate",
            generators: urls.generators,
            runtimeRoot: urls.runtimeRoot,
            prompt: nextPrompt,
            responseTemplate: JSON.stringify(template),
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
    return localSoapSchema.parse(restore(note));
  } finally {
    session.close();
  }
}
