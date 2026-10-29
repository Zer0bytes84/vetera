import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import {
  useAppointmentsRepository,
  useConsultationDocumentsRepository,
  useConsultationSoapsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useUsersRepository,
} from "@/data/repositories";
import { useAppointmentBilling } from "@/modules/billing/use-appointment-billing";
import {
  type ConsultationDraftPayload,
  type SaveDraftOptions,
  getDocumentCategory,
  readFileAsDataUrl,
} from "@/modules/clinique/components/clinique-shared";
import { closureBlocker } from "./consultation-closure";
import { localToday, medicalReminderTypeForAct } from "@/modules/patient-reminders/domain";
import { announceMedicalActRecorded } from "@/modules/patient-reminders/medical-act-events";
import { useFlowUndo } from "@/modules/visit-flow/use-flow-undo";
import { useAudit } from "@/services/use-audit";
import type { Appointment, ConsultationDocument, Patient } from "@/types/db";

/**
 * The consultation workspace: the open consultation, its documents and
 * history, the sheets it opens and the billing at close. Moved as is from
 * the Clinique page model so Clinique and Flux run the same consultation.
 * `onMove` lets the host follow the visit (Clinique moves its list tab).
 */
export function useConsultationSession({
  onMove,
}: {
  onMove?: (status: Appointment["status"], appointmentId: string) => void;
} = {}) {
  const audit = useAudit();
  const flowUndo = useFlowUndo();
  const { currentUser: authUser } = useAuth();
  const usersRepo = useUsersRepository();
  const currentUser = authUser
    ? (usersRepo.data.find((u) => u.id === authUser.id) ?? null)
    : null;
  const [activeConsultation, setActiveConsultation] =
    useState<Appointment | null>(null);
  const [prescriptionOpen, setPrescriptionOpen] = useState<boolean>(false);
  const [hospitalizationOpen, setHospitalizationOpen] =
    useState<boolean>(false);
  const [anesthesiaOpen, setAnesthesiaOpen] = useState<boolean>(false);

  const {
    data: appointments,
    update: updateAppointment,
    transitionStatus: transitionAppointmentStatus,
    completeWithBilling,
  } = useAppointmentsRepository();
  const { data: patients, update: updatePatient } = usePatientsRepository();
  const { data: owners } = useOwnersRepository();
  const {
    data: consultationDocuments,
    add: addConsultationDocument,
    remove: removeConsultationDocument,
  } = useConsultationDocumentsRepository();
  const soapsRepo = useConsultationSoapsRepository();

  const patientsById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients]
  );
  const ownersById = useMemo(
    () => new Map(owners.map((owner) => [owner.id, owner])),
    [owners]
  );

  const activeConsultationDocuments = useMemo(() => {
    if (!activeConsultation) {
      return [];
    }
    return consultationDocuments
      .filter((document) => document.appointmentId === activeConsultation.id)
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime()
      );
  }, [activeConsultation, consultationDocuments]);

  const activeConsultationHistory = useMemo(() => {
    if (!activeConsultation) {
      return [];
    }

    return appointments
      .filter(
        (appointment) =>
          appointment.patientId === activeConsultation.patientId &&
          appointment.id !== activeConsultation.id
      )
      .sort(
        (left, right) =>
          new Date(right.startTime).getTime() -
          new Date(left.startTime).getTime()
      )
      .slice(0, 4);
  }, [activeConsultation, appointments]);

  const getPatient = (patientId: string) => patientsById.get(patientId);
  const getOwner = (appointment: Appointment) => {
    const patient = getPatient(appointment.patientId);
    return ownersById.get(appointment.ownerId || patient?.ownerId || "");
  };
  const { billingAppointment, billingInvoice, handleBillingConfirm, setBillingAppointment } =
    useAppointmentBilling({ completeWithBilling, getOwner, getPatient });

  const handleConsultationSaveDraft = async (
    payload: ConsultationDraftPayload,
    options?: SaveDraftOptions
  ) => {
    if (!activeConsultation) {
      return;
    }

    try {
      await updateAppointment(activeConsultation.id, payload.appointmentPatch);
      await updatePatient(activeConsultation.patientId, payload.patientPatch);
      onMove?.("in_progress", activeConsultation.id);

      setActiveConsultation((current) =>
        current
          ? {
              ...current,
              ...payload.appointmentPatch,
            }
          : current
      );

      if (!options?.silent) {
        toast.success("Consultation mise à jour.");
      }
    } catch (error) {
      console.error(error);
      if (!options?.silent) {
        toast.error("Impossible d’enregistrer la consultation.");
      }
      throw error;
    }
  };

  const handleConsultationComplete = async (
    payload: ConsultationDraftPayload
  ) => {
    if (!activeConsultation) {
      return;
    }

    // B1 : une consultation ne peut être clôturée que si la note SOAP a
    // été relue et validée (risque médico-légal sinon). Même règle que le
    // bouton, pour qu'aucun chemin ne la contourne.
    const blocker = closureBlocker(soapsRepo.forAppointment(activeConsultation.id));
    if (blocker) {
      toast.error(blocker);
      return;
    }

    try {
      const finalAppointmentPatch: Partial<Appointment> = {
        ...payload.appointmentPatch,
      };
      const patientPatch: Partial<Patient> = {
        ...payload.patientPatch,
        lastVisit: new Date().toISOString(),
      };

      await updateAppointment(activeConsultation.id, finalAppointmentPatch);
      await transitionAppointmentStatus(activeConsultation.id, "completed");
      void flowUndo.record(activeConsultation.id);
      await updatePatient(activeConsultation.patientId, patientPatch);

      await audit.log({
        action: "update",
        entity: "consultation",
        entityId: activeConsultation.id,
        payload: {
          patientId: activeConsultation.patientId,
          status: "completed",
          lastVisit: patientPatch.lastVisit,
        },
      });

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(
          `vetera:consultation-start:${activeConsultation.id}`
        );
      }

      const updatedAppointment: Appointment = {
        ...activeConsultation,
        ...finalAppointmentPatch,
        status: "completed",
      };

      onMove?.("completed", activeConsultation.id);
      setActiveConsultation(null);
      setBillingAppointment(updatedAppointment);
      toast.success("Consultation clôturée et déplacée dans Terminées.");
      const reminderType = medicalReminderTypeForAct(`${updatedAppointment.type} ${updatedAppointment.title ?? ""} ${updatedAppointment.reason ?? ""}`);
      if (reminderType) {
        announceMedicalActRecorded({
          id: `consultation:${updatedAppointment.id}`,
          patientId: updatedAppointment.patientId,
          type: reminderType,
          date: localToday(),
          note: updatedAppointment.reason || updatedAppointment.title,
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Impossible de clôturer la consultation.");
    }
  };

  const handleConsultationDocumentUpload = async (
    file: File,
    description?: string
  ) => {
    if (!activeConsultation) {
      throw new Error("Aucune consultation active.");
    }

    const patient = getPatient(activeConsultation.patientId);
    if (!patient) {
      throw new Error("Patient introuvable pour ce document.");
    }

    const dataUrl = await readFileAsDataUrl(file);
    const owner = getOwner(activeConsultation);

    await addConsultationDocument({
      appointmentId: activeConsultation.id,
      patientId: activeConsultation.patientId,
      ownerId: owner?.id,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      category: getDocumentCategory(file.type || ""),
      dataUrl,
      description: description?.trim() || undefined,
      createdBy: "local",
    } as Omit<ConsultationDocument, "id" | "createdAt" | "updatedAt">);

    await audit.log({
      action: "create",
      entity: "consultation",
      entityId: activeConsultation.id,
      payload: {
        documentName: file.name,
        category: getDocumentCategory(file.type || ""),
        sizeBytes: file.size,
      },
    });
  };

  const handleConsultationDocumentDelete = async (documentId: string) => {
    await removeConsultationDocument(documentId);
    toast.success("Document supprimé.");
  };

  const activeConsultationPatient = activeConsultation
    ? patientsById.get(activeConsultation.patientId)
    : undefined;
  const activeConsultationOwner = activeConsultation
    ? getOwner(activeConsultation)
    : undefined;

  // Closing and billing wait for a validated note: the same rule as the closing itself.
  const closingBlocker = activeConsultation
    ? closureBlocker(soapsRepo.forAppointment(activeConsultation.id))
    : null;

  return {
    activeConsultation,
    activeConsultationDocuments,
    closingBlocker,
    activeConsultationHistory,
    activeConsultationOwner,
    activeConsultationPatient,
    anesthesiaOpen,
    billingAppointment,
    billingInvoice,
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
  };
}

export type ConsultationSession = ReturnType<typeof useConsultationSession>;
