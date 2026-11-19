/*
 * The period a question names, as a span of whole days. Same limits as the dashboard's custom range: a span longer than
 * MAX_DAYS keeps its last day. When the question names none, the caller takes the last 30 days and says so.
 */

import { MAX_CUSTOM_DAYS } from "@/modules/dashboard/model/premium-analytics";
import { addDays, endOfDay, parseDashboardDate, startOfDay } from "@/modules/dashboard/v2/model";
import type { Period } from "./types";
import { has } from "./language";

const MONTHS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
const MAX_COUNT = 999;

const shortDate = (date: Date) => date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export function periodLabel(from: Date, to: Date): string {
  return startOfDay(from).getTime() === startOfDay(to).getTime() ? `le ${shortDate(from)}` : `du ${shortDate(from)} au ${shortDate(to)}`;
}

function span(from: Date, to: Date, explicit = true): Period {
  const first = startOfDay(from);
  const last = endOfDay(to);
  const days = Math.round((startOfDay(last).getTime() - first.getTime()) / 86_400_000) + 1;
  const start = days > MAX_CUSTOM_DAYS ? startOfDay(addDays(last, 1 - MAX_CUSTOM_DAYS)) : first;
  return { from: start, to: last, label: periodLabel(start, last), explicit };
}

const mondayOf = (date: Date) => addDays(startOfDay(date), -((date.getDay() + 6) % 7));

/** The period a question names (already normalized), or null. « Les N derniers jours » end today. */
export function parsePeriod(text: string, now: Date): Period | null {
  const year = now.getFullYear();
  const month = now.getMonth();
  if (has(text, /\bavant hier\b/)) return span(addDays(now, -2), addDays(now, -2));
  if (has(text, /\b(aujourd hui|ce jour|du jour)\b/)) return span(now, now);
  if (has(text, /\bhier\b/)) return span(addDays(now, -1), addDays(now, -1));
  // « après-demain » holds « demain »: it is read first, like « avant-hier » before « hier » (until 19 November 2026 it
  // was answered as tomorrow).
  if (has(text, /\bapres demain\b/)) return span(addDays(now, 2), addDays(now, 2));
  if (has(text, /\bdemain\b/)) return span(addDays(now, 1), addDays(now, 1));
  if (has(text, /\bsemaine (derniere|passee|precedente)\b/)) return span(addDays(mondayOf(now), -7), addDays(mondayOf(now), -1));
  if (has(text, /\bsemaine prochaine\b/)) return span(addDays(mondayOf(now), 7), addDays(mondayOf(now), 13));
  if (has(text, /\b(cette|la) semaine\b/)) return span(mondayOf(now), addDays(mondayOf(now), 6));

  const named = new RegExp(`\\b(${MONTHS.join("|")})(?: (20\\d{2}))?\\b`).exec(text);
  if (named) {
    const index = MONTHS.indexOf(named[1]);
    // Without a year: the most recent such month, never one that has not started yet.
    const inYear = named[2] ? Number(named[2]) : index > month ? year - 1 : year;
    return span(new Date(inYear, index, 1), new Date(inYear, index + 1, 0));
  }
  if (has(text, /\bmois (dernier|passe|precedent)\b/)) return span(new Date(year, month - 1, 1), new Date(year, month, 0));
  if (has(text, /\bmois prochain\b/)) return span(new Date(year, month + 1, 1), new Date(year, month + 2, 0));
  if (has(text, /\b(ce|du) mois\b/)) return span(new Date(year, month, 1), new Date(year, month + 1, 0));
  if (has(text, /\b(annee|an) (derniere|dernier|passee|passe|precedente)\b/)) return span(new Date(year - 1, 0, 1), new Date(year - 1, 11, 31));
  if (has(text, /\b(cette annee|cet an)\b/)) return span(new Date(year, 0, 1), new Date(year, 11, 31));

  const last = /\b(\d{1,4}) (?:derniers|dernieres) (jours|semaines|mois)\b/.exec(text) ?? /\bdepuis (\d{1,4}) (jours|semaines|mois)\b/.exec(text);
  if (last) {
    const count = Math.min(Number(last[1]), MAX_COUNT);
    if (count < 1) return null;
    if (last[2] === "mois") return span(addDays(new Date(year, month - Math.min(count, 24), now.getDate()), 1), now);
    const days = last[2] === "jours" ? count : count * 7;
    return span(addDays(now, 1 - Math.min(days, MAX_CUSTOM_DAYS)), now);
  }
  const next = /\b(\d{1,4}) (?:prochains|prochaines) (jours|semaines)\b/.exec(text);
  if (next) {
    const count = Math.min(Number(next[1]), MAX_COUNT);
    if (count < 1) return null;
    return span(now, addDays(now, Math.min(count * (next[2] === "jours" ? 1 : 7), MAX_CUSTOM_DAYS) - 1));
  }
  const yearOnly = /\b(?:en|de|annee) (20\d{2})\b/.exec(text);
  if (yearOnly) return span(new Date(Number(yearOnly[1]), 0, 1), new Date(Number(yearOnly[1]), 11, 31));
  return null;
}

/** The thirty days ending today, the dashboard's own default. */
export const lastThirtyDays = (now: Date): Period => span(addDays(now, -29), now, false);

/** Is this stored date (ISO, or a calendar day) inside the period? An unreadable date is never inside. */
export function inPeriod(value: string | undefined | null, period: Period): boolean {
  const date = parseDashboardDate(value ?? undefined);
  return Boolean(date && date >= period.from && date <= period.to);
}
