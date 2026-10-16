import { PlanCareTasks } from "@/modules/care-tasks/plan-care-tasks";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CheckCircle,
  CircleNotch,
  FloppyDisk,
  FileText,
  Trash,
  XCircle,
} from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/contexts/AuthContext";
import { useConsultationSoapsRepository } from "@/data/repositories";
import { cn } from "@/lib/utils";
import type { ConsultationSoap } from "@/types/db";
import {
  EMPTY_SOAP,
  SOAP_SECTIONS,
  type LocalSoapNote,
} from "../local-ai/soap-schema";
import { SoapSectionEditor } from "./soap-section-editor";
import { AssistantBrandAvatar } from "./assistant-brand-avatar";
import { ConsultationAssistantPanel } from "./consultation-assistant-panel";
import { isSoapReviewed, reviewedSoapContent } from "../local-ai/soap-review";

const ConsultationDocumentsAssistant = lazy(
  () =>
    import("@/modules/documents/components/consultation-documents-assistant")
);

const LocalConsultationAssistant = lazy(
  () => import("./local-consultation-assistant")
);
type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";
type Payload = Pick<
  ConsultationSoap,
  | "subjective"
  | "objective"
  | "assessment"
  | "plan"
  | "transcript"
  | "aiDraft"
  | "aiConfidence"
  | "content"
  | "templateVersion"
>;
const emptyPayload: Payload = {
  ...EMPTY_SOAP,
  transcript: null,
  aiDraft: null,
  aiConfidence: null,
  content: "{}",
  templateVersion: "1.0",
};
const samePayload = (a: Payload | null, b: Payload) =>
  a !== null && JSON.stringify(a) === JSON.stringify(b);
const hasNote = (payload: Payload) =>
  SOAP_SECTIONS.some(({ key }) => payload[key].trim());

export function SoapPanel({
  appointmentId,
  patientId,
  className,
}: {
  appointmentId: string;
  patientId: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const repo = useConsultationSoapsRepository();
  const existing = repo.forAppointment(appointmentId);
  const [payload, setPayload] = useState<Payload>(emptyPayload);
  const [initialised, setInitialised] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [activeSection, setActiveSection] =
    useState<keyof LocalSoapNote>("subjective");
  const lastSaved = useRef<Payload | null>(null);
  const latest = useRef<Payload>(emptyPayload);
  const hydrated = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<Promise<void> | null>(null);
  const repoRef = useRef(repo);
  useEffect(() => {
    repoRef.current = repo;
  }, [repo]);
  useEffect(() => {
    if (initialised || repo.loading) return;
    const value: Payload = existing
      ? {
          subjective: existing.subjective ?? "",
          objective: existing.objective ?? "",
          assessment: existing.assessment ?? "",
          plan: existing.plan ?? "",
          transcript: existing.transcript,
          aiDraft: existing.aiDraft,
          aiConfidence: existing.aiConfidence,
          content: existing.content ?? "{}",
          templateVersion: existing.templateVersion ?? "1.0",
        }
      : emptyPayload;
    setPayload(value);
    latest.current = value;
    lastSaved.current = existing ? value : null;
    hydrated.current = true;
    setInitialised(true);
    setSaveStatus(existing ? "saved" : "idle");
  }, [existing, initialised, repo.loading]);

  const persist = useCallback(
    async (snapshot: Payload) => {
      const previous = pendingSave.current;
      const operation = (async () => {
        await previous?.catch(() => undefined);
        setSaveStatus("saving");
        try {
          const saved = await repoRef.current.upsertForAppointment(
            appointmentId,
            patientId,
            snapshot,
            currentUser?.id
          );
          if (!saved)
            throw new Error(
              "La base locale n’a pas confirmé l’enregistrement."
            );
          lastSaved.current = snapshot;
          setSaveStatus("saved");
        } catch (error) {
          setSaveStatus("error");
          throw error;
        }
      })();
      pendingSave.current = operation;
      try {
        await operation;
      } finally {
        if (pendingSave.current === operation) pendingSave.current = null;
      }
    },
    [appointmentId, currentUser?.id, patientId]
  );
  const persistRef = useRef(persist);
  useEffect(() => {
    latest.current = payload;
    persistRef.current = persist;
  }, [payload, persist]);
  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const reportSaveError = useCallback(
    () => toast.error(t("consultations.soap.meta.saveError")),
    [t]
  );
  useEffect(() => {
    if (
      !initialised ||
      assistantOpen ||
      saveStatus === "saving" ||
      saveStatus === "error" ||
      (!hasNote(payload) && !lastSaved.current) ||
      samePayload(lastSaved.current, payload)
    )
      return;
    setSaveStatus("pending");
    timer.current = setTimeout(() => {
      void persist(payload).catch(reportSaveError);
    }, 800);
    return clearTimer;
  }, [
    assistantOpen,
    clearTimer,
    initialised,
    payload,
    persist,
    reportSaveError,
    saveStatus,
  ]);
  useEffect(
    () => () => {
      clearTimer();
      // Only manual or explicitly validated content ever enters `latest`.
      // The assistant's transcription/draft stays exclusively in its own state.
      if (
        hydrated.current &&
        (hasNote(latest.current) || lastSaved.current) &&
        !samePayload(lastSaved.current, latest.current)
      ) {
        void persistRef
          .current(latest.current)
          .catch(() => toast.error("La note n’a pas été enregistrée."));
      }
    },
    [clearTimer]
  );

  const validateNote = async (note: LocalSoapNote, transcript: string) => {
    clearTimer();
    await pendingSave.current?.catch(() => undefined);
    // Preserve extensible clinical metadata already stored on the SOAP row.
    let content: Record<string, unknown> = {};
    try {
      const parsed: unknown = JSON.parse(payload.content);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
        content = parsed as Record<string, unknown>;
    } catch {
      /* Legacy content can be empty. */
    }
    const approved: Payload = {
      ...note,
      transcript,
      aiDraft: null,
      aiConfidence: null,
      templateVersion: "local-ai-soap-1",
      content: reviewedSoapContent(
        note,
        JSON.stringify({
          ...content,
          localAi: {
            pipeline: "whisper-fr+mediapipe",
            reviewedAt: new Date().toISOString(),
            reviewedBy: currentUser?.id ?? null,
          },
        }),
        currentUser?.id ?? null
      ),
    };
    await persist(approved);
    latest.current = approved;
    setPayload(approved);
  };
  const saveNow = async () => {
    clearTimer();
    try {
      await persist(payload);
    } catch {
      reportSaveError();
    }
  };
  const approveManualNote = async () => {
    clearTimer();
    try {
      const approved = {
        ...payload,
        aiDraft: null,
        content: reviewedSoapContent(
          payload,
          payload.content,
          currentUser?.id ?? null
        ),
      };
      await persist(approved);
      latest.current = approved;
      setPayload(approved);
      toast.success("Note validée. Vous pouvez préparer les documents.");
    } catch {
      reportSaveError();
    }
  };
  const dirty =
    initialised &&
    !samePayload(lastSaved.current, payload) &&
    (hasNote(payload) || !!lastSaved.current);
  return (
    <div className={cn("soap-panel space-y-5", className)}>
      <div className="soap-panel-header flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-base tracking-[-0.02em]">
              Note clinique structurée
            </h3>
            <span aria-live="polite">
              <SaveStatusPill status={saveStatus} />
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            SOAP : motif, observations, évaluation et plan de soins. Vos
            saisies sont enregistrées automatiquement ; une dictée IA attend
            toujours votre validation.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              disabled={!initialised || saveStatus === "saving"}
              size="sm"
              variant="outline"
              onClick={() => setDocumentsOpen(!documentsOpen)}
              aria-expanded={documentsOpen}
            >
              <FileText className="size-3.5" /> Documents
            </Button>
            <Button
              className="h-10 gap-1.5 px-4 text-xs"
              disabled={!dirty || saveStatus === "saving"}
              onClick={() => void saveNow()}
              size="sm"
              variant="outline"
            >
              <FloppyDisk className="size-3.5" />{" "}
              {t("consultations.soap.meta.save")}
            </Button>
            <Button
              className="h-10 gap-1.5 px-4 text-xs"
              disabled={!initialised || saveStatus === "saving"}
              onClick={() => {
                clearTimer();
                setAssistantOpen((value) => !value);
              }}
              size="sm"
              variant={assistantOpen ? "default" : "outline"}
              aria-expanded={assistantOpen}
              aria-label="Ouvrir l’assistant de consultation"
            >
              <AssistantBrandAvatar size={24} /> Assistant
            </Button>
            <Button
              aria-label="Effacer la note"
              className="size-10"
              disabled={!hasNote(payload) || saveStatus === "saving"}
              onClick={() => setClearDialogOpen(true)}
              size="icon"
              variant="ghost"
            >
              <Trash className="size-4" />
            </Button>
        </div>
      </div>
      <div className="soap-editor-grid grid gap-3 lg:grid-cols-2">
          {SOAP_SECTIONS.map(({ key }) => (
            <div key={key} className="space-y-2">
            <SoapSectionEditor
              sectionKey={key}
              title={t(`consultations.soap.sections.${key}`)}
              placeholder={t(`consultations.soap.placeholders.${key}`)}
              value={payload[key]}
              status={activeSection === key ? "active" : "default"}
              onFocusSection={() => setActiveSection(key)}
              disabled={!initialised}
              onChange={(value) => {
                setPayload((previous) => ({ ...previous, [key]: value }));
                setSaveStatus("pending");
              }}
            />
            {key === "plan" && payload.plan.trim() && isSoapReviewed(payload) && !dirty && <PlanCareTasks plan={payload.plan} patientId={patientId} />}
            </div>
          ))}
        </div>
      {hasNote(payload) && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            {isSoapReviewed(payload) && !dirty
              ? "Note validée pour les documents."
              : "Validez la version actuelle avant de préparer un document."}
          </span>
          <Button
            disabled={
              saveStatus === "saving" || (isSoapReviewed(payload) && !dirty)
            }
            size="sm"
            variant="outline"
            onClick={() => void approveManualNote()}
          >
            <CheckCircle className="size-3.5" /> Valider la note pour les
            documents
          </Button>
        </div>
      )}
      {documentsOpen && (
        <Suspense
          fallback={
            <p role="status" className="text-sm text-muted-foreground">
              Ouverture des documents…
            </p>
          }
        >
          <ConsultationDocumentsAssistant
            appointmentId={appointmentId}
            patientId={patientId}
            onClose={() => setDocumentsOpen(false)}
          />
        </Suspense>
      )}
      <ConsultationAssistantPanel open={assistantOpen}>
        <Suspense
          fallback={
            <p
              role="status"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <CircleNotch className="size-4 animate-spin" /> Ouverture de
              l’assistant…
            </p>
          }
        >
          <LocalConsultationAssistant
            appointmentId={appointmentId}
            patientId={patientId}
            existingNote={payload}
            onClose={() => setAssistantOpen(false)}
            onValidate={validateNote}
          />
        </Suspense>
      </ConsultationAssistantPanel>
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Effacer toute la note SOAP ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les quatre sections et la transcription déjà validée seront
              effacées. Cette modification sera enregistrée automatiquement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conserver la note</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                setPayload({ ...emptyPayload, content: payload.content })
              }
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
  const label = {
    saving: "upserting",
    pending: "pendingSave",
    error: "notSaved",
    saved: "lastSaved",
    idle: "notSaved",
  }[status];
  return (
    <Badge variant="outline" className="gap-1 text-[10px]">
      {status === "saving" && (
        <CircleNotch className="size-3 animate-spin motion-reduce:animate-none" />
      )}
      {status === "saved" && <CheckCircle className="size-3" />}
      {status === "error" && <XCircle className="size-3 text-destructive" />}
      {t(`consultations.soap.meta.${label}`)}
    </Badge>
  );
}
