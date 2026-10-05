import { describe, expect, it } from "vitest";
import type {
  Appointment,
  Hospitalization,
  Patient,
  Transaction,
  Vaccination,
} from "../../src/types/db";
import {
  buildClinicalCash,
  buildClinicalFollowUp,
  buildClinicalTrends,
  buildDayContext,
  buildNowSnapshot,
} from "../../src/modules/dashboard/model/clinical-dashboard";
import {
  buildClinicalAlerts,
  buildTodaySchedule,
  parseDashboardDate,
} from "../../src/modules/dashboard/v2/model";
import {
  migrateClassicDashboardOrder,
  normalizeDashboardOrder,
} from "../../src/modules/dashboard/model/dashboard-layout";
import { tablesAffectedByDelete } from "../../src/services/sqlite/related-tables";

const now = new Date(2026, 9, 3, 12);
const patient: Patient = {
  id: "milo",
  name: "Milo",
  ownerId: "owner",
  species: "Chien",
  sex: "M",
  status: "sante",
  allergies: "Pénicilline",
  createdAt: "2026-01-01",
};
const visit = (
  id: string,
  startTime: string,
  status: Appointment["status"] = "scheduled"
): Appointment => ({
  id,
  startTime: startTime.replace(" ", "T"),
  endTime: startTime.replace(" ", "T"),
  status,
  patientId: "milo",
  ownerId: "owner",
  title: "Milo",
  type: "Consultation",
  vetId: "vet",
  createdAt: "2026-01-01",
});
const cash = (
  id: string,
  date: string,
  amount: number,
  type: Transaction["type"] = "income",
  status: Transaction["status"] = "paid"
): Transaction => ({
  id,
  date,
  amount,
  type,
  status,
  category: "Consultation",
  method: "cash",
  description: id,
  createdAt: date,
});
const vaccine = (
  id: string,
  administeredAt: string,
  nextDueAt: string
): Vaccination => ({
  id,
  administeredAt,
  nextDueAt,
  vaccineName: "Rage",
  patientId: "milo",
  createdAt: administeredAt,
  updatedAt: administeredAt,
});

describe("clinical dashboard decisions", () => {
  it("preserves calendar dates locally while reading SQLite timestamps as UTC instants", () => {
    expect(parseDashboardDate("2026-10-04")).toEqual(new Date(2026, 9, 4));
    expect(parseDashboardDate("2026-10-03 15:45:00")?.toISOString()).toBe(
      "2026-10-03T15:45:00.000Z"
    );
    expect(parseDashboardDate("2026-02-31")).toBeNull();
  });
  it("prioritizes the consultation in progress, preserves allergies, and measures only known lateness", () => {
    const appointments = [
      visit("scheduled", "2026-10-03 08:00:00"),
      visit("waiting", "2026-10-03 11:45:00", "waiting"),
      visit("current", "2026-10-03 11:00:00", "in_progress"),
    ];
    const schedule = buildTodaySchedule({
      appointments,
      patients: [patient],
      owners: [],
      referenceDate: now,
    });
    const result = buildNowSnapshot(schedule, [patient], now);
    expect(result.next?.appointment.id).toBe("current");
    expect(result.maximumWait).toBe(15);
    expect(result.allergies).toBe("Pénicilline");
  });

  it("finds a real future visit even after three irrelevant future dates", () => {
    const appointments = [4, 5, 6].map((day) =>
      visit(`done-${day}`, `2026-10-0${day} 09:00:00`, "completed")
    );
    appointments.push(visit("next", "2026-10-07 14:30:00"));
    expect(buildDayContext(appointments, [], [patient], now)).toMatchObject({
      label: "Prochaines visites",
      rows: [{ appointment: { id: "next" } }],
    });
  });

  it("retains a completed day's summary without offering a completed or absent visit as the next patient", () => {
    const schedule = buildTodaySchedule({
      appointments: [
        visit("done", "2026-10-03 09:00:00", "completed"),
        visit("absent", "2026-10-03 10:00:00", "no_show"),
        visit("cancelled", "2026-10-03 11:00:00", "cancelled"),
      ],
      patients: [patient], owners: [], referenceDate: now,
    });
    const result = buildNowSnapshot(schedule, [patient], now);
    expect(result.today.map(row => row.appointment.id)).toEqual(["done", "absent"]);
    expect(result.next).toBeUndefined();
    expect(result.waiting).toEqual([]);
    expect(result.startsIn).toBeNull();
    expect(result.allergies).toBeUndefined();
  });

  it("shows the latest completed visits when there are no future appointments", () => {
    const appointments = [
      visit("unclosed", "2026-10-02 09:00:00"),
      visit("done", "2026-09-20 09:00:00", "completed"),
      visit("cancelled", "2026-10-04 10:00:00", "cancelled"),
    ];
    expect(buildDayContext(appointments, [], [patient], now)).toMatchObject({
      label: "Dernières visites",
      rows: [{ appointment: { id: "done" } }],
    });
  });

  it("does not count duplicate stays or deceased and missing patients as hospitalized", () => {
    const stays = ["milo", "milo", "deceased", "missing"].map(
      (patientId, index) =>
        ({
          id: String(index),
          patientId,
          status: "admitted",
        }) as Hospitalization
    );
    expect(
      buildClinicalFollowUp(
        [patient, { ...patient, id: "deceased", status: "decede" }],
        stays
      )
    ).toEqual({ count: 1, underTreatment: 0, hospitalized: 1 });
  });

  it("keeps money in centimes and excludes pending, future and out-of-period entries", () => {
    const transactions = [
      cash("today", "2026-10-03 10:00:00", 125050),
      cash("expense", "2026-10-03 11:00:00", 12000, "expense"),
      cash("pending", "2026-10-03", 700000, "income", "pending"),
      cash("future", "2026-10-04", 100000),
      cash("previous", "2026-09-30", 50000),
    ];
    expect(buildClinicalCash(transactions, now, "today")).toMatchObject({
      income: 125050,
      expense: 12000,
      count: 2,
    });
    expect(buildClinicalCash(transactions, now, "quarter").income).toBe(175050);
    expect(
      buildClinicalCash(transactions, now, "month").recent.map((row) => row.id)
    ).toEqual(["expense", "today", "previous"]);
  });

  it("starts weeks on Monday and years on January 1 while excluding future and unpaid money", () => {
    const sunday = new Date(2026, 9, 4, 12);
    const transactions = [
      cash("before-week", "2026-09-27", 100),
      cash("monday", "2026-09-28", 200),
      cash("sunday", "2026-10-04", 300),
      cash("next-week", "2026-10-05", 400),
      cash("last-year", "2025-12-31", 500),
      cash("year-start", "2026-01-01", 600),
      cash("unpaid", "2026-10-04", 700, "income", "pending"),
    ];
    expect(buildClinicalCash(transactions, sunday, "week")).toMatchObject({income: 500, count: 2});
    expect(buildClinicalCash(transactions, sunday, "year")).toMatchObject({income: 1200, count: 4});
    expect(buildClinicalCash(transactions, new Date(2026, 9, 5, 12), "week").income).toBe(400);
  });

  it("counts each completed visit once across weekly trend buckets", () => {
    const appointments = [
      visit("first", "2026-09-04 10:00:00", "completed"),
      visit("last", "2026-10-03 10:00:00", "completed"),
      visit("old", "2026-09-03 10:00:00", "completed"),
      visit("future", "2026-10-04 10:00:00", "completed"),
      visit("waiting", "2026-10-03 11:00:00", "waiting"),
    ];
    const trends = buildClinicalTrends(appointments, now, 30);
    expect(trends.total).toBe(2);
    expect(trends.points.reduce((total, point) => total + point.count, 0)).toBe(
      2
    );
    expect(trends.specialties).toEqual([{ label: "Consultation", count: 2 }]);
  });

  it("supersedes an old vaccine reminder after renewal, while retaining overdue reminders", () => {
    const rows = [
      vaccine("old", "2024-10-01", "2025-10-01"),
      vaccine("renewed", "2026-09-30", "2027-09-30"),
    ];
    const alerts = (vaccinations: Vaccination[]) =>
      buildClinicalAlerts({
        appointments: [],
        patients: [patient],
        products: [],
        tasks: [],
        vaccinations,
        referenceDate: now,
      });
    expect(alerts(rows)).toEqual([]);
    expect(alerts([rows[0]])[0]).toMatchObject({
      source: "vaccine",
      patientId: "milo",
    });
    expect(alerts([rows[0]])[0].detail).toContain("dépassé");
  });
});

describe("preserved layout and related-table cache", () => {
  it("preserves the user's order, drops retired entries and appends additions without duplicates", () => {
    expect(
      normalizeDashboardOrder(
        ["b", "retired", "b", null, "a"],
        ["a", "b", "new"]
      )
    ).toEqual(["b", "a", "new"]);
    expect(
      migrateClassicDashboardOrder(
        ["studio-insights", "studio-finance", "studio-overview", "studio-now"],
        ["clinical-now", "clinical-day", "clinical-followup", "clinical-trends"]
      )
    ).toEqual([
      "clinical-trends",
      "clinical-followup",
      "clinical-now",
      "clinical-day",
    ]);
  });

  it("invalidates all cascade descendants, including grandchildren and SET NULL invoice references", () => {
    const affected = tablesAffectedByDelete("owners");
    expect(affected).toEqual(
      expect.arrayContaining([
        "patients",
        "appointments",
        "prescription_items",
        "anesthesia_monitoring",
        "hospitalization_vitals",
        "invoices",
      ])
    );
    expect(new Set(affected).size).toBe(affected.length);
    expect(affected).not.toContain("owners");
    expect(tablesAffectedByDelete("products")).toEqual(["invoice_lines"]);
  });
});
