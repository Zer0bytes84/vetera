import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useAppointmentsRepository,
  useRemindersRepository,
} from "@/data/repositories";
import {
  DEFAULT_APPOINTMENT_REMINDER_OFFSETS,
  getFutureReminderSchedules,
  isAppointmentReminderEligible,
} from "@/domain/clinical/reminders";
import { generateId } from "@/services/sqlite/database";
import type { Reminder } from "@/types/db";

const POLL_INTERVAL_MS = 60_000;
const TOAST_DEDUPE_WINDOW_MS = 90_000;

function buildReminderPayload(
  appointmentId: string,
  scheduledFor: string,
  minutesBefore: number
): Omit<Reminder, "createdAt" | "updatedAt"> {
  return {
    id: generateId(),
    appointmentId,
    channel: "in_app",
    status: "pending",
    scheduledFor,
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
  const syncedAppointmentVersions = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (loading) {
      return;
    }
    const now = new Date();
    for (const appointment of appointments) {
      if (
        isAppointmentReminderEligible(
          appointment.status,
          appointment.startTime,
          now
        )
      ) {
        continue;
      }
      for (const reminder of remindersStore.forAppointment(appointment.id)) {
        if (reminder.status === "pending" || reminder.status === "snoozed") {
          void remindersStore.dismiss(reminder.id);
        }
      }
    }

    const upcoming = appointments.filter((appointment) =>
      isAppointmentReminderEligible(
        appointment.status,
        appointment.startTime,
        now
      )
    );

    for (const appointment of upcoming) {
      const versionKey = `${appointment.id}:${appointment.startTime}`;
      if (syncedAppointmentVersions.current.has(versionKey)) {
        continue;
      }
      syncedAppointmentVersions.current.add(versionKey);
      const existing = remindersStore.forAppointment(appointment.id);
      const schedules = getFutureReminderSchedules(
        appointment.startTime,
        now,
        DEFAULT_APPOINTMENT_REMINDER_OFFSETS
      );

      for (const schedule of schedules) {
        const current = existing.find(
          (reminder) => reminder.minutesBefore === schedule.minutesBefore
        );
        if (current) {
          if (
            current.status === "pending" &&
            current.scheduledFor !== schedule.scheduledFor
          ) {
            void remindersStore.update(current.id, {
              scheduledFor: schedule.scheduledFor,
            });
          }
          continue;
        }
        const payload = buildReminderPayload(
          appointment.id,
          schedule.scheduledFor,
          schedule.minutesBefore
        );
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
        toast.message(
          t("reminders.toast.due", {
            defaultValue: "Rappel : rendez-vous imminent",
          }),
          {
            description: t("reminders.toast.dueDescription", {
              defaultValue:
                "Un rendez-vous arrive à échéance dans quelques minutes.",
            }),
            duration: 6000,
          }
        );
        void remindersStore.markSent(reminder.id);
      }
    };

    tick();
    const handle = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => window.clearInterval(handle);
  }, [remindersStore, t]);
}
