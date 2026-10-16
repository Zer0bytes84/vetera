import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  CircleNotch,
  FileText,
  UploadSimple,
  X,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Message, MessageContent } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { useSQLite } from "@/hooks/useSQLite";
import type {
  Appointment,
  ConsultationDocument,
  ConsultationSoap,
  Note,
  Owner,
  Patient,
} from "@/types/db";
import {
  isSoapReviewed,
  soapSourceKey,
} from "@/modules/consultations/local-ai/soap-review";
import {
  EMPTY_MODEL_STATUS,
  getLocalModels,
  importLocalModel,
  type LocalModelStatus,
} from "@/modules/consultations/local-ai/models";
import { useDocumentTemplates } from "../hooks/use-document-templates";
import { renderClinicalDocument } from "../lib/document-templates";
import {
  readLocalDocument,
  type ReadingProgress,
} from "../lib/read-local-document";
import { readDocumentAnswer } from "../lib/read-document-answer";
import {
  saveReviewedDocument,
  type ReviewedDocumentInput,
} from "../lib/save-reviewed-document";
import { exportClinicalDocument } from "../lib/document-pdf";
import {
  type DocumentAnswer,
  type ReadDocument,
  MAX_DOCUMENT_CHARACTERS,
  assertReadableFile,
} from "../lib/document-reading";

type Draft = Pick<ReviewedDocumentInput, "title" | "text" | "source">;
function fileFromAttachment(document: ConsultationDocument): File {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(document.dataUrl);
  if (!match || match[1] !== document.mimeType)
    throw new Error("Ce fichier local est invalide.");
  const binary = atob(match[2]);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new File([bytes], document.fileName, { type: document.mimeType });
}
function noteText(note: Note): string {
  const parsed = new DOMParser().parseFromString(note.content, "text/html");
  parsed
    .querySelectorAll("script,style,iframe,object,link")
    .forEach((element) => element.remove());
  parsed
    .querySelectorAll("p,h1,h2,h3,li,br")
    .forEach((element) => element.append("\n"));
  return parsed.body.textContent?.trim() ?? "";
}
function ChatMessage({
  user = false,
  children,
}: {
  user?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Message align={user ? "end" : "start"}>
      <MessageContent className="w-full max-w-full">
        <Bubble
          variant={user ? "secondary" : "ghost"}
          className="w-full max-w-full"
        >
          <BubbleContent>{children}</BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}

export default function ConsultationDocumentsAssistant({
  appointmentId,
  patientId,
  onClose,
}: {
  appointmentId: string;
  patientId: string;
  onClose?: () => void;
}) {
  const { currentUser } = useAuth();
  const patients = useSQLite<Patient>("patients");
  const owners = useSQLite<Owner>("owners");
  const appointments = useSQLite<Appointment>("appointments");
  const soaps = useSQLite<ConsultationSoap>("consultation_soaps");
  const files = useSQLite<ConsultationDocument>("consultation_documents");
  const notes = useSQLite<Note>("notes");
  const templates = useDocumentTemplates();
  const patient = patients.data.find((entry) => entry.id === patientId);
  const appointment = appointments.data.find(
    (entry) => entry.id === appointmentId && entry.patientId === patientId
  );
  const soap = soaps.data.find(
    (entry) =>
      entry.appointmentId === appointmentId && entry.patientId === patientId
  );
  const owner = owners.data.find((entry) => entry.id === patient?.ownerId);
  const [mode, setMode] = useState<"generate" | "read">("generate");
  const [templateId, setTemplateId] = useState("document-report");
  const [models, setModels] = useState<LocalModelStatus>(EMPTY_MODEL_STATUS);
  const [reading, setReading] = useState<ReadDocument | null>(null);
  const [question, setQuestion] = useState(
    "Quels sont les principaux résultats mentionnés dans ce document ?"
  );
  const [answer, setAnswer] = useState<DocumentAnswer | null>(null);
  const [askedQuestion, setAskedQuestion] = useState("");
  const [partial, setPartial] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<ReadingProgress>({ message: "" });
  const [characters, setCharacters] = useState<number | undefined>();
  const controller = useRef<AbortController | null>(null);
  const savingRef = useRef(false);
  const picker = useRef<HTMLInputElement>(null);
  const id = useId();
  useEffect(() => {
    let active = true;
    void getLocalModels()
      .then((status) => {
        if (active) setModels(status);
      })
      .catch(() => {
        if (active)
          setError("L’installation de l’assistant n’a pas pu être vérifiée.");
      });
    return () => {
      active = false;
      controller.current?.abort();
    };
  }, []);
  const resetReview = () => {
    setReviewed(false);
    setSaved(false);
  };
  const switchMode = (next: "generate" | "read") => {
    if (busy || saving) return;
    setMode(next);
    setDraft(null);
    setAskedQuestion("");
    resetReview();
    setError("");
  };
  const ready = !!soap && isSoapReviewed(soap) && !!patient && !!appointment;
  const changedSource =
    draft?.source.type === "soap" &&
    (!soap ||
      !isSoapReviewed(soap) ||
      soapSourceKey(soap) !== draft.source.sourceKey);
  const unavailable = !!(
    patients.error ||
    appointments.error ||
    soaps.error ||
    templates.error ||
    files.error ||
    notes.error
  );
  const createDraft = () => {
    if (!ready || !patient || !appointment || !soap) return;
    try {
      const template = templates.templates.find(
        (entry) => entry.id === templateId
      );
      if (!template) throw new Error("Choisissez un modèle disponible.");
      const text = renderClinicalDocument(template, {
        patient,
        owner,
        appointment,
        soap,
        vetName: currentUser?.displayName ?? "",
      });
      setDraft({
        title: template.name + " · " + patient.name,
        text,
        source: {
          type: "soap",
          sourceKey: soapSourceKey(soap),
          template: {
            id: template.id,
            name: template.name,
            body: template.body,
            updatedAt: template.updatedAt,
          },
        },
      });
      resetReview();
      setError("");
    } catch (failure) {
      setError((failure as Error).message);
    }
  };
  const readFile = async (file: File, sourceId?: string) => {
    if (controller.current || saving) return;
    try {
      assertReadableFile(file);
    } catch (failure) {
      setError((failure as Error).message);
      return;
    }
    const task = new AbortController();
    controller.current = task;
    setBusy(true);
    setError("");
    setReading(null);
    setAnswer(null);
    setAskedQuestion("");
    setDraft(null);
    resetReview();
    setCharacters(undefined);
    try {
      const source = await readLocalDocument(file, task.signal, (update) => {
        if (controller.current === task) setProgress(update);
      });
      if (!task.signal.aborted) setReading({ ...source, sourceId });
    } catch (failure) {
      if (!task.signal.aborted) setError((failure as Error).message);
    } finally {
      if (controller.current === task) {
        controller.current = null;
        setBusy(false);
      }
    }
  };
  const chooseExisting = (value: string) => {
    setError("");
    setAnswer(null);
    setAskedQuestion("");
    setDraft(null);
    resetReview();
    const file = files.data.find(
      (entry) => entry.id === value && entry.patientId === patientId
    );
    const note = notes.data.find(
      (entry) =>
        entry.id === value &&
        entry.patientId === patientId &&
        entry.userId === currentUser?.uid
    );
    if (file) {
      try {
        void readFile(fileFromAttachment(file), file.id);
      } catch (failure) {
        setError((failure as Error).message);
      }
    } else if (note) {
      const text = noteText(note);
      if (!text || text.length > MAX_DOCUMENT_CHARACTERS) {
        setError("La note est vide ou trop longue pour être lue.");
        return;
      }
      setReading({
        name: note.title,
        sourceId: note.id,
        pages: [{ number: 1, text, method: "text" }],
      });
    } else setReading(null);
  };
  const ask = async () => {
    if (!reading || controller.current || saving) return;
    const task = new AbortController();
    controller.current = task;
    setBusy(true);
    setError("");
    setAnswer(null);
    setAskedQuestion(question);
    setDraft(null);
    resetReview();
    setCharacters(0);
    setProgress({ message: "Préparation de la lecture assistée…" });
    try {
      const result = await readDocumentAnswer(
        reading,
        question,
        models,
        task.signal,
        (event) => {
          if (controller.current === task) {
            setProgress({ message: event.message });
            setCharacters(event.characters);
          }
        }
      );
      if (!task.signal.aborted) {
        setAnswer(result.answer);
        setPartial(result.partial);
      }
    } catch (failure) {
      if (!task.signal.aborted) setError((failure as Error).message);
    } finally {
      if (controller.current === task) {
        controller.current = null;
        setBusy(false);
      }
    }
  };
  const reviewReading = () => {
    if (!reading) return;
    const text = answer
      ? answer.extraits
          .map((quote) => `Page ${quote.page}\n${quote.texte}`)
          .join("\n\n")
      : reading.pages
          .map((page) => `Page ${page.number}\n${page.text}`)
          .join("\n\n");
    setDraft({
      title: "Lecture · " + reading.name,
      text,
      source: {
        type: "document",
        name: reading.name,
        sourceId: reading.sourceId,
        pages: reading.pages,
        question: answer ? askedQuestion : undefined,
      },
    });
    resetReview();
  };
  const save = async () => {
    if (!draft || !reviewed || savingRef.current || busy) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      await saveReviewedDocument({
        ...draft,
        patientId,
        appointmentId,
        userId: currentUser?.uid ?? "",
        reviewed,
      });
      setSaved(true);
      toast.success("Document validé et enregistré dans le dossier patient.");
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const install = async () => {
    if (importing || busy) return;
    setImporting(true);
    setError("");
    try {
      const status = await importLocalModel("generator");
      if (status) setModels(status);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setImporting(false);
    }
  };
  const availableFiles = files.data.filter(
    (entry) =>
      entry.patientId === patientId &&
      ["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(
        entry.mimeType
      )
  );
  const availableNotes = notes.data.filter(
    (entry) =>
      entry.patientId === patientId && entry.userId === currentUser?.uid
  );
  return (
    <section
      aria-label="Assistant documents de consultation"
      className="mx-auto flex w-full max-w-3xl flex-col gap-5 border-t border-border pt-5"
    >
      <header className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Documents de consultation</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {patient?.name ?? "Patient"} · Sur cet ordinateur
          </p>
        </div>
        {onClose && (
          <Button
            aria-label="Fermer les documents"
            size="icon-sm"
            variant="ghost"
            disabled={saving}
            onClick={() => {
              controller.current?.abort();
              onClose();
            }}
          >
            <X className="size-4" />
          </Button>
        )}
      </header>
      <div className="flex gap-2" aria-label="Parcours documents">
        <Button
          size="sm"
          variant={mode === "generate" ? "secondary" : "ghost"}
          aria-pressed={mode === "generate"}
          disabled={busy || saving}
          onClick={() => switchMode("generate")}
        >
          Créer un document
        </Button>
        <Button
          size="sm"
          variant={mode === "read" ? "secondary" : "ghost"}
          aria-pressed={mode === "read"}
          disabled={busy || saving}
          onClick={() => switchMode("read")}
        >
          Lire un document
        </Button>
      </div>
      {unavailable && (
        <p role="alert" className="text-sm text-destructive">
          Une partie du dossier n’a pas pu être chargée. Fermez puis rouvrez les
          documents.
        </p>
      )}
      {mode === "generate" && (
        <>
          <ChatMessage>
            Je prépare une ordonnance, un certificat ou un compte-rendu à partir
            de votre note validée. Vous relisez le texte avant son
            enregistrement.
          </ChatMessage>
          {!ready && (
            <p role="status" className="text-sm text-muted-foreground">
              Validez d’abord la note de cette consultation. Une modification de
              la note demande une nouvelle validation.
            </p>
          )}
          <Field>
            <FieldLabel htmlFor={id + "-template"}>
              Modèle de document
            </FieldLabel>
            <NativeSelect
              id={id + "-template"}
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
              disabled={busy || saving}
            >
              {templates.templates.map((template) => (
                <NativeSelectOption key={template.id} value={template.id}>
                  {template.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <div>
            <Button
              size="sm"
              onClick={createDraft}
              disabled={!ready || unavailable || templates.loading || saving}
            >
              Préparer le document
            </Button>
          </div>
        </>
      )}
      {mode === "read" && (
        <>
          <ChatMessage>
            Choisissez un résultat de laboratoire, un PDF ou une image. Je lis
            le texte localement et cite les passages du document. Vous vérifiez
            le patient et les résultats avant tout enregistrement.
          </ChatMessage>
          <Field>
            <FieldLabel htmlFor={id + "-source"}>
              Document du dossier
            </FieldLabel>
            <NativeSelect
              id={id + "-source"}
              value={reading?.sourceId ?? ""}
              onChange={(event) => chooseExisting(event.target.value)}
              disabled={busy || saving || unavailable}
            >
              <NativeSelectOption value="">
                Choisir un document…
              </NativeSelectOption>
              {availableFiles.map((file) => (
                <NativeSelectOption key={file.id} value={file.id}>
                  {file.fileName}
                </NativeSelectOption>
              ))}
              {availableNotes.map((note) => (
                <NativeSelectOption key={note.id} value={note.id}>
                  {note.title || "Note sans titre"}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <input
            ref={picker}
            type="file"
            className="hidden"
            accept=".pdf,image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void readFile(file);
            }}
          />
          <div>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || saving}
              onClick={() => picker.current?.click()}
            >
              <UploadSimple className="size-4" /> Lire un fichier local
            </Button>
          </div>
          {reading && (
            <ChatMessage>
              <div className="space-y-3">
                <p className="font-medium">{reading.name}</p>
                <p className="text-xs text-muted-foreground">
                  Le texte reconnu reste modifiable. Vérifiez les noms, valeurs
                  et unités sur l’original.
                </p>
                {reading.pages.map((page) => (
                  <Field key={page.number}>
                    <FieldLabel htmlFor={id + "-page-" + page.number}>
                      Page {page.number}
                      {page.method === "ocr"
                        ? " · Texte reconnu sur l’image"
                        : ""}
                    </FieldLabel>
                    <Textarea
                      id={id + "-page-" + page.number}
                      aria-label={"Texte de la page " + page.number}
                      disabled={busy || saving}
                      className="min-h-32 text-sm"
                      value={page.text}
                      maxLength={MAX_DOCUMENT_CHARACTERS}
                      onChange={(event) => {
                        setReading((previous) =>
                          previous
                            ? {
                                ...previous,
                                pages: previous.pages.map((entry) =>
                                  entry.number === page.number
                                    ? { ...entry, text: event.target.value }
                                    : entry
                                ),
                              }
                            : null
                        );
                        setAnswer(null);
                        setAskedQuestion("");
                        setDraft(null);
                        resetReview();
                      }}
                    />
                  </Field>
                ))}
              </div>
            </ChatMessage>
          )}
          {reading && (
            <FieldGroup className="gap-3">
              <Field>
                <FieldLabel htmlFor={id + "-question"}>
                  Votre question
                </FieldLabel>
                <Input
                  id={id + "-question"}
                  value={question}
                  maxLength={500}
                  disabled={busy || saving}
                  onChange={(event) => setQuestion(event.target.value)}
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={
                    busy || saving || !question.trim() || !models.generatorReady
                  }
                  onClick={() => void ask()}
                >
                  Rechercher les passages
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || saving}
                  onClick={reviewReading}
                >
                  Relire le texte pour l’enregistrer
                </Button>
                {!models.generatorReady && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy || importing}
                    onClick={() => void install()}
                  >
                    {importing
                      ? "Installation…"
                      : "Installer la lecture assistée"}
                  </Button>
                )}
              </div>
            </FieldGroup>
          )}
          {askedQuestion && <ChatMessage user>{askedQuestion}</ChatMessage>}
          {answer && (
            <ChatMessage>
              <div className="space-y-3">
                {partial && (
                  <p className="text-xs text-muted-foreground">
                    La recherche porte sur les passages les plus pertinents. Le
                    texte complet reste disponible au-dessus.
                  </p>
                )}
                {answer.extraits.map((quote, index) => (
                  <blockquote
                    key={quote.page + ":" + index}
                    className="rounded-lg bg-muted p-3"
                  >
                    <p className="whitespace-pre-wrap text-sm">{quote.texte}</p>
                    <cite className="mt-2 block text-xs not-italic text-muted-foreground">
                      {reading?.name} · page {quote.page}
                    </cite>
                  </blockquote>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={reviewReading}
                  disabled={busy || saving}
                >
                  Préparer une note de lecture
                </Button>
              </div>
            </ChatMessage>
          )}
        </>
      )}
      {busy && (
        <Collapsible className="rounded-lg border border-border">
          <CollapsibleTrigger className="flex w-full items-center gap-2 p-3 text-left">
            <Marker render={<span />} role="status" aria-live="polite">
              <MarkerIcon>
                <CircleNotch className="animate-spin motion-reduce:animate-none" />
              </MarkerIcon>
              <MarkerContent>{progress.message}</MarkerContent>
            </Marker>
            <ChevronDown className="size-3.5" />
            <span className="sr-only">Afficher les étapes de lecture</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-3 text-xs text-muted-foreground">
            {progress.page && <p>Page {progress.page}</p>}
            {typeof characters === "number" ? (
              <p>{characters.toLocaleString("fr-FR")} caractères préparés</p>
            ) : typeof progress.progress === "number" ? (
              <p>{Math.round(progress.progress * 100)} % de cette étape</p>
            ) : (
              <p>Chargement puis lecture des passages du document.</p>
            )}
          </CollapsibleContent>
          <Button
            size="sm"
            variant="ghost"
            className="mx-2 mb-2"
            onClick={() => controller.current?.abort()}
          >
            Annuler la lecture
          </Button>
        </Collapsible>
      )}
      {draft && (
        <ChatMessage>
          <div className="space-y-4">
            <p className="font-medium">Document à relire</p>
            <FieldGroup className="gap-3">
              <Field>
                <FieldLabel htmlFor={id + "-title"}>
                  Titre du document
                </FieldLabel>
                <Input
                  id={id + "-title"}
                  value={draft.title}
                  disabled={saving}
                  maxLength={180}
                  onChange={(event) => {
                    setDraft({ ...draft, title: event.target.value });
                    resetReview();
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={id + "-draft"}>
                  Texte du document
                </FieldLabel>
                <Textarea
                  id={id + "-draft"}
                  value={draft.text}
                  disabled={saving}
                  maxLength={60000}
                  className="min-h-72 text-sm"
                  onChange={(event) => {
                    setDraft({ ...draft, text: event.target.value });
                    resetReview();
                  }}
                />
              </Field>
            </FieldGroup>
            {changedSource && (
              <p role="alert" className="text-sm text-destructive">
                La note source a changé. Validez-la puis préparez à nouveau le
                document.
              </p>
            )}
            <div className="flex items-start gap-2">
              <Checkbox
                id={id + "-review"}
                checked={reviewed}
                disabled={saving || saved}
                onCheckedChange={(value) => setReviewed(value === true)}
              />
              <label htmlFor={id + "-review"} className="text-xs leading-5">
                J’ai vérifié le patient et relu le document, y compris les
                valeurs, unités et traitements.
              </label>
            </div>
            {!saved ? (
              <Button
                size="sm"
                disabled={
                  !reviewed ||
                  !draft.text.trim() ||
                  !draft.title.trim() ||
                  saving ||
                  busy ||
                  changedSource ||
                  unavailable ||
                  !appointment
                }
                onClick={() => void save()}
              >
                {saving
                  ? "Enregistrement…"
                  : "Valider et enregistrer le document"}
              </Button>
            ) : (
              <div className="space-y-2">
                <p role="status" className="flex items-center gap-2 text-sm">
                  <Check className="size-4" /> Enregistré dans Documents et le
                  dossier de {patient?.name}.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void exportClinicalDocument(draft.title, draft.text).catch(
                      () => toast.error("Le PDF n’a pas pu être exporté.")
                    )
                  }
                >
                  <FileText className="size-4" /> Exporter le PDF validé
                </Button>
              </div>
            )}
          </div>
        </ChatMessage>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
