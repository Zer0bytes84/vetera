import { describe, expect, it } from "vitest";
import { alertWindow, buildAlertBars } from "../../src/modules/dashboard/model/alert-bars";

// Lundi 9 novembre 2026, 10:00 : la fenêtre va du 3 au 16 novembre.
const now = new Date(2026, 10, 9, 10, 0);
const at = (day: number, h = 9, month = 10) => new Date(2026, month, day, h).toISOString();
const base = { now, reminders: [], careTasks: [], products: [], patients: [], invoices: [], appointments: [] };
const invoice = (over: Record<string, unknown>) => ({ documentStatus: "issued", issuedAt: "2026-10-01", createdAt: "2026-10-01", dueAt: null, grossAmount: 10000, creditAmount: 0, balanceAmount: 10000, settlementStatus: "unpaid", ...over }) as never;
const product = (over: Record<string, unknown>) => ({ quantity: 10, minStock: 2, ...over }) as never;

describe("fenêtre", () => {
  it("six jours avant, sept jours après, aujourd'hui en septième colonne", () => {
    const w = alertWindow(now);
    expect([w.from.getDate(), w.to.getDate()]).toEqual([3, 16]);
    const r = buildAlertBars(base);
    expect(r.days).toHaveLength(14);
    expect(r.labels[6]).toBe("9 nov.");
    expect(r.todayIndex).toBe(6);
    expect(r.titles[6]).toBe("Lundi 9 novembre");
  });
  it("sans aucune alerte : des zéros partout, aucun NaN", () => {
    const r = buildAlertBars(base);
    expect(r.open).toBe(0);
    expect(r.lateAll).toBe(0);
    expect(JSON.stringify(r)).not.toMatch(/NaN|null/);
  });
});

describe("rappels", () => {
  const reminders = [
    { id: "a", patient_id: "p1", statut: "en_cours", echeance: "2026-11-12" },
    { id: "b", patient_id: "p1", statut: "en_cours", echeance: "2026-11-05" }, // en retard
    { id: "c", patient_id: "p1", statut: "termine", echeance: "2026-11-12" }, // fini
    { id: "d", patient_id: "p2", statut: "en_cours", echeance: "2026-11-12" }, // patient décédé
    { id: "e", patient_id: "p1", statut: "en_cours", echeance: "2026-11-20" }, // hors fenêtre
    { id: "f", patient_id: "p1", statut: "en_cours", echeance: "2026-10-01" }, // en retard, avant la fenêtre
    { id: "g", patient_id: "p1", statut: "en_cours", echeance: "2026-11-09" }, // aujourd'hui : pas en retard
  ];
  const r = buildAlertBars({ ...base, reminders, patients: [{ id: "p1", status: "actif" }, { id: "p2", status: "decede" }] as never });
  it("empile par jour d'échéance, sans les finis, les décédés ni ce qui est hors fenêtre", () => {
    expect(r.values.reminders[9]).toBe(1); // le 12
    expect(r.values.reminders[2]).toBe(1); // le 5
    expect(r.values.reminders[6]).toBe(1); // aujourd'hui
    expect(r.values.reminders.reduce((n, v) => n + v, 0)).toBe(3);
  });
  it("le retard pend sous la ligne : un rappel dont le jour est passé, pas celui d'aujourd'hui", () => {
    expect(r.late[2]).toBe(1);
    expect(r.late[6]).toBe(0);
    expect(r.lateInWindow).toBe(1);
  });
  it("un retard plus ancien que la fenêtre est compté à part", () => {
    expect(r.olderLate).toBe(1);
    expect(r.lateAll).toBe(2);
  });
});

describe("soins", () => {
  const careTasks = [
    { statut: "a_faire", heure_prevue: at(9, 8) }, // 8 h, déjà passé : en retard
    { statut: "en_cours", heure_prevue: at(9, 15) }, // 15 h : pas en retard
    { statut: "fait", heure_prevue: at(9, 9) },
    { statut: "annule", heure_prevue: at(9, 9) },
    { statut: "a_faire", heure_prevue: at(11, 9) },
    { statut: "a_faire", heure_prevue: at(7, 9) }, // jour passé : en retard
    { statut: "a_faire", heure_prevue: at(30, 9) }, // hors fenêtre
  ] as never;
  const r = buildAlertBars({ ...base, careTasks });
  it("ne compte que ce qui reste à faire ou en cours, par jour prévu", () => {
    expect(r.values.care[6]).toBe(2);
    expect(r.values.care[8]).toBe(1);
    expect(r.values.care[4]).toBe(1);
    expect(r.values.care.reduce((n, v) => n + v, 0)).toBe(4);
  });
  it("est en retard dès que l'heure prévue est passée, comme la vue Soins", () => {
    expect(r.late[6]).toBe(1);
    expect(r.late[4]).toBe(1);
    expect(r.late[8]).toBe(0);
  });
});

describe("stock", () => {
  it("une rupture et un stock sous le seuil comptent aujourd'hui, pas en retard", () => {
    const r = buildAlertBars({ ...base, products: [product({ quantity: 0 }), product({ quantity: 2 }), product({ quantity: 3 })] });
    expect(r.values.stock[6]).toBe(2);
    expect(r.late[6]).toBe(0);
  });
  it("une péremption tombe à sa date, en retard si elle est passée", () => {
    const r = buildAlertBars({ ...base, products: [product({ expiryDate: "2026-11-13" }), product({ expiryDate: "2026-11-04" }), product({ expiryDate: "2026-12-30" }), product({ nearestExpiryDate: "2026-11-10", expiryDate: "2026-12-30" })] });
    expect(r.values.stock[10]).toBe(1); // le 13
    expect(r.values.stock[7]).toBe(1); // le 10 (lot le plus proche)
    expect(r.values.stock[1]).toBe(1); // le 4
    expect(r.late[1]).toBe(1);
    expect(r.open).toBe(3);
  });
  it("un lot périmé sans date connue est en retard aujourd'hui ; un produit archivé ou non suivi est ignoré", () => {
    const r = buildAlertBars({ ...base, products: [product({ expiredQuantity: 4 }), product({ quantity: 0, archivedAt: "2026-01-01" }), product({ quantity: 0, stockTracked: false })] });
    expect(r.values.stock[6]).toBe(1);
    expect(r.late[6]).toBe(1);
  });
  it("une rupture avec une péremption proche compte deux alertes distinctes", () => {
    const r = buildAlertBars({ ...base, products: [product({ quantity: 0, expiryDate: "2026-11-12" })] });
    expect(r.open).toBe(2);
  });
  it("la quantité disponible l'emporte sur la quantité totale", () => {
    const r = buildAlertBars({ ...base, products: [product({ quantity: 50, availableQuantity: 1 })] });
    expect(r.values.stock[6]).toBe(1);
  });
});

describe("créances", () => {
  const invoices = [
    invoice({ dueAt: "2026-11-12" }), // impayée, échéance à venir
    invoice({ dueAt: "2026-11-05", settlementStatus: "overdue" }), // en retard
    invoice({ dueAt: "2026-10-01", settlementStatus: "overdue" }), // en retard, avant la fenêtre
    invoice({ dueAt: "2026-11-12", balanceAmount: 0, settlementStatus: "paid" }), // réglée
    invoice({ dueAt: "2026-11-12", documentStatus: "draft" }), // brouillon
    invoice({ dueAt: "2026-11-12", documentStatus: "void" }), // annulée
    invoice({ dueAt: "2026-11-12", creditAmount: 10000 }), // soldée par un avoir
    invoice({ dueAt: null, issuedAt: "2026-09-01" }), // sans échéance : aujourd'hui, même émise il y a longtemps
    invoice({ dueAt: "2026-12-25" }), // hors fenêtre
  ];
  const r = buildAlertBars({ ...base, invoices });
  it("compte les factures émises qu'il reste à encaisser, à leur échéance", () => {
    expect(r.values.receivables[9]).toBe(1); // le 12
    expect(r.values.receivables[2]).toBe(1); // le 5
    expect(r.values.receivables[6]).toBe(1); // sans échéance : aujourd'hui
    expect(r.values.receivables.reduce((n, v) => n + v, 0)).toBe(3);
  });
  it("une facture sans échéance, même en retard, compte aujourd'hui et pend sous la ligne si l'app la dit en retard", () => {
    const x = buildAlertBars({ ...base, invoices: [invoice({ dueAt: null, settlementStatus: "overdue" }), invoice({ dueAt: null })] });
    expect(x.values.receivables[6]).toBe(2);
    expect(x.late[6]).toBe(1);
  });
  it("ignore brouillons, annulées, réglées et soldées par un avoir", () => {
    expect(r.open).toBe(4); // trois dans la fenêtre, une plus ancienne dans « Avant »
  });
  it("une facture en retard pend sous la ligne, une plus ancienne que la fenêtre est comptée à part", () => {
    expect(r.late[2]).toBe(1);
    expect(r.lateInWindow).toBe(1);
    expect(r.olderLate).toBe(1);
    expect(r.lateAll).toBe(2);
  });
  it("une facture impayée dont l'échéance est passée mais que l'app ne dit pas en retard ne l'est pas", () => {
    const quiet = buildAlertBars({ ...base, invoices: [invoice({ dueAt: "2026-11-05", settlementStatus: "unpaid" })] });
    expect(quiet.values.receivables[2]).toBe(1);
    expect(quiet.lateAll).toBe(0);
  });
});

describe("rendez-vous non traités", () => {
  const appt = (day: number, h: number, status: string, minutes = 30, month = 10) => ({
    startTime: new Date(2026, month, day, h).toISOString(),
    endTime: new Date(2026, month, day, h, minutes).toISOString(),
    status,
  }) as never;
  const r = buildAlertBars({
    ...base,
    appointments: [
      appt(5, 9, "scheduled"), // passé, resté planifié
      appt(5, 10, "confirmed"), // passé, resté confirmé
      appt(5, 11, "completed"),
      appt(5, 12, "cancelled"),
      appt(5, 13, "no_show"),
      appt(5, 14, "in_progress"),
      appt(9, 8, "scheduled"), // aujourd'hui, 8 h : terminé depuis
      appt(9, 9, "scheduled", 120), // aujourd'hui, 9 h 00 à 11 h 00 : finit après 10 h 00 ? non, avant : 11 h > 10 h
      appt(9, 15, "scheduled"), // pas encore passé
      appt(12, 9, "scheduled"), // à venir
      appt(20, 9, "scheduled", 30, 9), // avant la fenêtre
    ],
  });
  it("compte les rendez-vous passés restés planifiés ou confirmés, à leur jour", () => {
    expect(r.values.appointments[2]).toBe(2); // le 5
    expect(r.values.appointments[6]).toBe(1); // aujourd'hui : celui de 8 h, pas celui de 9 h à 11 h ni celui de 15 h
    expect(r.values.appointments.reduce((n, v) => n + v, 0)).toBe(3);
  });
  it("ignore ceux qui ont une issue ou qui sont en cours, et ceux à venir", () => {
    expect(r.values.appointments[9]).toBe(0);
  });
  it("tous pendent sous la ligne, ceux d'avant la fenêtre vont dans « Avant »", () => {
    expect(r.late[2]).toBe(2);
    expect(r.late[6]).toBe(1);
    expect(r.chart.values.appointments[0]).toBe(1);
    expect(r.olderLate).toBe(1);
  });
  it("compte dans le total des alertes à traiter", () => {
    expect(r.total[2]).toBe(2);
    expect(r.open).toBe(4);
  });
});

describe("colonne « Avant » : rien d'ouvert n'est laissé de côté", () => {
  const r = buildAlertBars({
    ...base,
    reminders: [{ id: "a", patient_id: "p", statut: "en_cours", echeance: "2026-10-01" }, { id: "b", patient_id: "p", statut: "en_cours", echeance: "2026-11-12" }],
    careTasks: [{ statut: "a_faire", heure_prevue: at(1, 9, 10) }, { statut: "a_faire", heure_prevue: at(12, 9) }] as never,
    products: [product({ expiryDate: "2026-10-20" })],
    invoices: [invoice({ dueAt: "2026-10-05", settlementStatus: "overdue" }), invoice({ dueAt: "2026-10-06" })],
  });
  it("rassemble ce qui est daté avant la fenêtre, par catégorie, en première colonne", () => {
    expect(r.chart.labels[0]).toBe("Avant");
    expect(r.chart.titles[0]).toBe("Avant le 3 novembre");
    expect(r.chart.labels).toHaveLength(15);
    expect([r.chart.values.reminders[0], r.chart.values.care[0], r.chart.values.stock[0], r.chart.values.receivables[0]]).toEqual([1, 1, 1, 2]);
  });
  it("les retards de cette colonne pendent sous la ligne, les jours suivants gardent les leurs", () => {
    expect(r.chart.late[0]).toBe(r.olderLate);
    expect(r.chart.late[0]).toBe(4); // rappel, soin, lot périmé, facture en retard ; la seconde facture n'est pas dite en retard
    expect(r.chart.todayIndex).toBe(7);
    expect(r.chart.values.reminders[1 + 9]).toBe(1);
  });
  it("le chiffre en tête est tout ce qui est ouvert : « Avant » et les quatorze jours", () => {
    expect(r.olderTotal).toBe(5);
    expect(r.open).toBe(7);
    const sum = (v: number[]) => v.reduce((n, x) => n + x, 0);
    expect(sum(Object.values(r.chart.values).map(sum))).toBe(r.open);
  });
});

describe("totaux", () => {
  it("la pile du jour est la somme des trois catégories, et le total est la somme des jours", () => {
    const r = buildAlertBars({
      ...base,
      reminders: [{ id: "a", patient_id: "p", statut: "en_cours", echeance: "2026-11-12" }],
      careTasks: [{ statut: "a_faire", heure_prevue: at(12, 14) }] as never,
      products: [product({ expiryDate: "2026-11-12" })],
    });
    expect(r.total[9]).toBe(3);
    expect(r.open).toBe(3);
    expect(buildAlertBars({ ...base, invoices: [invoice({ dueAt: "2026-11-12" })] }).total[9]).toBe(1);
    expect(r.lateAll).toBe(0);
  });
});
