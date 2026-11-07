import type { ChartSeries } from "@/components/ui/chart-card";
import { formatNumber } from "@/utils/display-format";
import { seriesChange, type FocusPoint } from "../components/focus-trend-chart";
import type { VisitKindRow } from "./dashboard-widgets";

/** The chart's figures, from the same points as before: nothing is recomputed from another source. */

export const money = (value: number) => `${formatNumber(value)} DA`;
export const count = (value: number) => `${formatNumber(value)} consultation${value > 1 ? "s" : ""}`;
/** Compact scale label: 15 000 → « 15 k ». */
export const compactMoney = (value: number) =>
  value >= 1000 ? `${formatNumber(value / 1000, { maximumFractionDigits: 1 })} k` : formatNumber(value);

const sum = (values: (number | undefined)[]) => values.reduce<number>((total, value) => total + (value ?? 0), 0);

/** « +203,4 % contre 8 800 DA la période précédente », or the reason there is none. */
export function changeText(change: number | null, previous: string) {
  if (change === null) return "Pas de période précédente comparable";
  return `${change > 0 ? "+" : ""}${formatNumber(change, { maximumFractionDigits: 1 })} % contre ${previous} la période précédente`;
}

export interface RevenueChartModel {
  labels: string[];
  titles: string[];
  receipts: number[];
  visits: number[];
  totals: { receipts: number; visits: number; previousReceipts: number; previousVisits: number };
  changes: { receipts: number | null; visits: number | null };
  /** The same point in the previous period, as the tooltip's last line. */
  note: (index: number) => string | undefined;
  series: ChartSeries[];
}

/**
 * Receipts in dinars (read on the right scale, in blue) and consultations (on the left
 * scale, in teal, a marker a day), the two colours of TuffUI's Chart Card. Totals, changes and the tooltip's comparison are
 * the ones the chart has always shown.
 */
export function buildRevenueChart(points: FocusPoint[]): RevenueChartModel {
  const receipts = points.map((p) => p.receipts);
  const visits = points.map((p) => p.visits);
  const totals = {
    receipts: sum(receipts),
    visits: sum(visits),
    previousReceipts: sum(points.map((p) => p.previousReceipts)),
    previousVisits: sum(points.map((p) => p.previousVisits)),
  };
  const hasPrevious = points.some((p) => p.previousReceipts !== undefined || p.previousVisits !== undefined);
  const changes = {
    receipts: seriesChange(totals.receipts, totals.previousReceipts, hasPrevious),
    visits: seriesChange(totals.visits, totals.previousVisits, hasPrevious),
  };
  return {
    labels: points.map((p) => p.label),
    titles: points.map((p) => p.long),
    receipts,
    visits,
    totals,
    changes,
    note: (index) => {
      const point = points[index];
      if (!point || (point.previousReceipts === undefined && point.previousVisits === undefined)) return undefined;
      return `Période précédente : ${money(point.previousReceipts ?? 0)} · ${formatNumber(point.previousVisits ?? 0)}`;
    },
    series: [
      {
        id: "receipts",
        label: "Recettes",
        values: receipts,
        color: "var(--chart-blue)",
        axis: "right",
        format: compactMoney,
        valueFormat: money,
        detail: changeText(changes.receipts, money(totals.previousReceipts)),
      },
      {
        id: "visits",
        label: "Consultations",
        values: visits,
        color: "var(--chart-teal)",
        axis: "left",
        format: (v) => formatNumber(v),
        valueFormat: count,
        markers: true,
        detail: `${formatNumber(totals.visits)} · ${changeText(changes.visits, formatNumber(totals.previousVisits))}`,
      },
    ],
  };
}

/** The colour of an act, the same family as in the agenda (consultation green, vaccine blue, surgery rose, emergency amber). */
const KIND_COLORS: Record<string, string> = {
  consultation: "var(--tone-green)",
  vaccin: "var(--tone-blue)",
  chirurgie: "var(--tone-rose)",
  urgence: "var(--tone-amber)",
  contrôle: "var(--muted-foreground)",
};
const FALLBACK_COLORS = ["var(--tone-violet)", "var(--tone-blue)", "var(--tone-green)", "var(--tone-amber)", "var(--tone-rose)"];

/** The period's consultations split by type of act: one slice per type, each the count of its visits. */
export function buildKindsDonut(kinds: VisitKindRow[]): ChartSeries[] {
  let spare = 0;
  return kinds.map((kind) => ({
    id: kind.key,
    label: kind.name,
    values: [kind.count],
    color: KIND_COLORS[kind.key] ?? FALLBACK_COLORS[spare++ % FALLBACK_COLORS.length],
    format: (v: number) => formatNumber(v),
    valueFormat: count,
    detail: `${formatNumber(kind.count)} · ${kind.share} %`,
  }));
}
