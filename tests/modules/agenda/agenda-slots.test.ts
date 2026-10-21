import { describe, expect, it } from "vitest";
import {
  agendaDayStats,
  freeSlotStarts,
  personInitials,
} from "@/modules/agenda/components/agenda-slots";
import type { Appointment } from "@/types/db";

const visit = (
  start: string,
  end: string,
  status: Appointment["status"] = "scheduled",
  type: Appointment["type"] = "Consultation",
  vetId = "v1"
) => ({ startTime: `2026-10-21T${start}:00`, endTime: `2026-10-21T${end}:00`, status, type, vetId });

describe("personInitials", () => {
  it("skips the title", () => {
    expect(personInitials("Dr Lina Ait Salem")).toBe("LA");
    expect(personInitials("Dr. Karim Messaoud")).toBe("KM");
    expect(personInitials("")).toBe("?");
  });
});

describe("freeSlotStarts", () => {
  const day = new Date("2026-10-21T00:00:00");
  it("leaves out booked and past half hours, not cancelled ones", () => {
    const free = freeSlotStarts({
      appointments: [visit("09:30", "10:00"), visit("10:00", "10:30", "cancelled")],
      day,
      startHour: 9,
      endHour: 10,
      now: new Date("2026-10-21T09:10:00"),
    });
    // 09:00 is still running at 09:10, 09:30 is booked, 10:00 was cancelled.
    expect(free).toEqual([9 * 60, 10 * 60, 10 * 60 + 30]);
  });

  it("offers nothing on a day already over", () => {
    expect(
      freeSlotStarts({ appointments: [], day, startHour: 9, endHour: 10, now: new Date("2026-10-22T08:00:00") })
    ).toEqual([]);
  });
});

describe("agendaDayStats", () => {
  it("counts booked time without cancelled visits", () => {
    const stats = agendaDayStats([
      visit("09:30", "10:00", "completed", "Vaccin", "v1"),
      visit("10:15", "11:00", "in_progress", "Urgence", "v2"),
      visit("14:00", "14:30", "confirmed", "Contrôle", "v1"),
      visit("15:00", "16:00", "cancelled", "Chirurgie", "v2"),
    ]);
    expect(stats).toMatchObject({
      booked: 3,
      completed: 1,
      underway: 1,
      planned: 1,
      cancelled: 1,
      minutes: 105,
      vets: 2,
    });
    expect(stats.openUrgent).toHaveLength(1);
  });
});
