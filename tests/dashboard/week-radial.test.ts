import { describe, expect, it } from "vitest";
import { buildWeekFacts, buildWeekRadial, RADIAL_VIEWS, WEEK_STATES } from "../../src/modules/dashboard/model/week-radial";
import type { Invoice, Transaction } from "../../src/types/db";

const now = new Date(2026, 10, 7, 12, 30); // samedi 7 novembre 2026
const at = (day: number, hour: number, minute = 0, month = 10) => new Date(2026, month, day, hour, minute).toISOString();
const appt = (startTime: string | null, status = "completed") => ({ startTime, status });
const income = (date: string, amount: number, status: Transaction["status"] = "paid"): Pick<Transaction, "type" | "status" | "date" | "amount"> => ({ type: "income", status, date, amount });

describe("« Cette semaine » : les faits, identiques à ceux d'avant", () => {
  it("recettes et consultations de la semaine, avec la semaine d'avant sur la même durée", () => {
    const transactions = [income("2026-11-03", 10000), income("2026-11-06", 3900), income("2026-10-28", 5400), income("2026-11-02", 700, "pending")];
    const appointments = [appt(at(2, 9)), appt(at(5, 10)), appt(at(7, 18), "scheduled"), appt(at(8, 10), "scheduled"), appt(at(26, 9, 0, 9)), appt(at(27, 9, 0, 9), "cancelled")];
    const f = buildWeekFacts({ transactions, appointments, invoices: [], now });
    expect(f.income).toBe(13900);
    expect(f.visits).toBe(3); // dimanche 8 est après ce soir : pas encore dans la semaine
    expect(f.previousIncome).toBe(5400);
    expect(f.previousVisits).toBe(1);
    expect(f.since).toEqual(new Date(2026, 10, 2));
    expect(f.rate).toBeNull();
  });
  it("lundi à 0 h : la semaine commence, aucun chiffre ne se perd ni ne se double", () => {
    const monday = new Date(2026, 10, 2, 0, 0, 0);
    const f = buildWeekFacts({ transactions: [], appointments: [appt(new Date(2026, 10, 2, 0, 0).toISOString()), appt(new Date(2026, 10, 1, 23, 59).toISOString())], invoices: [], now: monday });
    expect(f.visits).toBe(1);
  });
  it("annulations, absences et rendez-vous sans date ne sont pas des consultations", () => {
    const f = buildWeekFacts({ transactions: [], appointments: [appt(at(3, 9), "cancelled"), appt(at(3, 10), "no_show"), appt(null), appt(at(3, 11))], invoices: [], now });
    expect(f.visits).toBe(1);
  });
  it("le taux de règlement est celui des factures émises", () => {
    const inv = [{ id: "a", documentStatus: "issued", issuedAt: "2026-10-01", createdAt: "x", grossAmount: 10000, creditAmount: 0, balanceAmount: 2500, settlementStatus: "unpaid" }] as Invoice[];
    expect(buildWeekFacts({ transactions: [], appointments: [], invoices: inv, now }).rate).toBeCloseTo(75, 1);
  });
});

describe("secteurs de la semaine : par heure et par jour, empilés par état", () => {
  const list = [
    appt(at(2, 9)), appt(at(2, 9, 40)), appt(at(5, 14)), appt(at(7, 9), "completed"), appt(at(7, 12), "in_progress"), appt(at(7, 15), "scheduled"),
    appt(at(7, 16), "confirmed"), appt(at(8, 11), "scheduled"), appt(at(3, 10), "cancelled"), appt(at(3, 11), "no_show"), appt(null), appt(at(30, 9, 0, 9)),
  ];
  const r = buildWeekRadial(list, now);

  it("propose les deux vues, par heure et par jour", () => {
    expect(RADIAL_VIEWS.map((v) => v.label)).toEqual(["Par jour", "Par heure"]);
    expect(WEEK_STATES.map((s) => s.label)).toEqual(["Terminés", "En cours", "À venir"]);
  });
  it("le chiffre de la semaine est le nombre de consultations depuis lundi jusqu'à ce soir", () => {
    expect(r.total).toBe(7); // le dimanche 8, le mois dernier, annulés et absents n'y sont pas
    expect(r.total).toBe(buildWeekFacts({ transactions: [], appointments: list, invoices: [], now }).visits);
  });
  it("la somme des points, heure par heure puis jour par jour, égale ce chiffre", () => {
    const sum = (v: Record<string, number[]>) => Object.values(v).flat().reduce((n, x) => n + x, 0);
    expect(sum(r.hour.values)).toBe(r.total);
    expect(sum(r.weekday.values)).toBe(r.total);
    expect(r.byState).toEqual({ done: 4, underway: 1, upcoming: 2 });
  });
  it("vingt-quatre heures et sept jours, lundi en haut", () => {
    expect(r.hour.labels).toHaveLength(24);
    expect(r.hour.labels[9]).toBe("09h");
    expect(r.weekday.labels).toEqual(["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]);
    expect(r.weekday.values.done[0]).toBe(2); // lundi
    expect(r.weekday.values.done[3]).toBe(1); // jeudi 5
    expect(r.weekday.values.underway[5]).toBe(1); // samedi
    expect(r.weekday.values.upcoming[5]).toBe(2);
    expect(r.hour.values.done[9]).toBe(3);
  });
  it("les états sont ceux des unités du jour : terminé, en cours (arrivé, en attente, en consultation), à venir", () => {
    const states = buildWeekRadial([appt(at(7, 8), "arrived"), appt(at(7, 8), "waiting"), appt(at(7, 8), "in_progress"), appt(at(7, 9), "scheduled"), appt(at(7, 9), "confirmed")], now);
    expect(states.byState).toEqual({ done: 0, underway: 3, upcoming: 2 });
  });
  it("une semaine sans rendez-vous : des secteurs vides, zéro au centre", () => {
    const empty = buildWeekRadial([], now);
    expect(empty.total).toBe(0);
    expect(empty.hour.values.done.every((v) => v === 0)).toBe(true);
  });
});
