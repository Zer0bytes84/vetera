import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Message, MessageContent } from "@/components/ui/message";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Segmented } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useSQLite } from "@/hooks/useSQLite";
import { guard, guardSync } from "@/lib/guard";
import {
  Check,
  ChevronDown,
  CircleNotch,
  FileText,
  UploadSimple,
  X,
} from "@/lib/icons";
import {
  EMPTY_MODEL_STATUS,
  getLocalModels,
  importLocalModel,
  type LocalModelStatus,
} from "@/modules/consultations/local-ai/models";
import {
  isSoapReviewed,
  soapSourceKey,
} from "@/modules/consultations/local-ai/soap-review";
import type {
  Appointment,
  ConsultationDocument,
  ConsultationSoap,
  Note,
  Owner,
  Patient,
} from "@/types/db";
import type { PatientDocument } from "../document-domain";
import { useDocumentTemplates } from "../hooks/use-document-templates";
import { usePatientDocuments } from "../hooks/use-managed-documents";
import { exportClinicalDocument } from "../lib/document-pdf";
import {
  assertReadableFile,
  type DocumentAnswer,
  MAX_DOCUMENT_CHARACTERS,
  type ReadDocument,
} from "../lib/document-reading";
import { renderClinicalDocument } from "../lib/document-templates";
import {
  attachmentFile,
  readPatientDocument,
} from "../lib/patient-document-reading";
import { readDocumentAnswer } from "../lib/read-document-answer";
import {
  type ReadingProgress,
  readLocalDocument,
} from "../lib/read-local-document";
import {
  type ReviewedDocumentInput,
  saveReviewedDocument,
} from "../lib/save-reviewed-document";

const BASE64_DATA_URL = /^data:([^;,]+);base64,([\s\S]+)$/;

type Draft = Pick<ReviewedDocumentInput, "title" | "text" | "source">;
function fileFromAttachment(document: ConsultationDocument): File {
  const match = BASE64_DATA_URL.exec(document.dataUrl);
  if (!match || match[1] !== document.mimeType) {
    throw new Error("Ce fichier local est invalide.");
  }
  const binary = atob(match[2]);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new File([bytes], document.fileName, { type: document.mimeType });
}
function noteText(note: Note): string {
  const parsed = new DOMParser().parseFromString(note.content, "text/html");
  for (const element of parsed.querySelectorAll(
    "script,style,iframe,object,link"
  )) {
    element.remove();
  }
  for (const element of parsed.querySelectorAll("p,h1,h2,h3,li,br")) {
    element.append("\n");
  }
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
          className="w-full max-w-full"
          variant={user ? "secondary" : "ghost"}
        >
          <BubbleContent>{children}</BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}

function textStateSuffix(
  textState: "extractible" | "scan" | "image" | undefined
): string {
  switch (textState) {
    case "scan":
      return " · PDF numérisé";
    case "image":
      return " · Image";
    default:
      return "";
  }
}

export default function ConsultationDocumentsAssistant({
  appointmentId,
  patientId,
  onClose,
  initialMode = "generate",
  initialDocument,
  initialNoteId,
}: {
  appointmentId: string;
  patientId: string;
  onClose?: () => void;
  initialMode?: "generate" | "read";
  initialDocument?: PatientDocument;
  /** A note to load as the source to read: one of this patient, or one not yet linked to a patient. */
  initialNoteId?: string;
}) {
  const { currentUser } = useAuth();
  const patients = useSQLite<Patient>("patients");
  const owners = useSQLite<Owner>("owners");
  const appointments = useSQLite<Appointment>("appointments");
  const soaps = useSQLite<ConsultationSoap>("consultation_soaps");
  const files = useSQLite<ConsultationDocument>("consultation_documents");
  const notes = useSQLite<Note>("notes");
  const templates = useDocumentTemplates();
  const managedDocuments = usePatientDocuments(patientId);
  const patient = patients.data.find((entry) => entry.id === patientId);
  const appointment = appointments.data.find(
    (entry) => entry.id === appointmentId && entry.patientId === patientId
  );
  const soap = soaps.data.find(
    (entry) =>
      entry.appointmentId === appointmentId && entry.patientId === patientId
  );
  const owner = owners.data.find((entry) => entry.id === patient?.ownerId);
  const [mode, setMode] = useState<"generate" | "read">(initialMode);
  const [templateId, setTemplateId] = useState("document-report");
  const [models, setModels] = useState<LocalModelStatus>(EMPTY_MODEL_STATUS);
  const [reading, setReading] = useState<ReadDocument | null>(null);
  const [selectedManagedId, setSelectedManagedId] = useState(
    initialDocument?.id ?? ""
  );
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
    if (!initialDocument) {
      return;
    }
    let active = true;
    void readPatientDocument(initialDocument, { patientId })
      .then((source) => {
        if (active) {
          setReading(source);
        }
      })
      .catch((failure) => {
        if (active) {
          setError((failure as Error).message);
        }
      });
    return () => {
      active = false;
    };
  }, [initialDocument, patientId]);
  useEffect(() => {
    let active = true;
    void getLocalModels()
      .then((status) => {
        if (active) {
          setModels(status);
        }
      })
      .catch(() => {
        if (active) {
          setError(
            (previous) =>
              previous ||
              "L’installation de l’assistant n’a pas pu être vérifiée."
          );
        }
      });
    return () => {
      active = false;
      controller.current?.abort();
    };
  }, []);
  const readNote = (note: Note) => {
    const text = noteText(note);
    if (!text || text.length > MAX_DOCUMENT_CHARACTERS) {
      setError("La note est vide ou trop longue pour être lue.");
      return;
    }
    setReading({
      name: note.title || "Note sans titre",
      sourceId: note.id,
      pages: [{ number: 1, text, method: "text" }],
    });
  };
  // The note the user came from is offered even before it is linked to this patient.
  const offered = (note: Note) =>
    note.patientId === patientId ||
    (note.id === initialNoteId && !note.patientId);
  const initialNote = initialNoteId
    ? notes.data.find((entry) => entry.id === initialNoteId && offered(entry))
    : undefined;
  // La note d'origine est lue une seule fois, dès le rendu où elle est disponible (corrigé au rendu, sans effet).
  const [initialNoteLoaded, setInitialNoteLoaded] = useState(false);
  if (initialNote && !initialNoteLoaded) {
    setInitialNoteLoaded(true);
    readNote(initialNote);
  }
  const resetReview = () => {
    setReviewed(false);
    setSaved(false);
  };
  const switchMode = (next: "generate" | "read") => {
    if (busy || saving) {
      return;
    }
    setMode(next);
    setDraft(null);
    setAskedQuestion("");
    resetReview();
    setError("");
  };
  const ready = !!soap && isSoapReviewed(soap) && !!patient && !!appointment;
  const changedSource =
    draft?.source.type === "soap" &&
    (!(soap && isSoapReviewed(soap)) ||
      soapSourceKey(soap) !== draft.source.sourceKey);
  const unavailable = !!(
    patients.error ||
    appointments.error ||
    soaps.error ||
    templates.error ||
    files.error ||
    notes.error ||
    managedDocuments.error
  );
  const createDraft = () => {
    if (!(ready && patient && appointment && soap)) {
      return;
    }
    guardSync(
      () => {
        const template = templates.templates.find(
          (entry) => entry.id === templateId
        );
        if (!template) {
          throw new Error("Choisissez un modèle disponible.");
        }
        const text = renderClinicalDocument(template, {
          patient,
          owner,
          appointment,
          soap,
          vetName: currentUser?.displayName ?? "",
        });
        setDraft({
          title: `${template.name} · ${patient.name}`,
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
      },
      {
        recover: (failure) => {
          setError((failure as Error).message);
        },
      }
    );
  };
  const readFile = async (file: File, sourceId?: string) => {
    if (controller.current || saving) {
      return;
    }
    try {
      assertReadableFile(file);
    } catch (failure) {
      setError((failure as Error).message);
      return;
    }
    const task = new AbortController();
    controller.current = task;
    setBusy(true);
    setSelectedManagedId(sourceId ?? "");
    setError("");
    setReading(null);
    setAnswer(null);
    setAskedQuestion("");
    setDraft(null);
    resetReview();
    setCharacters(undefined);
    await guard(
      async () => {
        const source = await readLocalDocument(file, task.signal, (update) => {
          if (controller.current === task) {
            setProgress(update);
          }
        });
        if (!task.signal.aborted) {
          setReading({ ...source, sourceId });
        }
      },
      {
        recover: (failure) => {
          if (!task.signal.aborted) {
            setError((failure as Error).message);
          }
        },
        cleanup: () => {
          if (controller.current === task) {
            controller.current = null;
            setBusy(false);
          }
        },
      }
    );
  };
  const chooseExisting = (value: string) => {
    setError("");
    setAnswer(null);
    setAskedQuestion("");
    setDraft(null);
    resetReview();
    const managed = managedDocuments.documents.find(
      (entry) => entry.id === value && entry.patientId === patientId
    );
    setSelectedManagedId(managed?.id ?? "");
    if (managed) {
      setReading(null);
      void readPatientDocument(managed, { patientId })
        .then(setReading)
        .catch((failure) => setError((failure as Error).message));
      return;
    }
    const file = files.data.find(
      (entry) => entry.id === value && entry.patientId === patientId
    );
    const note = notes.data.find(
      (entry) => entry.id === value && offered(entry)
    );
    if (file) {
      try {
        void readFile(fileFromAttachment(file), file.id);
      } catch (failure) {
        setError((failure as Error).message);
      }
    } else if (note) {
      readNote(note);
    } else {
      setReading(null);
    }
  };
  const ask = async () => {
    if (!reading || controller.current || saving) {
      return;
    }
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
    await guard(
      async () => {
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
      },
      {
        recover: (failure) => {
          if (!task.signal.aborted) {
            setError((failure as Error).message);
          }
        },
        cleanup: () => {
          if (controller.current === task) {
            controller.current = null;
            setBusy(false);
          }
        },
      }
    );
  };
  const reviewReading = () => {
    if (!reading) {
      return;
    }
    const text = answer
      ? answer.extraits
          .map((quote) => `Page ${quote.page}\n${quote.texte}`)
          .join("\n\n")
      : reading.pages
          .map((page) => `Page ${page.number}\n${page.text}`)
          .join("\n\n");
    setDraft({
      title: `Lecture · ${reading.name}`,
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
    if (!(draft && reviewed) || savingRef.current || busy) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    await guard(
      async () => {
        await saveReviewedDocument({
          ...draft,
          patientId,
          appointmentId,
          userId: currentUser?.uid ?? "",
          reviewed,
        });
        setSaved(true);
        toast.success("Document validé et enregistré dans le dossier patient.");
      },
      {
        recover: (failure) => {
          setError((failure as Error).message);
        },
        cleanup: () => {
          savingRef.current = false;
          setSaving(false);
        },
      }
    );
  };
  const install = async () => {
    if (importing || busy) {
      return;
    }
    setImporting(true);
    setError("");
    await guard(
      async () => {
        const status = await importLocalModel("generator");
        if (status) {
          setModels(status);
        }
      },
      {
        recover: (failure) => {
          setError((failure as Error).message);
        },
        cleanup: () => {
          setImporting(false);
        },
      }
    );
  };
  const availableFiles = files.data.filter(
    (entry) =>
      entry.patientId === patientId &&
      ["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(
        entry.mimeType
      )
  );
  const availableNotes = notes.data.filter(offered);
  const availableManaged = managedDocuments.documents.filter(
    (entry) => entry.patientId === patientId && entry.status === "finalise"
  );
  const selectedManaged = availableManaged.find(
    (entry) => entry.id === selectedManagedId
  );
  return (
    <section
      aria-label="Assistant documents de consultation"
      className="mx-auto flex w-full max-w-3xl flex-col gap-5 border-border border-t pt-5"
    >
      <header className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Documents de consultation</h3>
          <p className="mt-1 text-muted-foreground text-xs">
            {patient?.name ?? "Patient"} · Sur cet ordinateur
          </p>
        </div>
        {onClose && (
          <Button
            aria-label="Fermer les documents"
            disabled={saving}
            onClick={() => {
              controller.current?.abort();
              onClose();
            }}
            size="icon-sm"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        )}
      </header>
      <Segmented
        label="Parcours documents"
        onValueChange={(next) => switchMode(next)}
        options={[
          { value: "generate", label: "Créer un document" },
          { value: "read", label: "Lire un document" },
        ]}
        value={mode}
      />
      {unavailable && (
        <p className="text-destructive text-sm" role="alert">
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
            <p className="text-muted-foreground text-sm" role="status">
              {appointment
                ? "Validez d’abord la note de cette consultation. Une modification de la note demande une nouvelle validation."
                : "Choisissez une consultation pour créer un document à partir de sa note validée."}
            </p>
          )}
          <Field>
            <FieldLabel htmlFor={`${id}-template`}>
              Modèle de document
            </FieldLabel>
            <NativeSelect
              disabled={busy || saving}
              id={`${id}-template`}
              onChange={(event) => setTemplateId(event.target.value)}
              value={templateId}
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
              disabled={!ready || unavailable || templates.loading || saving}
              onClick={createDraft}
              size="sm"
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
            <FieldLabel htmlFor={`${id}-source`}>
              Document du dossier
            </FieldLabel>
            <NativeSelect
              disabled={busy || saving || unavailable}
              id={`${id}-source`}
              onChange={(event) => chooseExisting(event.target.value)}
              value={reading?.sourceId ?? selectedManagedId}
            >
              <NativeSelectOption value="">
                Choisir un document…
              </NativeSelectOption>
              {availableManaged.map((document) => (
                <NativeSelectOption key={document.id} value={document.id}>
                  {document.title}
                  {textStateSuffix(document.attachment?.textState)}
                </NativeSelectOption>
              ))}
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
            {selectedManaged?.attachment?.textState === "image" && !reading && (
              <Button
                className="mt-2 w-fit"
                disabled={busy || saving}
                onClick={() => {
                  const { attachment } = selectedManaged;
                  if (!attachment) {
                    return;
                  }
                  try {
                    void readFile(
                      attachmentFile(attachment),
                      selectedManaged.id
                    );
                  } catch (failure) {
                    setError((failure as Error).message);
                  }
                }}
                size="sm"
                variant="outline"
              >
                Reconnaître le texte de l’image
              </Button>
            )}
          </Field>
          <input
            accept=".pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                void readFile(file);
              }
            }}
            ref={picker}
            type="file"
          />
          <div>
            <Button
              disabled={busy || saving}
              onClick={() => picker.current?.click()}
              size="sm"
              variant="outline"
            >
              <UploadSimple className="size-4" /> Lire un fichier local
            </Button>
          </div>
          {reading && (
            <ChatMessage>
              <div className="space-y-3">
                <p className="font-medium">{reading.name}</p>
                <p className="text-muted-foreground text-xs">
                  Le texte reconnu reste modifiable. Vérifiez les noms, valeurs
                  et unités sur l’original.
                </p>
                {reading.pages.map((page) => (
                  <Field key={page.number}>
                    <FieldLabel htmlFor={`${id}-page-${page.number}`}>
                      Page {page.number}
                      {page.method === "ocr"
                        ? " · Texte reconnu sur l’image"
                        : ""}
                    </FieldLabel>
                    <Textarea
                      aria-label={`Texte de la page ${page.number}`}
                      className="min-h-32 text-sm"
                      disabled={busy || saving}
                      id={`${id}-page-${page.number}`}
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
                      value={page.text}
                    />
                  </Field>
                ))}
              </div>
            </ChatMessage>
          )}
          {reading && (
            <FieldGroup className="gap-3">
              <Field>
                <FieldLabel htmlFor={`${id}-question`}>
                  Votre question
                </FieldLabel>
                <Input
                  disabled={busy || saving}
                  id={`${id}-question`}
                  maxLength={500}
                  onChange={(event) => setQuestion(event.target.value)}
                  value={question}
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={
                    busy || saving || !question.trim() || !models.generatorReady
                  }
                  onClick={() => void ask()}
                  size="sm"
                >
                  Rechercher les passages
                </Button>
                <Button
                  disabled={busy || saving}
                  onClick={reviewReading}
                  size="sm"
                  variant="outline"
                >
                  Relire le texte pour l’enregistrer
                </Button>
                {!models.generatorReady && (
                  <Button
                    disabled={busy || importing}
                    onClick={() => void install()}
                    size="sm"
                    variant="ghost"
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
                  <p className="text-muted-foreground text-xs">
                    La recherche porte sur les passages les plus pertinents. Le
                    texte complet reste disponible au-dessus.
                  </p>
                )}
                {answer.extraits.map((quote, index) => (
                  <blockquote
                    className="rounded-lg bg-muted p-3"
                    // biome-ignore lint/suspicious/noArrayIndexKey: extraits d'une réponse remplacée en bloc à chaque question, jamais modifiés un par un
                    key={`${quote.page}:${index}`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{quote.texte}</p>
                    <cite className="mt-2 block text-muted-foreground text-xs not-italic">
                      {reading?.name} · page {quote.page}
                    </cite>
                  </blockquote>
                ))}
                <Button
                  disabled={busy || saving}
                  onClick={reviewReading}
                  size="sm"
                  variant="outline"
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
            <Marker aria-live="polite" render={<span />} role="status">
              <MarkerIcon>
                <CircleNotch className="animate-spin motion-reduce:animate-none" />
              </MarkerIcon>
              <MarkerContent>{progress.message}</MarkerContent>
            </Marker>
            <ChevronDown className="size-3.5" />
            <span className="sr-only">Afficher les étapes de lecture</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-3 text-muted-foreground text-xs">
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
            className="mx-2 mb-2"
            onClick={() => controller.current?.abort()}
            size="sm"
            variant="ghost"
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
                <FieldLabel htmlFor={`${id}-title`}>
                  Titre du document
                </FieldLabel>
                <Input
                  disabled={saving}
                  id={`${id}-title`}
                  maxLength={180}
                  onChange={(event) => {
                    setDraft({ ...draft, title: event.target.value });
                    resetReview();
                  }}
                  value={draft.title}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-draft`}>
                  Texte du document
                </FieldLabel>
                <Textarea
                  className="min-h-72 text-sm"
                  disabled={saving}
                  id={`${id}-draft`}
                  maxLength={60_000}
                  onChange={(event) => {
                    setDraft({ ...draft, text: event.target.value });
                    resetReview();
                  }}
                  value={draft.text}
                />
              </Field>
            </FieldGroup>
            {changedSource && (
              <p className="text-destructive text-sm" role="alert">
                La note source a changé. Validez-la puis préparez à nouveau le
                document.
              </p>
            )}
            <div className="flex items-start gap-2">
              <Checkbox
                checked={reviewed}
                disabled={saving || saved}
                id={`${id}-review`}
                onCheckedChange={(value) => setReviewed(value === true)}
              />
              <label className="text-xs leading-5" htmlFor={`${id}-review`}>
                J’ai vérifié le patient et relu le document, y compris les
                valeurs, unités et traitements.
              </label>
            </div>
            {!(appointment || saved) && (
              <p className="text-muted-foreground text-xs">
                Choisissez une consultation pour enregistrer ce document dans le
                dossier du patient.
              </p>
            )}
            {saved ? (
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm" role="status">
                  <Check className="size-4" /> Enregistré dans Documents et le
                  dossier de {patient?.name}.
                </p>
                <Button
                  onClick={() =>
                    void exportClinicalDocument(draft.title, draft.text).catch(
                      () => toast.error("Le PDF n’a pas pu être exporté.")
                    )
                  }
                  size="sm"
                  variant="outline"
                >
                  <FileText className="size-4" /> Exporter le PDF validé
                </Button>
              </div>
            ) : (
              <Button
                disabled={
                  !(reviewed && draft.text.trim() && draft.title.trim()) ||
                  saving ||
                  busy ||
                  changedSource ||
                  unavailable ||
                  !appointment
                }
                onClick={() => void save()}
                size="sm"
              >
                {saving
                  ? "Enregistrement…"
                  : "Valider et enregistrer le document"}
              </Button>
            )}
          </div>
        </ChatMessage>
      )}
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
