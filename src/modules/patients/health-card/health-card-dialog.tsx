import { useEffect, useRef, useState } from "react";
import { Download, HeartPulse, Printer, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogBody, FormDialogContent, FormDialogFooter, FormDialogHeader } from "@/components/ui/form-dialog";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAppointmentsRepository,
  useHospitalizationsRepository,
  usePrescriptionItemsRepository,
  usePrescriptionsRepository,
  useVaccinationsRepository,
  useWeightEntriesRepository,
} from "@/data/repositories";
import { DEFAULT_INVOICE_SETTINGS, getInvoiceSettings, type InvoiceSettings } from "@/services/invoiceSettingsService";
import type { Owner, Patient } from "@/types/db";
import { PatientRecordPreview } from "../export/patient-record-preview";
import type { PatientRecordPdf } from "../export/patient-record-types";
import "../export/patient-record-export.css";
import { buildHealthCard } from "./health-card-data";
import { guard } from "@/lib/guard";

const loadHealthCardPdf = () => import("./health-card-pdf");
const loadExportPatientRecordSave = () => import("../export/patient-record-save");

function message(error: unknown, fallback: string): string {
  return error instanceof Error && /^(?:L[’']|Le |La |Les |Une |Un |Votre |Connectez|Impossible )/u.test(error.message) ? error.message : fallback;
}

/**
 * Carnet de santé : une page récapitulative à remettre au propriétaire,
 * établie à partir des données du dossier au moment de l'ouverture.
 */
export function HealthCardDialog({ onClose, owner, patient }: {
  onClose: () => void;
  owner?: Owner | null;
  patient: Patient;
}) {
  const { currentUser } = useAuth();
  const appointments = useAppointmentsRepository();
  const hospitalizations = useHospitalizationsRepository();
  const prescriptions = usePrescriptionsRepository();
  const items = usePrescriptionItemsRepository();
  const vaccinations = useVaccinationsRepository();
  const weights = useWeightEntriesRepository();

  const [artifact, setArtifact] = useState<PatientRecordPdf | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const print = useRef<AbortController | null>(null);
  useEffect(() => () => print.current?.abort(), []);

  // Instantané pris à l'ouverture : le carnet ne change pas pendant sa relecture.
  const loading =
    appointments.loading || hospitalizations.loading || prescriptions.loading ||
    items.loading || vaccinations.loading || weights.loading;
  // L'instantané est pris une fois les données lues, pour ce patient (corrigé au rendu, sans ref lue au rendu).
  const [snapshot, setSnapshot] = useState<Parameters<typeof buildHealthCard>[0] | null>(null);
  if (!loading && (!snapshot || snapshot.patient.id !== patient.id)) {
    setSnapshot({
      appointments: appointments.data, hospitalizations: hospitalizations.data,
      items: items.data, now: new Date(), owner, patient,
      prescriptions: prescriptions.data, vaccinations: vaccinations.data, weights: weights.data,
    });
  }

  // Chaque nouvelle préparation (nouvel essai, autre utilisateur ou patient, instantané prêt) retire l'ancien PDF et l'ancienne erreur dès ce rendu.
  const [preparedFor, setPreparedFor] = useState<{ attempt: number; userId: string | undefined; loading: boolean; patientId: string; snapshot: typeof snapshot } | null>(null);
  if (!loading && snapshot && (!preparedFor || preparedFor.attempt !== attempt || preparedFor.userId !== currentUser?.id || preparedFor.loading !== loading || preparedFor.patientId !== patient.id || preparedFor.snapshot !== snapshot)) {
    setPreparedFor({ attempt, userId: currentUser?.id, loading, patientId: patient.id, snapshot });
    setArtifact(null); setError("");
  }
  useEffect(() => {
    const input = snapshot;
    if (loading || !input) return;
    let cancelled = false;
    void (async () => {
      await guard(async () => {
        if (!currentUser?.id) throw new Error("Connectez-vous pour préparer le carnet de santé.");
        let clinic: InvoiceSettings = DEFAULT_INVOICE_SETTINGS;
        try { clinic = await getInvoiceSettings(); } catch { /* L'en-tête du cabinet est facultatif. */ }
        const { buildHealthCardPdf } = await loadHealthCardPdf();
        const pdf = await buildHealthCardPdf(buildHealthCard({ ...input, now: new Date() }), {
          clinic, patientId: patient.id, requestedBy: currentUser.id,
        });
        if (!cancelled) setArtifact(pdf);
      }, {
        recover: (cause) => {
          console.error(cause);
          if (!cancelled) setError(message(cause, "Le carnet de santé n’a pas pu être préparé. Réessayez."));
        },
      });
    })();
    return () => { cancelled = true; };
  }, [attempt, currentUser?.id, loading, patient.id, snapshot]);

  const close = () => {
    if (saving) return;
    print.current?.abort();
    onClose();
  };

  const save = async () => {
    if (!artifact) return;
    setSaving(true); setError("");
    await guard(async () => {
      const { savePatientRecordPdf } = await loadExportPatientRecordSave();
      const result = await savePatientRecordPdf(artifact, { title: "Enregistrer le carnet de santé", filterName: "Carnet de santé PDF" });
      if (result) toast.success(result.downloaded ? "Téléchargement du carnet de santé lancé." : "Carnet de santé enregistré.", { description: result.path, duration: 8000 });
    }, {
      recover: (cause) => {
   setError(message(cause, "Le PDF n’a pas pu être enregistré. Vérifiez l’emplacement choisi, puis réessayez."));
      },
      cleanup: () => {
   setSaving(false);
      },
    });
  };

  const printPdf = async () => {
    if (!artifact) return;
    const controller = new AbortController(); print.current = controller;
    setPrinting(true); setError("");
    await guard(async () => {
      const { printPatientRecordPdf } = await loadExportPatientRecordSave();
      await printPatientRecordPdf(artifact, controller.signal);
    }, {
      recover: (cause) => {
   if (!controller.signal.aborted) setError(message(cause, "L’impression n’a pas pu être préparée. Réessayez ou enregistrez le PDF."));
      },
      cleanup: () => {
   if (!controller.signal.aborted) setPrinting(false);
      },
    });
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
      <FormDialogContent size="xl" className="patient-export-dialog patient-export-dialog-preview" data-testid="health-card-dialog">
        <FormDialogHeader compact icon={<HeartPulse aria-hidden="true" className="size-5" strokeWidth={1} />}
          title="Carnet de santé"
          description={`${patient.name} · Une page récapitulative à remettre au propriétaire. Relisez-la avant de l’imprimer.`} />
        <FormDialogBody className="patient-export-preview-body">
          {artifact ? <PatientRecordPreview artifact={artifact} page={1} />
            : !error && <p className="patient-export-preview-status" role="status"><Spinner className="size-4" />Préparation du carnet de santé…</p>}
          {error && <div className="patient-export-error" role="alert">
            <p>{error}</p>
            <Button className="mt-3" onClick={() => setAttempt((value) => value + 1)} size="sm" variant="outline"><RotateCcw className="size-4" aria-hidden="true" strokeWidth={1} />Réessayer</Button>
          </div>}
        </FormDialogBody>
        <FormDialogFooter className="patient-export-preview-footer">
          <p className="patient-export-footer-hint">Établi à partir des données enregistrées dans le dossier.</p>
          <div className="patient-export-preview-actions">
            <Button variant="ghost" disabled={saving} onClick={close}>Fermer</Button>
            <Button variant="outline" disabled={!artifact || saving || printing} onClick={() => void printPdf()}>{printing ? <Spinner className="size-4" /> : <Printer className="size-4" aria-hidden="true" strokeWidth={1} />}{printing ? "Préparation…" : "Imprimer"}</Button>
            <Button disabled={!artifact || saving || printing} onClick={() => void save()}>{saving ? <Spinner className="size-4" /> : <Download className="size-4" aria-hidden="true" strokeWidth={1} />}{saving ? "Enregistrement…" : "Enregistrer le PDF"}</Button>
          </div>
        </FormDialogFooter>
      </FormDialogContent>
    </Dialog>
  );
}
