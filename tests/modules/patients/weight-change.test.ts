import { describe, expect, it } from "vitest";
import {
  describeWeightChange,
  sortWeightEntries,
} from "@/modules/patients/lib/weight-change";
import type { WeightEntry } from "@/types/db";

function entry(
  id: string,
  weightKg: number,
  measuredAt: string,
  createdAt = measuredAt
): WeightEntry {
  return {
    createdAt,
    id,
    measuredAt,
    patientId: "p1",
    updatedAt: createdAt,
    weightKg,
  };
}

describe("weight change between the last two weighings", () => {
  it("reports a normal change in kilograms", () => {
    const change = describeWeightChange([
      entry("a", 28.4, "2026-09-01T00:00:00.000Z"),
      entry("b", 29.1, "2026-10-01T00:00:00.000Z"),
    ]);
    expect(change.kind).toBe("change");
    expect(change.kind === "change" && change.deltaKg).toBeCloseTo(0.7);
  });

  it("flags a typing slip instead of a -95 kg trend (100 kg then 5 kg)", () => {
    const change = describeWeightChange([
      entry("a", 100, "2026-07-29T00:00:00.000Z"),
      entry("b", 5, "2026-08-02T00:00:00.000Z"),
    ]);
    expect(change.kind).toBe("implausible");
    expect(change.kind === "implausible" && change.previous.weightKg).toBe(100);
  });

  it("keeps a puppy doubling its weight as a real change", () => {
    const change = describeWeightChange([
      entry("a", 2, "2026-08-01T00:00:00.000Z"),
      entry("b", 4, "2026-09-01T00:00:00.000Z"),
    ]);
    expect(change.kind).toBe("change");
  });

  it("shows nothing with a single weighing or a negligible change", () => {
    expect(describeWeightChange([entry("a", 5, "2026-08-02T00:00:00.000Z")]).kind).toBe("none");
    expect(
      describeWeightChange([
        entry("a", 5, "2026-08-01T00:00:00.000Z"),
        entry("b", 5.02, "2026-08-02T00:00:00.000Z"),
      ]).kind
    ).toBe("none");
  });

  it("orders same-day weighings by the time they were recorded", () => {
    const sorted = sortWeightEntries([
      entry("later", 6, "2026-08-02T00:00:00.000Z", "2026-08-02T10:00:00.000Z"),
      entry("earlier", 5, "2026-08-02T00:00:00.000Z", "2026-08-02T08:00:00.000Z"),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["earlier", "later"]);
  });
});
