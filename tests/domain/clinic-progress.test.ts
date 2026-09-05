import { describe, expect, it } from "vitest";
import {
  buildClinicProgress,
  isInProgressPeriod,
} from "../../src/modules/dashboard/v2/progress-model";
import type { Appointment, Task, Transaction } from "../../src/types/db";

const referenceDate = new Date(2026, 8, 4, 14);
const appointment = (
  id: string,
  status: Appointment["status"]
): Appointment => ({
  id,
  patientId: "p",
  ownerId: "o",
  vetId: "v",
  title: "Consultation",
  type: "Consultation",
  startTime: "2026-09-04T09:00:00",
  endTime: "2026-09-04T09:30:00",
  status,
  createdAt: "2026-09-04T08:00:00",
});
const task = (status: Task["status"], dueDate: string): Task => ({
  id: status,
  title: "Suivi",
  priority: "medium",
  isReminder: false,
  status,
  dueDate,
  createdAt: "2026-08-01T12:00:00",
});
const transaction = (
  status: Transaction["status"],
  type: Transaction["type"]
): Transaction => ({
  id: `${type}-${status}`,
  amount: 10000,
  category: "Consultation",
  description: "Paiement",
  method: "cash",
  status,
  type,
  date: "2026-09-04",
  createdAt: "2026-09-04T12:00:00",
});

describe("clinical progress denominators", () => {
  it("keeps an empty period empty, with no fabricated completion", () => {
    const result = buildClinicProgress({
      appointments: [],
      tasks: [],
      transactions: [],
      referenceDate,
      days: 30,
    });
    expect(result.map((item) => [item.done, item.total])).toEqual([
      [0, 0],
      [0, 0],
      [0, 0],
    ]);
  });
  it("excludes cancellations, retains no-shows, and counts only paid income", () => {
    const result = buildClinicProgress({
      appointments: [
        appointment("1", "completed"),
        appointment("2", "no_show"),
        appointment("3", "cancelled"),
      ],
      tasks: [
        task("done", "2026-09-04"),
        task("todo", "2026-09-02"),
        task("done", "2026-07-01"),
      ],
      transactions: [
        transaction("paid", "income"),
        transaction("pending", "income"),
        transaction("paid", "expense"),
      ],
      referenceDate,
      days: 7,
    });
    expect(result.map((item) => [item.done, item.total])).toEqual([
      [1, 2],
      [1, 2],
      [1, 2],
    ]);
  });
  it("uses inclusive local calendar boundaries and rejects future or invalid dates", () => {
    expect(isInProgressPeriod("2026-08-29", referenceDate, 7)).toBe(true);
    expect(isInProgressPeriod("2026-09-04", referenceDate, 7)).toBe(true);
    expect(isInProgressPeriod("2026-08-28", referenceDate, 7)).toBe(false);
    expect(isInProgressPeriod("2026-09-05", referenceDate, 7)).toBe(false);
    expect(isInProgressPeriod("invalid", referenceDate, 7)).toBe(false);
    expect(isInProgressPeriod(undefined, referenceDate, 7)).toBe(false);
  });
});
