import { describe, expect, it } from "vitest";
import { groupReminders, reminderBucket, sourceBreakdown } from "@/components/reminder-buckets";

const now = new Date("2026-10-21T11:00:00");
const at = (value: string | null) => (value ? new Date(value) : null);

describe("reminderBucket", () => {
  it("places a reminder relative to today", () => {
    expect(reminderBucket(at("2026-10-20T09:00:00"), now)).toBe("overdue");
    expect(reminderBucket(at("2026-10-21T08:00:00"), now)).toBe("today");
    expect(reminderBucket(at("2026-10-22T08:00:00"), now)).toBe("tomorrow");
    expect(reminderBucket(at("2026-11-02T08:00:00"), now)).toBe("later");
    expect(reminderBucket(null, now)).toBe("undated");
  });
});

describe("groupReminders", () => {
  it("keeps the order inside each group and counts them", () => {
    const items = ["2026-10-21T08:00:00", "2026-10-19T08:00:00", "2026-10-21T15:00:00", null];
    const groups = groupReminders(items, at, now);
    expect(groups.map((g) => [g.label, g.items.length])).toEqual([
      ["En retard", 1],
      ["Aujourd’hui", 2],
      ["Sans date", 1],
    ]);
    expect(groups[1].items).toEqual(["2026-10-21T08:00:00", "2026-10-21T15:00:00"]);
  });
});

describe("sourceBreakdown", () => {
  it("names each source with its count, leaving empty ones out", () => {
    expect(sourceBreakdown([{ kind: "medical" }, { kind: "medical" }, { kind: "manual" }])).toBe("2 médicaux · 1 manuel");
    expect(sourceBreakdown([])).toBe("");
  });
});
