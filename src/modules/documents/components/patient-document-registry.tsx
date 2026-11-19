import { ErrorState } from "@/design-system/patterns/error-state";
import { useImperativeHandle, useRef, useState, type Ref } from "react";
import { FileText, Search, Upload, BookOpen, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPES,
  type PatientDocument,
} from "../document-domain";
import { documentsService } from "../document-service";
import { usePatientDocuments } from "../hooks/use-managed-documents";
import { preparePatientAttachment } from "../lib/patient-document-reading";
import {
  filterPatientDocuments,
  type DocumentFilters,
} from "../lib/filter-patient-documents";
import ConsultationDocumentsAssistant from "./consultation-documents-assistant";
import { DocumentPreviewDialog } from "./document-preview-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { guard } from "@/lib/guard";

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date non renseignée"
    : date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export function PatientDocumentRegistry({
  patientId,
  onUpload,
  uploadControl,
}: {
  patientId: string;
  onUpload?: () => void;
  uploadControl?: Ref<{ open: () => void }>;
}) {
  const { currentUser } = useAuth();
  const registry = usePatientDocuments(patientId);
  const picker = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState("");
  const [filters, setFilters] = useState<DocumentFilters>({
    search: "",
    kind: "",
    from: "",
    to: "",
  });
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [reader, setReader] = useState<{ document?: PatientDocument } | null>(
    null
  );
  const openImporter = () => {
    if (!importing) {
      if (onUpload) {
        onUpload();
      } else {
        picker.current?.click();
      }
    }
  };
  useImperativeHandle(uploadControl, () => ({ open: openImporter }));
  const visible = filterPatientDocuments(registry.documents, filters);
  const changeFilter = (key: keyof DocumentFilters, value: string) =>
    setFilters((previous) => ({ ...previous, [key]: value }));
  const importFile = async (file: File) => {
    if (!currentUser || importing) {
      return;
    }
    setImporting(true);
    setProgress("Préparation du fichier…");
    await guard(
      async () => {
        const attachment = await preparePatientAttachment(
          file,
          undefined,
          (event) => setProgress(event.message)
        );
        const document = await documentsService.importAttachment(
          patientId,
          attachment,
          currentUser.uid
        );
        await registry.refresh();
        toast.success("La pièce a été ajoutée au dossier du patient.");
        if (attachment.textState === "scan") {
          toast.info(
            "PDF numérisé : l’assistant ne dispose pas de texte extractible. La pièce reste consultable."
          );
        }
        setPreviewId(document.id);
      },
      {
        recover: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "La pièce n’a pas pu être importée. Réessayez."
          );
        },
        cleanup: () => {
          setImporting(false);
          setProgress("");
        },
      }
    );
  };
  return (
    <section aria-label="Documents du patient" className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-base font-medium">
            <FileText
              className="size-4 shrink-0 text-muted-foreground"
              strokeWidth={1}
            />
            Documents du patient
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Documents générés et pièces importées, conservés sur cet ordinateur.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setReader({})} size="sm" variant="outline">
            <BookOpen className="size-4" strokeWidth={1} />
            Lire avec l’assistant
          </Button>
          <Button
            disabled={importing || !currentUser}
            onClick={openImporter}
            size="sm"
          >
            <Upload className="size-4" strokeWidth={1} />
            {importing ? "Import en cours…" : "Importer une pièce"}
          </Button>
        </div>
        <input
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          aria-label="Importer un PDF ou une image pour ce patient"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) {
              void importFile(file);
            }
          }}
          ref={picker}
          type="file"
        />
      </header>
      <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_180px_150px_150px]">
        <label className="relative block min-w-0">
          <span className="sr-only">Rechercher un document</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1}
          />
          <Input
            className="pl-9"
            onChange={(event) => changeFilter("search", event.target.value)}
            placeholder="Rechercher un document…"
            value={filters.search}
          />
        </label>
        <label className="block text-xs text-muted-foreground">
          <span className="sr-only">Type de document</span>
          <NativeSelect
            aria-label="Type de document"
            onChange={(event) => changeFilter("kind", event.target.value)}
            value={filters.kind}
          >
            <NativeSelectOption value="">Tous les types</NativeSelectOption>
            {Object.entries(DOCUMENT_TYPES).map(([kind, label]) => (
              <NativeSelectOption key={kind} value={kind}>
                {label}
              </NativeSelectOption>
            ))}
            <NativeSelectOption value="import">
              Pièces importées
            </NativeSelectOption>
          </NativeSelect>
        </label>
        <label className="block text-xs text-muted-foreground">
          Du
          <DatePicker
            aria-label="Documents à partir du"
            className="mt-1"
            clearable
            onChange={(value) => changeFilter("from", value)}
            value={filters.from}
          />
        </label>
        <label className="block text-xs text-muted-foreground">
          Au
          <DatePicker
            aria-label="Documents jusqu’au"
            className="mt-1"
            clearable
            min={filters.from || undefined}
            onChange={(value) => changeFilter("to", value)}
            value={filters.to}
          />
        </label>
      </div>
      {importing && (
        <p className="text-sm text-muted-foreground" role="status">
          {progress}
        </p>
      )}
      {registry.error ? (
        <ErrorState
          className="py-6"
          message={registry.error}
          onRetry={() => void registry.refresh()}
        />
      ) : registry.loading ? (
        <p
          className="py-8 text-center text-sm text-muted-foreground"
          role="status"
        >
          Chargement des documents…
        </p>
      ) : visible.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {visible.map((document) => (
            <li
              className="grid min-w-0 gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
              key={document.id}
            >
              <div className="min-w-0">
                <button
                  className="max-w-full text-left text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                  onClick={() => setPreviewId(document.id)}
                  type="button"
                >
                  <span className="break-words">{document.title}</span>
                </button>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {document.kind === "import"
                      ? "Pièce importée"
                      : DOCUMENT_TYPES[document.kind]}
                  </span>
                  <span className="tabular-nums">
                    {dateLabel(document.createdAt)}
                  </span>
                  <span>{document.authorName || "Équipe soignante"}</span>
                  <Badge
                    className={
                      document.status === "annule" ? "text-destructive" : ""
                    }
                    variant="outline"
                  >
                    {DOCUMENT_STATUS_LABELS[document.status]}
                  </Badge>
                  {document.attachment?.textState === "scan" && (
                    <span>PDF numérisé</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  onClick={() => setPreviewId(document.id)}
                  size="sm"
                  variant="outline"
                >
                  <Eye className="size-4" strokeWidth={1} />
                  Aperçu
                </Button>
                {document.status === "finalise" && (
                  <Button
                    onClick={() => setReader({ document })}
                    size="sm"
                    variant="ghost"
                  >
                    <BookOpen className="size-4" strokeWidth={1} />
                    Lire
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-8 text-center">
          <p className="text-sm font-medium">
            {registry.documents.length
              ? "Aucun document ne correspond aux filtres."
              : "Aucun document généré ou importé pour ce patient."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Générez un document depuis une note validée, ou importez un PDF ou
            une image.
          </p>
        </div>
      )}
      <DocumentPreviewDialog
        documentId={previewId}
        onChanged={() => void registry.refresh()}
        onClose={() => setPreviewId(null)}
      />
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setReader(null);
          }
        }}
        open={reader !== null}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader className="pr-12">
            <DialogTitle>Lecture des documents</DialogTitle>
            <DialogDescription>
              L’assistant cite les textes du dossier. Les originaux restent
              inchangés.
            </DialogDescription>
          </DialogHeader>
          <Button
            aria-label="Fermer la lecture"
            className="absolute right-4 top-4"
            onClick={() => setReader(null)}
            size="icon"
            variant="ghost"
          >
            <X strokeWidth={1} />
          </Button>
          {reader && (
            <ConsultationDocumentsAssistant
              appointmentId={reader.document?.consultationId ?? ""}
              initialDocument={reader.document}
              initialMode="read"
              key={reader.document?.id ?? "patient-reader"}
              patientId={patientId}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
