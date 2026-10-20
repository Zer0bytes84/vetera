import { formatNumber } from "@/utils/display-format";
import { useFlowUndo } from "@/modules/visit-flow/use-flow-undo";
import { useConsultationSession } from "@/modules/consultation-workspace/use-consultation-session";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { type SectionCardItem } from "@/components/section-cards";

import { useFocus } from "@/contexts/focus-provider";
import {
  useAppointmentsRepository,
  useConsultationDocumentsRepository,
  useOwnersRepository,
  usePatientsRepository,
} from "@/data/repositories";
import { PRE_CONSULTATION_STATUSES } from "@/domain/clinical/scheduling";

import { useAppointmentReminderSync } from "@/services/reminderService";

import type {
  Appointment,
  Owner,
  Patient,
} from "@/types/db";
import {
  CliniqueProps,
  ListTab,
  DetailTab,
  normalizeDate,
  isToday,
  getSpeciesIcon,
  formatOwnerName,
  generatePrescriptionPDF,
} from "@/modules/clinique/components/clinique-shared";

export function useCliniquePageModel({ onNavigate }: CliniqueProps) {
  const { t } = useTranslation();
  useAppointmentReminderSync();
  const { focus, clearFocus } = useFocus();
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  // The journal is written by the database; this only names who acted.
  const flowUndo = useFlowUndo();
  const recordFlowRef = useRef(flowUndo.record);
  useEffect(() => {
    recordFlowRef.current = flowUndo.record;
  }, [flowUndo.record]);
  const deferredSearch = useDeferredValue(searchQuery);
  const [listTab, setListTab] = useState<ListTab>("all");
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
  const session = useConsultationSession({
    onMove: (status, appointmentId) => {
      if (status === "in_progress" || status === "completed") {
        setListTab(status);
      }
      setSelectedAppointmentId(appointmentId);
    },
  });
  const {
    activeConsultation,
    activeConsultationPatient,
    setActiveConsultation,
    setAnesthesiaOpen,
    setHospitalizationOpen,
    setPrescriptionOpen,
  } = session;

  const {
    data: appointments,
    loading: loadingAppointments,
    transitionStatus: transitionAppointmentStatus,
  } = useAppointmentsRepository();
  const { data: patients } = usePatientsRepository();
  const { data: owners } = useOwnersRepository();
  const { data: consultationDocuments } = useConsultationDocumentsRepository();

  const patientsById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients]
  );

  useEffect(() => {
    if (focus) {
      if (focus.kind === "appointment") {
        const timer = setTimeout(() => {
          setSelectedAppointmentId(focus.id);
          clearFocus();
        }, 0);
        return () => clearTimeout(timer);
      }
      if (focus.kind === "patient") {
        const patientAppts = appointments
          .filter((a) => a.patientId === focus.id)
          .sort(
            (a, b) =>
              new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          );
        if (patientAppts.length > 0) {
          const timer = setTimeout(() => {
            setSelectedAppointmentId(patientAppts[0].id);
            clearFocus();
          }, 0);
          return () => clearTimeout(timer);
        }
        const timer = setTimeout(() => {
          clearFocus();
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [focus, appointments, clearFocus]);
  const ownersById = useMemo(
    () => new Map(owners.map((owner) => [owner.id, owner])),
    [owners]
  );

  const todaysAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => {
          const date = normalizeDate(appointment.startTime);
          return date ? isToday(date) : false;
        })
        .sort(
          (left, right) =>
            new Date(left.startTime).getTime() -
            new Date(right.startTime).getTime()
        ),
    [appointments]
  );

  const filteredAppointments = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return todaysAppointments.filter((appointment) => {
      if (listTab !== "all" && appointment.status !== listTab) {
        return false;
      }

      if (!query) {
        return true;
      }

      const patient = patientsById.get(appointment.patientId);
      const owner = ownersById.get(
        appointment.ownerId || patient?.ownerId || ""
      );

      const searchIndex = [
        patient?.name,
        patient?.species,
        patient?.breed,
        owner?.firstName,
        owner?.lastName,
        appointment.type,
        appointment.reason,
        appointment.diagnosis,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchIndex.includes(query);
    });
  }, [deferredSearch, listTab, ownersById, patientsById, todaysAppointments]);

  const [prevFilteredAppts, setPrevFilteredAppts] = useState<any[]>([]);
  if (prevFilteredAppts !== filteredAppointments) {
    setPrevFilteredAppts(filteredAppointments);
    if (filteredAppointments.length === 0) {
      setSelectedAppointmentId(null);
    } else if (
      !(
        selectedAppointmentId &&
        filteredAppointments.some((item) => item.id === selectedAppointmentId)
      )
    ) {
      setSelectedAppointmentId(filteredAppointments[0].id);
    }
  }

  const selectedAppointment = useMemo(
    () =>
      selectedAppointmentId
        ? (appointments.find(
            (appointment) => appointment.id === selectedAppointmentId
          ) ?? null)
        : null,
    [appointments, selectedAppointmentId]
  );

  const [consultationOpenRequest, setConsultationOpenRequest] = useState(0);
  useEffect(() => {
    const open = () => setConsultationOpenRequest(value => value + 1);
    window.addEventListener("vetera:open-consultation", open);
    return () => window.removeEventListener("vetera:open-consultation", open);
  }, []);
  // Consume the "pending consultation start" hint set by another view
  // (e.g. AgendaListView's Démarrer button). When the user navigates
  // from Agenda into Clinique with that flag set, we auto-open the
  // inline consultation for the matching appointment so a single click
  // is enough — no need to re-select the row in Clinique.
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (loadingAppointments) {
      return;
    }
    const pendingId = window.sessionStorage.getItem(
      "vetera:pending-consultation-start"
    );
    if (!pendingId) {
      return;
    }

    // Wait until target is found or appointments are fully loaded
    const target = appointments.find((a) => a.id === pendingId);
    if (!target) {
      return;
    }

    window.sessionStorage.removeItem("vetera:pending-consultation-start");

    if (
      target.status === "completed" ||
      target.status === "cancelled" ||
      target.status === "no_show"
    ) {
      return;
    }

    // Sync the right-side "Dossier sélectionné" panel with the appointment
    // we are about to open. Wrapped in flushSync so React commits this in
    // the same tick as the active-consultation state update below — this
    // is a one-shot init-on-mount, not a continuous sync.
    flushSync(() => {
      setSelectedAppointmentId(target.id);
    });
    if (PRE_CONSULTATION_STATUSES.includes(target.status)) {
      transitionAppointmentStatus(target.id, "in_progress")
        .then((updatedAppointment) => {
          void recordFlowRef.current(target.id);
          flushSync(() => {
            setActiveConsultation(updatedAppointment);
            setListTab("in_progress");
          });
        })
        .catch((error) => {
          console.error("Failed to start consultation from agenda", error);
        });
    } else if (target.status === "in_progress") {
      flushSync(() => {
        setActiveConsultation(target);
      });
    }
  }, [appointments, loadingAppointments, transitionAppointmentStatus, consultationOpenRequest, setActiveConsultation]);

  // Palette-driven quick actions (⌘K): listen for medical action events
  // dispatched by the CommandPalette. If a consultation is already active
  // for a patient, reuse that patient. Otherwise, surface the
  // QuickPatientPicker so the user can choose which patient to attach
  // the new prescription/hospitalization/anesthesia to.
  const [palettePickerOpen, setPalettePickerOpen] = useState(false);
  const [palettePickerAction, setPalettePickerAction] = useState<
    "prescription" | "hospitalization" | "anesthesia" | null
  >(null);
  const [palettePatient, setPalettePatient] = useState<Patient | null>(null);

  const selectedPatient = selectedAppointment
    ? patientsById.get(selectedAppointment.patientId)
    : undefined;

  const handlePalettePatientPicked = useCallback(
    (patient: Patient) => {
      setPalettePatient(patient);
      if (palettePickerAction === "prescription") {
        setPrescriptionOpen(true);
      } else if (palettePickerAction === "hospitalization") {
        setHospitalizationOpen(true);
      } else if (palettePickerAction === "anesthesia") {
        setAnesthesiaOpen(true);
      }
      setPalettePickerOpen(false);
    },
    [palettePickerAction, setAnesthesiaOpen, setHospitalizationOpen, setPrescriptionOpen]
  );

  const selectedOwner = selectedAppointment
    ? ownersById.get(
        selectedAppointment.ownerId || selectedPatient?.ownerId || ""
      )
    : undefined;

  const patientHistory = useMemo(() => {
    if (!selectedPatient) {
      return [];
    }

    return appointments
      .filter(
        (appointment) =>
          appointment.patientId === selectedPatient.id &&
          appointment.status === "completed"
      )
      .sort(
        (left, right) =>
          new Date(right.startTime).getTime() -
          new Date(left.startTime).getTime()
      )
      .slice(0, 6);
  }, [appointments, selectedPatient]);

  const selectedPatientDocuments = useMemo(() => {
    if (!selectedPatient) {
      return [];
    }
    return consultationDocuments
      .filter((document) => document.patientId === selectedPatient.id)
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime()
      )
      .slice(0, 24);
  }, [consultationDocuments, selectedPatient]);


  const stats = useMemo(
    () => ({
      total: todaysAppointments.length,
      completed: todaysAppointments.filter(
        (appointment) => appointment.status === "completed"
      ).length,
      inProgress: todaysAppointments.filter(
        (appointment) => appointment.status === "in_progress"
      ).length,
      pending: todaysAppointments.filter((appointment) =>
        PRE_CONSULTATION_STATUSES.includes(appointment.status)
      ).length,
    }),
    [todaysAppointments]
  );

  const sectionCards = useMemo<SectionCardItem[]>(() => {
    const completionRate =
      stats.total > 0
        ? Math.round((stats.completed / stats.total) * 100)
        : 100;
    return [
      {
        title: "Consultations",
        value: formatNumber(stats.total),
        change: completionRate,
        changeKind: "rate",
        changeBase: stats.total,
        changeLabel: "d'avancement du jour",
        trend: "neutral",
        detailRow: `${stats.completed} clôturée${stats.completed > 1 ? "s" : ""} · ${stats.inProgress} en cours · ${stats.pending} en attente`,
        footerTitle: "Consultations du jour",
        footerDescription: "Flux du jour",
      },
      {
        title: "En cours",
        value: formatNumber(stats.inProgress),
        badge:
          stats.inProgress > 0 ? "En salle d'examen" : "Aucun acte en cours",
        tone: stats.inProgress > 0 ? "watch" : "quiet",
        trend: stats.inProgress > 0 ? "up" : "neutral",
        detailRow: `${stats.inProgress} dossier médical actif · Notes SOAP en rédaction`,
        footerTitle: "Notes à compléter",
        footerDescription: "À documenter",
      },
      {
        title: "Terminées",
        value: formatNumber(stats.completed),
        change: stats.completed,
        changeKind: "count",
        changeLabel: "clôturées",
        tone: "positive",
        trend: "up",
        detailRow: `${stats.completed} consultation${stats.completed > 1 ? "s" : ""} validée${stats.completed > 1 ? "s" : ""} · Prêt pour facturation`,
        footerTitle: "Consultations clôturées",
        footerDescription: "Clôturées",
      },
      {
        title: "En attente",
        value: formatNumber(stats.pending),
        badge: stats.pending > 0 ? "Salle d'attente" : "File d'attente vide",
        tone: stats.pending > 0 ? "watch" : "positive",
        trend: stats.pending > 0 ? "up" : "neutral",
        detailRow: `${stats.pending} patient en attente · Prise en charge immédiate`,
        footerTitle: "Prises en charge à démarrer",
        footerDescription: "À lancer",
      },
    ];
  }, [stats.completed, stats.inProgress, stats.pending, stats.total]);

  const getPatient = (patientId: string) => patientsById.get(patientId);
  const getOwner = (appointment: Appointment) => {
    const patient = getPatient(appointment.patientId);
    return ownersById.get(appointment.ownerId || patient?.ownerId || "");
  };
  const moveSelectionToStatusTab = (
    status: Appointment["status"],
    appointmentId: string
  ) => {
    if (status === "in_progress" || status === "completed") {
      setListTab(status);
    }
    setSelectedAppointmentId(appointmentId);
  };

  const handleStatusAction = async (appointment: Appointment) => {
    try {
      if (PRE_CONSULTATION_STATUSES.includes(appointment.status)) {
        const openedAppointment = await transitionAppointmentStatus(
          appointment.id,
          "in_progress"
        );
        void flowUndo.record(appointment.id);
        setActiveConsultation(openedAppointment);
        moveSelectionToStatusTab("in_progress", appointment.id);
        toast.success(
          "La consultation a été démarrée et déplacée dans En cours."
        );
        return;
      }

      if (appointment.status === "in_progress") {
        setActiveConsultation(appointment);
      }
    } catch (error) {
      console.error(error);
      toast.error("Impossible de mettre à jour le statut de la consultation.");
    }
  };


  const handleCallOwner = (owner?: Owner) => {
    if (!owner?.phone) {
      toast.error("Aucun numéro n’est enregistré pour ce propriétaire.");
      return;
    }

    window.open(`tel:${owner.phone}`);
  };

  const handlePrescription = () => {
    if (!(selectedAppointment && selectedPatient)) {
      return;
    }

    if (
      selectedAppointment.status !== "completed" &&
      !selectedAppointment.treatment
    ) {
      toast.error(
        "Clôturez d’abord la consultation avant de générer l’ordonnance."
      );
      return;
    }

    generatePrescriptionPDF({
      patientName: selectedPatient.name,
      ownerName: formatOwnerName(selectedOwner),
      species: selectedPatient.species,
      breed: selectedPatient.breed,
      treatment: selectedAppointment.treatment,
      diagnosis: selectedAppointment.diagnosis,
    });

    toast.success("Ordonnance générée et téléchargée.");
  };

  const visibleCount = filteredAppointments.length;
  const SelectedSpeciesIcon = getSpeciesIcon(selectedPatient?.species);
  return {
    SelectedSpeciesIcon,
    activeConsultation,
    activeConsultationPatient,
    detailTab,
    filteredAppointments,
    getOwner,
    getPatient,
    handleCallOwner,
    handlePalettePatientPicked,
    handlePrescription,
    handleStatusAction,
    listTab,
    loadingAppointments,
    onNavigate,
    palettePatient,
    palettePickerAction,
    palettePickerOpen,
    patientHistory,
    patientsById,
    searchQuery,
    sectionCards,
    selectedAppointment,
    selectedAppointmentId,
    selectedOwner,
    selectedPatient,
    selectedPatientDocuments,
    session,
    setDetailTab,
    setListTab,
    setPalettePatient,
    setPalettePickerAction,
    setPalettePickerOpen,
    setSearchQuery,
    setSelectedAppointmentId,
    stats,
    t,
    visibleCount,
  };
}

export type CliniqueViewProps = ReturnType<typeof useCliniquePageModel>;
