import { FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  CERTIFICATE_TYPES,
  DOCUMENT_TYPES,
  type DocumentKind,
  type DocumentPreparation,
} from "../document-domain";
import { documentsService } from "../document-service";
import { useManagedTemplates } from "../hooks/use-managed-documents";
import { buildManagedDocumentPdf } from "../lib/managed-document-pdf";
import { DocumentPaperPreview } from "./document-paper-preview";
import { DocumentPreviewDialog } from "./document-preview-dialog";
import "./document-preview.css";
import { guard } from "@/lib/guard";

export function DocumentComposer({
  open,
  patientId,
  consultationId,
  onClose,
  onCreated,
}: {
  open: boolean;
  patientId: string;
  consultationId: string;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const { currentUser } = useAuth();
  const {
    templates,
    loading,
    error: templatesError,
    refresh,
  } = useManagedTemplates();
  const [kind, setKind] = useState<DocumentKind>("prescription");
  const [templateId, setTemplateId] = useState("");
  const [certificateType, setCertificateType] = useState<string>(
    CERTIFICATE_TYPES[0]
  );
  const [recipient, setRecipient] = useState("");
  const [referralReason, setReferralReason] = useState("");
  const [preparation, setPreparation] = useState<DocumentPreparation | null>(
    null
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pdf, setPdf] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const choices = useMemo(
    () =>
      templates.filter((template) => template.active && template.kind === kind),
    [templates, kind]
  );
  const chosenId = choices.some((template) => template.id === templateId)
    ? templateId
    : (choices[0]?.id ?? "");
  // À chaque ouverture, ou pour un autre patient / une autre consultation : on repart de zéro (corrigé au rendu, sans effet).
  const [seenOpening, setSeenOpening] = useState<{
    open: boolean;
    patientId: typeof patientId;
    consultationId: typeof consultationId;
  } | null>(null);
  if (
    !seenOpening ||
    seenOpening.open !== open ||
    seenOpening.patientId !== patientId ||
    seenOpening.consultationId !== consultationId
  ) {
    setSeenOpening({ open, patientId, consultationId });
    if (open) {
      setPreparation(null);
      setCreatedId(null);
      setReviewed(false);
      setError("");
    }
  }
  // Dès que la préparation, le titre ou le texte changent, l'ancien PDF est retiré (corrigé au rendu, sans effet).
  const [pdfFor, setPdfFor] = useState({ preparation, title, content });
  if (
    pdfFor.preparation !== preparation ||
    pdfFor.title !== title ||
    pdfFor.content !== content
  ) {
    setPdfFor({ preparation, title, content });
    setPdf(null);
  }
  useEffect(() => {
    let active = true;
    if (!preparation) {
      return;
    }
    const timer = setTimeout(() => {
      void buildManagedDocumentPdf({
        title,
        content,
        clinic: preparation.clinic,
        patientReference: preparation.values["patient.reference"] || undefined,
      })
        .then((document) => {
          if (active) {
            setPdf(document.output("datauristring"));
          }
        })
        .catch((cause) => {
          if (active) {
            setError(cause.message);
          }
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [preparation, title, content]);
  async function perform(operation: () => Promise<void>) {
    if (busy) {
      return;
    }
    setBusy(true);
    setError("");
    await guard(
      async () => {
        await operation();
      },
      {
        recover: (cause) => {
          setError(
            cause instanceof Error
              ? cause.message
              : "Le document n’a pas pu être préparé."
          );
        },
        cleanup: () => {
          setBusy(false);
        },
      }
    );
  }
  return (
    <>
      <Dialog
        onOpenChange={(value) => {
          if (!(value || busy)) {
            onClose();
          }
        }}
        open={open && !createdId}
      >
        <DialogContent className="document-composer-dialog">
          <DialogHeader icon={<FileText strokeWidth={1.5} />}>
            <DialogTitle>Générer un document</DialogTitle>
            <DialogDescription>
              Depuis la note clinique validée. Relisez et ajustez le contenu
              avant de l’enregistrer.
            </DialogDescription>
          </DialogHeader>
          {(error || templatesError) && (
            <div
              className="mx-6 mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-destructive text-sm"
              role="alert"
            >
              {error || String(templatesError)}
              {templatesError && (
                <Button onClick={() => void refresh()} variant="ghost">
                  Réessayer
                </Button>
              )}
            </div>
          )}
          {preparation ? (
            <>
              <div className="document-preview-body">
                <div className="document-preview-tools">
                  <label className="space-y-1 text-sm">
                    Titre
                    <Input
                      maxLength={160}
                      onChange={(event) => {
                        setTitle(event.target.value);
                        setReviewed(false);
                      }}
                      value={title}
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    Texte du document
                    <Textarea
                      className="document-content-editor"
                      maxLength={60_000}
                      onChange={(event) => {
                        setContent(event.target.value);
                        setReviewed(false);
                      }}
                      value={content}
                    />
                  </label>
                  <p className="text-muted-foreground text-xs leading-5">
                    Les mentions [à compléter] signalent une donnée absente.
                    Aucune information clinique n’est ajoutée automatiquement.
                  </p>
                  <Button
                    disabled={busy}
                    onClick={() => {
                      setPreparation(null);
                      setReviewed(false);
                    }}
                    variant="outline"
                  >
                    Changer de modèle
                  </Button>
                </div>
                <DocumentPaperPreview dataUrl={pdf} />
              </div>
              <DialogFooter>
                <label data-footer="meta">
                  <Checkbox
                    checked={reviewed}
                    onCheckedChange={(value) => setReviewed(value === true)}
                  />
                  J’ai relu ce document et je confirme son enregistrement.
                </label>
                <Button disabled={busy} onClick={onClose} variant="outline">
                  Fermer
                </Button>
                <Button
                  disabled={
                    busy ||
                    !reviewed ||
                    !title.trim() ||
                    !content.trim() ||
                    !pdf
                  }
                  onClick={() =>
                    void perform(async () => {
                      const document = await documentsService.createDraft(
                        preparation,
                        { title, content },
                        currentUser?.id ?? "",
                        reviewed
                      );
                      setCreatedId(document.id);
                      onCreated?.();
                    })
                  }
                >
                  <FileText strokeWidth={1} /> Enregistrer le brouillon
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="document-composer-form">
                <div className="document-composer-grid">
                  <label>
                    Type de document
                    <NativeSelect
                      className="w-full"
                      onChange={(event) => {
                        setKind(event.target.value as DocumentKind);
                        setTemplateId("");
                      }}
                      value={kind}
                    >
                      {Object.entries(DOCUMENT_TYPES).map(([id, label]) => (
                        <NativeSelectOption key={id} value={id}>
                          {label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </label>
                  <label>
                    Modèle
                    <NativeSelect
                      className="w-full"
                      disabled={loading || !choices.length}
                      onChange={(event) => setTemplateId(event.target.value)}
                      value={chosenId}
                    >
                      {!choices.length && (
                        <NativeSelectOption value="">
                          Aucun modèle actif
                        </NativeSelectOption>
                      )}
                      {choices.map((template) => (
                        <NativeSelectOption
                          key={template.id}
                          value={template.id}
                        >
                          {template.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </label>
                </div>
                {kind === "certificate" && (
                  <label>
                    Objet du certificat
                    <NativeSelect
                      className="w-full"
                      onChange={(event) =>
                        setCertificateType(event.target.value)
                      }
                      value={certificateType}
                    >
                      {CERTIFICATE_TYPES.map((type) => (
                        <NativeSelectOption key={type} value={type}>
                          {type}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <span className="text-muted-foreground text-xs">
                      L’objet ne constitue pas une attestation. Vérifiez les
                      observations et complétez la portée du certificat.
                    </span>
                  </label>
                )}
                {kind === "referral" && (
                  <div className="document-composer-grid">
                    <label>
                      Confrère ou spécialiste destinataire
                      <Textarea
                        maxLength={1500}
                        onChange={(event) => setRecipient(event.target.value)}
                        placeholder="Nom, établissement et coordonnées"
                        value={recipient}
                      />
                    </label>
                    <label>
                      Motif de référence
                      <Textarea
                        maxLength={3000}
                        onChange={(event) =>
                          setReferralReason(event.target.value)
                        }
                        placeholder="Indiquez le motif du courrier"
                        value={referralReason}
                      />
                    </label>
                  </div>
                )}
                <p className="text-muted-foreground text-sm">
                  Le patient, la consultation, le clinicien et la note validée
                  seront repris. Le document reste indépendant du modèle et de
                  la note source.
                </p>
                {loading && (
                  <p className="text-muted-foreground text-sm" role="status">
                    Chargement des modèles…
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button disabled={busy} onClick={onClose} variant="outline">
                  Fermer
                </Button>
                <Button
                  disabled={busy || loading || !chosenId || !consultationId}
                  onClick={() =>
                    void perform(async () => {
                      const prepared = await documentsService.prepare(
                        consultationId,
                        patientId,
                        chosenId,
                        currentUser?.id ?? "",
                        { certificateType, recipient, referralReason }
                      );
                      setPreparation(prepared);
                      setTitle(prepared.title);
                      setContent(prepared.content);
                      setReviewed(false);
                    })
                  }
                >
                  <FileText strokeWidth={1} />{" "}
                  {busy ? "Préparation…" : "Préparer l’aperçu"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      <DocumentPreviewDialog
        documentId={createdId}
        onChanged={onCreated}
        onClose={() => {
          setCreatedId(null);
          onClose();
        }}
      />
    </>
  );
}
