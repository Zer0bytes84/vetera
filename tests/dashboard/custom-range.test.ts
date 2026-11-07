import { describe, expect, it } from "vitest";
import type { Appointment, Patient, Transaction } from "../../src/types/db";
import {
  analyticsRanges,
  buildPremiumAnalytics,
  customAnalyticsRange,
  MAX_CUSTOM_DAYS,
  trendBuckets,
} from "../../src/modules/dashboard/model/premium-analytics";

const now = new Date(2026, 9, 15, 12);
const patient = (id: string): Patient => ({ id, name: id, species: "Chien", sex: "M", ownerId: "owner", status: "sante", createdAt: "2026-09-20" });
const visit = (id: string, patientId: string, date: string): Appointment => ({ id, patientId, ownerId: "owner", vetId: "vet", title: id, type: "Consultation", startTime: date, endTime: date, createdAt: date, status: "completed" });
const income = (id: string, date: string, amount: number): Transaction => ({ id, date, amount, type: "income", status: "paid", category: "Consultation", description: "Règlement", method: "cash", createdAt: date });
const data = () => ({ appointments: [] as Appointment[], patients: [patient("a")], transactions: [] as Transaction[], tasks: [], vaccinations: [], alerts: [] });

describe("période choisie au sélecteur de dates", () => {
  it("couvre du premier minuit au dernier jour inclus, avec une période précédente adjacente de même durée", () => {
    const r = analyticsRanges("custom", now, { from: "2026-10-05", to: "2026-10-11" });
    expect(r.current.from).toEqual(new Date(2026, 9, 5));
    expect(r.current.to).toEqual(new Date(2026, 9, 11, 23, 59, 59, 999));
    expect(r.previous.from).toEqual(new Date(2026, 8, 28));
    expect(r.previous.to.getTime() + 1).toBe(r.current.from.getTime());
  });
  it("accepte un seul jour", () => {
    const r = analyticsRanges("custom", now, { from: "2026-10-10", to: "2026-10-10" });
    expect(r.current.from.getDate()).toBe(10);
    expect(r.previous.from.getDate()).toBe(9);
    expect(trendBuckets("custom", r.current)).toEqual([]);
  });
  it("remet les dates à l'endroit quand elles sont inversées", () => {
    expect(customAnalyticsRange({ from: "2026-10-11", to: "2026-10-05" })).toEqual(customAnalyticsRange({ from: "2026-10-05", to: "2026-10-11" }));
  });
  it("ignore une date vide, mal formée ou inexistante et retombe sur 30 jours", () => {
    for (const bad of [{ from: "", to: "2026-10-05" }, { from: "2026-10-05", to: "05/10/2026" }, { from: "2026-02-31", to: "2026-03-05" }, null, undefined]) {
      expect(customAnalyticsRange(bad)).toBeNull();
      expect(analyticsRanges("custom", now, bad)).toEqual(analyticsRanges("30d", now));
    }
  });
  it("borne la durée en gardant le dernier jour", () => {
    const r = customAnalyticsRange({ from: "2000-01-01", to: "2026-10-11" })!;
    expect(r.to).toEqual(new Date(2026, 9, 11, 23, 59, 59, 999));
    const days = Math.round((new Date(2026, 9, 11).getTime() - r.from.getTime()) / 86_400_000) + 1;
    expect(days).toBe(MAX_CUSTOM_DAYS);
  });
  it("compte les jours civils au passage de l'heure d'été", () => {
    const r = analyticsRanges("custom", now, { from: "2026-03-25", to: "2026-04-01" });
    expect(r.previous.from).toEqual(new Date(2026, 2, 17));
    expect(r.previous.to.getDate()).toBe(24);
  });
  it("découpe un jour par barre jusqu'à un mois, une semaine par barre au-delà", () => {
    const days = (from: string, to: string) => trendBuckets("custom", analyticsRanges("custom", now, { from, to }).current).length;
    expect(days("2026-10-01", "2026-10-31")).toBe(31);
    expect(days("2026-09-01", "2026-10-31")).toBe(9);
    expect(trendBuckets("custom", analyticsRanges("custom", now, { from: "2026-09-01", to: "2026-10-31" }).current).at(-1)!.to.getDate()).toBe(31);
  });
  it("pilote les chiffres : seuls les jours choisis comptent, la comparaison est la période d'avant", () => {
    const d = data();
    d.appointments = [visit("in", "a", "2026-10-06T09:00:00"), visit("edge", "a", "2026-10-11T23:30:00"), visit("out", "a", "2026-10-12T09:00:00"), visit("before", "a", "2026-09-30T09:00:00")];
    d.transactions = [income("i1", "2026-10-06", 10000), income("i2", "2026-10-12", 50000), income("i0", "2026-09-30", 4000)];
    const m = buildPremiumAnalytics(d, "custom", now, { from: "2026-10-05", to: "2026-10-11" });
    expect(m.patients.visits).toBe(2);
    expect(m.patients.previousVisits).toBe(1);
    expect(m.cash.income).toBe(10000);
    expect(m.cash.previous).toBe(4000);
  });
  it("sans données dans la période, tout est à zéro sans erreur", () => {
    const m = buildPremiumAnalytics(data(), "custom", now, { from: "2026-10-05", to: "2026-10-11" });
    expect([m.patients.visits, m.cash.income, m.actions.count]).toEqual([0, 0, 0]);
    expect(m.cash.change).toBe(0);
  });
});
