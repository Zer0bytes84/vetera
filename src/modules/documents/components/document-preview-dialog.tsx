import { useEffect, useState } from "react";
import { Check, Download, History, Pencil, Printer, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { isTauriRuntime } from "@/services/browser-store";
import { DOCUMENT_STATUS_LABELS, type DocumentEvent, type PatientDocument } from "../document-domain";
import { documentsService } from "../document-service";
import { exportManagedDocument, patientDocumentPdf, printManagedDocument } from "../lib/managed-document-pdf";
import { DocumentPaperPreview } from "./document-paper-preview";
import "./document-preview.css";

const eventLabels: Record<string, string> = { creation: "Création", modification: "Modification", finalisation: "Finalisation", annulation: "Annulation", nouvelle_version: "Nouvelle version", import: "Import d’une pièce" };

export function DocumentPreviewDialog({ documentId, onClose, onChanged }: {
  documentId: string | null; onClose: () => void; onChanged?: () => void;
}) {
  const { currentUser } = useAuth();
  const [document, setDocument] = useState<PatientDocument | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [pdf, setPdf] = useState<{ dataUrl: string; version: string } | null>(null);
  const [events, setEvents] = useState<DocumentEvent[] | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setDocument(null); setError(""); setEditing(false); setReviewed(false); setEvents(null); setReason(null);
    if (documentId) void documentsService.get(documentId).then((value) => {
      if (active) { setDocument(value); setTitle(value.title); setText(value.content); }
    }).catch((cause) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [documentId]);
  useEffect(() => {
    let active = true;
    setPdf(null);
    if (document) void patientDocumentPdf(document).then((dataUrl) => {
      if (active) setPdf({ dataUrl, version: document.updatedAt });
    }).catch((cause) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [document]);
  async function perform(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError("");
    try { await action(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "L’action n’a pas pu aboutir. Réessayez."); }
    finally { setBusy(false); }
  }
  const author = currentUser?.id ?? "";
  async function downloadOriginal() {
    if (!document?.attachment) return;
    const file = document.attachment;
    const data = Uint8Array.from(atob(file.dataUrl.split(",")[1]), (char) => char.charCodeAt(0));
    if (isTauriRuntime()) {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const path = await save({ title: "Enregistrer la pièce jointe", defaultPath: file.name });
      if (!path) return;
      const { writeFile } = await import("@tauri-apps/plugin-fs"); await writeFile(path, data);
    } else {
      const url = URL.createObjectURL(new Blob([data.buffer], { type: file.mimeType }));
      const link = window.document.createElement("a"); link.href = url; link.download = file.name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
    toast.success("Pièce jointe enregistrée.");
  }
  return <Dialog open={!!documentId} onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent className="document-preview-dialog" showCloseButton={false}>
      <header className="document-preview-header">
        <div className="min-w-0 space-y-1">
          <DialogTitle>{document?.title || "Aperçu du document"}</DialogTitle>
          <DialogDescription>{document ? `${document.patientName} · ${document.authorName} · ${DOCUMENT_STATUS_LABELS[document.status]}` : "Chargement du dossier…"}</DialogDescription>
        </div>
        <Button variant="ghost" size="icon" aria-label="Fermer l’aperçu" disabled={busy} onClick={onClose}><X strokeWidth={1} /></Button>
      </header>
      {error && <p role="alert" className="mx-5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      {document && <>
        <div className="document-preview-body">
          <aside className="document-preview-tools">
            {document.status === "annule" ? <p className="text-sm text-destructive">Document annulé : {document.cancellationReason}</p>
              : document.status === "brouillon" ? <p className="text-sm text-muted-foreground">Relisez l’aperçu avant de finaliser. Le brouillon ne peut pas être imprimé ni exporté.</p>
              : <p className="text-sm text-muted-foreground">Document finalisé le {new Date(document.finalizedAt || document.createdAt).toLocaleDateString("fr-FR")}. Son contenu est conservé.</p>}
            {document.status === "brouillon" && <>
              {editing ? <div className="space-y-3">
                <label className="block space-y-1 text-sm">Titre<Input value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} /></label>
                <label className="block space-y-1 text-sm">Contenu<Textarea className="document-content-editor" value={text} maxLength={60000} onChange={(event) => setText(event.target.value)} /></label>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={busy || !title.trim() || !text.trim()} onClick={() => void perform(async () => {
                    const row = await documentsService.updateDraft(document.id, { title, content: text }, author, document.updatedAt);
                    setDocument(row); setEditing(false); setReviewed(false); onChanged?.();
                  })}><Save strokeWidth={1} /> Enregistrer</Button>
                  <Button variant="outline" disabled={busy} onClick={() => { setTitle(document.title); setText(document.content); setEditing(false); }}>Abandonner</Button>
                </div>
              </div> : <>
                <Button variant="outline" disabled={busy} onClick={() => setEditing(true)}><Pencil strokeWidth={1} /> Modifier le brouillon</Button>
                <label className="flex items-start gap-3 text-sm leading-6"><Checkbox checked={reviewed} onCheckedChange={(value) => setReviewed(value === true)} className="mt-1" />J’ai relu le document et je valide son contenu.</label>
                <Button disabled={busy || !reviewed || !pdf || pdf.version !== document.updatedAt} onClick={() => void perform(async () => {
                  const row = await documentsService.finalize(document.id, author, pdf!.dataUrl, reviewed, document.updatedAt);
                  setDocument(row); setReviewed(false); onChanged?.(); toast.success("Document finalisé.");
                })}><Check strokeWidth={1} /> Finaliser</Button>
              </>}
            </>}
            {document.status === "finalise" && <>
              <Button disabled={busy} onClick={() => void perform(async () => { await printManagedDocument(document); })}><Printer strokeWidth={1} /> Imprimer</Button>
              <Button variant="outline" disabled={busy} onClick={() => void perform(async () => { if (await exportManagedDocument(document)) toast.success("PDF enregistré."); })}><Download strokeWidth={1} /> Exporter en PDF</Button>
              {!document.attachment && <Button variant="outline" disabled={busy} onClick={() => void perform(async () => {
                const row = await documentsService.newVersion(document.id, author); setDocument(row); setTitle(row.title); setText(row.content); setEditing(true); setReviewed(false); setEvents(null); onChanged?.();
              })}><Pencil strokeWidth={1} /> Nouvelle version</Button>}
            </>}
            {document.attachment && <Button variant="outline" disabled={busy} onClick={() => void perform(downloadOriginal)}><Download strokeWidth={1} /> Télécharger l’original</Button>}
            {document.attachment?.textState === "scan" && <p className="text-sm text-muted-foreground">PDF scanné : aucun texte extractible. L’assistant ne peut pas citer son contenu sans reconnaissance locale explicite.</p>}
            <div className="border-t border-border pt-4 space-y-3">
              <Button variant="ghost" disabled={busy} onClick={() => void perform(async () => { setEvents(events ? null : await documentsService.history(document.id)); })}><History strokeWidth={1} /> Historique</Button>
              {events && <ol className="document-event-list">{events.map((entry) => <li key={entry.id}><span>{eventLabels[entry.action] || "Événement du document"}</span><small>{entry.authorName} · {new Date(entry.createdAt).toLocaleString("fr-FR")}</small>{entry.reason && <p>{entry.reason}</p>}</li>)}</ol>}
              {document.status !== "annule" && (reason === null ? <Button variant="ghost" disabled={busy} onClick={() => setReason("")}>Annuler le document</Button>
                : <div className="space-y-2"><label className="block text-sm">Motif de l’annulation<Textarea value={reason} maxLength={1000} onChange={(event) => setReason(event.target.value)} /></label>
                  <Button variant="destructive" disabled={busy || !reason.trim()} onClick={() => void perform(async () => {
                    await documentsService.cancel(document.id, reason!, author); setDocument(await documentsService.get(document.id)); setReason(null); setEvents(null); onChanged?.();
                  })}>Confirmer l’annulation</Button><Button variant="ghost" disabled={busy} onClick={() => setReason(null)}>Conserver</Button></div>)}
            </div>
            {busy && <p role="status" className="text-sm text-muted-foreground">En cours…</p>}
          </aside>
          <DocumentPaperPreview dataUrl={pdf?.dataUrl ?? null} />
        </div>
      </>}
      {!document && !error && <p role="status" className="p-6 text-sm text-muted-foreground">Chargement du document…</p>}
    </DialogContent>
  </Dialog>;
}
