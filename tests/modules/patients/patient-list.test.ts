import { describe, expect, it } from "vitest";
import {
  clinicalFlags,
  isUpcomingVisit,
  isVisitOverdue,
  sortPatientRecords,
} from "@/modules/patients/lib/patient-list";
import type { Appointment } from "@/types/db";

const now = new Date("2026-10-21T10:00:00");

describe("clinicalFlags", () => {
  it("splits free text and keeps allergies first", () => {
    expect(
      clinicalFlags({ allergies: "Pénicilline; poulet", chronicConditions: "Arthrose legere." })
    ).toEqual([
      { kind: "allergy", label: "Pénicilline" },
      { kind: "allergy", label: "poulet" },
      { kind: "chronic", label: "Arthrose legere" },
    ]);
  });

  it("ignores what people type when there is nothing", () => {
    expect(clinicalFlags({ allergies: "Aucune", chronicConditions: "RAS, néant" })).toEqual([]);
    expect(clinicalFlags({})).toEqual([]);
  });
});

describe("isUpcomingVisit", () => {
  const visit = (status: Appointment["status"], startTime: string) =>
    ({ status, startTime }) as Appointment;

  it("counts confirmed visits as well as booked ones", () => {
    expect(isUpcomingVisit(visit("confirmed", "2026-10-22T08:00:00"), now)).toBe(true);
    expect(isUpcomingVisit(visit("scheduled", "2026-10-22T08:00:00"), now)).toBe(true);
  });

  it("ignores past, started and cancelled visits", () => {
    expect(isUpcomingVisit(visit("scheduled", "2026-10-20T08:00:00"), now)).toBe(false);
    expect(isUpcomingVisit(visit("arrived", "2026-10-22T08:00:00"), now)).toBe(false);
    expect(isUpcomingVisit(visit("cancelled", "2026-10-22T08:00:00"), now)).toBe(false);
  });
});

describe("isVisitOverdue", () => {
  it("is due after 90 days without a visit", () => {
    expect(isVisitOverdue({ status: "sante", createdAt: "2025-01-01" }, "2026-07-01", now)).toBe(true);
    expect(isVisitOverdue({ status: "sante", createdAt: "2025-01-01" }, "2026-09-01", now)).toBe(false);
  });

  it("counts a record without visits from its creation", () => {
    expect(isVisitOverdue({ status: "sante", createdAt: "2026-10-20" }, undefined, now)).toBe(false);
    expect(isVisitOverdue({ status: "sante", createdAt: "2026-01-20" }, undefined, now)).toBe(true);
  });

  it("never asks to call back about a deceased patient", () => {
    expect(isVisitOverdue({ status: "decede", createdAt: "2020-01-01" }, "2021-01-01", now)).toBe(false);
  });
});

describe("sortPatientRecords", () => {
  const record = (name: string, lastVisit?: string, next?: string) => ({
    patient: { name, createdAt: "2026-01-01" },
    lastVisit,
    upcomingAppointment: next ? { startTime: next } : undefined,
  });
  const records = [
    record("Rex", "2026-10-10"),
    record("bella", "2026-10-20", "2026-10-25T09:00:00"),
    record("Milo", undefined, "2026-10-22T09:00:00"),
  ];
  const names = (sort: Parameters<typeof sortPatientRecords>[1]) =>
    sortPatientRecords(records, sort).map((r) => r.patient.name);

  it("sorts by name, ignoring case", () => {
    expect(names("name")).toEqual(["bella", "Milo", "Rex"]);
  });

  it("puts records without the sorted date last", () => {
    expect(names("lastVisit")).toEqual(["bella", "Rex", "Milo"]);
    expect(names("nextVisit")).toEqual(["Milo", "bella", "Rex"]);
  });

  it("keeps the historical activity order", () => {
    expect(names("activity")).toEqual(["bella", "Milo", "Rex"]);
  });
});
