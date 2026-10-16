import { useCallback, useEffect, useRef, useState } from "react";
import { captureAudio, prepareMicrophone } from "../local-ai/audio-capture";
import {
  LocalInferenceSession,
  abortError,
} from "../local-ai/inference-client";
import { getLocalModelUrls, type LocalModelStatus } from "../local-ai/models";
import { normalizeSpokenMentions } from "../local-ai/patient-mentions";
import { generateValidatedSoap } from "../local-ai/generate-soap";
import {
  assertFaithfulSoap,
  buildDictationScaffold,
  SoapFidelityError,
} from "../local-ai/dictation-scaffold";
import {
  localSoapSchema,
  SOAP_SECTIONS,
  type LocalSoapNote,
} from "../local-ai/soap-schema";
import {
  mergeProtectedDictation,
  prepareModelDictation,
  routeGuidedTreatments,
} from "../local-ai/treatment-routing";
import {
  createSoapPrompt,
  type LocalPatientContext,
} from "../local-ai/patient-context";
import type { LocalAiProgress } from "../local-ai/worker-protocol";
import type { DictationLanguage } from "../local-ai/whisper-language";

export type LocalAiPhase =
  | "idle"
  | "microphone"
  | "loading-whisper"
  | "listening"
  | "transcribing"
  | "loading-soap"
  | "generating";
type Attempt = {
  controller: AbortController;
  language?: DictationLanguage;
  session?: LocalInferenceSession;
  microphone?: Awaited<ReturnType<typeof prepareMicrophone>>;
  capture?: Awaited<ReturnType<typeof captureAudio>>;
};
export function useLocalConsultationAi() {
  const [phase, setPhase] = useState<LocalAiPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<LocalAiProgress>({ message: "" });
  const [seconds, setSeconds] = useState(0);
  const [transcription, setTranscription] = useState<string | null>(null);
  const active = useRef<Attempt | null>(null);
  const stopRef = useRef<() => Promise<string | null>>(async () => null);
  const dispose = useCallback((attempt: Attempt) => {
    attempt.controller.abort();
    attempt.capture?.cancel();
    attempt.microphone?.close();
    attempt.session?.close();
    if (active.current === attempt) active.current = null;
  }, []);
  const cancel = useCallback(() => {
    if (active.current) dispose(active.current);
    setPhase("idle");
    setProgress({ message: "" });
  }, [dispose]);
  const reportFailure = useCallback(
    (attempt: Attempt, failure: unknown) => {
      if (active.current !== attempt) return;
      const aborted =
        attempt.controller.signal.aborted ||
        (failure instanceof Error && failure.name === "AbortError");
      dispose(attempt);
      setPhase("idle");
      if (!aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "Le traitement local a échoué. Réessayez."
        );
    },
    [dispose]
  );
  useEffect(
    () => () => {
      if (active.current) dispose(active.current);
    },
    [dispose]
  );
  useEffect(() => {
    if (phase !== "listening") return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const start = useCallback(
    async (models: LocalModelStatus, language: DictationLanguage = "fr") => {
      if (active.current) return;
      setError(null);
      setSeconds(0);
      setTranscription(null);
      const attempt: Attempt = { controller: new AbortController(), language };
      active.current = attempt;
      const signal = attempt.controller.signal;
      const update = (event: LocalAiProgress) => {
        if (active.current === attempt) setProgress(event);
      };
      try {
        const urls = getLocalModelUrls(models);
        if (!models.whisperReady)
          throw new Error(
            "Installez la dictée sur cet ordinateur avant de commencer."
          );
        setPhase("microphone");
        setProgress({ message: "Autorisation du microphone…" });
        attempt.microphone = await prepareMicrophone(signal);
        setPhase("loading-whisper");
        setProgress({ message: "Préparation de la dictée…" });
        attempt.session = await LocalInferenceSession.create(
          "whisper",
          signal,
          update
        );
        await attempt.session.request(
          { type: "load-whisper", ...urls },
          "ready"
        );
        if (signal.aborted) throw abortError();
        attempt.capture = await captureAudio(
          attempt.microphone.stream,
          signal,
          () => {
            void stopRef.current();
          },
          attempt.microphone.audio
        );
        setPhase("listening");
        setProgress({
          message:
            language === "fr"
              ? "Le micro vous écoute. Parlez naturellement en français."
              : "Le micro vous écoute. La langue sera reconnue sur cet ordinateur.",
        });
      } catch (failure) {
        reportFailure(attempt, failure);
      }
    },
    [reportFailure]
  );
  const stop = useCallback(async () => {
    const attempt = active.current;
    if (!attempt?.capture || !attempt.session || phase !== "listening")
      return null;
    // Synchronously detach the capture so repeated clicks/limit events cannot
    // request a second transcription with the same transferred buffer.
    const capture = attempt.capture;
    attempt.capture = undefined;
    setPhase("transcribing");
    setProgress({ message: "Transcription locale en cours…" });
    try {
      const audio = capture.stop();
      attempt.microphone?.close();
      const result = await attempt.session.request(
        { type: "transcribe", audio, language: attempt.language ?? "fr" },
        "transcript",
        [audio.buffer as ArrayBuffer]
      );
      if (result.type !== "transcript")
        throw new Error("Échec de transcription.");
      if (active.current !== attempt || attempt.controller.signal.aborted)
        throw abortError();
      const text = normalizeSpokenMentions(result.text);
      setTranscription(text);
      dispose(attempt);
      setPhase("idle");
      setProgress({
        message: "Transcription terminée. Vous pouvez relire votre dictée.",
      });
      return text;
    } catch (failure) {
      reportFailure(attempt, failure);
      return null;
    }
  }, [dispose, phase, reportFailure]);
  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);
  const generate = useCallback(
    async (
      models: LocalModelStatus,
      transcript: string,
      context: LocalPatientContext,
      guidedSource?: LocalSoapNote
    ) => {
      if (active.current) return null;
      setError(null);
      const attempt: Attempt = { controller: new AbortController() };
      active.current = attempt;
      try {
        const protectedInput = prepareModelDictation(transcript);
        const routed = guidedSource
          ? routeGuidedTreatments(guidedSource)
          : null;
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
          (protectedInput.planSentences.length ||
            protectedInput.protectedSections)
        ) {
          const draft = localSoapSchema.parse(
            mergeProtectedDictation(scaffold, protectedInput)
          );
          dispose(attempt);
          setPhase("idle");
          setProgress({
            message: "Brouillon prêt à relire. Rien n’a été enregistré.",
          });
          return draft;
        }
        const prompt = createSoapPrompt(transcript, context, false, scaffold);
        const retryPrompt = createSoapPrompt(
          transcript,
          context,
          true,
          scaffold
        );
        const urls = getLocalModelUrls(models);
        if (!models.generatorReady)
          throw new Error(
            "Installez la préparation des notes sur cet ordinateur avant de continuer."
          );
        setPhase("loading-soap");
        setProgress({
          message: "Préparation de l’assistant…",
          stage: "loading",
          attempt: 1,
        });
        attempt.session = await LocalInferenceSession.create(
          "soap",
          attempt.controller.signal,
          (event) => {
            if (active.current !== attempt) return;
            setProgress(event);
            if (
              event.stage === "generating" ||
              event.stage === "validating" ||
              event.stage === "retrying"
            )
              setPhase("generating");
          }
        );
        const session = attempt.session;
        const note = await generateValidatedSoap({
          prompt,
          retryPrompt,
          signal: attempt.controller.signal,
          generate: async (nextPrompt, number) => {
            const result = await session.request(
              {
                type: "generate",
                modelUrl: urls.modelUrl,
                runtimeRoot: urls.runtimeRoot,
                prompt: nextPrompt,
                responseTemplate: JSON.stringify(scaffold),
                attempt: number,
              },
              "generated"
            );
            if (result.type !== "generated")
              throw new Error("La préparation locale de la note a échoué.");
            if (active.current === attempt)
              setProgress({
                message: "Vérification des quatre sections…",
                stage: "validating",
                attempt: number,
              });
            return result.text;
          },
          onRetry: (failure) => {
            setProgress({
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
        const draft = localSoapSchema.parse(
          mergeProtectedDictation(note, protectedInput)
        );
        dispose(attempt);
        setPhase("idle");
        setProgress({
          message: "Brouillon prêt à relire. Rien n’a été enregistré.",
        });
        return draft;
      } catch (failure) {
        reportFailure(attempt, failure);
        return null;
      }
    },
    [dispose, reportFailure]
  );
  return {
    phase,
    error,
    progress,
    seconds,
    transcription,
    start,
    stop,
    generate,
    cancel,
    busy: phase !== "idle",
  };
}
