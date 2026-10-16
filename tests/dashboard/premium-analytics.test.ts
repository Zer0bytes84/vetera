import { describe, expect, it } from "vitest";
import type { Appointment, Invoice, Owner, Patient, Task, Transaction, Vaccination } from "../../src/types/db";
import { analyticsRanges, buildPremiumAnalytics, dashboardPresentationData, metricChange } from "../../src/modules/dashboard/model/premium-analytics";
import type { ClinicalAlert } from "../../src/modules/dashboard/v2/model";

const now = new Date(2026, 9, 15, 12);
const patient = (id: string, name = id): Patient => ({ id, name, species: "Chien", sex: "M", ownerId: "owner", status: "sante", createdAt: "2026-09-20" });
const visit = (id: string, patientId: string, date: string, status: Appointment["status"] = "completed"): Appointment => ({ id, patientId, ownerId: "owner", vetId: "vet", title: id, type: "Consultation", startTime: date, endTime: date, createdAt: date, status });
const movement = (id: string, date: string, amount: number, type: Transaction["type"] = "income", status: Transaction["status"] = "paid"): Transaction => ({ id, date, amount, type, status, category: "Consultation", description: "Règlement", method: "cash", createdAt: date });
const empty = () => ({ appointments: [] as Appointment[], patients: [patient("a"), patient("b")], transactions: [] as Transaction[], tasks: [] as Task[], vaccinations: [] as Vaccination[], alerts: [] as ClinicalAlert[] });

describe("périodes de la synthèse Premium", () => {
  it.each([["today", 15, 15, 14, 14], ["7d", 9, 15, 2, 8], ["30d", 16, 15, 17, 15]] as const)("borne %s en jours locaux sans chevauchement", (period, from, to, previousFrom, previousTo) => {
    const r = analyticsRanges(period, now);
    expect(r.current.from.getDate()).toBe(from); expect(r.current.to.getDate()).toBe(to);
    expect(r.previous.from.getDate()).toBe(previousFrom); expect(r.previous.to.getDate()).toBe(previousTo);
    expect(r.current.from.getHours()).toBe(0); expect(r.current.to.getHours()).toBe(23);
    expect(r.previous.to.getTime() + 1).toBe(r.current.from.getTime());
  });
  it("utilise douze mois calendaires glissants et une période antérieure adjacente", () => {
    const r = analyticsRanges("12m", now);
    expect(r.current.from).toEqual(new Date(2025, 9, 16));
    expect(r.previous.from).toEqual(new Date(2024, 9, 16));
    expect(r.previous.to.getTime() + 1).toBe(r.current.from.getTime());
  });
  it("reste sur les limites des journées au passage de l’heure d’été", () => {
    const r = analyticsRanges("7d", new Date(2026, 2, 10, 12));
    expect(r.current.from).toEqual(new Date(2026, 2, 4));
    expect(r.previous.from).toEqual(new Date(2026, 1, 25));
    expect(r.previous.to.getDate()).toBe(3);
  });
});

describe("métriques réelles, sans séries de démonstration", () => {
  it("compte les mouvements payés en centimes, pas les écritures en attente ni futures", () => {
    const data = empty(); data.transactions = [movement("a", "2026-10-15", 150000), movement("b", "2026-10-14", 100000), movement("c", "2026-10-15", 20000, "expense"), movement("d", "2026-10-15", 90000, "income", "pending"), movement("e", "2026-10-16", 500000)];
    expect(buildPremiumAnalytics(data, "today", now).cash).toEqual({ income: 150000, expense: 20000, net: 130000, previous: 100000, change: 50 });
  });
  it("déduplique les patients et exclut les visites annulées, absentes et orphelines", () => {
    const data = empty(); data.appointments = [visit("a", "a", "2026-10-15"), visit("b", "a", "2026-10-15"), visit("c", "b", "2026-10-15", "cancelled"), visit("d", "b", "2026-10-15", "no_show"), visit("e", "absent", "2026-10-15"), visit("f", "b", "2026-10-14")];
    expect(buildPremiumAnalytics(data, "today", now).patients).toMatchObject({ count: 1, previous: 1, change: 0, visits: 2, completed: 2, newRecords: 0 });
  });
  it("le choix commun met à jour les trois métriques", () => {
    const data = empty(); data.transactions = [movement("a", "2026-10-10", 20000)]; data.appointments = [visit("a", "a", "2026-10-10")];
    data.tasks = [{ id: "t", title: "Contrôle", status: "todo", priority: "high", dueDate: "2026-10-10", isReminder: true, createdAt: "2026-10-10" }];
    data.alerts = [{ id: "task:t", title: "Contrôle", detail: "", source: "task", tone: "critical" }];
    const today = buildPremiumAnalytics(data, "today", now), week = buildPremiumAnalytics(data, "7d", now);
    expect([today.cash.income, today.patients.count, today.actions.count]).toEqual([0, 0, 0]);
    expect([week.cash.income, week.patients.count, week.actions.count]).toEqual([20000, 1, 1]);
    expect(week.actions).toMatchObject({ urgent: 1, tasks: 1, reminders: 0 });
  });
  it("ne fabrique ni dates d’action, ni historique des stocks et actions sans échéance", () => {
    const data = empty(); data.alerts = [{ id: "stock:p", title: "Stock", detail: "", source: "stock", tone: "warning" }, { id: "task:t", title: "À vérifier", detail: "", source: "task", tone: "critical" }];
    expect(buildPremiumAnalytics(data, "30d", now).actions.count).toBe(0);
  });
  it("compare les rappels ouverts à leur date d’échéance et ignore les dates invalides", () => {
    const data = empty(); data.vaccinations = [{ id: "v", patientId: "a", vaccineName: "Rage", nextDueAt: "2026-10-14", administeredAt: "2025-10-14", createdAt: "2025-10-14" }];
    data.alerts = [{ id: "vaccine:v", title: "Vaccin", detail: "", source: "vaccine", tone: "warning" }];
    expect(buildPremiumAnalytics(data, "today", now).actions).toMatchObject({ count: 0, previous: 1, change: -100 });
  });
  it("ne présente jamais un faux pourcentage quand la base est zéro", () => {
    expect(metricChange(10, 0)).toBeNull(); expect(metricChange(0, 0)).toBe(0); expect(metricChange(0, 10)).toBe(-100); expect(metricChange(150, 100)).toBe(50);
  });
});

describe("projection d’affichage TEST ZO", () => {
  it("masque les objets nommés et leurs relations sans effacer ni muter les sources", () => {
    const patients = [patient("real", "Test de santé Zo"), patient("test", "TEST ZO E2E Rex")];
    const data = { patients, owners: [] as Owner[], appointments: [visit("test-visit", "test", "2026-10-15"), visit("real-visit", "real", "2026-10-15")], tasks: [{ id: "task", patientId: "test", title: "Contrôle" }] as Task[], products: [], vaccinations: [], invoices: [{ id: "invoice", ownerId: "owner", patientId: "test" }] as Invoice[], transactions: [{ ...movement("pay", "2026-10-15", 10000), sourceId: "invoice" }, movement("real-pay", "2026-10-15", 20000)] };
    const snapshot = JSON.stringify(data); const visible = dashboardPresentationData(data);
    expect(visible.patients.map(p => p.id)).toEqual(["real"]); expect(visible.appointments.map(a => a.id)).toEqual(["real-visit"]);
    expect(visible.tasks).toEqual([]); expect(visible.invoices).toEqual([]); expect(visible.transactions.map(t => t.id)).toEqual(["real-pay"]);
    expect(JSON.stringify(data)).toBe(snapshot); expect(data.patients).toHaveLength(2);
  });
  it("ne masque pas les données ordinaires contenant seulement le mot test", () => {
    const p = patient("allergie", "Test allergique");
    const visible = dashboardPresentationData({ patients: [p], owners: [], appointments: [], tasks: [], products: [], vaccinations: [], invoices: [], transactions: [] });
    expect(visible.patients).toEqual([p]);
  });
});
