import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  useAppointmentsRepository,
  useRemindersRepository,
} from "@/data/repositories";
import { generateId } from "@/services/sqlite/database";
import type { Appointment, Reminder } from "@/types/db";

const DEFAULT_OFFSETS_MIN = [15, 30, 60, 1440] as const;
const POLL_INTERVAL_MS = 60_000;
const TOAST_DEDUPE_WINDOW_MS = 90_000;

type AppointmentLike = Pick<
  Appointment,
  "id" | "startTime" | "status" | "patientId"
>;

function isUpcomingAppointment(
  appointment: AppointmentLike,
  now: Date
): boolean {
  if (
    appointment.status === "cancelled" ||
    appointment.status === "no_show" ||
    appointment.status === "completed"
  ) {
    return false;
  }
  const start = new Date(appointment.startTime);
  if (!Number.isFinite(start.getTime())) {
    return false;
  }
  return start.getTime() > now.getTime();
}

function buildReminderPayload(
  appointmentId: string,
  appointmentStart: Date,
  minutesBefore: number
): Omit<Reminder, "createdAt" | "updatedAt"> {
  const scheduledFor = new Date(
    appointmentStart.getTime() - minutesBefore * 60_000
  );
  return {
    id: generateId(),
    appointmentId,
    channel: "in_app",
    status: "pending",
    scheduledFor: scheduledFor.toISOString(),
    minutesBefore,
  };
}

/**
 * Syncs in-app reminders for every upcoming appointment using a fixed set of
 * offsets (15 / 30 / 60 / 1440 minutes). Already-pending reminders for the same
 * appointment + offset are left untouched so the user can snooze them safely.
 */
export function useAppointmentReminderSync() {
  const { data: appointments, loading } = useAppointmentsRepository();
  const remindersStore = useRemindersRepository();
  const seededAppointmentIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (loading) {
      return;
    }
    const now = new Date();
    const upcoming = appointments.filter((appointment) =>
      isUpcomingAppointment(appointment, now)
    );

    for (const appointment of upcoming) {
      if (seededAppointmentIds.current.has(appointment.id)) {
        continue;
      }
      seededAppointmentIds.current.add(appointment.id);
      const start = new Date(appointment.startTime);
      const existing = remindersStore.forAppointment(appointment.id);
      const existingOffsets = new Set(
        existing.map((reminder) => reminder.minutesBefore ?? -1)
      );
      for (const offset of DEFAULT_OFFSETS_MIN) {
        if (existingOffsets.has(offset)) {
          continue;
        }
        const payload = buildReminderPayload(appointment.id, start, offset);
        void remindersStore.add(payload);
      }
    }
  }, [appointments, loading, remindersStore]);
}

/**
 * Polls the reminders repository every minute and surfaces due-pending
 * reminders as a non-blocking toast. Toasts are deduped by (id, scheduledFor)
 * for 90 s so a flaky polling loop cannot spam the user.
 */
export function useReminderToasts() {
  const { t } = useTranslation();
  const remindersStore = useRemindersRepository();
  const lastToastedAt = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const due = remindersStore.dueNow(now);
      if (due.length === 0) {
        return;
      }
      for (const reminder of due) {
        const dedupeKey = `${reminder.id}:${reminder.scheduledFor}`;
        const last = lastToastedAt.current.get(dedupeKey) ?? 0;
        if (now.getTime() - last < TOAST_DEDUPE_WINDOW_MS) {
          continue;
        }
        lastToastedAt.current.set(dedupeKey, now.getTime());
        toast.message(t("reminders.toast.due", {
          defaultValue: "Rappel : rendez-vous imminent",
        }), {
          description: t("reminders.toast.dueDescription", {
            defaultValue: "Un rendez-vous arrive à échéance dans quelques minutes.",
          }),
          duration: 6000,
        });
        void remindersStore.markSent(reminder.id);
      }
    };

    tick();
    const handle = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => window.clearInterval(handle);
  }, [remindersStore, t]);
}
