/*
 * How an answer is shown beyond its sentence: cards that name its figures, and a chart drawn from its table's rows
 * (tranche 1 of 19 November 2026). Nothing is read here: every point comes from a row the table shows, grouped by day,
 * week or month of the period, and each series names the figure it must add up to (verifyAnswer checks it).
 */

import { parseDashboardDate } from "@/modules/dashboard/v2/model";
import type {
  Answer,
  AnswerCard,
  AnswerChart,
  AnswerChartPoint,
  AnswerRow,
  AnswerSeries,
  Period,
} from "./types";

/*
 * Buckets are calendar days, never timestamps: a day where the clock jumps at midnight (Beirut, Santiago, Cairo) has no
 * 00:00, and stepping by 24 hours would slip a bucket by an hour and drop its rows. A day is its « YYYY-MM-DD » key;
 * days compare as text.
 */
type Bucket = { key: string; label: string; first: string; last: string };

const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const calendar = (date: Date) => ({
  y: date.getFullYear(),
  m: date.getMonth(),
  d: date.getDate(),
});
const at = (y: number, m: number, d: number) => new Date(y, m, d, 12);
const dayLabel = (date: Date) =>
  date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const monthLabel = (date: Date) =>
  date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });

/**
 * The period's buckets, in order: days up to 62 days; weeks up to 182, counted back from the period's last day so the
 * last week is whole (the first may be short); calendar months beyond, the first and last cut at the period's ends.
 */
export function bucketsOf(period: Period): {
  unit: "jour" | "semaine" | "mois";
  buckets: Bucket[];
} {
  const from = calendar(period.from);
  const to = calendar(period.to);
  const firstKey = iso(at(from.y, from.m, from.d));
  const lastKey = iso(at(to.y, to.m, to.d));
  const days: Date[] = [];
  for (let i = 0; ; i++) {
    const day = at(from.y, from.m, from.d + i);
    if (iso(day) > lastKey) break;
    days.push(day);
  }
  if (days.length <= 62)
    return {
      unit: "jour",
      buckets: days.map((day) => ({
        key: iso(day),
        label: dayLabel(day),
        first: iso(day),
        last: iso(day),
      })),
    };
  if (days.length <= 182) {
    const buckets: Bucket[] = [];
    for (let end = days.length - 1; end >= 0; end -= 7) {
      const start = Math.max(0, end - 6);
      buckets.unshift({
        key: iso(days[start]),
        label: `sem. du ${dayLabel(days[start])}`,
        first: iso(days[start]),
        last: iso(days[end]),
      });
    }
    return { unit: "semaine", buckets };
  }
  const buckets: Bucket[] = [];
  for (let y = from.y, m = from.m; iso(at(y, m, 1)) <= lastKey; m++) {
    const monthStart = at(y, m, 1);
    const first = iso(monthStart) < firstKey ? firstKey : iso(monthStart);
    const monthEnd = iso(at(y, m + 1, 0));
    buckets.push({
      key: iso(monthStart),
      label: monthLabel(monthStart),
      first,
      last: monthEnd > lastKey ? lastKey : monthEnd,
    });
  }
  return { unit: "mois", buckets };
}

/**
 * The rows' values summed by bucket, every bucket kept (a day without a line is a zero, not a gap). A row is placed by
 * its local calendar day, read with the same parser as the period filter; a row in no bucket is left out, so the
 * series' sum, checked against its figure, would reveal it.
 */
export function seriesOver(
  rows: AnswerRow[],
  dateKey: string,
  value: (row: AnswerRow) => number,
  buckets: Bucket[]
): AnswerChartPoint[] {
  const sums = buckets.map(() => 0);
  for (const row of rows) {
    const raw = row[dateKey];
    const date = typeof raw === "string" ? parseDashboardDate(raw) : null;
    if (!date) continue;
    const key = iso(date);
    const index = buckets.findIndex(
      (bucket) => key >= bucket.first && key <= bucket.last
    );
    if (index >= 0) sums[index] += value(row);
  }
  return buckets.map((bucket, index) => ({
    key: bucket.key,
    label: bucket.label,
    value: sums[index],
  }));
}

type Shown = Extract<Answer, { kind: "answer" }>;
export type Built = Omit<Shown, "cards" | "chart">;

/** What a figure means for the practice: a card's colour says this, not whether it went up. */
const TONES: Record<string, AnswerCard["tone"]> = {
  income: "positive",
  expense: "negative",
  net: "neutral",
  rows: "neutral",
  completed: "positive",
  cancelled: "neutral",
  no_show: "negative",
  late: "negative",
  undated: "neutral",
  active: "neutral",
  total: "neutral",
};
/** Figures that are notes, not results: « lignes en attente » is said in a note and not counted. */
const NOT_A_CARD = new Set(["pending"]);

export function withPresentation(answer: Built): Shown {
  return { ...answer, ...presentationOf(answer) };
}

/** The cards and chart an answer must show, derived from its figures and table alone: verifyAnswer compares them. */
export function presentationOf(answer: Built): Pick<Shown, "cards" | "chart"> {
  const cards: AnswerCard[] = answer.figures
    .filter((figure) => !NOT_A_CARD.has(figure.id))
    .map((figure) => ({
      figure: figure.id,
      tone: figure.meaning ?? TONES[figure.id] ?? "neutral",
    }));
  return { cards, chart: chartOf(answer) };
}

/** A species chart keeps the seven largest groups and adds the rest up as « Autres »: the total is unchanged. */
const MAX_SPECIES = 8;

function chartOf(answer: Built): AnswerChart | null {
  const { table, figures, topic, period } = answer;
  if (!table || table.rows.length === 0) return null;
  const has = (id: string) => figures.some((figure) => figure.id === id);
  if (topic === "patients" && has("active")) {
    const all = table.rows.map((row) => ({
      key: String(row.id),
      label: String(row.species),
      value: Number(row.count),
    }));
    const points =
      all.length <= MAX_SPECIES
        ? all
        : [
            ...all.slice(0, MAX_SPECIES - 1),
            {
              key: "autres",
              label: "Autres",
              value: all
                .slice(MAX_SPECIES - 1)
                .reduce((sum, point) => sum + point.value, 0),
            },
          ];
    return {
      title: "Dossiers actifs par espèce",
      kind: "bars",
      unit: "count",
      bucket: "espece",
      series: [
        {
          id: "active",
          label: "Dossiers actifs",
          tone: "count",
          tie: "active",
          points,
        },
      ],
    };
  }
  if (!period || topic === "tasks") return null;
  const { unit, buckets } = bucketsOf(period);
  if (topic === "cash") {
    const series: AnswerSeries[] = [];
    if (has("income"))
      series.push({
        id: "income",
        label: "Encaissé",
        tone: "income",
        tie: "income",
        points: seriesOver(
          table.rows,
          "date",
          (row) => Math.max(0, Number(row.amount)),
          buckets
        ),
      });
    if (has("expense"))
      series.push({
        id: "expense",
        label: "Dépensé",
        tone: "expense",
        tie: "expense",
        points: seriesOver(
          table.rows,
          "date",
          (row) => Math.max(0, -Number(row.amount)),
          buckets
        ),
      });
    return series.length
      ? {
          title: `Journal de caisse par ${unit}`,
          kind: "area",
          unit: "money",
          bucket: unit,
          series,
        }
      : null;
  }
  const dateKey = topic === "appointments" ? "start" : "created";
  const rows = figures.find((figure) => figure.id === "rows");
  if (!rows) return null;
  // The series is named like its figure: « Absences » when the question asked for them.
  const label = rows.label;
  return {
    title: `${label} par ${unit}`,
    kind: "bars",
    unit: "count",
    bucket: unit,
    series: [
      {
        id: "rows",
        label,
        tone: "count",
        tie: "rows",
        points: seriesOver(table.rows, dateKey, () => 1, buckets),
      },
    ],
  };
}
