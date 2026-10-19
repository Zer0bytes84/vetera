import { describe, expect, it } from "vitest";

import {
  buildWeekLoad,
  findNextAppointmentAfter,
} from "@/modules/agenda/components/agenda-day-load-model";
import type { Appointment } from "@/types/db";

const appt = (id: string, startTime: string, status: Appointment["status"] = "scheduled"): Appointment => ({
  id, startTime, endTime: startTime, status, patientId: "p", ownerId: "o", vetId: "v",
  title: id, type: "Consultation", createdAt: "",
});

describe("panneau Charge de la journée", () => {
  it("propose le premier rendez-vous maintenu après la journée affichée", () => {
    const day = new Date("2026-10-22T12:00:00");
    const next = findNextAppointmentAfter(
      [
        appt("meme-jour", "2026-10-22T16:00:00"),
        appt("annule", "2026-10-23T08:00:00", "cancelled"),
        appt("absent", "2026-10-23T09:00:00", "no_show"),
        appt("plus-tard", "2026-10-28T10:00:00"),
        appt("suivant", "2026-10-23T10:30:00"),
        appt("passe", "2026-10-01T10:00:00"),
      ],
      day
    );
    expect(next?.id).toBe("suivant");
  });

  it("ne propose rien quand aucun rendez-vous ne suit", () => {
    expect(findNextAppointmentAfter([appt("passe", "2026-10-01T10:00:00")], new Date("2026-10-22T12:00:00"))).toBeNull();
    expect(findNextAppointmentAfter([], new Date())).toBeNull();
  });

  it("met la semaine à une échelle commune", () => {
    const days = Array.from({ length: 7 }, (_, index) => new Date(2026, 9, 19 + index));
    const counts = [3, 1, 0, 0, 0, 0, 0];
    const load = buildWeekLoad(days, (date) => counts[date.getDate() - 19]);
    expect(load.map((day) => day.count)).toEqual(counts);
    expect(load[0].ratio).toBe(1);
    expect(load[1].ratio).toBeCloseTo(1 / 3);
    expect(load[2].ratio).toBe(0);
    expect(buildWeekLoad(days, () => 0).every((day) => day.ratio === 0)).toBe(true);
  });
});
