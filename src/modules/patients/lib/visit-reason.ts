import type { Appointment } from "@/types/db";

/**
 * The reason typed for the visit. Titles built as "Patient - Type" repeat the
 * row's own data, so they are not shown as a reason.
 */
export function visitReason(appointment: Appointment, patientName: string) {
  const reason = appointment.reason?.trim();
  if (reason) return reason;
  const title = appointment.title?.trim() ?? "";
  const generated = new RegExp(
    `^${patientName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[-–]\\s*`,
    "i"
  );
  return title && !generated.test(title) ? title : "";
}
