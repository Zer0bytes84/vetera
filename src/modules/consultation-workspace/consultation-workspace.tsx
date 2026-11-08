import "@/modules/patients/medical-record.css";
import "@/modules/patients/patient-record-blocks.css";
import { useEffect, useRef } from "react";

import { AnesthesiaSheet } from "@/modules/anesthesia";
import {
  BillingDialog,
  ConsultationSessionDialog,
  formatOwnerName,
} from "@/modules/clinique/components/clinique-shared";
import { HospitalizationSheet } from "@/modules/hospitalizations";
import { PrescriptionSheet } from "@/modules/prescriptions";
import type { Patient } from "@/types/db";

import type { ConsultationSession } from "./use-consultation-session";

/** Every scrolling box above `node`, the page included. */
function scrollParents(node: HTMLElement | null) {
  const boxes: Array<HTMLElement | Window> = [];
  for (let parent = node?.parentElement; parent; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent);
    if ((overflowY === "auto" || overflowY === "scroll") && parent.scrollHeight > parent.clientHeight) boxes.push(parent);
  }
  boxes.push(window);
  return boxes;
}

/**
 * The consultation workspace as Clinique renders it: the open consultation,
 * then billing and the prescription, hospitalization and anesthesia sheets.
 * `sheetPatient` lets a host open a sheet with no consultation open (the
 * Clinique palette); `onSheetClosed` clears it.
 */
export function ConsultationWorkspace({
  closeLabel,
  onBilled,
  onSheetClosed,
  session,
  sheetPatient,
}: {
  closeLabel?: string;
  onBilled?: () => void | Promise<void>;
  onSheetClosed?: () => void;
  session: ConsultationSession;
  sheetPatient?: Patient | null;
}) {
  const {
    activeConsultation,
    activeConsultationDocuments,
    activeConsultationHistory,
    activeConsultationOwner,
    activeConsultationPatient,
    anesthesiaOpen,
    billingAppointment,
    billingInvoice,
    closingBlocker,
    currentUser,
    getOwner,
    handleBillingConfirm,
    handleConsultationComplete,
    handleConsultationDocumentDelete,
    handleConsultationDocumentUpload,
    handleConsultationSaveDraft,
    hospitalizationOpen,
    patientsById,
    prescriptionOpen,
    setActiveConsultation,
    setAnesthesiaOpen,
    setBillingAppointment,
    setHospitalizationOpen,
    setPrescriptionOpen,
  } = session;
  const effectiveSheetPatient = activeConsultationPatient ?? sheetPatient;
  const effectiveAppointmentId = activeConsultation?.id ?? "";

  // A consultation opens at its top, not where the list or board was scrolled.
  const anchor = useRef<HTMLSpanElement>(null);
  const openedId = activeConsultation && activeConsultationPatient ? activeConsultation.id : null;
  useEffect(() => {
    if (!openedId) return;
    for (const box of scrollParents(anchor.current)) box.scrollTo({ top: 0 });
  }, [openedId]);

  return (
    <>
      <span aria-hidden hidden ref={anchor} />
      {activeConsultation && activeConsultationPatient ? (
        <ConsultationSessionDialog
          appointment={activeConsultation}
          closeLabel={closeLabel}
          closingBlocker={closingBlocker}
          key={activeConsultation.id}
          documents={activeConsultationDocuments}
          historyAppointments={activeConsultationHistory}
          onClose={() => setActiveConsultation(null)}
          onComplete={handleConsultationComplete}
          onDeleteDocument={handleConsultationDocumentDelete}
          onOpenAnesthesia={() => setAnesthesiaOpen(true)}
          onOpenHospitalization={() => setHospitalizationOpen(true)}
          onOpenPrescription={() => setPrescriptionOpen(true)}
          onSaveDraft={handleConsultationSaveDraft}
          onUploadDocument={handleConsultationDocumentUpload}
          owner={activeConsultationOwner}
          patient={activeConsultationPatient}
          patientName={
            patientsById.get(activeConsultation.patientId)?.name ||
            "Patient local"
          }
        />
      ) : null}

      {billingAppointment ? (
        <BillingDialog
          appointment={billingAppointment}
          existingInvoice={billingInvoice}
          onClose={() => setBillingAppointment(null)}
          onConfirm={async (items, amountReceivedDa) => {
            await handleBillingConfirm(items, amountReceivedDa);
            await onBilled?.();
          }}
          ownerEmail={getOwner(billingAppointment)?.email}
          ownerName={formatOwnerName(getOwner(billingAppointment))}
          patientName={
            patientsById.get(billingAppointment.patientId)?.name ||
            "Patient local"
          }
        />
      ) : null}

      {effectiveSheetPatient ? (
        <PrescriptionSheet
          appointmentId={effectiveAppointmentId}
          onOpenChange={(open) => {
            setPrescriptionOpen(open);
            if (!open) {
              onSheetClosed?.();
            }
          }}
          open={prescriptionOpen}
          patient={effectiveSheetPatient}
          vet={currentUser}
        />
      ) : null}

      {effectiveSheetPatient ? (
        <HospitalizationSheet
          onOpenChange={(open) => {
            setHospitalizationOpen(open);
            if (!open) {
              onSheetClosed?.();
            }
          }}
          open={hospitalizationOpen}
          patient={effectiveSheetPatient}
        />
      ) : null}

      {effectiveSheetPatient ? (
        <AnesthesiaSheet
          onOpenChange={(open) => {
            setAnesthesiaOpen(open);
            if (!open) {
              onSheetClosed?.();
            }
          }}
          open={anesthesiaOpen}
          patient={effectiveSheetPatient}
        />
      ) : null}
    </>
  );
}
