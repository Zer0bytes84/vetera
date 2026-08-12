import { describe, expect, it } from "vitest";

import {
  getFutureReminderSchedules,
  isAppointmentReminderEligible,
} from "../../src/domain/clinical/reminders";

describe("clinical reminder planning", () => {
  const now = new Date("2026-08-01T10:00:00.000Z");

  it("keeps only reminder offsets that are still actionable", () => {
    expect(
      getFutureReminderSchedules("2026-08-01T10:40:00.000Z", now)
    ).toEqual([
      {
        minutesBefore: 15,
        scheduledFor: "2026-08-01T10:25:00.000Z",
      },
      {
        minutesBefore: 30,
        scheduledFor: "2026-08-01T10:10:00.000Z",
      },
    ]);
  });

  it("does not schedule reminders for terminal appointments", () => {
    expect(
      isAppointmentReminderEligible(
        "cancelled",
        "2026-08-02T10:00:00.000Z",
        now
      )
    ).toBe(false);
    expect(
      isAppointmentReminderEligible(
        "confirmed",
        "2026-08-02T10:00:00.000Z",
        now
      )
    ).toBe(true);
  });
});
