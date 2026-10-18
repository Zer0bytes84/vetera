import { ErrorState } from "@/design-system/patterns/error-state";
import { useImperativeHandle, useRef, useState, type Ref } from "react";
import { FileText, Search, Upload, BookOpen, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { DOCUMENT_STATUS_LABELS, DOCUMENT_TYPES, type PatientDocument } from "../document-domain";
import { documentsService } from "../document-service";
import { usePatientDocuments } from "../hooks/use-managed-documents";
import { preparePatientAttachment } from "../lib/patient-document-reading";
import { filterPatientDocuments, type DocumentFilters } from "../lib/filter-patient-documents";
import ConsultationDocumentsAssistant from "./consultation-documents-assistant";
import { DocumentPreviewDialog } from "./document-preview-dialog";
import { DatePicker } from "@/components/ui/date-picker";

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date non renseignée" : date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function PatientDocumentRegistry({ patientId, onUpload, uploadControl }: { patientId: string; onUpload?: () => void; uploadControl?: Ref<{ open: () => void }> }) {
  const { currentUser } = useAuth();
  const registry = usePatientDocuments(patientId);
  const picker = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState("");
  const [filters, setFilters] = useState<DocumentFilters>({ search: "", kind: "", from: "", to: "" });
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [reader, setReader] = useState<{ document?: PatientDocument } | null>(null);
  const openImporter = () => { if (!importing) { if (onUpload) onUpload(); else picker.current?.click(); } };
  useImperativeHandle(uploadControl, () => ({ open: openImporter }));
  const visible = filterPatientDocuments(registry.documents, filters);
  const changeFilter = (key: keyof DocumentFilters, value: string) => setFilters(previous => ({ ...previous, [key]: value }));
  const importFile = async (file: File) => {
    if (!currentUser || importing) return;
    setImporting(true); setProgress("Préparation du fichier…");
    try {
      const attachment = await preparePatientAttachment(file, undefined, event => setProgress(event.message));
      const document = await documentsService.importAttachment(patientId, attachment, currentUser.uid);
      await registry.refresh();
      toast.success("La pièce a été ajoutée au dossier du patient.");
      if (attachment.textState === "scan") toast.info("PDF numérisé : l’assistant ne dispose pas de texte extractible. La pièce reste consultable.");
      setPreviewId(document.id);
    } catch (error) { toast.error(error instanceof Error ? error.message : "La pièce n’a pas pu être importée. Réessayez."); }
    finally { setImporting(false); setProgress(""); }
  };
  return <section aria-label="Documents du patient" className="space-y-4">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-base font-medium"><FileText className="size-4 shrink-0 text-muted-foreground" strokeWidth={1} />Documents du patient</h3>
        <p className="mt-1 text-sm text-muted-foreground">Documents générés et pièces importées, conservés sur cet ordinateur.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setReader({})}><BookOpen className="size-4" strokeWidth={1} />Lire avec l’assistant</Button>
        <Button size="sm" disabled={importing || !currentUser} onClick={openImporter}><Upload className="size-4" strokeWidth={1} />{importing ? "Import en cours…" : "Importer une pièce"}</Button>
      </div>
      <input ref={picker} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" aria-label="Importer un PDF ou une image pour ce patient" onChange={event => {
        const file = event.target.files?.[0]; event.target.value = "";
        if (file) void importFile(file);
      }} />
    </header>
    <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_180px_150px_150px]">
      <label className="relative block min-w-0"><span className="sr-only">Rechercher un document</span><Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1} /><Input className="pl-9" placeholder="Rechercher un document…" value={filters.search} onChange={event => changeFilter("search", event.target.value)} /></label>
      <label className="block text-xs text-muted-foreground"><span className="sr-only">Type de document</span><NativeSelect aria-label="Type de document" value={filters.kind} onChange={event => changeFilter("kind", event.target.value)}><NativeSelectOption value="">Tous les types</NativeSelectOption>{Object.entries(DOCUMENT_TYPES).map(([kind, label]) => <NativeSelectOption key={kind} value={kind}>{label}</NativeSelectOption>)}<NativeSelectOption value="import">Pièces importées</NativeSelectOption></NativeSelect></label>
      <label className="block text-xs text-muted-foreground">Du<DatePicker clearable className="mt-1" aria-label="Documents à partir du" value={filters.from} onChange={(value) => changeFilter("from", value)} /></label>
      <label className="block text-xs text-muted-foreground">Au<DatePicker clearable className="mt-1" aria-label="Documents jusqu’au" value={filters.to} min={filters.from || undefined} onChange={(value) => changeFilter("to", value)} /></label>
    </div>
    {importing && <p className="text-sm text-muted-foreground" role="status">{progress}</p>}
    {registry.error ? <ErrorState className="py-6" message={registry.error} onRetry={() => void registry.refresh()} />
      : registry.loading ? <p role="status" className="py-8 text-center text-sm text-muted-foreground">Chargement des documents…</p>
        : !visible.length ? <div className="py-8 text-center"><p className="text-sm font-medium">{registry.documents.length ? "Aucun document ne correspond aux filtres." : "Aucun document généré ou importé pour ce patient."}</p><p className="mt-1 text-sm text-muted-foreground">Générez un document depuis une note validée, ou importez un PDF ou une image.</p></div>
          : <ul className="divide-y divide-border border-y border-border">
            {visible.map(document => <li className="grid min-w-0 gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center" key={document.id}>
              <div className="min-w-0"><button type="button" onClick={() => setPreviewId(document.id)} className="max-w-full text-left text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"><span className="break-words">{document.title}</span></button><div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{document.kind === "import" ? "Pièce importée" : DOCUMENT_TYPES[document.kind]}</span><span className="tabular-nums">{dateLabel(document.createdAt)}</span><span>{document.authorName || "Équipe soignante"}</span><Badge variant="outline" className={document.status === "annule" ? "text-destructive" : ""}>{DOCUMENT_STATUS_LABELS[document.status]}</Badge>{document.attachment?.textState === "scan" && <span>PDF numérisé</span>}</div></div>
              <div className="flex shrink-0 gap-2"><Button size="sm" variant="outline" onClick={() => setPreviewId(document.id)}><Eye className="size-4" strokeWidth={1} />Aperçu</Button>{document.status === "finalise" && <Button size="sm" variant="ghost" onClick={() => setReader({ document })}><BookOpen className="size-4" strokeWidth={1} />Lire</Button>}</div>
            </li>)}
          </ul>}
    <DocumentPreviewDialog documentId={previewId} onClose={() => setPreviewId(null)} onChanged={() => void registry.refresh()} />
    <Dialog open={reader !== null} onOpenChange={open => { if (!open) setReader(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl"><DialogHeader className="pr-12"><DialogTitle>Lecture des documents</DialogTitle><DialogDescription>L’assistant cite les textes du dossier. Les originaux restent inchangés.</DialogDescription></DialogHeader><Button className="absolute right-4 top-4" variant="ghost" size="icon" aria-label="Fermer la lecture" onClick={() => setReader(null)}><X strokeWidth={1} /></Button>{reader && <ConsultationDocumentsAssistant key={reader.document?.id ?? "patient-reader"} patientId={patientId} appointmentId={reader.document?.consultationId ?? ""} initialMode="read" initialDocument={reader.document} />}</DialogContent></Dialog>
  </section>;
}
