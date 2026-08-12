import {
  CheckCircle,
  CircleNotch,
  FloppyDisk,
  Microphone,
  Sparkle,
  Trash,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useConsultationSoapsRepository } from "@/data/repositories";
import { getModelPreferences } from "@/lib/ai-models";
import { cn } from "@/lib/utils";
import { useEnsureWebLLM } from "../hooks/use-ensure-webllm";
import { useSpeechToText } from "../hooks/use-speech-to-text";
import {
  type SoapDraft,
  normalizeSoapDraft,
  structureDictationIntoSoap,
} from "../lib/voice-to-soap";
import { MicrophoneButton } from "./microphone-button";
import { SoapSectionEditor } from "./soap-section-editor";

const SECTIONS: Array<{
  key: "subjective" | "objective" | "assessment" | "plan";
  i18n: "subjective" | "objective" | "assessment" | "plan";
}> = [
  { key: "subjective", i18n: "subjective" },
  { key: "objective", i18n: "objective" },
  { key: "assessment", i18n: "assessment" },
  { key: "plan", i18n: "plan" },
];

const AUTOSAVE_DEBOUNCE_MS = 800;
const LIGHT_SOAP_MODEL_ID = "Qwen2.5-3B-Instruct-q4f16_1-MLC";

interface SoapPanelProps {
  appointmentId: string;
  className?: string;
  patientId: string;
}

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

type SoapFormState = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

type SoapPersistedState = SoapFormState & {
  aiConfidence: number | null;
  aiDraft: string | null;
  transcript: string | null;
};

const EMPTY_FORM: SoapFormState = {
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
};

function areFormsEqual(a: SoapFormState, b: SoapFormState) {
  return (
    a.subjective === b.subjective &&
    a.objective === b.objective &&
    a.assessment === b.assessment &&
    a.plan === b.plan
  );
}

function parseDraft(value: string | null | undefined): SoapDraft | null {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as SoapDraft;
  } catch {
    return null;
  }
}

function arePersistedStatesEqual(
  a: SoapPersistedState | null,
  b: SoapPersistedState
) {
  return Boolean(
    a &&
      areFormsEqual(a, b) &&
      a.transcript === b.transcript &&
      a.aiDraft === b.aiDraft &&
      a.aiConfidence === b.aiConfidence
  );
}

function hasSoapContent(state: SoapPersistedState) {
  return Boolean(
    state.subjective.trim() ||
      state.objective.trim() ||
      state.assessment.trim() ||
      state.plan.trim() ||
      state.transcript?.trim() ||
      state.aiDraft
  );
}

function getSoapModelId() {
  const selectedModelId = getModelPreferences().defaultModelId;
  return selectedModelId === "Qwen3-0.6B-q4f16_1-MLC"
    ? LIGHT_SOAP_MODEL_ID
    : selectedModelId;
}

export function SoapPanel({
  appointmentId,
  className,
  patientId,
}: SoapPanelProps) {
  const { t, i18n } = useTranslation();
  const { currentUser } = useAuth();
  const repo = useConsultationSoapsRepository();
  const existing = repo.forAppointment(appointmentId);

  // ── Form state ───────────────────────────────────────────────────────────
  const [form, setForm] = useState<SoapFormState>(EMPTY_FORM);
  const [activeSection, setActiveSection] =
    useState<keyof SoapFormState>("subjective");
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [draft, setDraft] = useState<SoapDraft | null>(null);
  const [isStructuring, setIsStructuring] = useState<boolean>(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    existing ? "saved" : "idle"
  );
  const [initialised, setInitialised] = useState<boolean>(false);

  // ── WebLLM engine state ─────────────────────────────────────────────────
  const engine = useEnsureWebLLM();

  // ── Speech recognition (single instance) ────────────────────────────────
  const speech = useSpeechToText({
    lang: i18n.language?.startsWith("fr") ? "fr-FR" : "en-US",
  });

  // Hydrate only after the repository has completed its first read.
  useEffect(() => {
    if (initialised || repo.loading) {
      return;
    }
    const hydratedForm = existing
      ? {
          subjective: existing.subjective ?? "",
          objective: existing.objective ?? "",
          assessment: existing.assessment ?? "",
          plan: existing.plan ?? "",
        }
      : EMPTY_FORM;
    const hydratedTranscript = existing?.transcript ?? "";
    const parsedDraft = parseDraft(existing?.aiDraft);
    const hydratedDraft = parsedDraft
      ? normalizeSoapDraft(parsedDraft, hydratedTranscript)
      : null;
    setForm(hydratedForm);
    setLiveTranscript(hydratedTranscript);
    setDraft(hydratedDraft);
    lastSavedRef.current = {
      ...hydratedForm,
      transcript: hydratedTranscript || null,
      aiDraft: existing?.aiDraft ?? null,
      aiConfidence: existing?.aiConfidence ?? null,
    };
    setSaveStatus(existing ? "saved" : "idle");
    setInitialised(true);
  }, [existing, initialised, repo.loading]);

  // Sync interim transcript into the live transcript field while dictating
  useEffect(() => {
    if (speech.isListening) {
      setLiveTranscript((previous) => {
        const interim = speech.interimTranscript.trim();
        if (!interim) {
          return previous;
        }
        // Avoid duplicating the interim text on every result event
        if (previous.endsWith(interim)) {
          return previous;
        }
        const lastFinal = speech.transcript.trim();
        if (lastFinal && previous.trim() === lastFinal) {
          return `${lastFinal} ${interim}`.trim();
        }
        return previous ? `${previous} ${interim}`.trim() : interim;
      });
    } else if (speech.transcript) {
      // Stop: replace live with final
      setLiveTranscript(speech.transcript.trim());
    }
  }, [speech.interimTranscript, speech.isListening, speech.transcript]);

  // ── Debounced auto-save ──────────────────────────────────────────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef<Promise<void> | null>(null);
  const lastSavedRef = useRef<SoapPersistedState | null>(null);
  const latestPayloadRef = useRef<SoapPersistedState>({
    ...EMPTY_FORM,
    aiConfidence: null,
    aiDraft: null,
    transcript: null,
  });
  const initialisedRef = useRef(false);

  const persist = useCallback(
    async (snapshot: SoapPersistedState) => {
      const previousSave = saveInFlightRef.current;
      const operation = (async () => {
        await previousSave?.catch(() => undefined);
        setSaveStatus("saving");
        try {
          const saved = await repo.upsertForAppointment(
            appointmentId,
            patientId,
            {
              subjective: snapshot.subjective,
              objective: snapshot.objective,
              assessment: snapshot.assessment,
              plan: snapshot.plan,
              transcript: snapshot.transcript,
              aiDraft: snapshot.aiDraft,
              aiConfidence: snapshot.aiConfidence,
              templateVersion: "1.0",
            },
            currentUser?.id
          );
          if (!saved) {
            throw new Error("La base locale n'a pas confirmé l'enregistrement.");
          }
          lastSavedRef.current = snapshot;
          setSaveStatus("saved");
        } catch (err) {
          console.error("[SoapPanel] persist error", err);
          setSaveStatus("error");
          toast.error(t("consultations.soap.meta.saveError"));
        }
      })();
      saveInFlightRef.current = operation;
      try {
        await operation;
      } finally {
        if (saveInFlightRef.current === operation) {
          saveInFlightRef.current = null;
        }
      }
    },
    [appointmentId, currentUser?.id, patientId, repo, t]
  );

  const persistedState = useMemo<SoapPersistedState>(
    () => ({
      ...form,
      transcript: liveTranscript.trim() || null,
      aiDraft: draft ? JSON.stringify(draft) : null,
      aiConfidence: draft?.confidence ?? null,
    }),
    [draft, form, liveTranscript]
  );

  useEffect(() => {
    latestPayloadRef.current = persistedState;
    initialisedRef.current = initialised;
  }, [initialised, persistedState]);

  useEffect(() => {
    if (!initialised) {
      return;
    }
    // Do not create an empty SOAP row just by opening a consultation. An
    // existing note may still be deliberately cleared and saved as empty.
    if (!hasSoapContent(persistedState) && !lastSavedRef.current) {
      return;
    }
    if (arePersistedStatesEqual(lastSavedRef.current, persistedState)) {
      return;
    }
    setSaveStatus("pending");
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      void persist(persistedState);
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [initialised, persist, persistedState]);

  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      const latest = latestPayloadRef.current;
      if (
        initialisedRef.current &&
        !arePersistedStatesEqual(lastSavedRef.current, latest)
      ) {
        void persistRef.current(latest);
      }
    },
    []
  );

  // ── Handlers ────────────────────────────────────────────────────────────
  const updateSection = (key: keyof SoapFormState, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const handleAppendTranscriptToSection = () => {
    const chunk = liveTranscript.trim();
    if (!chunk) {
      return;
    }
    setForm((previous) => {
      const current = previous[activeSection];
      const next = current ? `${current}\n${chunk}`.trim() : chunk;
      return { ...previous, [activeSection]: next };
    });
    setLiveTranscript("");
    setActiveSection("assessment");
  };

  const handleStructureWithAi = async () => {
    const transcript = liveTranscript.trim() || form.subjective.trim();
    if (!transcript) {
      toast.warning(t("consultations.soap.ai.transcriptPlaceholder"));
      return;
    }
    setIsStructuring(true);
    try {
      if (!engine.isReady) {
        await engine.ensure(getSoapModelId());
      } else if (engine.activeModelId !== getSoapModelId()) {
        await engine.ensure(getSoapModelId());
      }
      const result = await structureDictationIntoSoap(transcript, {
        modelId: getSoapModelId(),
        withConfidence: true,
      });
      if (
        !result ||
        !(
          result.subjective ||
          result.objective ||
          result.assessment ||
          result.plan
        )
      ) {
        toast.error(t("consultations.soap.ai.parseError"));
        return;
      }
      setDraft(result);
      toast.success(t("consultations.soap.ai.draftAvailable"));
    } catch (err) {
      console.error("[SoapPanel] structureWithAi error", err);
      toast.error(
        err instanceof Error &&
          /WebGPU|moteur|modèle|model|memory|mémoire|chargement|fetch/i.test(
            err.message
          )
          ? t("consultations.soap.ai.modelUnavailable")
          : t("consultations.soap.ai.parseError")
      );
    } finally {
      setIsStructuring(false);
    }
  };

  const applyDraft = () => {
    if (!draft) {
      return;
    }
    setForm({
      subjective: draft.subjective || form.subjective,
      objective: draft.objective || form.objective,
      assessment: draft.assessment || form.assessment,
      plan: draft.plan || form.plan,
    });
    setDraft(null);
  };

  const discardDraft = () => {
    setDraft(null);
  };

  const clearAll = () => {
    if (speech.isListening) {
      speech.stop();
    }
    setForm(EMPTY_FORM);
    setLiveTranscript("");
    setDraft(null);
  };

  const speechMicError = speech.error;
  const canStructure = useMemo(
    () => Boolean(liveTranscript.trim() || form.subjective.trim()),
    [form.subjective, liveTranscript]
  );
  const canClear = useMemo(
    () =>
      Boolean(
        form.subjective ||
          form.objective ||
          form.assessment ||
          form.plan ||
          liveTranscript.trim() ||
          draft
      ),
    [draft, form, liveTranscript]
  );
  const canSave = useMemo(
    () =>
      initialised &&
      !isStructuring &&
      saveStatus !== "saving" &&
      (hasSoapContent(persistedState) || Boolean(lastSavedRef.current)) &&
      !arePersistedStatesEqual(lastSavedRef.current, persistedState),
    [initialised, isStructuring, persistedState, saveStatus]
  );

  const saveNow = async () => {
    if (!canSave) {
      return;
    }
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await persist(persistedState);
  };

  return (
    <div className={cn("space-y-5", className)}>
      {/* Header action row */}
      <div className="flex flex-col gap-3 border-border border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-base tracking-[-0.02em]">
              Note clinique structurée
            </h3>
            <span aria-live="polite">
              <SaveStatusPill status={saveStatus} />
            </span>
          </div>
          <p className="mt-1 text-muted-foreground text-xs leading-5">
            SOAP organise la consultation en quatre repères : ce que rapporte le
            propriétaire, ce que vous observez, votre analyse et le plan de soins.
            Chaque modification est enregistrée automatiquement.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            className="h-10 gap-1.5 rounded-xl px-4 font-semibold text-xs"
            disabled={!canSave}
            onClick={() => void saveNow()}
            size="sm"
            type="button"
            variant="outline"
          >
            {saveStatus === "saving" ? (
              <CircleNotch className="size-3.5 animate-spin" weight="duotone" />
            ) : (
              <FloppyDisk className="size-3.5" weight="duotone" />
            )}
            {t("consultations.soap.meta.save")}
          </Button>
          <Button
            className="h-10 gap-1.5 rounded-xl px-4 font-semibold text-xs"
            disabled={!canStructure || isStructuring}
            onClick={() => void handleStructureWithAi()}
            size="sm"
            type="button"
            variant="default"
          >
            {isStructuring ? (
              <CircleNotch className="size-3.5 animate-spin" weight="duotone" />
            ) : (
              <Sparkle className="size-3.5" weight="duotone" />
            )}
            {isStructuring
              ? t("consultations.soap.ai.structuring")
              : t("consultations.soap.ai.structure")}
          </Button>
          <Button
            aria-label={t("consultations.soap.ai.clear")}
            className="size-10 rounded-xl transition-colors hover:bg-destructive/10 hover:text-destructive"
            disabled={!canClear}
            onClick={() => setClearDialogOpen(true)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash className="size-4" weight="duotone" />
          </Button>
        </div>
      </div>

      {/* Engine progress (only shown while loading) */}
      {engine.isLoading ? (
        <EngineProgress
          progress={engine.progress}
          progressText={engine.progressText}
        />
      ) : null}
      {engine.error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-destructive text-xs">
          <p className="min-w-0 flex-1">
            {t("consultations.soap.ai.modelUnavailable")}
            <span className="mt-0.5 block text-destructive/75">{engine.error}</span>
          </p>
          <Button
            className="h-8 rounded-lg px-3 text-xs"
            disabled={engine.isLoading}
            onClick={() =>
              void engine.ensure(getSoapModelId()).catch(() => undefined)
            }
            size="sm"
            type="button"
            variant="outline"
          >
            {t("consultations.soap.ai.retryModel")}
          </Button>
        </div>
      ) : null}

      {/* 4 SOAP sections */}
      <div className="grid gap-3 lg:grid-cols-2">
        {SECTIONS.map(({ key, i18n: i18nKey }) => (
          <SoapSectionEditor
            disabled={isStructuring}
            key={key}
            onChange={(value) => updateSection(key, value)}
            onFocusSection={() => setActiveSection(key)}
            placeholder={t(`consultations.soap.placeholders.${i18nKey}`)}
            sectionKey={key}
            status={activeSection === key ? "active" : "default"}
            title={t(`consultations.soap.sections.${i18nKey}`)}
            value={form[key]}
          />
        ))}
      </div>

      {/* Live dictation + AI draft panel */}
      <div className="grid gap-3 xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-4" aria-labelledby="dictation-title">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Microphone className="size-4" weight="duotone" />
              </div>
              <h4 className="font-semibold text-sm tracking-[-0.01em]" id="dictation-title">
                Dictée clinique
              </h4>
              {speech.isListening ? (
                <Badge
                  className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                  variant="default"
                >
                  En écoute
                </Badge>
              ) : null}
              {speechMicError ? (
                <Badge
                  className="bg-destructive/10 text-destructive"
                  variant="outline"
                >
                  {speechMicError}
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <MicrophoneButton
                isListening={speech.isListening}
                isSupported={speech.isSupported}
                onToggle={() =>
                  speech.isListening ? speech.stop() : speech.start()
                }
                size="sm"
              />
              <Button
                className="h-10 rounded-xl px-3.5 font-semibold text-xs"
                disabled={!liveTranscript.trim() || isStructuring}
                onClick={handleAppendTranscriptToSection}
                size="sm"
                type="button"
                variant="secondary"
              >
                → {t(`consultations.soap.sections.${activeSection}`)}
              </Button>
            </div>
          </div>
          <Textarea
            aria-labelledby="dictation-title"
            className="min-h-[112px] resize-y rounded-xl border-border/80 bg-muted/20 text-sm leading-6 shadow-none placeholder:text-muted-foreground"
            onChange={(event) => setLiveTranscript(event.target.value)}
            placeholder={t("consultations.soap.ai.transcriptPlaceholder")}
            value={liveTranscript}
          />
          <p className="mt-2 flex items-center gap-1.5 text-muted-foreground text-xs">
            <Sparkle className="size-3.5" weight="duotone" />
            {speech.isListening
              ? t("consultations.soap.ai.stopDictation")
              : t("consultations.soap.ai.startDictation")}
          </p>
        </section>

        <DraftZone
          draft={draft}
          isStructuring={isStructuring}
          onApply={applyDraft}
          onDiscard={discardDraft}
        />
      </div>

      <AlertDialog onOpenChange={setClearDialogOpen} open={clearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Effacer toute la note SOAP ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les quatre sections, la dictée et le brouillon généré seront vidés. Cette modification sera ensuite enregistrée automatiquement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conserver la note</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={clearAll}
            >
              Effacer la note
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SaveStatusPill({ status }: { status: SaveStatus }) {
  const { t } = useTranslation();
  if (status === "saving") {
    return (
      <Badge className="text-[10px]" variant="secondary">
        <CircleNotch className="mr-1 size-3 animate-spin" weight="duotone" />
        {t("consultations.soap.meta.upserting")}
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge className="text-[10px]" variant="outline">
        {t("consultations.soap.meta.pendingSave")}
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge
        className="bg-destructive/10 text-[10px] text-destructive"
        variant="outline"
      >
        <XCircle className="mr-1 size-3" weight="duotone" />
        {t("consultations.soap.meta.notSaved")}
      </Badge>
    );
  }
  if (status === "saved") {
    return (
      <Badge className="gap-1 text-[10px]" variant="outline">
        <CheckCircle className="size-3" weight="fill" />
        {t("consultations.soap.meta.lastSaved")}
      </Badge>
    );
  }
  return (
    <Badge className="text-[10px]" variant="outline">
      {t("consultations.soap.meta.notSaved")}
    </Badge>
  );
}

function EngineProgress({
  progress,
  progressText,
}: {
  progress: number;
  progressText: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-md border border-border/40 bg-background/40 p-2">
      <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {t("consultations.soap.ai.title")} · {Math.round(progress * 100)}%
        </span>
        <span className="truncate">{progressText}</span>
      </div>
      <Progress value={Math.max(0, Math.min(1, progress)) * 100} />
    </div>
  );
}

function DraftZone({
  draft,
  isStructuring,
  onApply,
  onDiscard,
}: {
  draft: SoapDraft | null;
  isStructuring: boolean;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const { t } = useTranslation();
  if (isStructuring) {
    return (
      <div className="flex h-full min-h-[180px] items-center justify-center rounded-2xl border border-border bg-muted/15 p-4 text-muted-foreground text-sm">
        <CircleNotch className="mr-2 size-4 animate-spin" weight="duotone" />
        {t("consultations.soap.ai.structuring")}
      </div>
    );
  }
  if (!draft) {
    return (
      <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-2xl border border-border bg-muted/15 p-5 text-center text-muted-foreground text-xs">
        <span className="mb-3 flex size-9 items-center justify-center rounded-xl bg-background text-muted-foreground ring-1 ring-border">
          <Sparkle className="size-4" weight="duotone" />
        </span>
        <span className="max-w-[34ch] leading-5">{t("consultations.soap.ai.description")}</span>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge className="text-[10px]" variant="secondary">
            {t("consultations.soap.ai.draftAvailable")}
          </Badge>
          {draft.confidence == null ? null : (
            <Badge className="text-[10px]" variant="outline">
              {t("consultations.soap.ai.confidence")} ·{" "}
              {Math.round(draft.confidence * 100)}%
            </Badge>
          )}
          {draft.groundingScore != null && draft.groundingScore < 0.6 ? (
            <Badge
              className="gap-1 border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300"
              variant="outline"
            >
              <WarningCircle className="size-3" weight="duotone" />
              {t("consultations.soap.ai.reviewRequired")}
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            className="h-9 rounded-xl px-3.5 font-semibold text-xs"
            onClick={onApply}
            size="sm"
            type="button"
            variant="default"
          >
            {t("consultations.soap.ai.applyDraft")}
          </Button>
          <Button
            className="h-9 rounded-xl px-3 font-semibold text-xs"
            onClick={onDiscard}
            size="sm"
            type="button"
            variant="ghost"
          >
            {t("consultations.soap.ai.discardDraft")}
          </Button>
        </div>
      </div>
      <ul className="mt-3 divide-y divide-border/60 text-xs">
        {(["subjective", "objective", "assessment", "plan"] as const).map(
          (key) =>
            draft[key] ? (
              <li className="grid gap-1 py-2 first:pt-0 last:pb-0 sm:grid-cols-[90px_minmax(0,1fr)]" key={key}>
                <span className="font-medium text-muted-foreground">
                  {t(`consultations.soap.sections.${key}`)}
                </span>
                <span className="line-clamp-3 leading-5">{draft[key]}</span>
              </li>
            ) : null
        )}
      </ul>
    </div>
  );
}

// Internal textarea import (kept here to avoid a full re-export in soap-section-editor)
