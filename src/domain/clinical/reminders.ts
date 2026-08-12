import type { AppointmentStatus } from "@/types/db";

export const DEFAULT_APPOINTMENT_REMINDER_OFFSETS = [
  15, 30, 60, 1440,
] as const;

export function isAppointmentReminderEligible(
  status: AppointmentStatus,
  startTime: string | Date,
  now = new Date()
): boolean {
  if (["completed", "cancelled", "no_show"].includes(status)) {
    return false;
  }
  const start = startTime instanceof Date ? startTime : new Date(startTime);
  return Number.isFinite(start.getTime()) && start.getTime() > now.getTime();
}

export function getFutureReminderSchedules(
  startTime: string | Date,
  now = new Date(),
  offsets: readonly number[] = DEFAULT_APPOINTMENT_REMINDER_OFFSETS
): Array<{ minutesBefore: number; scheduledFor: string }> {
  const start = startTime instanceof Date ? startTime : new Date(startTime);
  if (!Number.isFinite(start.getTime())) {
    return [];
  }

  return offsets.flatMap((minutesBefore) => {
    const scheduledFor = new Date(start.getTime() - minutesBefore * 60_000);
    if (scheduledFor <= now) {
      return [];
    }
    return [{ minutesBefore, scheduledFor: scheduledFor.toISOString() }];
  });
}
