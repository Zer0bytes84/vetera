import { describe, expect, it } from "vitest";
import { kpiRange, kpiBuckets, kpiWithin } from "../../src/modules/dashboard/v2/kpi-period";
const date = new Date(2026, 9, 5, 12);
describe("dashboard KPI calendar periods", () => {
  it("uses Monday to Sunday weeks and full calendar months and years", () => {
    expect(kpiRange("day", date)).toEqual({ from: "2026-10-05", to: "2026-10-05" });
    expect(kpiRange("week", date)).toEqual({ from: "2026-10-05", to: "2026-10-11" });
    expect(kpiRange("month", date)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(kpiRange("year", date)).toEqual({ from: "2026-01-01", to: "2026-12-31" });
    expect(kpiWithin("2025-12-01", kpiRange("all", date))).toBe(true);
    expect(kpiWithin("2026-09-30", kpiRange("month", date))).toBe(false);
  });
  it("caps month buckets at the end of February and includes leap day", () => {
    const buckets = kpiBuckets("month", new Date(2024, 1, 20));
    expect(buckets).toHaveLength(5);
    expect(buckets.at(-1)).toMatchObject({ from: "2024-02-29", to: "2024-02-29" });
    expect(kpiBuckets("year", date)).toHaveLength(12);
  });
});
