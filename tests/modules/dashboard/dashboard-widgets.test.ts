import { describe, expect, it } from "vitest";
import { buildDayUnits, buildMonthForecast, buildSpeciesSplit, shares } from "@/modules/dashboard/model/dashboard-widgets";
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
