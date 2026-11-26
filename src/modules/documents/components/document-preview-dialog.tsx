import {
  Check,
  Download,
  History,
  Pencil,
  Printer,
  Save,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { isTauriRuntime } from "@/services/browser-store";
import {
  DOCUMENT_STATUS_LABELS,
  type DocumentEvent,
  type PatientDocument,
} from "../document-domain";
import { documentsService } from "../document-service";
import {
  exportManagedDocument,
  patientDocumentPdf,
  printManagedDocument,
} from "../lib/managed-document-pdf";
import { DocumentPaperPreview } from "./document-paper-preview";
import "./document-preview.css";
import { guard } from "@/lib/guard";

const loadTauriAppsPluginDialog = () => import("@tauri-apps/plugin-dialog");
const loadTauriAppsPluginFs = () => import("@tauri-apps/plugin-fs");

const eventLabels: Record<string, string> = {
  creation: "Création",
  modification: "Modification",
  finalisation: "Finalisation",
  annulation: "Annulation",
  nouvelle_version: "Nouvelle version",
  import: "Import d’une pièce",
};

function documentStatusNotice(document: PatientDocument) {
  switch (document.status) {
    case "annule":
      return (
        <p className="text-destructive text-sm">
          Document annulé : {document.cancellationReason}
        </p>
      );
    case "brouillon":
      return (
        <p className="text-muted-foreground text-sm">
          Relisez l’aperçu avant de finaliser. Le brouillon ne peut pas être
          imprimé ni exporté.
        </p>
      );
    default:
      return (
        <p className="text-muted-foreground text-sm">
          Document finalisé le{" "}
          {new Date(
            document.finalizedAt || document.createdAt
          ).toLocaleDateString("fr-FR")}
          . Son contenu est conservé.
        </p>
      );
  }
}

export function DocumentPreviewDialog({
  documentId,
  onClose,
  onChanged,
}: {
  documentId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const { currentUser } = useAuth();
  const [document, setDocument] = useState<PatientDocument | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [pdf, setPdf] = useState<{ dataUrl: string; version: string } | null>(
    null
  );
  const [events, setEvents] = useState<DocumentEvent[] | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  // Un autre document demandé : l'écran repart de zéro dès ce rendu (corrigé au rendu, sans effet).
  const [seenDocumentId, setSeenDocumentId] = useState(documentId);
  if (seenDocumentId !== documentId) {
    setSeenDocumentId(documentId);
    setDocument(null);
    setError("");
    setEditing(false);
    setReviewed(false);
    setEvents(null);
    setReason(null);
  }
  useEffect(() => {
    let active = true;
    if (documentId) {
      void documentsService
        .get(documentId)
        .then((value) => {
          if (active) {
            setDocument(value);
            setTitle(value.title);
            setText(value.content);
          }
        })
        .catch((cause) => {
          if (active) {
            setError(cause.message);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [documentId]);
  // Le PDF d'un autre document n'est jamais montré : il est retiré dès ce rendu.
  const [seenDocument, setSeenDocument] = useState(document);
  if (seenDocument !== document) {
    setSeenDocument(document);
    setPdf(null);
  }
  useEffect(() => {
    let active = true;
    if (document) {
      void patientDocumentPdf(document)
        .then((dataUrl) => {
          if (active) {
            setPdf({ dataUrl, version: document.updatedAt });
          }
        })
        .catch((cause) => {
          if (active) {
            setError(cause.message);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [document]);
  async function perform(action: () => Promise<void>) {
    if (busy) {
      return;
    }
    setBusy(true);
    setError("");
    await guard(
      async () => {
        await action();
      },
      {
        recover: (cause) => {
          setError(
            cause instanceof Error
              ? cause.message
              : "L’action n’a pas pu aboutir. Réessayez."
          );
        },
        cleanup: () => {
          setBusy(false);
        },
      }
    );
  }
  const author = currentUser?.id ?? "";
  async function downloadOriginal() {
    if (!document?.attachment) {
      return;
    }
    const file = document.attachment;
    const data = Uint8Array.from(atob(file.dataUrl.split(",")[1]), (char) =>
      char.charCodeAt(0)
    );
    if (isTauriRuntime()) {
      const { save } = await loadTauriAppsPluginDialog();
      const path = await save({
        title: "Enregistrer la pièce jointe",
        defaultPath: file.name,
      });
      if (!path) {
        return;
      }
      const { writeFile } = await loadTauriAppsPluginFs();
      await writeFile(path, data);
    } else {
      const url = URL.createObjectURL(
        new Blob([data.buffer], { type: file.mimeType })
      );
      const link = window.document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    }
    toast.success("Pièce jointe enregistrée.");
  }
  return (
    <Dialog
      onOpenChange={(open) => {
        if (!(open || busy)) {
          onClose();
        }
      }}
      open={!!documentId}
    >
      <DialogContent
        className="document-preview-dialog"
        showCloseButton={false}
      >
        <header className="document-preview-header">
          <div className="min-w-0 space-y-1">
            <DialogTitle>{document?.title || "Aperçu du document"}</DialogTitle>
            <DialogDescription>
              {document
                ? `${document.patientName} · ${document.authorName} · ${DOCUMENT_STATUS_LABELS[document.status]}`
                : "Chargement du dossier…"}
            </DialogDescription>
          </div>
          <Button
            aria-label="Fermer l’aperçu"
            disabled={busy}
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <X strokeWidth={1} />
          </Button>
        </header>
        {error && (
          <p
            className="mx-5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-destructive text-sm"
            role="alert"
          >
            {error}
          </p>
        )}
        {document && (
          <div className="document-preview-body">
            <aside className="document-preview-tools">
              {documentStatusNotice(document)}
              {document.status === "brouillon" &&
                (editing ? (
                  <div className="space-y-3">
                    <label className="block space-y-1 text-sm">
                      Titre
                      <Input
                        maxLength={160}
                        onChange={(event) => setTitle(event.target.value)}
                        value={title}
                      />
                    </label>
                    <label className="block space-y-1 text-sm">
                      Contenu
                      <Textarea
                        className="document-content-editor"
                        maxLength={60_000}
                        onChange={(event) => setText(event.target.value)}
                        value={text}
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={busy || !title.trim() || !text.trim()}
                        onClick={() =>
                          void perform(async () => {
                            const row = await documentsService.updateDraft(
                              document.id,
                              { title, content: text },
                              author,
                              document.updatedAt
                            );
                            setDocument(row);
                            setEditing(false);
                            setReviewed(false);
                            onChanged?.();
                          })
                        }
                      >
                        <Save strokeWidth={1} /> Enregistrer
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() => {
                          setTitle(document.title);
                          setText(document.content);
                          setEditing(false);
                        }}
                        variant="outline"
                      >
                        Abandonner
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Button
                      disabled={busy}
                      onClick={() => setEditing(true)}
                      variant="outline"
                    >
                      <Pencil strokeWidth={1} /> Modifier le brouillon
                    </Button>
                    <label className="flex items-start gap-3 text-sm leading-6">
                      <Checkbox
                        checked={reviewed}
                        className="mt-1"
                        onCheckedChange={(value) => setReviewed(value === true)}
                      />
                      J’ai relu le document et je valide son contenu.
                    </label>
                    <Button
                      disabled={
                        busy ||
                        !reviewed ||
                        !pdf ||
                        pdf.version !== document.updatedAt
                      }
                      onClick={() => {
                        if (!pdf) {
                          return;
                        }
                        void perform(async () => {
                          const row = await documentsService.finalize(
                            document.id,
                            author,
                            pdf.dataUrl,
                            reviewed,
                            document.updatedAt
                          );
                          setDocument(row);
                          setReviewed(false);
                          onChanged?.();
                          toast.success("Document finalisé.");
                        });
                      }}
                    >
                      <Check strokeWidth={1} /> Finaliser
                    </Button>
                  </>
                ))}
              {document.status === "finalise" && (
                <>
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void perform(async () => {
                        await printManagedDocument(document);
                      })
                    }
                  >
                    <Printer strokeWidth={1} /> Imprimer
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void perform(async () => {
                        if (await exportManagedDocument(document)) {
                          toast.success("PDF enregistré.");
                        }
                      })
                    }
                    variant="outline"
                  >
                    <Download strokeWidth={1} /> Exporter en PDF
                  </Button>
                  {!document.attachment && (
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void perform(async () => {
                          const row = await documentsService.newVersion(
                            document.id,
                            author
                          );
                          setDocument(row);
                          setTitle(row.title);
                          setText(row.content);
                          setEditing(true);
                          setReviewed(false);
                          setEvents(null);
                          onChanged?.();
                        })
                      }
                      variant="outline"
                    >
                      <Pencil strokeWidth={1} /> Nouvelle version
                    </Button>
                  )}
                </>
              )}
              {document.attachment && (
                <Button
                  disabled={busy}
                  onClick={() => void perform(downloadOriginal)}
                  variant="outline"
                >
                  <Download strokeWidth={1} /> Télécharger l’original
                </Button>
              )}
              {document.attachment?.textState === "scan" && (
                <p className="text-muted-foreground text-sm">
                  PDF scanné : aucun texte extractible. L’assistant ne peut pas
                  citer son contenu sans reconnaissance locale explicite.
                </p>
              )}
              <div className="space-y-3 border-border border-t pt-4">
                <Button
                  disabled={busy}
                  onClick={() =>
                    void perform(async () => {
                      setEvents(
                        events
                          ? null
                          : await documentsService.history(document.id)
                      );
                    })
                  }
                  variant="ghost"
                >
                  <History strokeWidth={1} /> Historique
                </Button>
                {events && (
                  <ol className="document-event-list">
                    {events.map((entry) => (
                      <li key={entry.id}>
                        <span>
                          {eventLabels[entry.action] || "Événement du document"}
                        </span>
                        <small>
                          {entry.authorName} ·{" "}
                          {new Date(entry.createdAt).toLocaleString("fr-FR")}
                        </small>
                        {entry.reason && <p>{entry.reason}</p>}
                      </li>
                    ))}
                  </ol>
                )}
                {document.status !== "annule" &&
                  (reason === null ? (
                    <Button
                      disabled={busy}
                      onClick={() => setReason("")}
                      variant="ghost"
                    >
                      Annuler le document
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-sm">
                        Motif de l’annulation
                        <Textarea
                          maxLength={1000}
                          onChange={(event) => setReason(event.target.value)}
                          value={reason}
                        />
                      </label>
                      <Button
                        disabled={busy || !reason.trim()}
                        onClick={() =>
                          void perform(async () => {
                            await documentsService.cancel(
                              document.id,
                              reason,
                              author
                            );
                            setDocument(
                              await documentsService.get(document.id)
                            );
                            setReason(null);
                            setEvents(null);
                            onChanged?.();
                          })
                        }
                        variant="destructive"
                      >
                        Confirmer l’annulation
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() => setReason(null)}
                        variant="ghost"
                      >
                        Conserver
                      </Button>
                    </div>
                  ))}
              </div>
              {busy && (
                <p className="text-muted-foreground text-sm" role="status">
                  En cours…
                </p>
              )}
            </aside>
            <DocumentPaperPreview dataUrl={pdf?.dataUrl ?? null} />
          </div>
        )}
        {!(document || error) && (
          <p className="p-6 text-muted-foreground text-sm" role="status">
            Chargement du document…
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
