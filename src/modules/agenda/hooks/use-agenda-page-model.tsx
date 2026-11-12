import { formatNumber, formatPersonName } from "@/utils/display-format";
import { TERMINAL_APPOINTMENT_STATUSES } from "@/domain/clinical/scheduling";
import type { BusySlot } from "../components/agenda-shared";
import { useFlowUndo } from "@/modules/visit-flow/use-flow-undo";
import { startInFlux } from "@/modules/flow-board/open-in-flux";
import type { View } from "@/types";
import { agendaDayStats, isActiveBooking } from "../components/agenda-slots";
import { findDossiers, selectedDossierSearchLabel } from "../quick-search";
import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { type SectionCardItem } from "@/components/section-cards";

import { APPOINTMENT_STATUS_META } from "@/config/status-meta";
import { useFocus } from "@/contexts/focus-provider";
import {
  useAppointmentRecurrencesRepository,
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useUsersRepository,
} from "@/data/repositories";

import { useAudit } from "@/services/use-audit";
import { generateId } from "@/services/sqlite/database";
import { useRooms } from "@/modules/rooms/use-rooms";
import { roomLabel } from "@/modules/rooms/store";
import type {
  Appointment,
  AppointmentRecurrence,
  RecurrenceFrequency,
} from "@/types/db";
import {
  APPOINTMENT_TYPES,
  CALENDAR_START_HOUR,
  CALENDAR_END_HOUR,
  DAY_HOUR_HEIGHT,
  TABLE_TABS,
  ViewMode,
  TableTab,
  AgendaTableRow,
  normalizeDate,
  formatDateInput,
  isSameDay,
  formatTime,
  formatTimeCompact,
  formatDateLabel,
  formatDateTimeLabel,
  formatDuration,
  getTimePosition,
  getWeekDays,
  getMonthDays,
  formatOwnerName,
  normalizeEntityId,
  getAppointmentPresentation,
} from "@/modules/agenda/components/agenda-shared";

export function useAgendaPageModel(onNavigate?: (view: View) => void) {
  const { t } = useTranslation();
  const { focus, clearFocus } = useFocus();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [appointmentPendingDelete, setAppointmentPendingDelete] =
    useState<Appointment | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [editingAppointmentId, setEditingAppointmentId] = useState<
    string | null
  >(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [personSearchTerm, setPersonSearchTerm] = useState("");
  const [ownerSearchTerm, setOwnerSearchTerm] = useState("");
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedVetId, setSelectedVetId] = useState("");
  const [selectedType, setSelectedType] =
    useState<Appointment["type"]>("Consultation");
  const [formDate, setFormDate] = useState(formatDateInput(new Date()));
  const [formTime, setFormTime] = useState("09:00");
  const [duration, setDuration] = useState(15);
  const [reason, setReason] = useState("");
  const [formRoom, setFormRoom] = useState("");
  const { active: activeRooms, rooms } = useRooms();
  const defaultRoomId = activeRooms[0]?.id ?? "";
  const selectedRoom = formRoom || defaultRoomId;
  // Active rooms, plus the archived room of an appointment being edited so
  // saving it never moves it to another room.
  const roomOptions = useMemo(() => {
    const options = activeRooms.map((room) => ({ archived: false, label: room.name, value: room.id }));
    if (selectedRoom && !options.some((option) => option.value === selectedRoom)) {
      options.push({ archived: true, label: roomLabel(selectedRoom, rooms) ?? selectedRoom, value: selectedRoom });
    }
    return options;
  }, [activeRooms, rooms, selectedRoom]);
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] =
    useState<RecurrenceFrequency>("weekly");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [recurrenceMaxOccurrences, setRecurrenceMaxOccurrences] = useState<
    number | null
  >(null);
  const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState<number[]>(
    []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [vetFilter, setVetFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tableTab, setTableTab] = useState<TableTab>("selection");

  const {
    data: appointments,
    loading: loadingAppointments,
    saveAppointment,
    transitionStatus,
    remove,
  } = useAppointmentsRepository();

  const flowUndo = useFlowUndo();
  const handleAppointmentStatusTransition = async (
    appointment: Appointment,
    nextStatus: Appointment["status"]
  ) => {
    try {
      await transitionStatus(appointment.id, nextStatus);
      void flowUndo.confirm(appointment.id, APPOINTMENT_STATUS_META[nextStatus].label);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de mettre à jour le rendez-vous."
      );
    }
  };

  // « Ouvrir » in the list starts the visit in Flux: Flux is the one place
  // where a visit moves on (see modules/flow-board/open-in-flux).
  const openAppointmentInFlux = (appointment: Appointment) => {
    if (onNavigate) {
      startInFlux(appointment.id, onNavigate);
    }
  };

  useEffect(() => {
    if (focus) {
      if (focus.kind === "appointment") {
        setSelectedAppointmentId(focus.id);
        const appt = appointments.find((a) => a.id === focus.id);
        if (appt) {
          setSelectedDate(new Date(appt.startTime));
        }
        clearFocus();
      } else if (focus.kind === "patient") {
        const patientAppts = appointments
          .filter((a) => a.patientId === focus.id)
          .sort(
            (a, b) =>
              new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          );
        if (patientAppts.length > 0) {
          setSelectedAppointmentId(patientAppts[0].id);
          setSelectedDate(new Date(patientAppts[0].startTime));
        }
        clearFocus();
      }
    }
  }, [focus, appointments, clearFocus]);
  const recurrencesStore = useAppointmentRecurrencesRepository();
  const { data: patients } = usePatientsRepository();
  const { data: owners } = useOwnersRepository();
  const { data: users } = useUsersRepository();
  const audit = useAudit();

  useEffect(() => {
    const interval = window.setInterval(
      () => setCurrentTime(new Date()),
      60_000
    );
    return () => window.clearInterval(interval);
  }, []);

  const vets = useMemo(
    () =>
      users.filter(
        (user) =>
          user.status === "active" &&
          (user.role === "vet_principal" || user.role === "vet_adjoint")
      ),
    [users]
  );

  const patientsById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients]
  );
  const ownersById = useMemo(
    () => new Map(owners.map((owner) => [owner.id, owner])),
    [owners]
  );
  const usersById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users]
  );
  const filteredOwners = useMemo(() => {
    const query = ownerSearchTerm.trim().toLowerCase();
    if (!query) {
      return owners;
    }

    return owners.filter((owner) =>
      [owner.firstName, owner.lastName, owner.phone, owner.email, owner.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [ownerSearchTerm, owners]);

  const patientsForSelectedOwner = useMemo(() => {
    const ownerId = normalizeEntityId(selectedOwnerId);
    if (!ownerId) {
      return patients;
    }

    return patients.filter(
      (patient) => normalizeEntityId(patient.ownerId) === ownerId
    );
  }, [patients, selectedOwnerId]);

  const filteredPatientsForForm = useMemo(() => {
    const query = patientSearchTerm.trim().toLowerCase();
    if (!query) {
      return patientsForSelectedOwner;
    }

    return patientsForSelectedOwner.filter((patient) => {
      const owner = ownersById.get(patient.ownerId);
      const searchIndex = [
        patient.name,
        patient.species,
        patient.breed,
        owner?.firstName,
        owner?.lastName,
        owner?.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchIndex.includes(query);
    });
  }, [ownersById, patientSearchTerm, patientsForSelectedOwner]);

  const unifiedAppointmentMatches = useMemo(() => {
    if (!personSearchTerm.trim()) {
      return [];
    }

    const matches = findDossiers(
      patients.filter((patient) => !patient.archivedAt),
      ownersById,
      personSearchTerm
    );

    // The dossier already chosen stays listed while its pre-filled label is
    // untouched, even if its owner record lacks the words searched for.
    const selected = selectedPatientId
      ? patientsById.get(selectedPatientId)
      : undefined;
    if (
      selected &&
      !matches.some((entry) => entry.patient.id === selected.id) &&
      personSearchTerm.trim() ===
        selectedDossierSearchLabel(selected.name, ownersById.get(selected.ownerId))
    ) {
      return [{ owner: ownersById.get(selected.ownerId), patient: selected, searchIndex: "" }, ...matches];
    }
    return matches;
  }, [ownersById, patients, patientsById, personSearchTerm, selectedPatientId]);

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();

    appointments.forEach((appointment) => {
      const start = normalizeDate(appointment.startTime);
      if (!start) {
        return;
      }

      const key = formatDateInput(start);
      const current = map.get(key) ?? [];
      current.push(appointment);
      map.set(key, current);
    });

    map.forEach((value, key) => {
      map.set(
        key,
        value
          .slice()
          .sort(
            (left, right) =>
              new Date(left.startTime).getTime() -
              new Date(right.startTime).getTime()
          )
      );
    });

    return map;
  }, [appointments]);

  const getAppointmentsForDate = (date: Date) =>
    appointmentsByDate.get(formatDateInput(date)) ?? [];

  const dailyAppointments = useMemo(
    () => appointmentsByDate.get(formatDateInput(selectedDate)) ?? [],
    [appointmentsByDate, selectedDate]
  );

  const appointmentsByVet = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    dailyAppointments.forEach((appointment) => {
      const current = map.get(appointment.vetId) ?? [];
      current.push(appointment);
      map.set(appointment.vetId, current);
    });
    return map;
  }, [dailyAppointments]);

  // Other bookings of the chosen veterinarian or room that day, with the
  // same rule as the conflict check run on save.
  const timeBusySlots = useMemo<BusySlot[]>(() => {
    const vetId = selectedVetId || vets[0]?.id || "";
    const [year, month, day] = formDate.split("-").map(Number);
    return appointments.flatMap((appointment) => {
      if (appointment.id === editingAppointmentId) return [];
      if (TERMINAL_APPOINTMENT_STATUSES.includes(appointment.status)) return [];
      const sameVet = Boolean(vetId) && appointment.vetId === vetId;
      const sameRoom = Boolean(selectedRoom) && appointment.room === selectedRoom;
      if (!sameVet && !sameRoom) return [];
      const start = new Date(appointment.startTime);
      const end = new Date(appointment.endTime);
      if (start.getFullYear() !== year || start.getMonth() + 1 !== month || start.getDate() !== day) return [];
      const endMinutes = end.toDateString() === start.toDateString() ? end.getHours() * 60 + end.getMinutes() : 24 * 60;
      return [
        {
          end: endMinutes,
          label: patientsById.get(appointment.patientId)?.name ?? "un autre patient",
          start: start.getHours() * 60 + start.getMinutes(),
        },
      ];
    });
  }, [appointments, editingAppointmentId, formDate, patientsById, selectedRoom, selectedVetId, vets]);

  const selectedAppointment = useMemo(
    () =>
      selectedAppointmentId
        ? (appointments.find(
            (appointment) => appointment.id === selectedAppointmentId
          ) ?? null)
        : null,
    [appointments, selectedAppointmentId]
  );

  const selectedPatient = selectedAppointment
    ? patientsById.get(selectedAppointment.patientId)
    : undefined;
  const selectedOwner = selectedAppointment
    ? ownersById.get(
        selectedAppointment.ownerId || selectedPatient?.ownerId || ""
      )
    : undefined;
  const selectedVet = selectedAppointment
    ? usersById.get(selectedAppointment.vetId)
    : undefined;

  useEffect(() => {
    if (
      selectedAppointmentId &&
      !appointments.some((item) => item.id === selectedAppointmentId)
    ) {
      setSelectedAppointmentId(null);
    }
  }, [appointments, selectedAppointmentId]);

  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours();
    if (hours < CALENDAR_START_HOUR || hours >= CALENDAR_END_HOUR + 1) {
      return null;
    }
    return getTimePosition(currentTime, DAY_HOUR_HEIGHT);
  }, [currentTime]);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const monthDays = useMemo(() => getMonthDays(selectedDate), [selectedDate]);

  const previousDayAppointments = useMemo(() => {
    const previous = new Date(selectedDate);
    previous.setDate(previous.getDate() - 1);
    return appointmentsByDate.get(formatDateInput(previous)) ?? [];
  }, [appointmentsByDate, selectedDate]);

  const upcomingAppointments = useMemo(() => {
    const now = new Date();

    return appointments
      .filter((appointment) => {
        const start = normalizeDate(appointment.startTime);
        return (
          start &&
          start.getTime() >= now.getTime() &&
          !["cancelled", "no_show", "completed"].includes(appointment.status)
        );
      })
      .sort(
        (left, right) =>
          new Date(left.startTime).getTime() -
          new Date(right.startTime).getTime()
      );
  }, [appointments]);

  const nextAppointment = upcomingAppointments[0];
  // One reading of the selected day for the indicators and the day-load card:
  // cancelled and missed visits hold no time, urgencies are those of the day.
  const dayStats = useMemo(() => agendaDayStats(dailyAppointments), [dailyAppointments]);
  const urgentOpenCount = dayStats.openUrgent.length;
  const totalPlannedMinutes = dayStats.minutes;
  const engagedVetsCount = vets.filter((vet) =>
    (appointmentsByVet.get(vet.id) ?? []).some(isActiveBooking)
  ).length;

  const sectionCards = useMemo<SectionCardItem[]>(() => {
    const plural = (count: number, word: string) =>
      `${formatNumber(count)} ${word}${count > 1 ? "s" : ""}`;
    const today = isSameDay(selectedDate, new Date());
    const dayName = today
      ? "aujourd'hui"
      : `le ${formatDateLabel(selectedDate, { day: "numeric", month: "long" })}`;
    const day = dayStats;
    const previous = agendaDayStats(previousDayAppointments);
    const delta = day.booked - previous.booked;

    const urgentNames = day.openUrgent
      .slice(0, 2)
      .map(
        (item) =>
          `${patientsById.get(item.patientId)?.name ?? "Patient"} à ${formatTimeCompact(item.startTime)}`
      );
    const moreUrgent = day.openUrgent.length - urgentNames.length;

    const nextStart = nextAppointment ? normalizeDate(nextAppointment.startTime) : null;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextDay = !nextStart
      ? ""
      : isSameDay(nextStart, new Date())
        ? "Aujourd'hui"
        : isSameDay(nextStart, tomorrow)
          ? "Demain"
          : formatDateLabel(nextStart, { weekday: "short", day: "numeric", month: "short" });
    const nextPatient = nextAppointment
      ? patientsById.get(nextAppointment.patientId)?.name || nextAppointment.title
      : "";
    const nextVet = nextAppointment
      ? formatPersonName(vets.find((vet) => vet.id === nextAppointment.vetId)?.displayName)
      : "";

    return [
      {
        title: t("agenda.overview.slotsTitle", { defaultValue: "Créneaux" }),
        value: formatNumber(day.booked),
        // No difference when either day is empty: "-1" against a free day says nothing.
        ...(day.booked > 0 && previous.booked > 0
          ? {
              change: delta,
              changeKind: "difference" as const,
              changeLabel: `contre ${formatNumber(previous.booked)} la veille`,
            }
          : {}),
        detailRow:
          day.booked > 0 || day.cancelled > 0
            ? [
                plural(day.completed, "terminé"),
                `${formatNumber(day.underway)} en cours`,
                `${formatNumber(day.planned)} à venir`,
                day.cancelled > 0 ? plural(day.cancelled, "annulé") : "",
              ]
                .filter(Boolean)
                .join(" · ")
            : `Aucun rendez-vous ${dayName}`,
        footerTitle: plural(day.completed, "terminé"),
        footerDescription: "Rendez-vous du jour, hors annulés",
      },
      {
        title: t("agenda.overview.openEmergencies", {
          defaultValue: "Urgences ouvertes",
        }),
        value: formatNumber(day.openUrgent.length),
        badge: day.openUrgent.length > 0 ? `Non terminées ${dayName}` : undefined,
        tone: day.openUrgent.length > 0 ? "critical" : undefined,
        detailRow:
          day.openUrgent.length > 0
            ? `${urgentNames.join(" · ")}${moreUrgent > 0 ? ` · +${moreUrgent}` : ""}`
            : `Aucune urgence ouverte ${dayName}`,
        footerTitle: "Urgences non terminées",
        footerDescription: "Urgences du jour non terminées",
      },
      {
        title: t("agenda.overview.plannedTime", {
          defaultValue: "Temps planifié",
        }),
        value: formatDuration(day.minutes),
        detailRow:
          day.minutes > 0
            ? `${formatNumber(day.vets)} praticien${day.vets > 1 ? "s" : ""} mobilisé${day.vets > 1 ? "s" : ""} sur ${formatNumber(vets.length)} · hors annulés`
            : `Rien de planifié ${dayName}`,
        footerTitle: "Durée des rendez-vous du jour",
        footerDescription: "Durée cumulée des rendez-vous du jour",
      },
      {
        title: t("agenda.overview.nextAppointment", {
          defaultValue: "Prochain rendez-vous",
        }),
        value: nextAppointment ? formatTimeCompact(nextAppointment.startTime) : "Aucun",
        badge: nextAppointment
          ? `${nextDay} · ${nextAppointment.type || "Rendez-vous"}`
          : undefined,
        tone: nextAppointment ? "quiet" : undefined,
        detailRow: nextAppointment
          ? [nextPatient, nextVet].filter(Boolean).join(" · ")
          : "Aucun rendez-vous à venir",
        footerTitle: nextPatient || "Aucun rendez-vous à venir",
        footerDescription: "Prochain passage",
      },
    ];
  }, [
    dayStats,
    nextAppointment,
    patientsById,
    previousDayAppointments,
    selectedDate,
    vets,
    t,
  ]);

  const periodLabel = useMemo(() => {
    if (viewMode === "month") {
      return formatDateLabel(selectedDate, { month: "long", year: "numeric" });
    }

    if (viewMode === "week") {
      const start = weekDays[0];
      const end = weekDays[weekDays.length - 1];
      return `${formatDateLabel(start, { day: "numeric", month: "long" })} - ${formatDateLabel(
        end,
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      )}`;
    }

    return formatDateLabel(selectedDate, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [selectedDate, viewMode, weekDays]);

  const dayLoadSummary = useMemo(
    () =>
      vets
        .map((vet) => ({
          vet,
          count: (appointmentsByVet.get(vet.id) ?? []).filter(isActiveBooking).length,
        }))
        .filter((entry) => entry.count > 0)
        .sort((left, right) => right.count - left.count),
    [appointmentsByVet, vets]
  );

  const typeSummary = useMemo(
    () =>
      APPOINTMENT_TYPES.map((type) => ({
        type,
        count: dailyAppointments.filter(
          (appointment) => appointment.type === type && isActiveBooking(appointment)
        ).length,
      })).filter((item) => item.count > 0),
    [dailyAppointments]
  );

  const getPatientName = (patientId: string) =>
    patientsById.get(patientId)?.name || "Patient local";

  const resetForm = (date = selectedDate) => {
    setEditingAppointmentId(null);
    setSelectedOwnerId("");
    setPersonSearchTerm("");
    setOwnerSearchTerm("");
    setPatientSearchTerm("");
    setSelectedPatientId("");
    setSelectedVetId(vets[0]?.id ?? "");
    setSelectedType("Consultation");
    setFormDate(formatDateInput(date));
    setFormTime("09:00");
    setDuration(15);
    setReason("");
    setFormRoom("");
    setRecurrenceEnabled(false);
    setRecurrenceFrequency("weekly");
    setRecurrenceEndDate("");
    setRecurrenceMaxOccurrences(null);
    setRecurrenceDaysOfWeek([]);
    setIsSubmitting(false);
    setFormError("");
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm(selectedDate);
  };

  const handleOpenCreate = (date = selectedDate, time?: string, vetId?: string) => {
    resetForm(date);
    if (time) {
      setFormTime(time);
    }
    if (vetId) {
      setSelectedVetId(vetId);
    }
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (appointment: Appointment) => {
    const start = normalizeDate(appointment.startTime);
    const end = normalizeDate(appointment.endTime);

    setEditingAppointmentId(appointment.id);
    setSelectedOwnerId(appointment.ownerId);
    setOwnerSearchTerm("");
    setSelectedPatientId(appointment.patientId);
    setSelectedVetId(appointment.vetId);
    setSelectedType(appointment.type);
    setFormDate(formatDateInput(start ?? new Date()));
    setFormTime(formatTime(start));
    setDuration(
      start && end
        ? Math.max(15, Math.round((end.getTime() - start.getTime()) / 60_000))
        : 15
    );
    setReason(appointment.reason || "");
    setFormRoom(appointment.room ?? "");
    setIsDialogOpen(true);
  };

  const handleOwnerSelect = (ownerId: string) => {
    const normalizedOwnerId = normalizeEntityId(ownerId);
    setSelectedOwnerId(normalizedOwnerId);
    const owner = ownersById.get(normalizedOwnerId);
    setOwnerSearchTerm(
      owner ? `${owner.firstName} ${owner.lastName}`.trim() : ""
    );

    const ownerPatients = patients.filter(
      (patient) => normalizeEntityId(patient.ownerId) === normalizedOwnerId
    );
    if (ownerPatients.length === 1) {
      setSelectedPatientId(ownerPatients[0].id);
      setPatientSearchTerm("");
      return;
    }

    const selectedPatient = patientsById.get(selectedPatientId);
    if (
      !selectedPatient ||
      normalizeEntityId(selectedPatient.ownerId) !== normalizedOwnerId
    ) {
      setSelectedPatientId("");
    }
    setPatientSearchTerm("");
  };

  const handlePatientSelect = (patientId: string) => {
    setFormError("");
    const normalizedPatientId = normalizeEntityId(patientId);
    setSelectedPatientId(normalizedPatientId);
    const patient = patientsById.get(normalizedPatientId);
    if (patient?.ownerId) {
      const normalizedOwnerId = normalizeEntityId(patient.ownerId);
      setSelectedOwnerId(normalizedOwnerId);
      const owner = ownersById.get(normalizedOwnerId);
      setOwnerSearchTerm(
        owner ? `${owner.firstName} ${owner.lastName}`.trim() : ""
      );
    }
    if (patient) {
      setPatientSearchTerm(patient.name);
      const owner = ownersById.get(patient.ownerId);
      setPersonSearchTerm(selectedDossierSearchLabel(patient.name, owner));
    }
  };

  const handleOpenCreateForPatient = (patientId: string, date = selectedDate) => {
    const normalizedPatientId = normalizeEntityId(patientId);
    const patient = patientsById.get(normalizedPatientId);
    if (!patient) {
      return false;
    }

    resetForm(date);
    setIsDialogOpen(true);
    window.setTimeout(() => {
      handlePatientSelect(normalizedPatientId);
    }, 0);
    return true;
  };

  const openCreate = useEffectEvent(handleOpenCreate);
  const openCreateForPatient = useEffectEvent(handleOpenCreateForPatient);

  useEffect(() => {
    const consumePendingAppointment = () => {
      if (typeof window === "undefined") {
        return false;
      }

      const raw = window.sessionStorage.getItem("vetera:pending-appointment");
      if (!raw) {
        return false;
      }

      try {
        const pending = JSON.parse(raw) as {
          patientId?: string;
          create?: boolean;
          date?: string;
          time?: string;
          vetId?: string;
        };
        const requestedDate = pending.date ? new Date(pending.date) : undefined;
        const date = requestedDate && !Number.isNaN(requestedDate.getTime()) ? requestedDate : undefined;
        if (date) setSelectedDate(date);
        if (!pending.patientId) {
          window.sessionStorage.removeItem("vetera:pending-appointment");
          if (pending.create) {
            openCreate(date, pending.time, pending.vetId);
            return true;
          }
          return false;
        }

        const opened = openCreateForPatient(pending.patientId, date);
        if (opened) {
          window.sessionStorage.removeItem("vetera:pending-appointment");
        }
        return opened;
      } catch {
        window.sessionStorage.removeItem("vetera:pending-appointment");
        return false;
      }
    };

    const handleNewAppointment = (event: Event) => {
      const detail = (event as CustomEvent<{ patientId?: string }>).detail;
      if (detail?.patientId && typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "vetera:pending-appointment",
          JSON.stringify(detail)
        );
      }

      window.setTimeout(() => {
        if (!consumePendingAppointment()) {
          openCreate();
        }
      }, 0);
    };

    consumePendingAppointment();
    window.addEventListener("vetera:new-appointment", handleNewAppointment);
    return () => {
      window.removeEventListener(
        "vetera:new-appointment",
        handleNewAppointment
      );
    };
  }, [patientsById, ownersById, selectedDate]);

  const selectAppointment = (appointment: Appointment, syncDate = false) => {
    setSelectedAppointmentId(appointment.id);

    if (syncDate) {
      const start = normalizeDate(appointment.startTime);
      if (start) {
        setSelectedDate(start);
      }
    }
  };

  const performAppointmentDelete = async (appointment: Appointment) => {
    try {
      const removed = await remove(appointment.id);
      if (!removed) {
        toast.error("Le rendez-vous n'a pas pu être supprimé.");
        return;
      }
      await audit.log({
        action: "delete",
        entity: "appointment",
        entityId: appointment.id,
        payload: {
          patientId: appointment.patientId,
          startTime: appointment.startTime,
        },
      });
      toast.success("Le rendez-vous a été supprimé du planning.");

      if (selectedAppointmentId === appointment.id) {
        setSelectedAppointmentId(null);
      }

      if (editingAppointmentId === appointment.id) {
        closeDialog();
      }
      setAppointmentPendingDelete(null);
    } catch (error) {
      console.error(error);
      toast.error("Impossible de supprimer ce rendez-vous.");
    }
  };

  const deleteAppointment = (appointment: Appointment) => {
    setAppointmentPendingDelete(appointment);
  };

  const handleSave = async () => {
    setFormError("");

    if (!selectedPatientId) {
      const message = "Sélectionnez un patient pour créer le rendez-vous.";
      setFormError(message);
      toast.error(message);
      return;
    }

    const effectiveVetId =
      selectedVetId || selectedAppointment?.vetId || vets[0]?.id || "";

    if (!effectiveVetId) {
      const message =
        "Aucun vétérinaire actif n’est disponible pour ce créneau.";
      setFormError(message);
      toast.error(message);
      return;
    }

    const [year, month, day] = formDate.split("-").map(Number);
    const [hours, minutes] = formTime.split(":").map(Number);

    if (
      !(year && month && day) ||
      Number.isNaN(hours) ||
      Number.isNaN(minutes)
    ) {
      const message = "La date ou l’heure du rendez-vous est invalide.";
      setFormError(message);
      toast.error(message);
      return;
    }

    const start = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const end = new Date(start.getTime() + duration * 60_000);
    const patient = patientsById.get(selectedPatientId);

    setIsSubmitting(true);

    try {
      const saved = await saveAppointment({
        ...(editingAppointmentId ? { id: editingAppointmentId } : {}),
        patientId: selectedPatientId,
        ownerId: patient?.ownerId,
        vetId: effectiveVetId,
        title: `${patient?.name || "Patient"} - ${selectedType}`,
        type: selectedType,
        startTime: start,
        endTime: end,
        status:
          (editingAppointmentId
            ? appointments.find((entry) => entry.id === editingAppointmentId)
                ?.status
            : undefined) ?? "scheduled",
        reason,
        room: selectedRoom || undefined,
      });

      if (!saved) {
        throw new Error("Le rendez-vous n’a pas pu être enregistré.");
      }

      await audit.log({
        action: editingAppointmentId ? "update" : "create",
        entity: "appointment",
        entityId: saved.id,
        payload: {
          patientId: saved.patientId,
          startTime: saved.startTime,
          room: saved.room,
          type: saved.type,
        },
      });

      if (recurrenceEnabled && !editingAppointmentId) {
        const recurrence: Omit<
          AppointmentRecurrence,
          "createdAt" | "updatedAt"
        > = {
          id: generateId(),
          parentAppointmentId: saved.id,
          frequency: recurrenceFrequency,
          intervalCount: 1,
          daysOfWeek:
            recurrenceFrequency === "weekly" && recurrenceDaysOfWeek.length > 0
              ? JSON.stringify(recurrenceDaysOfWeek)
              : null,
          endDate: recurrenceEndDate || null,
          maxOccurrences: recurrenceMaxOccurrences,
          generatedCount: 1,
        };
        await recurrencesStore.add(recurrence);
      }

      toast.success(
        editingAppointmentId
          ? "Le rendez-vous a été mis à jour."
          : "Le rendez-vous a été ajouté à l’agenda."
      );

      setSelectedAppointmentId(saved.id);
      setSelectedDate(start);
      setViewMode("list");
      closeDialog();
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Erreur inconnue";
      if (
        message.toLowerCase().includes("database is locked") ||
        message.toLowerCase().includes("code: 5")
      ) {
        const userMessage = "Base occupée, réessayez dans quelques secondes.";
        setFormError(userMessage);
        toast.error(userMessage);
      } else {
        const userMessage = `Impossible d’enregistrer ce rendez-vous: ${message}`;
        setFormError(userMessage);
        toast.error(userMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const tableRowsByTab = useMemo<Record<TableTab, AgendaTableRow[]>>(() => {
    const query = deferredSearchTerm.trim().toLowerCase();

    const rows = appointments
      .map<AgendaTableRow>((appointment) => {
        const patient = patientsById.get(appointment.patientId);
        const owner = ownersById.get(
          appointment.ownerId || patient?.ownerId || ""
        );
        const vet = usersById.get(appointment.vetId);
        const presentation = getAppointmentPresentation(appointment, patient);
        const start = normalizeDate(appointment.startTime);

        let tab: TableTab = "planning";
        if (presentation.attention) {
          tab = "attention";
        } else if (appointment.status === "completed") {
          tab = "termine";
        } else if (start && isSameDay(start, selectedDate)) {
          tab = "selection";
        }

        return {
          appointment,
          patient,
          owner,
          vet,
          patientName: patient?.name || appointment.title,
          ownerName: formatOwnerName(owner),
          vetName: formatPersonName(vet?.displayName) || "Vétérinaire local",
          appointmentAt: formatDateTimeLabel(appointment.startTime),
          statusLabel: presentation.label,
          statusClassName: presentation.className,
          tab,
          searchIndex: [
            patient?.name,
            patient?.species,
            patient?.breed,
            owner?.firstName,
            owner?.lastName,
            owner?.phone,
            vet?.displayName,
            appointment.type,
            appointment.reason,
            appointment.title,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
        };
      })
      .filter((row) => {
        if (vetFilter !== "all" && row.appointment.vetId !== vetFilter) {
          return false;
        }
        if (statusFilter !== "all" && row.appointment.status !== statusFilter) {
          return false;
        }
        if (query && !row.searchIndex.includes(query)) {
          return false;
        }
        return true;
      });

    return TABLE_TABS.reduce<Record<TableTab, AgendaTableRow[]>>(
      (accumulator, tab) => {
        // The day scope lists the whole selected day, finished and flagged
        // appointments included; the other scopes keep their own buckets.
        accumulator[tab.value] = rows
          .filter((row) =>
            tab.value === "selection"
              ? isSameDay(
                  normalizeDate(row.appointment.startTime) ?? new Date(0),
                  selectedDate
                )
              : row.tab === tab.value
          )
          .sort((left, right) => {
            const leftTime = new Date(left.appointment.startTime).getTime();
            const rightTime = new Date(right.appointment.startTime).getTime();
            return tab.value === "termine"
              ? rightTime - leftTime
              : leftTime - rightTime;
          });
        return accumulator;
      },
      {
        planning: [],
        selection: [],
        termine: [],
        attention: [],
      }
    );
  }, [
    appointments,
    deferredSearchTerm,
    ownersById,
    patientsById,
    selectedDate,
    statusFilter,
    usersById,
    vetFilter,
  ]);

  const visibleRowsCount = tableRowsByTab[tableTab].length;

  const shiftPeriod = (direction: number) => {
    setSelectedDate((current) => {
      const next = new Date(current);
      if (viewMode === "month") {
        const day = next.getDate();
        next.setDate(1);
        next.setMonth(next.getMonth() + direction);
        const lastDay = new Date(
          next.getFullYear(),
          next.getMonth() + 1,
          0
        ).getDate();
        next.setDate(Math.min(day, lastDay));
      } else {
        next.setDate(
          next.getDate() + direction * (viewMode === "week" ? 7 : 1)
        );
      }
      return next;
    });
  };
  return {
    appointmentPendingDelete,
    appointments,
    appointmentsByVet,
    closeDialog,
    currentTime,
    currentTimePosition,
    dailyAppointments,
    dayLoadSummary,
    deleteAppointment,
    duration,
    editingAppointmentId,
    engagedVetsCount,
    filteredOwners,
    filteredPatientsForForm,
    formDate,
    formError,
    formRoom: selectedRoom,
    formTime,
    roomOptions,
    timeBusySlots,
    getAppointmentsForDate,
    getPatientName,
    handleAppointmentStatusTransition,
    handleOpenCreate,
    handleOpenEdit,
    handleOwnerSelect,
    handlePatientSelect,
    handleSave,
    isDialogOpen,
    isSubmitting,
    loadingAppointments,
    monthDays,
    ownerSearchTerm,
    openAppointmentInFlux,
    ownersById,
    patientSearchTerm,
    patientsById,
    performAppointmentDelete,
    periodLabel,
    personSearchTerm,
    reason,
    recurrenceDaysOfWeek,
    recurrenceEnabled,
    recurrenceEndDate,
    recurrenceFrequency,
    recurrenceMaxOccurrences,
    resetForm,
    searchTerm,
    sectionCards,
    selectAppointment,
    selectedAppointment,
    selectedAppointmentId,
    selectedDate,
    selectedOwner,
    selectedOwnerId,
    selectedPatient,
    selectedPatientId,
    selectedType,
    selectedVet,
    selectedVetId,
    setAppointmentPendingDelete,
    setDuration,
    setFormDate,
    setFormRoom,
    setFormTime,
    setIsDialogOpen,
    setOwnerSearchTerm,
    setPatientSearchTerm,
    setPersonSearchTerm,
    setReason,
    setRecurrenceDaysOfWeek,
    setRecurrenceEnabled,
    setRecurrenceEndDate,
    setRecurrenceFrequency,
    setRecurrenceMaxOccurrences,
    setSearchTerm,
    setSelectedDate,
    setSelectedOwnerId,
    setSelectedType,
    setSelectedVetId,
    setStatusFilter,
    setTableTab,
    setVetFilter,
    setViewMode,
    shiftPeriod,
    statusFilter,
    t,
    tableRowsByTab,
    tableTab,
    totalPlannedMinutes,
    typeSummary,
    unifiedAppointmentMatches,
    urgentOpenCount,
    vetFilter,
    vets,
    viewMode,
    visibleRowsCount,
    weekDays,
  };
}

export type AgendaViewProps = ReturnType<typeof useAgendaPageModel>;
