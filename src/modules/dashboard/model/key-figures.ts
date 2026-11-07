import type { StatTone } from "@/components/ui/stat-grid";
import { formatNumber } from "@/utils/display-format";
import { formatCentimes } from "../v2/model";
import type { buildPremiumAnalytics } from "./premium-analytics";
import type { receivablesSummary } from "../v2/financial-model";

/**
 * The dashboard's row of key figures, as plain data, kept minimal like TuffUI's Stat Grid: a label, the
 * figure, how it changed against the previous period (a pill), one short line under it, and the two
 * things a view shows: the striped bar towards a goal (the « Indicateurs » view) or the curve (the « Mini-graphiques »
 * view),
 * each card drawing both from its own records.
 */

export type KeyFigureId = "cash" | "appointments" | "receivables" | "actions";

export interface KeyFigure {
  id: KeyFigureId;
  label: string;
  value: string;
  /** Change vs the previous period, in percent: every card has one. */
  delta: number;
  /** The badge's words when a percentage cannot be (the previous period was empty). */
  deltaText?: string;
  higherIsBetter: boolean;
  /** The one short line under the figure. */
  line: string;
  /** Progress towards a goal the card's own records make meaningful, 0 to 1, with its label; none when they cannot say. */
  goal?: { ratio: number; label: string };
  /** The curve of the sparkline: a running total for money, a count per day for appointments. */
  trend?: number[];
  tone: StatTone;
  /** The figure itself takes the tone: a warning. */
  emphasize: boolean;
  ariaLabel: string;
}

/**
 * The change every card shows as its badge, against the previous period. A percentage when there was
 * something before; nothing on either side is 0 %; from nothing to something has no percentage, so
 * the badge reads the rise itself ("+2", "+200 DA"). `absolute` words an amount for that case.
 */
export function changeBadge(change: number | null, previous: number, current: number, absolute: (n: number) => string): { delta: number; deltaText?: string } {
  if (previous === 0 && current === 0) return { delta: 0 };
  if (previous === 0) return { delta: current, deltaText: `+${absolute(current)}` };
  return { delta: change ?? Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10 };
}

const dinars = (n: number) => formatCentimes(Math.round(n * 100));

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

/** The rate of actions done: finished out of finished plus still to follow; 100 % when there is nothing to finish. */
export function actionsGoal(done: number, open: number): { ratio: number; label: string } {
  const total = done + open;
  if (total === 0) return { ratio: 1, label: "Aucune action à terminer" };
  return { ratio: done / total, label: `${plural(done, "action")} terminée${done > 1 ? "s" : ""} sur ${total}` };
}

export function buildKeyFigures(
  model: Pick<ReturnType<typeof buildPremiumAnalytics>, "cash" | "patients" | "actions" | "appointments" | "trend" | "receivablesBefore">,
  receivables: ReturnType<typeof receivablesSummary>,
  /** Share of the invoiced amount already settled, in percent; null without any invoice. */
  settlement: number | null
): KeyFigure[] {
  const { cash, actions, appointments, trend } = model;
  const running = trend.income.reduce<number[]>((sums, value) => [...sums, (sums.at(-1) ?? 0) + value], []);
  const owed = Math.round(receivables.total * 100);
  const late = receivables.overdueInvoices;
  const entries = receivables.pendingEntries;
  return [
    {
      id: "cash",
      label: "Trésorerie",
      value: formatCentimes(cash.income),
      ...changeBadge(cash.change, cash.previous / 100, cash.income / 100, dinars),
      higherIsBetter: true,
      line: `Solde net : ${formatCentimes(cash.net)}`,
      // The goal: match the previous period's receipts. Without a previous period, no goal.
      goal: cash.previous > 0 ? { ratio: Math.min(1, cash.income / cash.previous), label: `Période précédente : ${formatCentimes(cash.previous)}` } : undefined,
      trend: running,
      tone: "green",
      emphasize: false,
      ariaLabel: "Voir la trésorerie",
    },
    {
      id: "appointments",
      label: "Rendez-vous",
      value: formatNumber(appointments.count),
      ...changeBadge(appointments.change, appointments.previous, appointments.count, formatNumber),
      higherIsBetter: true,
      line: `${plural(appointments.honored, "honoré")} · ${plural(appointments.cancelled, "annulé")} · ${plural(appointments.missed, "absence")}`,
      // The goal: that the appointments are honoured. Without an appointment, no goal.
      goal: appointments.count > 0 ? { ratio: appointments.honored / appointments.count, label: `Honorés : ${appointments.honored} sur ${appointments.count}` } : undefined,
      // Per day (per week over a long period), not cumulative: the curve of the agenda's load.
      trend: trend.appointments,
      tone: "blue",
      emphasize: false,
      ariaLabel: "Voir les rendez-vous",
    },
    {
      id: "receivables",
      label: "Créances",
      value: formatCentimes(owed),
      // Against what was owed when the previous period ended: less is better.
      ...changeBadge(null, model.receivablesBefore, receivables.total, dinars),
      higherIsBetter: false,
      line:
        (receivables.unpaidInvoices === 0 ? "Aucune facture impayée" : `${plural(receivables.unpaidInvoices, "facture")} impayée${receivables.unpaidInvoices > 1 ? "s" : ""} · ${late} en retard`) +
        (entries > 0 ? ` · ${entries} en attente` : ""),
      // What is owed is settled over every invoice, the goal being that all of it is.
      goal: settlement === null ? undefined : { ratio: settlement / 100, label: "Factures réglées" },
      // How what is owed moved over the period, read back from today's figure.
      trend: trend.receivables,
      tone: late > 0 ? "rose" : owed > 0 ? "amber" : "green",
      emphasize: owed > 0,
      ariaLabel: "Voir les créances",
    },
    {
      id: "actions",
      label: "Actions à suivre",
      value: formatNumber(actions.count),
      ...changeBadge(actions.change, actions.previous, actions.count, formatNumber),
      higherIsBetter: false,
      line: `${actions.urgent} prioritaires · ${actions.reminders} vaccins · ${actions.tasks} tâches`,
      // The rate of actions done: those finished in the period out of those finished and those still to follow.
      // Nothing to finish is a full bar, 100 %, and the bar is always there, so the four cards keep the same foot.
      goal: actionsGoal(actions.tasksDone, actions.count),
      // The open actions falling due per day: the curve of what is waiting.
      trend: trend.actions,
      tone: actions.urgent > 0 ? "rose" : "amber",
      emphasize: true,
      ariaLabel: "Voir les actions et rappels",
    },
  ];
}
