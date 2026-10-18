import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogBody, FormDialogContent, FormDialogFooter, FormDialogHeader } from "@/components/ui/form-dialog";
import { Spinner } from "@/components/ui/spinner";
import { documentLocalDay } from "@/modules/documents/document-domain";
import { validatePatientRecordOptions } from "./patient-record-data";
import { PatientRecordPreview } from "./patient-record-preview";
import { DEFAULT_PATIENT_RECORD_OPTIONS, type PatientRecordOptions, type PatientRecordPdf, type PatientRecordProgress } from "./patient-record-types";
import "./patient-record-export.css";
import { DatePicker } from "@/components/ui/date-picker";

const SECTIONS: Array<{ id: keyof PatientRecordOptions["sections"]; label: string; description: string }> = [
  { id: "identity", label: "Identité du patient", description: "Identité, poids enregistré et coordonnées du propriétaire." },
  { id: "consultations", label: "Consultations", description: "Motifs, notes cliniques, diagnostics et traitements consignés." },
  { id: "documents", label: "Documents générés", description: "Ordonnances, certificats, comptes-rendus et lettres validés." },
  { id: "reminders", label: "Rappels médicaux", description: "Échéances à venir et rappels effectués." },
  { id: "notes", label: "Notes libres", description: "Notes liées au patient et remarques générales." },
];

function userMessage(error: unknown, fallback: string): string {
  return error instanceof Error && /^(?:L[’']|Le |La |Les |Un |Une |Choisissez |Connectez|Votre |Ce |Cet|Sélectionnez |Aucun|Vérifiez|Réduisez|Impossible |Indiquez )/u.test(error.message)
    ? error.message : fallback;
}

export function PatientRecordExportDialog({ patientId, patientName, onClose }: {
  patientId: string; patientName: string; onClose: () => void;
}) {
  const [phase, setPhase] = useState<"options" | "generating" | "preview">("options");
  const [sections, setSections] = useState({ ...DEFAULT_PATIENT_RECORD_OPTIONS.sections });
  const [attachments, setAttachments] = useState(true);
  const [range, setRange] = useState(false);
  const [from, setFrom] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [to, setTo] = useState(() => documentLocalDay(new Date().toISOString()));
  const [artifact, setArtifact] = useState<PatientRecordPdf | null>(null);
  const [page, setPage] = useState(1);
  const [progress, setProgress] = useState<PatientRecordProgress | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const generation = useRef<AbortController | null>(null);
  const print = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current += 1; generation.current?.abort(); print.current?.abort(); }, []);

  const close = () => {
    if (saving) return;
    sequence.current += 1; generation.current?.abort(); print.current?.abort(); onClose();
  };
  const generate = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    let options: PatientRecordOptions;
    try { options = validatePatientRecordOptions({ period: range ? { from, to } : null, sections, includeAttachments: attachments }); }
    catch (cause) { setError(userMessage(cause, "Vérifiez la période et les sections à exporter.")); return; }
    const controller = new AbortController();
    generation.current?.abort(); generation.current = controller;
    const token = ++sequence.current;
    setPhase("generating"); setProgress(null); setArtifact(null);
    try {
      const [{ loadPatientRecord }, { buildPatientRecordPdf }] = await Promise.all([
        import("./patient-record-service"), import("./patient-record-pdf"),
      ]);
      if (controller.signal.aborted) return;
      setProgress({ stage: "preparing", current: 0, pages: 0, label: "Lecture du dossier patient…" });
      const snapshot = await loadPatientRecord(patientId, options, { signal: controller.signal });
      const result = await buildPatientRecordPdf(snapshot, {
        signal: controller.signal,
        onProgress: value => { if (token === sequence.current) setProgress(value); },
      });
      if (token !== sequence.current || controller.signal.aborted) return;
      setArtifact(result); setPage(1); setPhase("preview");
    } catch (cause) {
      if (token !== sequence.current || controller.signal.aborted) return;
      setError(userMessage(cause, "Le dossier n’a pas pu être préparé. Réessayez sans fermer le dossier patient."));
      setPhase("options");
    }
  };
  const cancelGeneration = () => { sequence.current += 1; generation.current?.abort(); setProgress(null); setPhase("options"); };
  const save = async () => {
    if (!artifact) return;
    setSaving(true); setError("");
    try {
      const { savePatientRecordPdf } = await import("./patient-record-save");
      const result = await savePatientRecordPdf(artifact);
      if (result) toast.success(result.downloaded ? "Téléchargement du dossier PDF lancé." : "Dossier PDF enregistré.", { description: result.path, duration: 8000 });
    } catch (cause) { setError(userMessage(cause, "Le PDF n’a pas pu être enregistré. Vérifiez l’emplacement et l’espace disponible, puis réessayez.")); }
    finally { setSaving(false); }
  };
  const printPdf = async () => {
    if (!artifact) return;
    const controller = new AbortController(); print.current = controller;
    setPrinting(true); setError("");
    try {
      const { printPatientRecordPdf } = await import("./patient-record-save");
      await printPatientRecordPdf(artifact, controller.signal);
    } catch (cause) { if (!controller.signal.aborted) setError(userMessage(cause, "L’impression du dossier n’a pas pu être préparée. Réessayez ou enregistrez le PDF.")); }
    finally { if (!controller.signal.aborted) setPrinting(false); }
  };
  const hasContent = attachments || Object.values(sections).some(Boolean);

  return (
    <Dialog open onOpenChange={open => { if (!open) close(); }}>
      <FormDialogContent size={phase === "preview" ? "xl" : "md"} className={`patient-export-dialog${phase === "preview" ? " patient-export-dialog-preview" : ""}`}>
        <FormDialogHeader compact icon={<FileText aria-hidden="true" className="size-5" strokeWidth={1} />}
          title={phase === "preview" ? "Aperçu du dossier patient" : "Exporter le dossier en PDF"}
          description={phase === "preview" ? `${artifact?.patientName ?? patientName} · Relisez le document avant de l’enregistrer ou de l’imprimer.` : `${patientName} · Choisissez la période et le contenu du dossier.`} />
        {phase === "options" ? <form className="contents" onSubmit={event => void generate(event)}>
          <FormDialogBody className="patient-export-options">
            <fieldset className="patient-export-period-group">
              <legend>Période</legend>
              <div className="patient-export-period">
                <label data-selected={!range}><input type="radio" name="patient-export-period" checked={!range} onChange={() => setRange(false)} />Tout l’historique</label>
                <label data-selected={range}><input type="radio" name="patient-export-period" checked={range} onChange={() => setRange(true)} />Choisir une période</label>
              </div>
              {range && <div className="patient-export-dates">
                <label htmlFor="patient-export-from">Du<DatePicker id="patient-export-from" required max={to || undefined} value={from} onChange={(value) => setFrom(value)} /></label>
                <label htmlFor="patient-export-to">Au<DatePicker id="patient-export-to" required min={from || undefined} value={to} onChange={(value) => setTo(value)} /></label>
              </div>}
            </fieldset>
            <fieldset className="patient-export-sections">
              <legend>Sections à inclure</legend>
              {SECTIONS.map(section => <label className="patient-export-option" key={section.id} htmlFor={`patient-export-${section.id}`}>
                <span><strong>{section.label}</strong><span>{section.description}</span></span>
                <Checkbox id={`patient-export-${section.id}`} checked={sections[section.id]} onCheckedChange={checked => setSections(current => ({ ...current, [section.id]: checked }))} />
              </label>)}
            </fieldset>
            <label className="patient-export-option patient-export-attachments" htmlFor="patient-export-attachments">
              <span><strong>Pièces jointes en annexe</strong><span>PDF et images importés, avec leurs pages complètes.</span></span>
              <Checkbox id="patient-export-attachments" checked={attachments} onCheckedChange={setAttachments} />
            </label>
            {error && <p className="patient-export-error" role="alert">{error}</p>}
          </FormDialogBody>
          <FormDialogFooter><p className="patient-export-footer-hint">Un aperçu s’ouvrira avant l’enregistrement.</p><Button onClick={close} type="button" variant="outline">Annuler</Button><Button type="submit" disabled={!hasContent}><FileText className="size-4" aria-hidden="true" strokeWidth={1} />Générer</Button></FormDialogFooter>
        </form> : phase === "generating" ? <>
          <FormDialogBody className="patient-export-generating" aria-busy="true">
            <Spinner className="size-6" />
            <div role="status" aria-live="polite"><p className="font-medium">{progress?.label || "Préparation du dossier…"}</p>{Boolean(progress?.pages) && <p className="text-muted-foreground">{progress!.pages} {progress!.pages > 1 ? "pages préparées" : "page préparée"}</p>}</div>
            <progress aria-label="Préparation du dossier PDF" max={progress?.total || undefined} value={progress?.total ? progress.current : undefined} />
            {(progress?.pages ?? 0) > 20 && <p className="patient-export-large">Ce dossier dépasse 20 pages. La préparation se poursuit, vous pouvez l’annuler à tout moment.</p>}
          </FormDialogBody>
          <FormDialogFooter><Button variant="outline" onClick={cancelGeneration}>Annuler la génération</Button></FormDialogFooter>
        </> : artifact && <>
          <FormDialogBody className="patient-export-preview-body"><PatientRecordPreview artifact={artifact} page={page} />{error && <p role="alert" className="patient-export-error">{error}</p>}</FormDialogBody>
          <FormDialogFooter className="patient-export-preview-footer">
            <div className="patient-export-pagination" aria-label="Pages du dossier">
              <Button variant="outline" size="icon" aria-label="Page précédente" disabled={page === 1} onClick={() => setPage(value => value - 1)}><ChevronLeft className="size-4" strokeWidth={1} /></Button>
              <span className="tabular-nums" aria-live="polite">{page} / {artifact.pageCount}</span>
              <Button variant="outline" size="icon" aria-label="Page suivante" disabled={page === artifact.pageCount} onClick={() => setPage(value => value + 1)}><ChevronRight className="size-4" strokeWidth={1} /></Button>
            </div>
            <div className="patient-export-preview-actions">
              <Button variant="ghost" disabled={saving || printing} onClick={() => { setPhase("options"); setError(""); }}><ArrowLeft className="size-4" aria-hidden="true" strokeWidth={1} />Options</Button>
              <Button variant="outline" disabled={saving || printing} onClick={() => void printPdf()}>{printing ? <Spinner className="size-4" /> : <Printer className="size-4" aria-hidden="true" strokeWidth={1} />}{printing ? "Préparation…" : "Imprimer"}</Button>
              <Button disabled={saving || printing} onClick={() => void save()}>{saving ? <Spinner className="size-4" /> : <Download className="size-4" aria-hidden="true" strokeWidth={1} />}{saving ? "Enregistrement…" : "Enregistrer le PDF"}</Button>
            </div>
          </FormDialogFooter>
        </>}
      </FormDialogContent>
    </Dialog>
  );
}
