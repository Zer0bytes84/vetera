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
  Notebook,
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
import {
  EMPTY_SOAP,
  SOAP_SECTIONS,
  type LocalSoapNote,
} from "../local-ai/soap-schema";
import { SoapSectionEditor } from "./soap-section-editor";
import {
  hasNote,
  isSoapAutosaveDue,
  isSoapUnsaved,
  samePayload,
  type Payload,
  type SaveStatus,
} from "../soap-panel-state";
import { AssistantBrandAvatar } from "./assistant-brand-avatar";
import { meaningful } from "@/modules/patients/lib/meaningful";
import { Shell, ShellHeader } from "@/components/ui/surface";
import "./soap-surface.css";
import { ConsultationAssistantPanel } from "./consultation-assistant-panel";
import { isSoapReviewed, reviewedSoapContent } from "../local-ai/soap-review";
import { OPEN_SOAP_ASSISTANT_EVENT } from "@/modules/consultation-workspace/consultation-closure";
import type { SoapNoteOrigin } from "./local-consultation-assistant";
import { guard } from "@/lib/guard";

const ConsultationDocumentsAssistant = lazy(
  () =>
    import("@/modules/documents/components/consultation-documents-assistant")
);
const DocumentComposer = lazy(() =>
  import("@/modules/documents/components/document-composer").then((module) => ({
    default: module.DocumentComposer,
  }))
);

const LocalConsultationAssistant = lazy(
  () => import("./local-consultation-assistant")
);
/** Warms the assistant chunk while the consultation is open, so clicking
 * « Assistant » does not pay the load before the Dicter button appears. */
const preloadLocalConsultationAssistant = () => {
  void import("./local-consultation-assistant");
};
const emptyPayload: Payload = {
  ...EMPTY_SOAP,
  transcript: null,
  aiDraft: null,
  aiConfidence: null,
  content: "{}",
  templateVersion: "1.0",
};

/** Les métadonnées cliniques déjà stockées sur la ligne SOAP ; un contenu ancien, vide ou illisible donne un objet vide. */
function readContentObject(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      return parsed as Record<string, unknown>;
  } catch {
    /* Legacy content can be empty. */
  }
  return {};
}

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
  const [documentComposerOpen, setDocumentComposerOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [activeSection, setActiveSection] =
    useState<keyof LocalSoapNote>("subjective");
  const lastSaved = useRef<Payload | null>(null);
  // Le même instantané, en état : l'indicateur « modifié » le lit au rendu (la ref, elle, sert aux minuteries et aux effets).
  const [savedSnapshot, setSavedSnapshot] = useState<Payload | null>(null);
  const latest = useRef<Payload>(emptyPayload);
  const hydrated = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<Promise<void> | null>(null);
  const repoRef = useRef(repo);
  // The assistant is the consultation's main tool: warm its chunk on mount.
  useEffect(() => {
    preloadLocalConsultationAssistant();
  }, []);
  // « Dicter la note » from the closing bar of this consultation.
  useEffect(() => {
    const open = (event: Event) => {
      if (
        (event as CustomEvent<{ appointmentId: string }>).detail
          ?.appointmentId === appointmentId
      )
        setAssistantOpen(true);
    };
    window.addEventListener(OPEN_SOAP_ASSISTANT_EVENT, open);
    return () => window.removeEventListener(OPEN_SOAP_ASSISTANT_EVENT, open);
  }, [appointmentId]);
  useEffect(() => {
    repoRef.current = repo;
  }, [repo]);
  // Dès que la note enregistrée est lue, le panneau part d'elle (corrigé au rendu, sans effet) ;
  // les références lues par les minuteries et le nettoyage sont posées juste après, dans l'effet qui suit.
  if (!initialised && !repo.loading) {
    // A section holding only a placeholder (« Na », « n/a », « - »…) is read as empty; the stored text is left alone until the next real save.
    const value: Payload = existing
      ? {
          subjective: meaningful(existing.subjective),
          objective: meaningful(existing.objective),
          assessment: meaningful(existing.assessment),
          plan: meaningful(existing.plan),
          transcript: existing.transcript,
          aiDraft: existing.aiDraft,
          aiConfidence: existing.aiConfidence,
          content: existing.content ?? "{}",
          templateVersion: existing.templateVersion ?? "1.0",
        }
      : emptyPayload;
    setPayload(value);
    setSavedSnapshot(existing ? value : null);
    setInitialised(true);
    setSaveStatus(existing ? "saved" : "idle");
  }
  useEffect(() => {
    if (!initialised) return;
    latest.current = payload;
    lastSaved.current = savedSnapshot;
    hydrated.current = true;
  }, [initialised, payload, savedSnapshot]);

  const persist = useCallback(
    async (snapshot: Payload) => {
      const previous = pendingSave.current;
      const operation = (async () => {
        await previous?.catch(() => undefined);
        setSaveStatus("saving");
        await guard(
          async () => {
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
            setSavedSnapshot(snapshot);
            setSaveStatus("saved");
          },
          {
            recover: (error) => {
              setSaveStatus("error");
              throw error;
            },
          }
        );
      })();
      pendingSave.current = operation;
      await guard(
        async () => {
          await operation;
        },
        {
          cleanup: () => {
            if (pendingSave.current === operation) pendingSave.current = null;
          },
        }
      );
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
  // La sauvegarde automatique est due : l'état « en attente » est posé dès le rendu (corrigé au rendu, sans effet),
  // l'effet ne fait que lancer la minuterie.
  const autosaveDue = isSoapAutosaveDue({
    initialised,
    assistantOpen,
    saveStatus,
    saved: savedSnapshot,
    payload,
  });
  if (autosaveDue && saveStatus !== "pending") setSaveStatus("pending");
  useEffect(() => {
    if (!autosaveDue) return;
    timer.current = setTimeout(() => {
      void persist(payload).catch(reportSaveError);
    }, 800);
    return clearTimer;
  }, [autosaveDue, clearTimer, payload, persist, reportSaveError, saveStatus]);
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

  const validateNote = async (
    note: LocalSoapNote,
    transcript: string,
    origin: SoapNoteOrigin
  ) => {
    clearTimer();
    await pendingSave.current?.catch(() => undefined);
    // Preserve extensible clinical metadata already stored on the SOAP row.
    const content = readContentObject(payload.content);
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
            // "dictee": the vet's own dictation, reread and validated without generated wording.
            source: origin === "assistant" ? "assistant" : "dictee-relue",
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
  const dirty = isSoapUnsaved(initialised, savedSnapshot, payload);
  return (
    <Shell className={cn("soap-panel", className)}>
      <ShellHeader
        aside={
          <>
            <Button
              className="rounded-full px-4"
              disabled={
                !initialised ||
                dirty ||
                saveStatus === "saving" ||
                !isSoapReviewed(payload)
              }
              size="sm"
              onClick={() => setDocumentComposerOpen(true)}
            >
              <FileText className="size-3.5" /> Générer un document
            </Button>
            <Button
              className="rounded-full px-4"
              disabled={!initialised || saveStatus === "saving"}
              size="sm"
              variant="outline"
              onClick={() => setDocumentsOpen(!documentsOpen)}
              aria-expanded={documentsOpen}
            >
              <FileText className="size-3.5" /> Documents
            </Button>
            <Button
              className="rounded-full px-4"
              disabled={!dirty || saveStatus === "saving"}
              onClick={() => void saveNow()}
              size="sm"
              variant="outline"
            >
              <FloppyDisk className="size-3.5" />{" "}
              {t("consultations.soap.meta.save")}
            </Button>
            <Button
              className="rounded-full px-4"
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
              <AssistantBrandAvatar size={20} /> Assistant
            </Button>
            <Button
              aria-label="Effacer la note"
              className="rounded-full"
              disabled={!hasNote(payload) || saveStatus === "saving"}
              onClick={() => setClearDialogOpen(true)}
              size="icon"
              variant="ghost"
            >
              <Trash className="size-4" />
            </Button>
          </>
        }
        as="h3"
        className="soap-panel-header"
        icon={Notebook}
        subtitle={
          <span aria-live="polite" className="inline-flex items-center gap-2">
            SOAP <SaveStatusPill status={saveStatus} />
          </span>
        }
        title="Note clinique"
      />
      <div className="soap-editor-grid grid gap-1.5 lg:grid-cols-2">
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
          </div>
        ))}
      </div>
      {hasNote(payload) && (
        <div className="soap-panel-footer flex flex-wrap items-center justify-end gap-2 px-2 pt-3">
          {payload.plan.trim() && isSoapReviewed(payload) && !dirty ? (
            <PlanCareTasks patientId={patientId} plan={payload.plan} />
          ) : null}
          {isSoapReviewed(payload) && !dirty ? (
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] text-[var(--tone-green)]">
              <CheckCircle className="size-3.5" /> Note validée pour les
              documents
            </span>
          ) : (
            <>
              <span className="mr-auto text-[0.8125rem] text-muted-foreground">
                Validez la version actuelle avant de préparer un document.
              </span>
              <Button
                className="rounded-full px-4"
                disabled={saveStatus === "saving"}
                onClick={() => void approveManualNote()}
                size="sm"
              >
                <CheckCircle className="size-3.5" /> Valider la note pour les
                documents
              </Button>
            </>
          )}
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
      {documentComposerOpen && (
        <Suspense fallback={<p role="status">Ouverture de la génération…</p>}>
          <DocumentComposer
            open={documentComposerOpen}
            patientId={patientId}
            consultationId={appointmentId}
            onClose={() => setDocumentComposerOpen(false)}
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
    </Shell>
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
    <Badge variant="outline" className="gap-1 t-12">
      {status === "saving" && (
        <CircleNotch className="size-3 animate-spin motion-reduce:animate-none" />
      )}
      {status === "saved" && <CheckCircle className="size-3" />}
      {status === "error" && <XCircle className="size-3 text-destructive" />}
      {t(`consultations.soap.meta.${label}`)}
    </Badge>
  );
}
