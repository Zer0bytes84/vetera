import { formatNumber } from "@/utils/display-format";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { type SectionCardItem } from "@/components/section-cards";

import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useTransactionsRepository,
  useUsersRepository,
} from "@/data/repositories";

import { useAudit } from "@/services/use-audit";
import type { Appointment, Owner, Patient } from "@/types/db";

import {
  DetailsTab,
  PatientRecord,
  PATIENTS_PAGE_SIZE,
  formatPatientDateTime,
  normalizeDate,
  PatientsProps,
} from "@/modules/patients/components/patients-shared";
import {
  isUpcomingVisit,
  isVisitOverdue,
  type PatientSort,
  sortPatientRecords,
} from "@/modules/patients/lib/patient-list";

export function usePatientsPageModel({ onNavigateToPatient }: PatientsProps) {
  const { data: users } = useUsersRepository();
  const { data: transactions } = useTransactionsRepository();
  const [searchTerm, setSearchTerm] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<PatientSort>("activity");
  const [currentPage, setCurrentPage] = useState(1);
  const [recentOwnersById, setRecentOwnersById] = useState<
    Record<string, Owner>
  >({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdPatientPrompt, setCreatedPatientPrompt] = useState<{
    owner?: Owner;
    patient: Patient;
  } | null>(null);
  const [recentlySavedPatientId, setRecentlySavedPatientId] = useState<
    string | null
  >(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null
  );
  const [detailsInitialTab, setDetailsInitialTab] =
    useState<DetailsTab>("info");

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const {
    data: patients,
    loading: loadingPatients,
    error: patientsError,
    refresh: refreshPatients,
    update: updatePatient,
    createWithOwner,
  } = usePatientsRepository();
  const { data: owners, update: updateOwner } = useOwnersRepository();
  const { data: appointments } = useAppointmentsRepository();
  const audit = useAudit();

  const hydratedOwners = useMemo(() => {
    const merged = new Map<string, Owner>();
    owners.forEach((owner) => merged.set(owner.id, owner));
    Object.values(recentOwnersById).forEach((owner) =>
      merged.set(owner.id, owner)
    );
    return Array.from(merged.values());
  }, [owners, recentOwnersById]);

  const ownersMap = useMemo(
    () => new Map(hydratedOwners.map((owner) => [owner.id, owner])),
    [hydratedOwners]
  );

  const appointmentsByPatient = useMemo(() => {
    const grouped = new Map<string, Appointment[]>();

    appointments.forEach((appointment) => {
      const current = grouped.get(appointment.patientId) ?? [];
      current.push(appointment);
      grouped.set(appointment.patientId, current);
    });

    return grouped;
  }, [appointments]);

  const visiblePatients = useMemo<PatientRecord[]>(() => {
    const query = deferredSearchTerm.trim().toLowerCase();

    const records = patients
      .map((patient) => {
        const owner = ownersMap.get(patient.ownerId);
        const patientAppointments = [
          ...(appointmentsByPatient.get(patient.id) ?? []),
        ].sort((left, right) => {
          const leftDate = normalizeDate(left.startTime)?.getTime() ?? 0;
          const rightDate = normalizeDate(right.startTime)?.getTime() ?? 0;
          return rightDate - leftDate;
        });

        const completedAppointments = patientAppointments.filter(
          (appointment) => appointment.status === "completed"
        );

        const upcomingAppointment = patientAppointments
          .filter((appointment) => isUpcomingVisit(appointment, new Date()))
          .slice()
          .sort((left, right) => {
            const leftDate = normalizeDate(left.startTime)?.getTime() ?? 0;
            const rightDate = normalizeDate(right.startTime)?.getTime() ?? 0;
            return leftDate - rightDate;
          })[0];

        const lastVisit =
          completedAppointments[0]?.startTime ?? patient.lastVisit;
        const searchIndex = [
          patient.name,
          patient.species,
          patient.breed,
          owner?.firstName,
          owner?.lastName,
          owner?.phone,
          owner?.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return {
          patient,
          owner,
          completedAppointments,
          upcomingAppointment,
          lastVisit,
          searchIndex,
        };
      })
      .filter((entry) => {
        if (
          speciesFilter !== "all" &&
          entry.patient.species !== speciesFilter
        ) {
          return false;
        }
        if (statusFilter !== "all" && entry.patient.status !== statusFilter) {
          return false;
        }
        if (query && !entry.searchIndex.includes(query)) {
          return false;
        }
        return true;
      });

    return sortPatientRecords(records, sortKey);
  }, [
    appointmentsByPatient,
    deferredSearchTerm,
    ownersMap,
    patients,
    sortKey,
    speciesFilter,
    statusFilter,
  ]);

  useEffect(() => {
    if (
      selectedPatientId &&
      !patients.some((patient) => patient.id === selectedPatientId)
    ) {
      setSelectedPatientId(null);
    }
  }, [patients, selectedPatientId]);

  useEffect(() => {
    if (!recentlySavedPatientId) {
      return;
    }

    const patientStillExists = patients.some(
      (patient) => patient.id === recentlySavedPatientId
    );
    if (!patientStillExists) {
      return;
    }

    const patientIsVisible = visiblePatients.some(
      (entry) => entry.patient.id === recentlySavedPatientId
    );

    if (!patientIsVisible) {
      setSearchTerm("");
      setSpeciesFilter("all");
      setStatusFilter("all");
      toast.info(
        "Les filtres ont été réinitialisés pour garder le dossier visible après modification."
      );
    }

    setSelectedPatientId(recentlySavedPatientId);
    setRecentlySavedPatientId(null);
  }, [patients, recentlySavedPatientId, visiblePatients]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchTerm, sortKey, speciesFilter, statusFilter]);

  // Listen for new patient event from sidebar
  useEffect(() => {
    const handleNewPatient = () => {
      setIsCreateOpen(true);
    };
    window.addEventListener("vetera:new-patient", handleNewPatient);
    return () => {
      window.removeEventListener("vetera:new-patient", handleNewPatient);
    };
  }, []);

  const selectedPatient =
    patients.find((patient) => patient.id === selectedPatientId) ?? null;

  const speciesOptions = useMemo(
    () =>
      Array.from(
        new Set(patients.map((patient) => patient.species).filter(Boolean))
      ).sort((left, right) => left.localeCompare(right, "fr")),
    [patients]
  );

  const sectionCards = useMemo<SectionCardItem[]>(() => {
    const now = new Date();
    const plural = (count: number, word: string) =>
      `${formatNumber(count)} ${word}${count > 1 ? "s" : ""}`;
    const living = patients.filter((patient) => patient.status !== "decede");
    const species = (name: string) =>
      living.filter((p) => (p.species || "").toLowerCase().includes(name)).length;
    const canine = species("chien");
    const feline = species("chat");
    const others = living.length - canine - feline;
    const households = new Set(living.map((patient) => patient.ownerId)).size;
    const newInMonth = living.filter((patient) => {
      const created = normalizeDate(patient.createdAt);
      return !!created && now.getTime() - created.getTime() <= 30 * 86400000;
    }).length;

    const underTreatment = patients.filter((p) => p.status === "traitement").length;
    const hospitalized = patients.filter((p) => p.status === "hospitalise").length;
    const monitoredPatients = underTreatment + hospitalized;

    const upcoming = appointments
      .filter((appointment) => isUpcomingVisit(appointment, now))
      .sort(
        (left, right) =>
          (normalizeDate(left.startTime)?.getTime() ?? 0) -
          (normalizeDate(right.startTime)?.getTime() ?? 0)
      );
    const upcomingPatients = new Set(upcoming.map((a) => a.patientId)).size;
    const next = upcoming[0];
    const nextName = next
      ? patients.find((patient) => patient.id === next.patientId)?.name
      : undefined;

    // Same last visit as the list: latest finished visit, else the record's own.
    const overdue = living.filter((patient) => {
      const finished = (appointmentsByPatient.get(patient.id) ?? [])
        .filter((appointment) => appointment.status === "completed")
        .map((appointment) => appointment.startTime)
        .sort()
        .at(-1);
      return isVisitOverdue(patient, finished ?? patient.lastVisit, now);
    }).length;

    return [
      {
        title: "Patients actifs",
        value: formatNumber(living.length),
        badge: newInMonth > 0 ? `+${plural(newInMonth, "nouveau")} sur 30 jours` : undefined,
        tone: newInMonth > 0 ? "positive" : undefined,
        detailRow: [
          plural(households, "foyer"),
          plural(canine, "chien"),
          plural(feline, "chat"),
          others > 0 ? plural(others, "autre") : "",
        ]
          .filter(Boolean)
          .join(" · "),
        footerTitle: "Patients actifs",
        footerDescription: "Patients enregistrés, hors décédés",
      },
      {
        title: "Suivi clinique",
        value: formatNumber(monitoredPatients),
        badge: monitoredPatients > 0 ? "Surveillance active" : "Aucun sous surveillance",
        tone: monitoredPatients > 0 ? "watch" : "positive",
        detailRow: `${formatNumber(underTreatment)} sous traitement · ${plural(hospitalized, "hospitalisé")}`,
        footerTitle: "Sous traitement ou hospitalisés",
        footerDescription: "Patients sous traitement ou hospitalisés",
      },
      {
        title: "Rendez-vous à venir",
        value: formatNumber(upcoming.length),
        badge: upcoming.length > 0 ? `pour ${plural(upcomingPatients, "patient")}` : "Aucun de prévu",
        detailRow: next
          ? `Prochain : ${formatPatientDateTime(next.startTime)}${nextName ? ` · ${nextName}` : ""}`
          : "Planifiez depuis l'Agenda ou le dossier",
        footerTitle: "Rendez-vous planifiés ou confirmés",
        footerDescription: "Rendez-vous planifiés ou confirmés à venir",
      },
      {
        title: "Relances à prévoir",
        value: formatNumber(overdue),
        badge: overdue > 0 ? "Sans visite depuis plus de 90 jours" : "Tous vus dans les 90 jours",
        tone: overdue > 0 ? "critical" : "positive",
        detailRow: "Depuis la dernière visite terminée, hors décédés",
        footerTitle: "Sans visite depuis 90 jours",
        footerDescription: "Patients sans visite depuis 90 jours",
      },
    ];
  }, [appointments, appointmentsByPatient, patients]);

  const openPatientDetails = (patient: Patient, tab: DetailsTab = "info") => {
    setDetailsInitialTab(tab);
    setSelectedPatientId(patient.id);
  };

  const handlePatientSaved = useCallback((patientId: string) => {
    window.setTimeout(() => {
      setRecentlySavedPatientId(patientId);
    }, 0);
  }, []);

  const resetFilters = () => {
    setSearchTerm("");
    setSpeciesFilter("all");
    setStatusFilter("all");
    setSortKey("activity");
    setCurrentPage(1);
  };
  const filtersActive =
    searchTerm.trim() !== "" ||
    speciesFilter !== "all" ||
    statusFilter !== "all" ||
    sortKey !== "activity";

  const totalPages = Math.max(
    1,
    Math.ceil(visiblePatients.length / PATIENTS_PAGE_SIZE)
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * PATIENTS_PAGE_SIZE;
    return visiblePatients.slice(start, start + PATIENTS_PAGE_SIZE);
  }, [currentPage, visiblePatients]);

  const pageStart = visiblePatients.length
    ? (currentPage - 1) * PATIENTS_PAGE_SIZE + 1
    : 0;
  const pageEnd = Math.min(
    currentPage * PATIENTS_PAGE_SIZE,
    visiblePatients.length
  );

  const paginationRange = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, totalPages];
    }

    if (currentPage >= totalPages - 2) {
      return [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, currentPage - 1, currentPage, currentPage + 1, totalPages];
  }, [currentPage, totalPages]);

  const createAppointmentForPatient = useCallback((patient: Patient) => {
    const pendingAppointment = {
      ownerId: patient.ownerId,
      patientId: patient.id,
    };

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "vetera:pending-appointment",
        JSON.stringify(pendingAppointment)
      );
      window.location.hash = "#/agenda";
      // La vue agenda consomme ce marqueur à son montage (useAgendaPageModel)
      // ; l'événement synchrone couvre le cas où elle serait déjà montée.
      // Pas de setTimeout : le délai arbitraire créait une course si la vue
      // mettait plus de temps à monter.
      window.dispatchEvent(
        new CustomEvent("vetera:new-appointment", {
          detail: pendingAppointment,
        })
      );
    }

    setCreatedPatientPrompt(null);
  }, []);

  const handleCreatePatient = useCallback(
    async ({
      selectedOwnerId,
      owner,
      patient,
    }: {
      selectedOwnerId: string | null;
      owner: Partial<Owner>;
      patient: Partial<Patient>;
    }) => {
      try {
        const createdBundle = await createWithOwner({
          ownerId: selectedOwnerId,
          owner: {
            firstName: owner.firstName || "",
            lastName: owner.lastName || "",
            phone: owner.phone || "",
            email: owner.email || "",
            address: owner.address || "",
            city: owner.city || "",
          },
          patient: {
            name: patient.name || "",
            species: patient.species || "",
            breed: patient.breed || "",
            sex: (patient.sex || "M") as Patient["sex"],
            status: (patient.status || "sante") as Patient["status"],
          },
        });

        if (!createdBundle?.patient) {
          throw new Error("La création du patient a échoué.");
        }

        await audit.log({
          action: "create",
          entity: "patient",
          entityId: createdBundle.patient.id,
          payload: {
            name: createdBundle.patient.name,
            species: createdBundle.patient.species,
          },
        });

        toast.success("Dossier patient créé.", {
          description: "Vous pouvez maintenant créer le rendez-vous associé.",
        });
        setIsCreateOpen(false);
        setRecentlySavedPatientId(createdBundle.patient.id);
        const createdOwner = createdBundle.owner;
        if (createdOwner) {
          setRecentOwnersById((current) => ({
            ...current,
            [createdOwner.id]: createdOwner,
          }));
        }
        setCreatedPatientPrompt({
          owner:
            createdBundle.owner ||
            ownersMap.get(createdBundle.patient.ownerId) ||
            (selectedOwnerId ? ownersMap.get(selectedOwnerId) : undefined),
          patient: createdBundle.patient,
        });
      } catch (error) {
        console.error(error);
        const message =
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : "Impossible de créer le dossier patient.";
        if (
          message.toLowerCase().includes("database is locked") ||
          message.toLowerCase().includes("code: 5")
        ) {
          toast.error("Base occupée, réessayez dans quelques secondes.");
        } else {
          toast.error(message);
        }
        throw new Error(message);
      }
    },
    [audit, createWithOwner, ownersMap]
  );
  return {
    appointments,
    audit,
    createAppointmentForPatient,
    createdPatientPrompt,
    currentPage,
    detailsInitialTab,
    handleCreatePatient,
    handlePatientSaved,
    hydratedOwners,
    isCreateOpen,
    loadingPatients,
    onNavigateToPatient,
    openPatientDetails,
    owners,
    ownersMap,
    pageEnd,
    pageStart,
    paginatedPatients,
    paginationRange,
    patientsError,
    refreshPatients,
    filtersActive,
    resetFilters,
    searchTerm,
    sectionCards,
    selectedPatient,
    setCreatedPatientPrompt,
    setCurrentPage,
    setDetailsInitialTab,
    setIsCreateOpen,
    setSearchTerm,
    setSelectedPatientId,
    setSortKey,
    setSpeciesFilter,
    setStatusFilter,
    speciesFilter,
    speciesOptions,
    sortKey,
    statusFilter,
    totalPages,
    transactions,
    updateOwner,
    updatePatient,
    users,
    visiblePatients,
  };
}

export type PatientsViewProps = ReturnType<typeof usePatientsPageModel>;
