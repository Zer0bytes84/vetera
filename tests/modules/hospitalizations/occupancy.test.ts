import { describe, expect, it } from "vitest";
import { occupancySummary } from "@/modules/hospitalizations/stays/occupancy";
import type { Stay, StayLocation } from "@/modules/hospitalizations/stays/store";

const now = new Date("2026-10-22T09:00:00");
const location = (id: string, active = 1): StayLocation => ({ id, name: `Box ${id}`, type: "box", species: null, active, note: "" });
const stay = (id: string, locationId: string | null, status: Stay["status"], plannedDischarge: string | null = null): Stay => ({
  id, patient_id: `p${id}`, location_id: locationId, status,
  admitted_at: "2026-10-20T10:00:00", planned_discharge_at: plannedDischarge, discharged_at: null,
  reason: "", discharge_summary: "", cancellation_reason: null, author_id: "u", created_at: "", updated_at: "",
});

describe("occupancySummary", () => {
  it("counts one unit per active location, occupied by active stays only", () => {
    const summary = occupancySummary(
      [location("1"), location("2"), location("3"), location("4", 0)],
      [stay("a", "1", "en_cours"), stay("b", "2", "sorti"), stay("c", null, "admis")],
      now,
    );
    expect(summary.units.map((unit) => [unit.id, unit.state])).toEqual([["1", "occupied"], ["2", "free"], ["3", "free"]]);
    expect(summary).toMatchObject({ total: 3, occupied: 1, free: 2, forecast: null });
  });

  it("marks a stay leaving within 24 hours, and forecasts from planned discharges only", () => {
    const summary = occupancySummary(
      [location("1"), location("2"), location("3")],
      [
        stay("a", "1", "en_cours", "2026-10-23T08:00:00"),
        stay("b", "2", "sortie_prevue", "2026-10-23T17:00:00"),
        stay("c", "3", "admis", "2026-10-26T10:00:00"),
      ],
      now,
    );
    expect(summary.units.map((unit) => unit.state)).toEqual(["leaving", "occupied", "occupied"]);
    expect(summary.forecast).toBe("2 sorties prévues demain : 2 places libres sur 3 ensuite.");
  });

  it("ignores discharges already past and says nothing without a planned one", () => {
    const summary = occupancySummary([location("1"), location("2")], [stay("a", "1", "en_cours", "2026-10-21T10:00:00")], now);
    expect(summary.units[0].state).toBe("occupied");
    expect(summary.forecast).toBeNull();
  });

  it("names a later day by its date", () => {
    const summary = occupancySummary([location("1")], [stay("a", "1", "admis", "2026-10-26T10:00:00")], now);
    expect(summary.forecast).toBe("Une sortie prévue le lundi 26 oct. : 1 place libre sur 1 ensuite.");
  });
});
