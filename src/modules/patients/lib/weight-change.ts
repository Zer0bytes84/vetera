import type { WeightEntry } from "@/types/db";

/**
 * Between two consecutive weighings, a weight that triples or drops to a
 * third is almost always a typing slip (100 kg for 10 kg, grams for kg),
 * not a change in the animal. Such a gap is flagged instead of shown as a trend.
 */
const IMPLAUSIBLE_RATIO = 3;
const MIN_VISIBLE_CHANGE_KG = 0.05;

export type WeightChange =
  | { kind: "none" }
  | { kind: "change"; deltaKg: number }
  | { kind: "implausible"; deltaKg: number; previous: WeightEntry };

function time(value: string | undefined) {
  const parsed = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Oldest first; same-day weighings keep the order they were recorded in. */
export function sortWeightEntries(entries: WeightEntry[]) {
  return [...entries].sort(
    (left, right) =>
      time(left.measuredAt) - time(right.measuredAt) ||
      time(left.createdAt) - time(right.createdAt)
  );
}

/** Change between the last weighing and the one before it. */
export function describeWeightChange(entries: WeightEntry[]): WeightChange {
  const sorted = sortWeightEntries(
    entries.filter((entry) => Number.isFinite(entry.weightKg) && entry.weightKg > 0)
  );
  const last = sorted.at(-1);
  const previous = sorted.at(-2);
  if (!(last && previous)) {
    return { kind: "none" };
  }
  const deltaKg = last.weightKg - previous.weightKg;
  if (Math.abs(deltaKg) < MIN_VISIBLE_CHANGE_KG) {
    return { kind: "none" };
  }
  const ratio =
    Math.max(last.weightKg, previous.weightKg) /
    Math.min(last.weightKg, previous.weightKg);
  if (ratio >= IMPLAUSIBLE_RATIO) {
    return { kind: "implausible", deltaKg, previous };
  }
  return { kind: "change", deltaKg };
}
