import { careDisplayStatus, type CareTask } from "./domain";

type DayTask = Pick<CareTask, "id" | "statut" | "heure_prevue" | "patient_id">;

const HOUR_MS = 3_600_000;
/** A care task due within this window is announced as coming up. */
export const SOON_HOURS = 2;

const time = (task: DayTask) => new Date(task.heure_prevue).getTime();
const byTime = (left: DayTask, right: DayTask) => time(left) - time(right);

/**
 * What a day of care holds. Cancelled care is counted apart and never as
 * planned; late care is care still to do whose time has passed.
 */
export function careDaySummary<T extends DayTask>(tasks: T[], now: Date) {
  const live = tasks.filter((task) => task.statut !== "annule");
  const pending = live.filter((task) => task.statut === "a_faire" || task.statut === "en_cours");
  const overdue = pending
    .filter((task) => careDisplayStatus(task, now) === "en_retard")
    .sort(byTime);
  return {
    planned: live.length,
    done: live.filter((task) => task.statut === "fait").length,
    pending: pending.length,
    inProgress: pending.filter((task) => task.statut === "en_cours").length,
    cancelled: tasks.length - live.length,
    overdue,
    next: pending.filter((task) => time(task) >= now.getTime()).sort(byTime)[0],
  };
}

/** Doses of the day for one animal: done out of planned, cancelled left out. */
export function careDoses(tasks: DayTask[]) {
  const live = tasks.filter((task) => task.statut !== "annule");
  return { done: live.filter((task) => task.statut === "fait").length, total: live.length };
}

export type CareMarkKind = "done" | "late" | "soon" | "later";

/**
 * Marks of a day timeline: done, late, due within two hours, or later.
 * The track spans the planned hours (and the current time on the day shown),
 * one hour wider on each side; positions are percentages of that span.
 */
export function careTimeline<T extends DayTask>(tasks: T[], now: Date) {
  const live = tasks.filter((task) => task.statut !== "annule").sort(byTime);
  if (live.length === 0) return null;
  const day = new Date(time(live[0]));
  day.setHours(0, 0, 0, 0);
  const sameDay = now.getTime() >= day.getTime() && now.getTime() < day.getTime() + 24 * HOUR_MS;
  const hours = live.map((task) => new Date(time(task)).getHours());
  if (sameDay) hours.push(now.getHours());
  const startHour = Math.max(0, Math.min(...hours) - 1);
  const endHour = Math.min(24, Math.max(...hours) + 2);
  const start = day.getTime() + startHour * HOUR_MS;
  const span = (endHour - startHour) * HOUR_MS;
  const at = (ms: number) => Math.min(100, Math.max(0, ((ms - start) / span) * 100));
  const kind = (task: T): CareMarkKind => {
    if (task.statut === "fait") return "done";
    if (careDisplayStatus(task, now) === "en_retard") return "late";
    return time(task) - now.getTime() <= SOON_HOURS * HOUR_MS ? "soon" : "later";
  };
  return {
    startHour,
    endHour,
    now: sameDay ? at(now.getTime()) : null,
    marks: live.map((task) => ({ task, kind: kind(task), at: at(time(task)) })),
  };
}
