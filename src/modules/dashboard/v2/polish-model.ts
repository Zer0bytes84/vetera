import { addDays, endOfDay, startOfDay } from "date-fns";
import type { Appointment, Patient } from "@/types/db";
import { parseDashboardDate } from "./model";

export function percentChange(current: number, previous: number): number | null {
  return previous > 0 ? Math.round((current - previous) / previous * 100) : null;
}

export function recentTrend(events: { date: string; value: number }[], reference: Date) {
  const today = startOfDay(reference);
  const totals = Array.from({ length: 14 }, (_, i) => {
    const from = addDays(today, i - 13);
    const to = endOfDay(from);
    return { label: from.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }), value: events.reduce((sum, e) => {
      const date = parseDashboardDate(e.date);
      return date && date >= from && date <= to ? sum + e.value : sum;
    }, 0) };
  });
  const current = totals.slice(7).reduce((s, d) => s + d.value, 0);
  const previous = totals.slice(0, 7).reduce((s, d) => s + d.value, 0);
  return { points: totals.slice(7), change: percentChange(current, previous) };
}

export function dayPatients(appointments: Appointment[], patients: Patient[], reference: Date) {
  const start = startOfDay(reference), end = endOfDay(reference);
  const ids = new Set(appointments.filter(a => {
    const date = parseDashboardDate(a.startTime);
    return date && date >= start && date <= end && !["cancelled", "no_show"].includes(a.status);
  }).map(a => a.patientId));
  return patients.filter(p => ids.has(p.id));
}

/** A collision needs the same known resource (vet or room), not just simultaneous visits. */
export function conflictingVisits(appointments: Appointment[]) {
  const conflicts = new Set<string>();
  const live = appointments.filter(a => !["cancelled", "no_show"].includes(a.status));
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
    const a = live[i], b = live[j];
    if (!((a.vetId && a.vetId === b.vetId) || (a.room && a.room === b.room))) continue;
    const sa = parseDashboardDate(a.startTime), ea = parseDashboardDate(a.endTime);
    const sb = parseDashboardDate(b.startTime), eb = parseDashboardDate(b.endTime);
    if (sa && ea && sb && eb && sa < ea && sb < eb && sa < eb && sb < ea) { conflicts.add(a.id); conflicts.add(b.id); }
  }
  return conflicts;
}
