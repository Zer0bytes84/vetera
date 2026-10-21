import { describe, expect, it } from "vitest";
import { latestReadings, verdict, vitalsByDay } from "@/modules/hospitalizations/stays/vitals-summary";
import type { VitalSign } from "@/modules/hospitalizations/stays/store";

const reading = (at: string, temperature: number | null, heart: number | null, respiratory: number | null = null): VitalSign => ({
  id: at, stay_id: "s", recorded_at: at, temperature_c: temperature, heart_rate: heart,
  respiratory_rate: respiratory, weight_kg: null, general_state: null, appetite: null, note: "", author_id: "u",
});
const vitals = [
  reading("2026-10-20T08:00:00", 38.6, 130, 24),
  reading("2026-10-20T18:00:00", 39.0, 150),
  reading("2026-10-21T08:00:00", 39.6, 128, 30),
];

describe("vitalsByDay", () => {
  it("gives the lowest and highest value of each day, newest day first", () => {
    const days = vitalsByDay(vitals);
    expect(days.map((d) => [d.day, d.count])).toEqual([["2026-10-21", 1], ["2026-10-20", 2]]);
    expect(days[1].ranges.temperature_c).toEqual({ min: 38.6, max: 39 });
    expect(days[1].ranges.respiratory_rate).toEqual({ min: 24, max: 24 });
    expect(days[1].ranges.weight_kg).toBeNull();
  });
});

describe("latestReadings", () => {
  it("reads the last value against the species reference and the reading before", () => {
    const [temperature, heart, respiratory] = latestReadings("Chat", vitals);
    expect(temperature).toMatchObject({ value: 39.6, verdict: "above", range: [38.1, 39.2] });
    expect(temperature.change).toBeCloseTo(0.6);
    expect(heart).toMatchObject({ value: 128, verdict: "within", change: -22 });
    // No resting reference is recorded for the respiratory rate.
    expect(respiratory).toMatchObject({ value: 30, verdict: null, change: 6 });
  });

  it("has no verdict for a species without reference", () => {
    expect(latestReadings("Furet", vitals)[0].verdict).toBeNull();
    expect(verdict(37, [37.5, 39.2])).toBe("below");
  });
});
