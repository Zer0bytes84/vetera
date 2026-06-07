import {
  CircleNotch,
  Microphone,
  Sparkle,
  Trash,
  XCircle,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useConsultationSoapsRepository } from "@/data/repositories";
import { cn } from "@/lib/utils";
import { useEnsureWebLLM } from "../hooks/use-ensure-webllm";
import { useSpeechToText } from "../hooks/use-speech-to-text";
import { type SoapDraft, structureDictationIntoSoap } from "../lib/voice-to-soap";
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

export function SoapPanel({ appointmentId, className, patientId }: SoapPanelProps) {
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

  // Hydrate from existing record once
  useEffect(() => {
    if (initialised) {
      return;
    }
    if (existing) {
      setForm({
        subjective: existing.subjective ?? "",
        objective: existing.objective ?? "",
        assessment: existing.assessment ?? "",
        plan: existing.plan ?? "",
      });
    }
    setInitialised(true);
  }, [existing, initialised]);

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
  }, [
    speech.interimTranscript,
    speech.isListening,
    speech.transcript,
  ]);

  // ── Debounced auto-save ──────────────────────────────────────────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<SoapFormState | null>(
    existing
      ? {
          subjective: existing.subjective ?? "",
          objective: existing.objective ?? "",
          assessment: existing.assessment ?? "",
          plan: existing.plan ?? "",
        }
      : null
  );
  const isFirstRender = useRef<boolean>(true);

  const persist = useCallback(
    async (snapshot: SoapFormState) => {
      setSaveStatus("saving");
      try {
        await repo.upsertForAppointment(
          appointmentId,
          patientId,
          {
            subjective: snapshot.subjective,
            objective: snapshot.objective,
            assessment: snapshot.assessment,
            plan: snapshot.plan,
            transcript: liveTranscript || null,
            aiDraft: draft ? JSON.stringify(draft) : null,
            aiConfidence: draft?.confidence ?? null,
            templateVersion: "1.0",
          },
          currentUser?.id
        );
        lastSavedRef.current = snapshot;
        setSaveStatus("saved");
      } catch (err) {
        console.error("[SoapPanel] persist error", err);
        setSaveStatus("error");
        toast.error(t("consultations.soap.meta.upserting"));
      }
    },
    [appointmentId, draft, currentUser?.id, liveTranscript, patientId, repo, t]
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!initialised) {
      return;
    }
    if (lastSavedRef.current && areFormsEqual(lastSavedRef.current, form)) {
      return;
    }
    setSaveStatus("pending");
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      void persist(form);
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [form, initialised, persist]);

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
        await engine.ensure();
      }
      const result = await structureDictationIntoSoap(transcript, {
        withConfidence: true,
      });
      if (!result) {
        toast.error(t("consultations.soap.ai.parseError"));
        return;
      }
      setDraft(result);
      toast.success(t("consultations.soap.ai.draftAvailable"));
    } catch (err) {
      console.error("[SoapPanel] structureWithAi error", err);
      toast.error(t("consultations.soap.ai.parseError"));
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
    setForm(EMPTY_FORM);
    setLiveTranscript("");
    setDraft(null);
  };

  const speechMicError = speech.error;
  const canStructure = useMemo(
    () => Boolean(liveTranscript.trim() || form.subjective.trim()),
    [form.subjective, liveTranscript]
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header action row */}
      <div className="flex items-center justify-between gap-2 border-b border-border/10 pb-2.5">
        <div className="flex items-center gap-2">
          <SaveStatusPill status={saveStatus} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="h-8 gap-1.5 text-xs font-semibold rounded-full px-4 shadow-sm hover:shadow-md transition-all duration-300"
            disabled={!canStructure || isStructuring}
            onClick={() => void handleStructureWithAi()}
            size="sm"
            type="button"
            variant="default"
          >
            {isStructuring ? (
              <CircleNotch weight="duotone" className="size-3.5 animate-spin" />
            ) : (
              <Sparkle weight="duotone" className="size-3.5" />
            )}
            {isStructuring
              ? t("consultations.soap.ai.structuring")
              : t("consultations.soap.ai.structure")}
          </Button>
          <Button
            aria-label={t("consultations.soap.ai.clear")}
            className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
            disabled={!form.subjective && !form.objective && !form.assessment && !form.plan}
            onClick={clearAll}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash weight="duotone" className="size-4" />
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
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1 text-xs text-destructive">
          {engine.error}
        </p>
      ) : null}

      {/* 4 SOAP sections */}
      <div className="grid gap-4 sm:grid-cols-2">
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
        <div className="rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl p-4 shadow-sm relative overflow-hidden group/dictation">
          <div className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500 group-hover/dictation:opacity-100 mix-blend-overlay">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent" />
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 relative z-10">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Microphone weight="duotone" className="size-4" />
              </div>
              <h4 className="text-sm font-semibold tracking-tight">
                {t("consultations.soap.ai.transcriptPlaceholder")}
              </h4>
              {speech.isListening ? (
                <Badge className="animate-pulse bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.4)]" variant="default">
                  ● {t("consultations.soap.ai.stopDictation")}
                </Badge>
              ) : null}
              {speechMicError ? (
                <Badge className="bg-destructive/10 text-destructive" variant="outline">
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
                className="h-8 text-xs font-semibold rounded-full px-3.5 shadow-xs"
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
            className="min-h-[88px] resize-y border-0 bg-zinc-100/50 dark:bg-zinc-900/50 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-rose-500/30 rounded-lg relative z-10 placeholder:text-muted-foreground/50 transition-colors"
            onChange={(event) => setLiveTranscript(event.target.value)}
            placeholder={t("consultations.soap.ai.transcriptPlaceholder")}
            value={liveTranscript}
          />
          <p className="mt-2 text-[10px] font-medium text-muted-foreground/60 relative z-10 flex items-center gap-1.5">
            <Sparkle weight="fill" className="size-3 text-rose-400" />
            {speech.isListening
              ? t("consultations.soap.ai.stopDictation")
              : t("consultations.soap.ai.startDictation")}
          </p>
        </div>

        <DraftZone
          draft={draft}
          isStructuring={isStructuring}
          onApply={applyDraft}
          onDiscard={discardDraft}
        />
      </div>
    </div>
  );
}

function SaveStatusPill({ status }: { status: SaveStatus }) {
  const { t } = useTranslation();
  if (status === "saving") {
    return (
      <Badge className="text-[10px]" variant="secondary">
        <CircleNotch weight="duotone" className="mr-1 size-3 animate-spin" />
        {t("consultations.soap.meta.upserting")}
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge className="text-[10px]" variant="outline">
        {t("consultations.soap.meta.autoSaved")}
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge className="bg-destructive/10 text-[10px] text-destructive" variant="outline">
        <XCircle weight="duotone" className="mr-1 size-3" />
        {t("consultations.soap.meta.notSaved")}
      </Badge>
    );
  }
  if (status === "saved") {
    return (
      <Badge className="text-[10px]" variant="outline">
        ✓ {t("consultations.soap.meta.lastSaved")}
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
      <div className="flex h-full min-h-[140px] items-center justify-center rounded-lg border border-dashed border-border/50 bg-background/30 p-3 text-sm text-muted-foreground">
        <CircleNotch className="mr-2 size-4 animate-spin" weight="duotone" />
        {t("consultations.soap.ai.structuring")}
      </div>
    );
  }
  if (!draft) {
    return (
      <div className="flex h-full min-h-[140px] flex-col items-center justify-center rounded-lg border border-dashed border-border/50 bg-background/30 p-3 text-center text-xs text-muted-foreground">
        <Sparkle className="mb-1 size-4 opacity-60" weight="duotone" />
        {t("consultations.soap.ai.description")}
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge className="text-[10px]" variant="default">
            {t("consultations.soap.ai.draftAvailable")}
          </Badge>
          {draft.confidence != null ? (
            <Badge className="text-[10px]" variant="outline">
              {t("consultations.soap.ai.confidence")} ·
              {" "}
              {Math.round(draft.confidence * 100)}%
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            className="h-7.5 text-xs font-semibold rounded-full px-3.5"
            onClick={onApply}
            size="sm"
            type="button"
            variant="default"
          >
            {t("consultations.soap.ai.applyDraft")}
          </Button>
          <Button
            className="h-7.5 text-xs font-semibold rounded-full px-3"
            onClick={onDiscard}
            size="sm"
            type="button"
            variant="ghost"
          >
            {t("consultations.soap.ai.discardDraft")}
          </Button>
        </div>
      </div>
      <ul className="space-y-1 text-xs">
        {(["subjective", "objective", "assessment", "plan"] as const).map(
          (key) =>
            draft[key] ? (
              <li key={key} className="flex gap-2">
                <span className="w-16 shrink-0 text-muted-foreground">
                  {t(`consultations.soap.sections.${key}`)}
                </span>
                <span className="line-clamp-2 flex-1">{draft[key]}</span>
              </li>
            ) : null
        )}
      </ul>
    </div>
  );
}

// Internal textarea import (kept here to avoid a full re-export in soap-section-editor)