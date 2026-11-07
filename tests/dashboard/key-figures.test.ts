import { describe, expect, it } from "vitest";
import { buildKeyFigures, changeBadge } from "../../src/modules/dashboard/model/key-figures";
import { buildPremiumAnalytics } from "../../src/modules/dashboard/model/premium-analytics";
import { receivablesSummary, settlementRate } from "../../src/modules/dashboard/v2/financial-model";
import { formatCentimes } from "../../src/modules/dashboard/v2/model";
import { formatNumber } from "../../src/utils/display-format";
import type { Appointment, Invoice, Patient, Task, Transaction } from "../../src/types/db";

/** The old DeltaBadge, copied as it was: the oracle for the comparison rules. */
function oldDelta(value: number | null, previous: number, current: number, inverse = false) {
  if (previous === 0 && current === 0) return { kind: "nothing" as const };
  if (value === null && previous === 0) return { kind: "no-base" as const };
  const computed = value ?? Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
  const positive = computed !== 0 && (inverse ? computed < 0 : computed > 0);
  return { kind: "pct" as const, computed, sense: computed === 0 ? "neutral" : positive ? "good" : "bad" };
}

describe("badge d'écart : un sur chaque carte, avec les règles de l'ancienne rangée", () => {
  const n = (v: number) => String(v);
  it("rien des deux côtés : 0 %, neutre", () => {
    expect(changeBadge(0, 0, 0, n)).toEqual({ delta: 0 });
  });
  it("de rien à quelque chose : pas de pourcentage, le badge dit la hausse elle-même", () => {
    expect(changeBadge(null, 0, 2, n)).toEqual({ delta: 2, deltaText: "+2" });
    expect(changeBadge(null, 0, 150, (v) => `${v} DA`)).toEqual({ delta: 150, deltaText: "+150 DA" });
  });
  it("sinon : la variation en pourcentage, à la hausse comme à la baisse", () => {
    expect(changeBadge(203.4, 88, 267, n)).toEqual({ delta: 203.4 });
    expect(changeBadge(null, 4, 6, n)).toEqual({ delta: 50 });
    expect(changeBadge(-12.5, 8, 7, n)).toEqual({ delta: -12.5 });
    expect(changeBadge(null, 5, 0, n)).toEqual({ delta: -100 });
  });
  it("coïncide avec l'ancienne règle partout où il y avait un pourcentage, sens compris", () => {
    for (const previous of [1, 2, 5, 40]) for (const current of [0, 1, 3, 5, 100]) for (const inverse of [false, true]) {
      const change = ((current - previous) / Math.abs(previous)) * 100;
      const old = oldDelta(change, previous, current, inverse);
      const now = changeBadge(change, previous, current, n);
      expect(old.kind).toBe("pct");
      if (old.kind !== "pct") continue;
      expect(now.delta).toBe(old.computed);
      const flat = now.delta === 0;
      const good = !flat && (now.delta > 0) === !inverse;
      expect(flat ? "neutral" : good ? "good" : "bad").toBe(old.sense);
    }
  });
  it("toujours un nombre, jamais NaN ni infini, même sur des bases extrêmes", () => {
    for (const previous of [0, 0.01, 1, 1e9]) for (const current of [0, 0.01, 1, 1e9]) {
      const b = changeBadge(null, previous, current, n);
      expect(Number.isFinite(b.delta)).toBe(true);
    }
  });
});

describe("les quatre chiffres clés, minimalistes : libellé, valeur, écart, une ligne", () => {
  const patient = (id: string): Patient => ({ id, name: id, species: "Chien", sex: "M", ownerId: "o", status: "sante", createdAt: "2026-09-01" });
  const appt = (id: string, date: string, status: Appointment["status"]): Appointment => ({ id, patientId: "a", ownerId: "o", vetId: "v", title: id, type: "Consultation", startTime: date, endTime: date, createdAt: date, status });
  const income = (id: string, date: string, amount: number): Transaction => ({ id, date, amount, type: "income", status: "paid", category: "Consultation", description: "r", method: "cash", createdAt: date });
  const task = (id: string, status: Task["status"], dueDate: string): Task => ({ id, title: id, status, priority: "low", dueDate, isReminder: false, createdAt: dueDate });
  const now = new Date(2026, 9, 15, 12);
  const base = () => ({ appointments: [] as Appointment[], patients: [patient("a")], transactions: [] as Transaction[], tasks: [] as Task[], vaccinations: [], alerts: [] });
  const figures = (d = base(), r = receivablesSummary([], []), rate: number | null = null) => buildKeyFigures(buildPremiumAnalytics(d, "30d", now), r, rate);

  it("quatre cartes, dans l'ordre : Trésorerie, Rendez-vous, Créances, Actions à suivre", () => {
    expect(figures().map((f) => f.label)).toEqual(["Trésorerie", "Rendez-vous", "Créances", "Actions à suivre"]);
    expect(figures().map((f) => f.ariaLabel)).toEqual(["Voir la trésorerie", "Voir les rendez-vous", "Voir les créances", "Voir les actions et rappels"]);
  });
  it("chaque carte a son badge d'écart, créances et actions comprises", () => {
    for (const f of figures()) expect(typeof f.delta).toBe("number");
  });
  it("chaque carte n'a qu'une ligne de texte, courte, et plus de ligne de comparaison", () => {
    const d = base(); d.appointments = [appt("1", "2026-10-10T09:00:00", "completed")]; d.tasks = [task("t", "done", "2026-10-10")];
    for (const f of figures(d)) {
      expect(f.line.length).toBeLessThanOrEqual(48);
      expect(f.line).not.toMatch(/contre|période précédente|Rien à comparer|comparable/);
      expect(Object.keys(f)).not.toContain("hint");
      expect(Object.keys(f)).not.toContain("detail");
    }
  });
  it("Trésorerie : recettes, écart, solde net, courbe cumulée", () => {
    const d = base(); d.transactions = [income("a", "2026-10-10", 20000), income("b", "2026-10-12", 10000), income("p", "2026-08-20", 10000)];
    const cash = figures(d)[0];
    expect(cash.value).toBe(formatCentimes(30000));
    expect(cash.delta).toBe(200);
    expect(cash.line).toBe(`Solde net : ${formatCentimes(30000)}`);
    expect(cash.trend!.every((v, i, arr) => i === 0 || v >= arr[i - 1])).toBe(true);
    expect(cash.trend!.at(-1)).toBe(30000);
    // 300 DA encaissés contre 100 DA la période d'avant : l'objectif d'égaler est atteint, plafonné à 100 %.
    expect(cash.goal).toEqual({ ratio: 1, label: `Période précédente : ${formatCentimes(10000)}` });
  });
  it("Rendez-vous : le nombre, l'écart, honorés, annulés et absences, et sa courbe par jour", () => {
    const d = base();
    d.appointments = [appt("1", "2026-10-10T09:00:00", "completed"), appt("2", "2026-10-11T09:00:00", "completed"), appt("3", "2026-10-12T09:00:00", "cancelled"), appt("4", "2026-10-13T09:00:00", "no_show"), appt("5", "2026-10-14T09:00:00", "scheduled"), appt("old", "2026-08-25T09:00:00", "completed")];
    const rdv = figures(d)[1];
    expect(rdv.value).toBe("5");
    expect(rdv.delta).toBe(400);
    expect(rdv.line).toBe("2 honorés · 1 annulé · 1 absence");
    expect(rdv.trend!.reduce((n, v) => n + v, 0)).toBe(5);
    expect(rdv.goal).toEqual({ ratio: 0.4, label: "Honorés : 2 sur 5" });
  });
  it("Rendez-vous : le singulier ne prend pas de s, le zéro non plus", () => {
    const d = base(); d.appointments = [appt("1", "2026-10-10T09:00:00", "completed")];
    expect(figures(d)[1].line).toBe("1 honoré · 0 annulé · 0 absence");
  });
  describe("Créances", () => {
    const invoice = (id: string, over: Partial<Invoice> = {}) => ({ id, documentStatus: "issued", issuedAt: "2026-10-01", createdAt: "2026-10-01", grossAmount: 10000, creditAmount: 0, balanceAmount: 10000, completedPaymentAmount: 0, settlementStatus: "unpaid", ...over }) as Invoice;
    it("le reste à recouvrer, les factures impayées et celles en retard, sans écart (toutes périodes)", () => {
      const inv = [invoice("a"), invoice("b", { balanceAmount: 5000, settlementStatus: "overdue" }), invoice("c", { balanceAmount: 0, settlementStatus: "paid" })];
      const c = figures(base(), receivablesSummary(inv, []), settlementRate(inv))[2];
      expect(c.value).toBe(formatCentimes(15000));
      expect(c.line).toBe("2 factures impayées · 1 en retard");
      // Rien n'était dû avant la période : le badge dit la hausse, en dinars.
      expect([c.tone, c.emphasize, c.delta, c.deltaText]).toEqual(["rose", true, 150, `+${formatCentimes(15000)}`]);
    });
    it("l'objectif est la part des factures réglées, calculée sur les factures", () => {
      const inv = [invoice("a", { balanceAmount: 2500 }), invoice("c", { balanceAmount: 0, settlementStatus: "paid" })];
      const rate = settlementRate(inv)!;
      const c = figures(base(), receivablesSummary(inv, []), rate)[2];
      expect(c.goal).toEqual({ ratio: rate / 100, label: "Factures réglées" });
      expect(rate).toBeCloseTo(87.5, 1);
    });
    it("sans facture, pas d'objectif, aucun montant : vert et sobre", () => {
      const none = figures()[2];
      expect([none.value, none.line, none.tone, none.emphasize, none.goal]).toEqual([formatCentimes(0), "Aucune facture impayée", "green", false, undefined]);
    });
    it("une seule facture impayée au singulier, ambre quand rien n'est en retard", () => {
      const r = receivablesSummary([invoice("a")], []);
      const c = figures(base(), r, 0)[2];
      expect(c.line).toBe("1 facture impayée · 0 en retard");
      expect(c.tone).toBe("amber");
      expect(c.goal).toEqual({ ratio: 0, label: "Factures réglées" });
    });
    it("une écriture manuelle en attente est dans le montant, et nommée dans la ligne", () => {
      const pending = { id: "m", type: "income", status: "pending", amount: 5000, date: "2026-10-05" } as Transaction;
      const c = figures(base(), receivablesSummary([], [pending]))[2];
      expect(c.value).toBe(formatCentimes(5000));
      expect(c.line).toBe("Aucune facture impayée · 1 en attente");
    });
  });
  describe("Actions à suivre", () => {
    it("le détail d'avant, la tonalité selon les urgences, le chiffre toujours coloré", () => {
      const a = figures()[3];
      expect(a.line).toBe("0 prioritaires · 0 vaccins · 0 tâches");
      expect([a.tone, a.emphasize, a.higherIsBetter]).toEqual(["amber", true, false]);
      const d = base(); d.alerts = [{ id: "task:t", title: "t", detail: "", source: "task", tone: "critical" }]; d.tasks = [task("t", "todo", "2026-10-10")];
      const urgent = figures(d)[3];
      expect(urgent.tone).toBe("rose");
      expect(urgent.line).toBe("1 prioritaires · 0 vaccins · 1 tâches");
      expect(urgent.value).toBe(formatNumber(1));
    });
    it("l'objectif est le taux d'actions terminées : terminées sur terminées plus à suivre, en français", () => {
      const d = base(); d.tasks = [task("1", "done", "2026-10-10"), task("2", "done", "2026-10-11"), task("3", "todo", "2026-10-12"), task("4", "in_progress", "2026-10-13"), task("old", "done", "2026-08-01")];
      d.alerts = [{ id: "task:3", title: "t", detail: "", source: "task", tone: "neutral" }, { id: "task:4", title: "t", detail: "", source: "task", tone: "neutral" }];
      // 2 terminées dans la période, 2 encore à suivre : 2 sur 4.
      expect(figures(d)[3].goal).toEqual({ ratio: 0.5, label: "2 actions terminées sur 4" });
    });
    it("une seule action, pas encore terminée : « 0 action terminée sur 1 », barre à 0", () => {
      const d = base(); d.tasks = [task("1", "todo", "2026-10-10")];
      d.alerts = [{ id: "task:1", title: "t", detail: "", source: "task", tone: "neutral" }];
      expect(figures(d)[3].goal).toEqual({ ratio: 0, label: "0 action terminée sur 1" });
    });
    it("rien à terminer : la barre est pleine, 100 %, jamais vide", () => {
      expect(figures()[3].goal).toEqual({ ratio: 1, label: "Aucune action à terminer" });
    });
    it("tout est terminé : 100 %, au pluriel", () => {
      const d = base(); d.tasks = [task("1", "done", "2026-10-10"), task("2", "done", "2026-10-11")];
      expect(figures(d)[3].goal).toEqual({ ratio: 1, label: "2 actions terminées sur 2" });
    });
  });
});

describe("objectifs de la vue KPI : sur quelles cartes, et avec quelles données", () => {
  const patient = (id: string): Patient => ({ id, name: id, species: "Chien", sex: "M", ownerId: "o", status: "sante", createdAt: "2026-09-01" });
  const appt = (id: string, date: string, status: Appointment["status"]): Appointment => ({ id, patientId: "a", ownerId: "o", vetId: "v", title: id, type: "Consultation", startTime: date, endTime: date, createdAt: date, status });
  const income = (id: string, date: string, amount: number): Transaction => ({ id, date, amount, type: "income", status: "paid", category: "Consultation", description: "r", method: "cash", createdAt: date });
  const now = new Date(2026, 9, 15, 12);
  const build = (d: { appointments: Appointment[]; transactions: Transaction[] }, rate: number | null = null) =>
    buildKeyFigures(buildPremiumAnalytics({ ...d, patients: [patient("a")], tasks: [], vaccinations: [], alerts: [] }, "30d", now), receivablesSummary([], []), rate);

  it("Trésorerie : égaler la période précédente, plafonné à 100 %, absent sans période précédente", () => {
    const d = { appointments: [], transactions: [income("a", "2026-10-10", 5000), income("p", "2026-08-20", 20000)] };
    expect(build(d)[0].goal).toEqual({ ratio: 0.25, label: `Période précédente : ${formatCentimes(20000)}` });
    const above = { appointments: [], transactions: [income("a", "2026-10-10", 50000), income("p", "2026-08-20", 20000)] };
    expect(build(above)[0].goal?.ratio).toBe(1);
    expect(build({ appointments: [], transactions: [income("a", "2026-10-10", 5000)] })[0].goal).toBeUndefined();
  });
  it("Rendez-vous : la part des rendez-vous honorés, absente sans rendez-vous", () => {
    const d = { appointments: [appt("1", "2026-10-10T09:00:00", "completed"), appt("2", "2026-10-11T09:00:00", "cancelled"), appt("3", "2026-10-12T09:00:00", "scheduled"), appt("4", "2026-10-13T09:00:00", "completed")], transactions: [] };
    expect(build(d)[1].goal).toEqual({ ratio: 0.5, label: "Honorés : 2 sur 4" });
    expect(build({ appointments: [], transactions: [] })[1].goal).toBeUndefined();
  });
  it("Créances : la part des factures réglées ; Actions : toujours une barre", () => {
    expect(build({ appointments: [], transactions: [] }, 72.5)[2].goal).toEqual({ ratio: 0.725, label: "Factures réglées" });
    expect(build({ appointments: [], transactions: [] })[3].goal).toBeDefined();
  });
  it("tout objectif est un rapport entre 0 et 1, jamais NaN ni au-delà de 100 %", () => {
    const d = { appointments: [appt("1", "2026-10-10T09:00:00", "completed")], transactions: [income("a", "2026-10-10", 90000), income("p", "2026-08-20", 100)] };
    for (const f of build(d, 99.9)) if (f.goal) { expect(Number.isFinite(f.goal.ratio)).toBe(true); expect(f.goal.ratio).toBeGreaterThanOrEqual(0); expect(f.goal.ratio).toBeLessThanOrEqual(1); }
  });
});

describe("badge des créances : ce qui est dû aujourd'hui contre ce qui l'était à la fin de la période précédente", () => {
  const patient = (id: string): Patient => ({ id, name: id, ownerId: "o", species: "Chien", sex: "M", status: "sante", createdAt: "2026-01-01" });
  const invoice = (id: string, issued: string, balance: number, over: Partial<Invoice> = {}) => ({ id, documentStatus: "issued", issuedAt: issued, createdAt: issued, grossAmount: 10000, creditAmount: 0, balanceAmount: balance, completedPaymentAmount: 0, settlementStatus: "unpaid", ...over }) as Invoice;
  const now = new Date(2026, 9, 15, 12);
  const run = (invoices: Invoice[], transactions: Transaction[] = []) => {
    const model = buildPremiumAnalytics({ appointments: [], patients: [patient("a")], transactions, tasks: [], vaccinations: [], alerts: [], invoices }, "30d", now);
    return { model, card: buildKeyFigures(model, receivablesSummary(invoices, transactions), settlementRate(invoices))[2] };
  };

  it("une facture émise avant la période et une pendant : +50 % (100 DA dus au début, 150 DA aujourd'hui)", () => {
    const { model, card } = run([invoice("a", "2026-08-01", 10000), invoice("b", "2026-10-05", 5000, { grossAmount: 5000 })]);
    expect(model.receivablesBefore).toBe(100);
    expect(card.delta).toBe(50);
    expect(card.deltaText).toBeUndefined();
  });
  it("un paiement reçu pendant la période fait baisser ce qui est dû : badge en baisse", () => {
    const pay: Transaction = { id: "p", type: "income", status: "paid", amount: 6000, date: "2026-10-05", sourceType: "billing_payment", referenceId: "a" } as Transaction;
    const { model, card } = run([invoice("a", "2026-08-01", 4000)], [pay]);
    // 100 DA dus avant le paiement de 60 DA, 40 DA aujourd'hui : -60 %.
    expect(model.receivablesBefore).toBe(100);
    expect(card.delta).toBe(-60);
  });
  it("rien dû avant ni aujourd'hui : 0 %, neutre", () => {
    const { card } = run([]);
    expect([card.delta, card.deltaText]).toEqual([0, undefined]);
  });
  it("aucune facture avant la période : le badge dit la hausse en dinars, jamais un pourcentage infini", () => {
    const { card } = run([invoice("a", "2026-10-05", 10000)]);
    expect(card.deltaText).toBe(`+${formatCentimes(10000)}`);
    expect(Number.isFinite(card.delta)).toBe(true);
  });
  it("la tonalité suit le sens : une hausse des créances est défavorable, une baisse favorable", () => {
    // Le composant lit higherIsBetter : moins de créances, c'est mieux.
    expect(run([invoice("a", "2026-10-05", 10000)]).card.higherIsBetter).toBe(false);
  });
});
