import { describe, expect, it } from "vitest";
import {
  SchedulingError,
  assertAppointmentStatusTransition,
  findAppointmentConflicts,
  normalizeAppointmentInterval,
} from "../../src/domain/clinical/scheduling";
import type { Appointment } from "../../src/types/db";

const appointment = (
  overrides: Partial<Appointment> = {}
): Appointment => ({
  id: "appointment-1",
  patientId: "patient-1",
  ownerId: "owner-1",
  vetId: "vet-1",
  title: "Consultation Nala",
  startTime: "2026-08-01T09:00:00.000Z",
  endTime: "2026-08-01T09:30:00.000Z",
  status: "confirmed",
  type: "Consultation",
  room: "consult-1",
  createdAt: "2026-08-01T08:00:00.000Z",
  ...overrides,
});

describe("appointment scheduling rules", () => {
  it("supports the professional arrival workflow", () => {
    expect(() => assertAppointmentStatusTransition("scheduled", "confirmed")).not.toThrow();
    expect(() => assertAppointmentStatusTransition("confirmed", "arrived")).not.toThrow();
    expect(() => assertAppointmentStatusTransition("arrived", "waiting")).not.toThrow();
    expect(() => assertAppointmentStatusTransition("waiting", "in_progress")).not.toThrow();
    expect(() => assertAppointmentStatusTransition("in_progress", "completed")).not.toThrow();
  });

  it("prevents reopening a completed consultation", () => {
    expect(() =>
      assertAppointmentStatusTransition("completed", "in_progress")
    ).toThrowError(
      expect.objectContaining<Partial<SchedulingError>>({
        code: "APPOINTMENT_STATUS_TRANSITION_INVALID",
      })
    );
  });

  it("detects veterinarian and room overlaps", () => {
    const conflicts = findAppointmentConflicts(
      {
        id: "appointment-2",
        vetId: "vet-1",
        room: "consult-1",
        startTime: "2026-08-01T09:15:00.000Z",
        endTime: "2026-08-01T09:45:00.000Z",
      },
      [appointment()]
    );

    expect(conflicts.map(({ kind }) => kind)).toEqual([
      "veterinarian",
      "room",
    ]);
  });

  it("ignores terminal appointments when checking availability", () => {
    const conflicts = findAppointmentConflicts(
      {
        id: "appointment-2",
        vetId: "vet-1",
        room: "consult-1",
        startTime: "2026-08-01T09:15:00.000Z",
        endTime: "2026-08-01T09:45:00.000Z",
      },
      [appointment({ status: "completed" })]
    );

    expect(conflicts).toEqual([]);
  });

  it("rejects invalid appointment durations", () => {
    expect(() =>
      normalizeAppointmentInterval(
        "2026-08-01T10:00:00.000Z",
        "2026-08-01T09:00:00.000Z"
      )
    ).toThrowError(
      expect.objectContaining<Partial<SchedulingError>>({
        code: "APPOINTMENT_DURATION_INVALID",
      })
    );
  });
});
