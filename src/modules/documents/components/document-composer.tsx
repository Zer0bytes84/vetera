import { useEffect, useMemo, useState } from "react";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { CERTIFICATE_TYPES, DOCUMENT_TYPES, type DocumentKind, type DocumentPreparation } from "../document-domain";
import { documentsService } from "../document-service";
import { useManagedTemplates } from "../hooks/use-managed-documents";
import { buildManagedDocumentPdf } from "../lib/managed-document-pdf";
import { DocumentPaperPreview } from "./document-paper-preview";
import { DocumentPreviewDialog } from "./document-preview-dialog";
import "./document-preview.css";

export function DocumentComposer({ open, patientId, consultationId, onClose, onCreated }: {
  open: boolean; patientId: string; consultationId: string;
  onClose: () => void; onCreated?: () => void;
}) {
  const { currentUser } = useAuth();
  const { templates, loading, error: templatesError, refresh } = useManagedTemplates();
  const [kind, setKind] = useState<DocumentKind>("prescription");
  const [templateId, setTemplateId] = useState("");
  const [certificateType, setCertificateType] = useState<string>(CERTIFICATE_TYPES[0]);
  const [recipient, setRecipient] = useState("");
  const [referralReason, setReferralReason] = useState("");
  const [preparation, setPreparation] = useState<DocumentPreparation | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pdf, setPdf] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const choices = useMemo(() => templates.filter((template) => template.active && template.kind === kind), [templates, kind]);
  const chosenId = choices.some((template) => template.id === templateId) ? templateId : choices[0]?.id ?? "";
  useEffect(() => {
    if (open) { setPreparation(null); setCreatedId(null); setReviewed(false); setError(""); }
  }, [open, patientId, consultationId]);
  useEffect(() => {
    let active = true;
    setPdf(null);
    if (!preparation) return;
    const timer = setTimeout(() => {
      void buildManagedDocumentPdf({ title, content, clinic: preparation.clinic }).then((document) => {
        if (active) setPdf(document.output("datauristring"));
      }).catch((cause) => { if (active) setError(cause.message); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [preparation, title, content]);
  async function perform(operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError("");
    try { await operation(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Le document n’a pas pu être préparé."); }
    finally { setBusy(false); }
  }
  return <>
    <Dialog open={open && !createdId} onOpenChange={(value) => { if (!value && !busy) onClose(); }}>
      <DialogContent className="document-composer-dialog" showCloseButton={false}>
        <header className="document-preview-header">
          <div className="space-y-1"><DialogTitle>Générer un document</DialogTitle>
            <DialogDescription>Depuis la note clinique validée. Relisez et ajustez le contenu avant de l’enregistrer.</DialogDescription></div>
          <Button variant="ghost" size="icon" aria-label="Fermer la génération" disabled={busy} onClick={onClose}><X strokeWidth={1} /></Button>
        </header>
        {(error || templatesError) && <div role="alert" className="mx-6 mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {error || String(templatesError)}{templatesError && <Button variant="ghost" onClick={() => void refresh()}>Réessayer</Button>}</div>}
        {preparation ? <>
          <div className="document-preview-body">
            <div className="document-preview-tools">
              <label className="space-y-1 text-sm">Titre<Input value={title} maxLength={160} onChange={(event) => { setTitle(event.target.value); setReviewed(false); }} /></label>
              <label className="space-y-1 text-sm">Texte du document<Textarea className="document-content-editor" value={content} maxLength={60000} onChange={(event) => { setContent(event.target.value); setReviewed(false); }} /></label>
              <p className="text-xs leading-5 text-muted-foreground">Les mentions [à compléter] signalent une donnée absente. Aucune information clinique n’est ajoutée automatiquement.</p>
              <Button variant="outline" disabled={busy} onClick={() => { setPreparation(null); setReviewed(false); }}>Changer de modèle</Button>
            </div>
            <DocumentPaperPreview dataUrl={pdf} />
          </div>
          <footer className="document-composer-footer">
            <label><Checkbox checked={reviewed} onCheckedChange={(value) => setReviewed(value === true)} />J’ai relu ce document et je confirme son enregistrement.</label>
            <Button variant="outline" disabled={busy} onClick={onClose}>Fermer</Button>
            <Button disabled={busy || !reviewed || !title.trim() || !content.trim() || !pdf} onClick={() => void perform(async () => {
              const document = await documentsService.createDraft(preparation, { title, content }, currentUser?.id ?? "", reviewed);
              setCreatedId(document.id); onCreated?.();
            })}><FileText strokeWidth={1} /> Enregistrer le brouillon</Button>
          </footer>
        </> : <>
          <div className="document-composer-form">
            <div className="document-composer-grid">
              <label>Type de document<NativeSelect className="w-full" value={kind} onChange={(event) => { setKind(event.target.value as DocumentKind); setTemplateId(""); }}>
                {Object.entries(DOCUMENT_TYPES).map(([id, label]) => <NativeSelectOption key={id} value={id}>{label}</NativeSelectOption>)}
              </NativeSelect></label>
              <label>Modèle<NativeSelect className="w-full" value={chosenId} onChange={(event) => setTemplateId(event.target.value)} disabled={loading || !choices.length}>
                {!choices.length && <NativeSelectOption value="">Aucun modèle actif</NativeSelectOption>}
                {choices.map((template) => <NativeSelectOption key={template.id} value={template.id}>{template.name}</NativeSelectOption>)}
              </NativeSelect></label>
            </div>
            {kind === "certificate" && <label>Objet du certificat<NativeSelect className="w-full" value={certificateType} onChange={(event) => setCertificateType(event.target.value)}>
              {CERTIFICATE_TYPES.map((type) => <NativeSelectOption key={type} value={type}>{type}</NativeSelectOption>)}
            </NativeSelect><span className="text-xs text-muted-foreground">L’objet ne constitue pas une attestation. Vérifiez les observations et complétez la portée du certificat.</span></label>}
            {kind === "referral" && <div className="document-composer-grid">
              <label>Confrère ou spécialiste destinataire<Textarea value={recipient} maxLength={1500} placeholder="Nom, établissement et coordonnées" onChange={(event) => setRecipient(event.target.value)} /></label>
              <label>Motif de référence<Textarea value={referralReason} maxLength={3000} placeholder="Indiquez le motif du courrier" onChange={(event) => setReferralReason(event.target.value)} /></label>
            </div>}
            <p className="text-sm text-muted-foreground">Le patient, la consultation, le clinicien et la note validée seront repris. Le document reste indépendant du modèle et de la note source.</p>
            {loading && <p role="status" className="text-sm text-muted-foreground">Chargement des modèles…</p>}
          </div>
          <footer className="document-composer-footer">
            <Button variant="outline" disabled={busy} onClick={onClose}>Fermer</Button>
            <Button disabled={busy || loading || !chosenId || !consultationId} onClick={() => void perform(async () => {
              const prepared = await documentsService.prepare(consultationId, patientId, chosenId, currentUser?.id ?? "", { certificateType, recipient, referralReason });
              setPreparation(prepared); setTitle(prepared.title); setContent(prepared.content); setReviewed(false);
            })}><FileText strokeWidth={1} /> {busy ? "Préparation…" : "Préparer l’aperçu"}</Button>
          </footer>
        </>}
      </DialogContent>
    </Dialog>
    <DocumentPreviewDialog documentId={createdId} onClose={() => { setCreatedId(null); onClose(); }} onChanged={onCreated} />
  </>;
}
