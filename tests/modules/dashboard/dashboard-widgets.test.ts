import { describe, expect, it } from "vitest";
import { buildActivityHeatmap, buildDayUnits, buildMonthForecast, buildSpeciesSplit, buildVisitKinds, heatLegend, heatLevel, shares } from "@/modules/dashboard/model/dashboard-widgets";
import type { ScheduleEntry } from "@/modules/dashboard/v2/model";
import type { Transaction } from "@/types/db";

const entry = (id: string, hour: number, status: string, type = "Consultation"): ScheduleEntry =>
  ({
    appointment: { id, status, type },
    start: new Date(2026, 9, 29, hour, 0),
    end: new Date(2026, 9, 29, hour, 30),
    ownerName: "Propriétaire",
    patientName: `Patient ${id}`,
    species: "Chien",
  }) as unknown as ScheduleEntry;

const paid = (date: string, amount: number): Transaction =>
  ({ id: date + amount, type: "income", status: "paid", date, amount }) as unknown as Transaction;

describe("rendez-vous du jour en unités", () => {
  it("une unité par visite, dans l'ordre des heures, sans annulation ni absence", () => {
    const day = buildDayUnits([
      entry("b", 11, "scheduled", "Vaccin"),
      entry("a", 8, "completed"),
      entry("c", 9, "in_progress"),
      entry("d", 10, "cancelled"),
      entry("e", 12, "no_show"),
    ]);
    expect(day.units.map((unit) => unit.id)).toEqual(["a", "c", "b"]);
    expect(day.units.map((unit) => unit.state)).toEqual(["done", "underway", "upcoming"]);
    expect(day.units[2].label).toBe("11:00 · Patient b · Vaccin");
    expect([day.total, day.done, day.underway, day.upcoming]).toEqual([3, 1, 1, 1]);
  });

  it("une journée sans rendez-vous ne compte rien", () => {
    expect(buildDayUnits([])).toMatchObject({ total: 0, units: [] });
  });
});

describe("parts entières", () => {
  it("tombent juste à 100", () => {
    expect(shares([1, 1, 1])).toEqual([34, 33, 33]);
    expect(shares([2, 1])).toEqual([67, 33]);
    expect(shares([5, 0])).toEqual([100, 0]);
  });

  it("restent à zéro sans rien à partager", () => {
    expect(shares([0, 0])).toEqual([0, 0]);
  });
});

describe("prévision des encaissements du mois", () => {
  const now = new Date(2026, 9, 29, 9, 0);

  it("projette le rythme du mois et date le dépassement du mois précédent", () => {
    const forecast = buildMonthForecast(
      [paid("2026-10-02", 2_900_000), paid("2026-10-20", 0), paid("2026-09-15", 3_000_000)],
      new Date(2026, 9, 29, 9, 0),
    );
    expect(forecast.kind).toBe("forecast");
    if (forecast.kind !== "forecast") return;
    // 29 000 DA in 29 days: 1 000 DA a day, 31 000 DA over October.
    expect(forecast.projected).toBe(3_100_000);
    expect(forecast.previousTotal).toBe(3_000_000);
    expect(forecast.crossing?.getDate()).toBe(30);
    expect(forecast.passed).toBe(false);
    expect([forecast.monthLabel, forecast.previousLabel]).toEqual(["octobre", "septembre"]);
  });

  it("dit que le mois précédent est déjà dépassé, sans date", () => {
    const forecast = buildMonthForecast([paid("2026-10-02", 5_000_000), paid("2026-09-15", 3_000_000)], now);
    expect(forecast).toMatchObject({ kind: "forecast", passed: true, crossing: null });
  });

  it("ne date rien quand le rythme n'atteint pas le mois précédent", () => {
    const forecast = buildMonthForecast([paid("2026-10-02", 1_000_000), paid("2026-09-15", 9_000_000)], now);
    expect(forecast).toMatchObject({ kind: "forecast", passed: false, crossing: null });
  });

  it("ignore les dépenses, les impayés et ce qui est daté après maintenant", () => {
    const forecast = buildMonthForecast(
      [
        paid("2026-10-02", 1_000_000),
        { ...paid("2026-10-03", 9_000_000), type: "expense" } as Transaction,
        { ...paid("2026-10-04", 9_000_000), status: "pending" } as Transaction,
        paid("2026-10-30", 9_000_000),
      ],
      now,
    );
    expect(forecast.kind === "forecast" && forecast.collected).toBe(1_000_000);
  });

  it("refuse de prévoir avant une semaine de recul ou sans encaissement", () => {
    expect(buildMonthForecast([paid("2026-10-02", 1_000_000)], new Date(2026, 9, 3))).toMatchObject({ kind: "early", daysElapsed: 3 });
    expect(buildMonthForecast([], now)).toEqual({ kind: "empty", monthLabel: "octobre" });
  });
});

describe("phrase de prévision", () => {
  const now = new Date(2026, 9, 29, 9, 0);
  // Imported here: the component module carries its CSS, which Vitest ignores.
  const sentence = async (transactions: Transaction[], at = now) => {
    const { forecastSentence } = await import("@/modules/dashboard/components/widget-units");
    return forecastSentence(buildMonthForecast(transactions, at)).replace(/\s/g, " ");
  };

  it("s'écrit avec les chiffres calculés, jamais en dur", async () => {
    expect(await sentence([paid("2026-10-02", 2_900_000), paid("2026-09-15", 3_000_000)])).toBe(
      "À ce rythme, octobre finit vers 31 000 DA et dépasse septembre (30 000 DA) vers le 30 oct.",
    );
    expect(await sentence([paid("2026-10-02", 5_150_000), paid("2026-09-15", 2_500_000)])).toBe(
      "Septembre (25 000 DA) est déjà dépassé. À ce rythme, octobre finit vers 55 052 DA.",
    );
    expect(await sentence([paid("2026-10-02", 1_000_000)])).toBe("À ce rythme, octobre finit vers 10 690 DA.");
  });

  it("dit pourquoi elle ne prévoit pas", async () => {
    expect(await sentence([])).toBe("Aucun encaissement en octobre : rien à prévoir.");
    expect(await sentence([paid("2026-10-02", 1_000_000)], new Date(2026, 9, 3))).toBe(
      "10 000 DA encaissés en 3 jours : trop tôt pour prévoir, prévision dès le 7 octobre.",
    );
  });
});

describe("patients par espèce", () => {
  const now = new Date(2026, 9, 29);
  const patient = (species: string, status = "sante", createdAt = "2026-01-01") => ({ species, status, createdAt });

  it("compte les patients actifs par espèce, la plus fréquente d'abord, parts justes", () => {
    const split = buildSpeciesSplit(
      [patient("Chien"), patient("chien "), patient("Chat"), patient("Chien", "decede"), patient("Lapin", "traitement", "2026-10-20")],
      now,
    );
    expect(split.total).toBe(4);
    expect(split.deceased).toBe(1);
    expect(split.recent).toBe(1);
    expect(split.rows).toEqual([
      { key: "chien", name: "Chien", count: 2, share: 50 },
      { key: "chat", name: "Chat", count: 1, share: 25 },
      { key: "lapin", name: "Lapin", count: 1, share: 25 },
    ]);
  });

  it("regroupe les plus petites espèces au-delà de quatre, et nomme l'espèce absente", () => {
    const split = buildSpeciesSplit(
      ["Chien", "Chien", "Chat", "Cheval", "Lapin", "Oiseau", "Tortue", ""].map((s) => patient(s)),
      now,
    );
    expect(split.rows.map((row) => row.name)).toEqual(["Chien", "Chat", "Cheval", "Lapin", "Autres (3)"]);
    expect(split.rows.at(-1)?.count).toBe(3);
    expect(split.rows.reduce((sum, row) => sum + row.share, 0)).toBe(100);
    expect(buildSpeciesSplit([patient("")], now).rows[0].name).toBe("Non renseignée");
  });

  it("reste vide sans patient actif", () => {
    expect(buildSpeciesSplit([patient("Chien", "decede")], now)).toMatchObject({ total: 0, rows: [] });
  });
});

describe("consultations par motif", () => {
  it("compte chaque motif, du plus fréquent au moins fréquent, avec des parts qui somment à 100", () => {
    const kinds = buildVisitKinds([
      { type: "Consultation" },
      { type: "Vaccin" },
      { type: "Consultation" },
      { type: null },
      { type: "Urgence" },
      { type: " Vaccin " },
    ]);
    expect(kinds.map((row) => [row.name, row.count])).toEqual([
      ["Consultation", 3],
      ["Vaccin", 2],
      ["Urgence", 1],
    ]);
    expect(kinds.reduce((sum, row) => sum + row.share, 0)).toBe(100);
  });

  it("aucune visite, aucun motif", () => {
    expect(buildVisitKinds([])).toEqual([]);
  });
});

describe("heatmap de l'activité", () => {
  const at = (day: number, hour = 10, status = "completed", month = 9) => ({
    startTime: new Date(2026, month, day, hour, 0).toISOString(),
    status,
  });
  const now = new Date(2026, 9, 29, 15, 0);

  it("compte les rendez-vous par jour local, sans annulation ni absence", () => {
    const map = buildActivityHeatmap(
      [at(4), at(4, 16), at(4, 18, "cancelled"), at(5, 9, "no_show"), at(5, 23, "scheduled"), { startTime: undefined, status: "completed" }],
      "month",
      now,
    );
    const day = (n: number) => map.days.find((d) => d.date.getDate() === n)!;
    expect(day(4).count).toBe(2);
    expect(day(5).count).toBe(1);
    expect(map.total).toBe(3);
    expect(map.activeDays).toBe(2);
    expect(map.busiest?.date.getDate()).toBe(4);
    // 4 et 5 octobre 2026 : un dimanche et un lundi.
    expect(map.weekdays).toEqual([1, 0, 0, 0, 0, 0, 2]);
  });

  it("au mois, une grille calendrier du lundi au dimanche, les jours voisins vides", () => {
    const map = buildActivityHeatmap([], "month", now);
    const [october] = map.months;
    expect(map.months).toHaveLength(1);
    expect(october.label).toBe("Octobre 2026");
    // Le 1er octobre 2026 est un jeudi.
    expect(october.weeks[0].slice(0, 3)).toEqual([null, null, null]);
    expect(october.weeks[0][3]?.date.getDate()).toBe(1);
    expect(october.weeks.flat().filter(Boolean)).toHaveLength(31);
    expect(map.days.filter((d) => d.future).map((d) => d.date.getDate())).toEqual([30, 31]);
    expect(map.days.find((d) => d.today)?.date.getDate()).toBe(29);
    expect(map.elapsedDays).toBe(29);
    expect(map.total).toBe(0);
    expect(map.busiest).toBeNull();
  });

  it("à la semaine, du lundi au dimanche ; au trimestre, trois mois", () => {
    const week = buildActivityHeatmap([], "week", now);
    expect(week.days.map((d) => d.date.getDate())).toEqual([26, 27, 28, 29, 30, 31, 1]);
    expect(week.months[0].label).toBe("Semaine du 26 octobre");
    const quarter = buildActivityHeatmap([at(14, 10, "completed", 7)], "quarter", now);
    expect(quarter.months.map((m) => m.label)).toEqual(["Août 2026", "Septembre 2026", "Octobre 2026"]);
    expect(quarter.total).toBe(1);
  });

  it("à l'année, des colonnes par semaine nommées au début de chaque mois", () => {
    const year = buildActivityHeatmap([at(14, 10, "completed", 0), at(14, 10, "completed", 10)], "year", now);
    expect(year.from).toEqual(new Date(2025, 10, 1));
    expect(year.to).toEqual(new Date(2026, 10, 1));
    expect(year.columns.every((c) => c.days.length === 7)).toBe(true);
    expect(year.columns.filter((c) => c.month).map((c) => c.month)).toHaveLength(13);
    // Le 1er novembre 2025 est un samedi : les cinq jours d'avant ne sont pas dans la période.
    expect(year.columns[0].days.slice(0, 5)).toEqual([null, null, null, null, null]);
    expect(year.total).toBe(1);
  });

  it("paliers : un par rendez-vous jusqu'à 4, puis des tranches égales du jour le plus chargé", () => {
    expect([0, 1, 2, 3].map((c) => heatLevel(c, 3))).toEqual([0, 1, 2, 3]);
    expect([1, 2, 3, 4, 5].map((c) => heatLevel(c, 5))).toEqual([1, 2, 3, 4, 4]);
    expect([1, 3, 6, 9, 12].map((c) => heatLevel(c, 12))).toEqual([1, 1, 2, 3, 4]);
    expect(heatLegend(12).map((s) => [s.min, s.max])).toEqual([[0, 0], [1, 3], [4, 6], [7, 9], [10, 12]]);
    expect(heatLegend(2).map((s) => [s.min, s.max])).toEqual([[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]);
  });
});
