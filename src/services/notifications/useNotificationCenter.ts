import { useMemo } from "react";
import {
  useAppointmentsRepository,
  useConsultationSoapsRepository,
  useNotificationStateRepository,
  usePatientsRepository,
  useProductsRepository,
  useRemindersRepository,
  useTasksRepository,
  useVaccinationsRepository,
} from "@/data/repositories";
import { useNowTick } from "@/hooks/useNowTick";
import { usePostOpFollowUp } from "@/modules/dashboard/hooks/usePostOpFollowUp";
import {
  buildNotificationId,
  NOTIFICATION_SEVERITY_WEIGHT,
  type NotificationItem,
  type NotificationSeverity,
  type NotificationSource,
  type NotificationTarget,
} from "./types";

const NOTIFICATION_HORIZON_MIN = 240;
const SOAP_BACKLOG_HORIZON_MIN = 60 * 24 * 7; // 7 jours
const VACCINATION_HORIZON_DAYS = 30;
const POSTOP_HORIZON_DAYS = 30;
const APPOINTMENT_GRACE_MIN = 5; // démarre 5 min avant l'heure pile
const APPOINTMENT_IN_PROGRESS_AFTER_MIN = 15; // SOAP attendu après 15 min

function severityToLevel(severity: NotificationSeverity): number {
  return NOTIFICATION_SEVERITY_WEIGHT[severity];
}

/**
 * Centre de notifications unifié.
 * Agrège 6 sources existantes (reminders / postop / tasks / stock / soap /
 * vaccinations) en une liste homogène de `NotificationItem` + un état
 * read/dismiss persistant. Mount une seule fois au niveau AppShell.
 */
export function useNotificationCenter() {
  const now = useNowTick(60_000);
  const stateStore = useNotificationStateRepository();
  const { data: patients } = usePatientsRepository();
  const { data: appointments } = useAppointmentsRepository();
  const remindersStore = useRemindersRepository();
  const tasksStore = useTasksRepository();
  const productsStore = useProductsRepository();
  const { data: soaps } = useConsultationSoapsRepository();
  const postOp = usePostOpFollowUp();
  const { data: vaccinations } = useVaccinationsRepository();

  const patientNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const patient of patients) {
      map.set(patient.id, patient.name);
    }
    return map;
  }, [patients]);

  const items = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];

    // 0) Rendez-vous en cours / imminents (couverture explicite, pas juste
    // via les rappels) — permet d'attraper les RDV sans reminder lié.
    for (const appt of appointments) {
      if (appt.status === "cancelled" || appt.status === "no_show") continue;
      const start = new Date(appt.startTime);
      const minutesUntilStart =
        (start.getTime() - now.getTime()) / 60_000;
      const patientName = patientNameById.get(appt.patientId) ?? "Patient";
      const time = start.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (appt.status === "in_progress") {
        list.push({
          id: buildNotificationId("appointment", `${appt.id}:running`),
          source: "appointment",
          severity: "info",
          title: `${patientName} · ${appt.type}`,
          description: `Consultation en cours depuis ${time}`,
          clickHint: "Voir le rendez-vous",
          target: { view: "agenda", appointmentId: appt.id },
          createdAt: appt.createdAt,
          data: { appointmentId: appt.id, patientId: appt.patientId },
        });
        continue;
      }

      // RDV "scheduled" qui arrive dans la fenêtre [−5min, +15min]
      if (
        appt.status === "scheduled" &&
        minutesUntilStart <= APPOINTMENT_IN_PROGRESS_AFTER_MIN &&
        minutesUntilStart >= -APPOINTMENT_GRACE_MIN
      ) {
        const severity: NotificationSeverity =
          minutesUntilStart <= 0 ? "critical" : "warn";
        list.push({
          id: buildNotificationId("appointment", `${appt.id}:due`),
          source: "appointment",
          severity,
          title: `${patientName} · ${appt.type}`,
          description:
            minutesUntilStart <= 0
              ? `Rendez-vous attendu — ${time}`
              : `Rendez-vous dans ${Math.round(minutesUntilStart)} min — ${time}`,
          clickHint: "Ouvrir dans l'agenda",
          target: { view: "agenda", appointmentId: appt.id },
          createdAt: appt.createdAt,
          data: { appointmentId: appt.id, patientId: appt.patientId },
        });
      }
    }

    // 1) Reminders RDV (4 offsets: 15/30/60/1440 min avant)
    const upcomingReminders = remindersStore.upcoming(NOTIFICATION_HORIZON_MIN);
    for (const reminder of upcomingReminders) {
      if (reminder.status === "dismissed") continue;
      const minutes = reminder.minutesBefore ?? 0;
      const severity: NotificationSeverity =
        minutes <= 15 ? "critical" : minutes <= 60 ? "warn" : "info";
      const appt = appointments.find((a) => a.id === reminder.appointmentId);
      const patientName = appt
        ? patientNameById.get(appt.patientId) ?? "Patient"
        : "Rendez-vous";
      const targetAt = new Date(reminder.scheduledFor);
      const targetTime = targetAt.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      list.push({
        id: buildNotificationId("reminder", reminder.id),
        source: "reminder",
        severity,
        title: `${patientName} · ${appt?.type ?? "RDV"}`,
        description: `Rappel ${minutes < 60 ? `${minutes} min` : `${Math.round(minutes / 60)} h`} avant — ${targetTime}`,
        clickHint: "Ouvrir le rendez-vous",
        target: appt
          ? { view: "agenda", appointmentId: appt.id }
          : { view: "agenda" },
        createdAt: reminder.createdAt,
        data: { appointmentId: reminder.appointmentId, reminderId: reminder.id },
      });
    }

    // 2) Post-op : patients avec alertes critiques ou warn
    for (const patient of postOp.patients) {
      if (patient.hasCritical) {
        list.push({
          id: buildNotificationId("postop", `${patient.patientId}:critical`),
          source: "postop",
          severity: "critical",
          title: patient.patientName,
          description: "Constantes critiques post-opératoires",
          clickHint: "Ouvrir la fiche patient",
          target: { view: "clinique", patientId: patient.patientId },
          createdAt: now.toISOString(),
          data: { patientId: patient.patientId },
        });
      } else if (patient.hasWarn) {
        list.push({
          id: buildNotificationId("postop", `${patient.patientId}:warn`),
          source: "postop",
          severity: "warn",
          title: patient.patientName,
          description: "Constantes à surveiller post-opératoire",
          clickHint: "Ouvrir la fiche patient",
          target: { view: "clinique", patientId: patient.patientId },
          createdAt: now.toISOString(),
          data: { patientId: patient.patientId },
        });
      }
    }

    // 3) Tasks urgentes (non terminées, priorité haute ou échue)
    for (const task of tasksStore.data) {
      if (task.status === "done") continue;
      const isOverdue =
        task.dueDate !== undefined && new Date(task.dueDate) < now;
      const isUrgent = task.priority === "high" || isOverdue;
      if (!isUrgent) continue;
      const patientName = task.patientId
        ? patientNameById.get(task.patientId)
        : null;
      list.push({
        id: buildNotificationId("task", task.id),
        source: "task",
        severity: isOverdue ? "critical" : "warn",
        title: task.title,
        description: patientName
          ? `${patientName} · ${isOverdue ? "En retard" : "Priorité haute"}`
          : isOverdue
            ? "En retard"
            : "Priorité haute",
        clickHint: "Voir la tâche",
        target: { view: "taches", taskId: task.id },
        createdAt: task.createdAt,
        data: { taskId: task.id },
      });
    }

    // 4) Stock bas (rupture ou sous le seuil)
    for (const product of productsStore.data) {
      if (product.quantity > product.minStock) continue;
      const isOutOfStock = product.quantity === 0;
      list.push({
        id: buildNotificationId("stock", product.id),
        source: "stock",
        severity: isOutOfStock ? "critical" : "warn",
        title: product.name,
        description: isOutOfStock
          ? "Rupture de stock"
          : `Stock bas : ${product.quantity} ${product.unit} (seuil ${product.minStock})`,
        clickHint: "Voir le produit",
        target: { view: "stock", productId: product.id },
        createdAt: now.toISOString(),
        data: { productId: product.id },
      });
    }

    // 5) SOAP backlog : rendez-vous consultés sans SOAP rédigé
    const soapsByAppointment = new Map<string, (typeof soaps)[number]>();
    for (const soap of soaps) {
      soapsByAppointment.set(soap.appointmentId, soap);
    }
    for (const appt of appointments) {
      if (appt.status !== "completed") continue;
      if (soapsByAppointment.has(appt.id)) continue;
      if (!appt.endTime) continue;
      const completedAt = new Date(appt.endTime);
      const hoursAgo = (now.getTime() - completedAt.getTime()) / 3_600_000;
      if (hoursAgo > SOAP_BACKLOG_HORIZON_MIN / 60) continue;
      const patientName = patientNameById.get(appt.patientId) ?? "Patient";
      list.push({
        id: buildNotificationId("soap", appt.id),
        source: "soap",
        severity: hoursAgo > 48 ? "warn" : "info",
        title: `${patientName} · SOAP manquant`,
        description: `Consultation ${appt.type} terminée ${Math.round(hoursAgo)} h sans note`,
        clickHint: "Rédiger le SOAP",
        target: { view: "clinique", patientId: appt.patientId },
        createdAt: appt.endTime,
        data: { appointmentId: appt.id, patientId: appt.patientId },
      });
    }

    // 6) Vaccinations à venir (≤ 30 jours)
    for (const vaccination of vaccinations) {
      if (!vaccination.nextDueAt) continue;
      const due = new Date(vaccination.nextDueAt);
      const daysLeft = Math.round(
        (due.getTime() - now.getTime()) / (24 * 3_600_000)
      );
      if (daysLeft > VACCINATION_HORIZON_DAYS) continue;
      const patientName = patientNameById.get(vaccination.patientId) ?? "Patient";
      const severity: NotificationSeverity =
        daysLeft <= 0 ? "critical" : daysLeft <= 7 ? "warn" : "info";
      list.push({
        id: buildNotificationId("automation", vaccination.id),
        source: "automation",
        severity,
        title: `${patientName} · ${vaccination.vaccineName}`,
        description:
          daysLeft <= 0
            ? "Vaccin en retard"
            : `Rappel vaccin dans ${daysLeft} j`,
        clickHint: "Ouvrir la fiche patient",
        target: { view: "patient_detail", patientId: vaccination.patientId },
        createdAt: vaccination.createdAt,
        data: { vaccinationId: vaccination.id, patientId: vaccination.patientId },
      });
    }

    // Tri : severity desc → createdAt desc
    return list.sort((a, b) => {
      const sev = severityToLevel(b.severity) - severityToLevel(a.severity);
      if (sev !== 0) return sev;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
  }, [
    now,
    remindersStore,
    remindersStore.data,
    appointments,
    postOp.patients,
    tasksStore.data,
    productsStore.data,
    soaps,
    vaccinations,
    patientNameById,
  ]);

  // Annotate with read/dismiss state
  const annotated = useMemo(() => {
    return items
      .map((item) => {
        const state = stateStore.stateFor(item.id);
        return {
          ...item,
          isRead: state?.readAt != null,
          isDismissed: state?.dismissedAt != null,
        };
      })
      .filter((item) => !item.isDismissed);
  }, [items, stateStore.data]);

  const unreadCount = useMemo(
    () => annotated.filter((item) => !item.isRead).length,
    [annotated]
  );

  const criticalCount = useMemo(
    () => annotated.filter((item) => item.severity === "critical").length,
    [annotated]
  );

  return {
    items: annotated,
    unreadCount,
    criticalCount,
    now,
    isLoading:
      remindersStore.loading ||
      tasksStore.loading ||
      productsStore.loading ||
      stateStore.loading ||
      postOp.isLoading,
    markRead: stateStore.markRead,
    markUnread: stateStore.markUnread,
    dismiss: stateStore.dismiss,
    markAllRead: () => stateStore.markAllRead(annotated.map((i) => i.id)),
  };
}

export type NotificationCenter = ReturnType<typeof useNotificationCenter>;

// Re-export so other modules can import from the same path.
export type { NotificationItem, NotificationTarget, NotificationSource, NotificationSeverity } from "./types";
