import type { VitalSign } from "./store";
import { vitalReference } from "./vital-alerts";

export type VitalKey = "temperature_c" | "heart_rate" | "respiratory_rate" | "weight_kg";
export const VITAL_METRICS: readonly { key: VitalKey; label: string; unit: string; digits: number }[] = [
  { key: "temperature_c", label: "Température", unit: "°C", digits: 1 },
  { key: "heart_rate", label: "Fréquence cardiaque", unit: "/min", digits: 0 },
  { key: "respiratory_rate", label: "Fréquence respiratoire", unit: "/min", digits: 0 },
  { key: "weight_kg", label: "Poids", unit: "kg", digits: 1 },
];

export type Verdict = "below" | "within" | "above";

/** Only temperature and heart rate have a recorded resting reference. */
export function referenceRange(species: string, key: VitalKey): readonly [number, number] | undefined {
  const reference = vitalReference(species);
  if (!reference) return undefined;
  if (key === "temperature_c") return reference.temperature;
  if (key === "heart_rate") return reference.heartRate;
  return undefined;
}

export function verdict(value: number, range?: readonly [number, number]): Verdict | null {
  if (!range) return null;
  return value < range[0] ? "below" : value > range[1] ? "above" : "within";
}

const dayKey = (value: string) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

/**
 * One row per calendar day, newest first: number of readings and, for each
 * measure taken that day, its lowest and highest value.
 */
export function vitalsByDay(vitals: VitalSign[]) {
  const days = new Map<string, VitalSign[]>();
  for (const vital of vitals) {
    const key = dayKey(vital.recorded_at);
    days.set(key, [...(days.get(key) ?? []), vital]);
  }
  return [...days.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([day, readings]) => ({
      day,
      count: readings.length,
      ranges: Object.fromEntries(
        VITAL_METRICS.map(({ key }) => {
          const values = readings.map((reading) => reading[key]).filter((value): value is number => value != null);
          return [key, values.length ? { min: Math.min(...values), max: Math.max(...values) } : null];
        })
      ) as Record<VitalKey, { min: number; max: number } | null>,
    }));
}

/**
 * The latest value of each measure, read against the species reference and
 * against the reading before it.
 */
export function latestReadings(species: string, vitals: VitalSign[]) {
  const ordered = [...vitals].sort((left, right) => left.recorded_at.localeCompare(right.recorded_at));
  return VITAL_METRICS.flatMap((metric) => {
    const taken = ordered.filter((vital) => vital[metric.key] != null);
    const last = taken.at(-1);
    if (!last) return [];
    const previous = taken.at(-2);
    const value = last[metric.key] as number;
    const range = referenceRange(species, metric.key);
    return [{
      ...metric,
      value,
      at: last.recorded_at,
      range,
      verdict: verdict(value, range),
      change: previous ? value - (previous[metric.key] as number) : null,
      previousAt: previous?.recorded_at ?? null,
    }];
  });
}
