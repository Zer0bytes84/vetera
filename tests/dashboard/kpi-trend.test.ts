import { describe, expect, it } from "vitest";
import type { Appointment, Patient } from "@/types/db";
import { analyticsRanges, buildPremiumAnalytics, trendBuckets } from "@/modules/dashboard/model/premium-analytics";

const now = new Date(2026, 9, 21, 10);
const patient = (id: string) => ({ id, name: id, ownerId: "o", species: "Chien", status: "sante", createdAt: "2026-01-01" }) as Patient;
const visit = (id: string, patientId: string, day: number, month = 9): Appointment =>
  ({ id, patientId, ownerId: "o", vetId: "v", title: id, type: "Consultation", status: "completed",
    startTime: new Date(2026, month, day, 9).toISOString(), endTime: new Date(2026, month, day, 10).toISOString(), createdAt: "2026-01-01" }) as Appointment;

describe("micro-histogrammes des indicateurs", () => {
  it("découpe la période en jours, en semaines ou en mois", () => {
    const len = (p: Parameters<typeof trendBuckets>[0]) => trendBuckets(p, analyticsRanges(p, now).current).length;
    expect(len("today")).toBe(0);
    expect(len("7d")).toBe(7);
    expect(len("30d")).toBe(30);
    expect(len("90d")).toBe(13);
    expect(len("12m")).toBe(12);
  });

  it("compte les consultations par jour et compare les consultations entre elles", () => {
    const model = buildPremiumAnalytics({
      appointments: [visit("a", "rex", 21), visit("b", "rex", 21), visit("c", "milo", 20), visit("d", "milo", 10)],
      patients: [patient("rex"), patient("milo")],
      transactions: [], tasks: [], vaccinations: [], alerts: [],
    }, "7d", now);
    expect(model.trend.visits.slice(-2)).toEqual([1, 2]);
    expect(model.trend.patients.slice(-2)).toEqual([1, 1]);
    expect(model.patients.visits).toBe(3);
    // The 10 October visit falls in the previous seven days.
    expect(model.patients.previousVisits).toBe(1);
    expect(model.patients.visitsChange).toBe(200);
  });
});
