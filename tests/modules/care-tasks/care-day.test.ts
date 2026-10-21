import { describe, expect, it } from "vitest";
import { careDaySummary, careDoses, careTimeline } from "@/modules/care-tasks/care-day";
import type { CareTask } from "@/modules/care-tasks/domain";

const task = (id: string, at: string, statut: CareTask["statut"], patient_id = "p1") => ({
  id,
  patient_id,
  statut,
  heure_prevue: `2026-10-21T${at}:00`,
});
const now = new Date("2026-10-21T11:00:00");
const day = [
  task("a", "08:00", "fait"),
  task("b", "09:00", "a_faire"),
  task("c", "12:30", "a_faire"),
  task("d", "16:00", "en_cours", "p2"),
  task("e", "10:00", "annule", "p2"),
];

describe("careDaySummary", () => {
  it("leaves cancelled care out of what is planned", () => {
    const summary = careDaySummary(day, now);
    expect(summary).toMatchObject({ planned: 4, done: 1, pending: 3, inProgress: 1, cancelled: 1 });
    expect(summary.overdue.map((t) => t.id)).toEqual(["b"]);
    expect(summary.next?.id).toBe("c");
  });
});

describe("careDaySummary with care carried from earlier days", () => {
  it("counts earlier undone care as late and to finish, never as planned today", () => {
    const carried = task("old", "08:00", "a_faire", "p1");
    const earlier = { ...carried, heure_prevue: "2026-10-14T12:30:00" };
    const summary = careDaySummary([earlier, ...day], now, new Date("2026-10-21T00:00:00"));
    expect(summary).toMatchObject({ planned: 4, pending: 4, carried: 1, cancelled: 1 });
    expect(summary.overdue.map((t) => t.id)).toEqual(["old", "b"]);
  });
});

describe("careDoses", () => {
  it("counts done out of planned for one animal", () => {
    expect(careDoses(day.filter((t) => t.patient_id === "p1"))).toEqual({ done: 1, total: 3 });
    expect(careDoses(day.filter((t) => t.patient_id === "p2"))).toEqual({ done: 0, total: 1 });
  });
});

describe("careTimeline", () => {
  it("marks done, late, soon and later care on the day's span", () => {
    const line = careTimeline(day, now);
    expect(line).not.toBeNull();
    expect(line?.startHour).toBe(7);
    expect(line?.endHour).toBe(18);
    expect(line?.marks.map((m) => [m.task.id, m.kind])).toEqual([
      ["a", "done"],
      ["b", "late"],
      ["c", "soon"],
      ["d", "later"],
    ]);
    expect(line?.now).toBeCloseTo((4 / 11) * 100);
  });

  it("has no current time on another day, and nothing without care", () => {
    expect(careTimeline(day, new Date("2026-10-22T09:00:00"))?.now).toBeNull();
    expect(careTimeline([task("x", "09:00", "annule")], now)).toBeNull();
  });
});
