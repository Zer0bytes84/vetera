import { describe, expect, it } from "vitest";
import {
  answerQuestion,
  verifyAnswer,
} from "@/modules/assistant-answers/answer";
import { bucketsOf } from "@/modules/assistant-answers/presentation";
import type { Answer } from "@/modules/assistant-answers/types";
import { appointment, clinic, line, NOW, patient } from "./fixtures";

/**
 * Tranche 1 (19 November 2026): cards and charts with no reading of their own. A card names a figure; a series is
 * drawn from the table's rows and adds up, to the centime, to the figure it names, which the table already adds up to.
 */
const shown = (answer: Answer) => {
  if (answer.kind !== "answer") {
    throw new Error(`refus : ${answer.text}`);
  }
  return answer;
};
const sum = (points: { value: number }[]) =>
  points.reduce((total, point) => total + point.value, 0);
const day = (offset: number, hour = 10) =>
  new Date(
    NOW.getFullYear(),
    NOW.getMonth(),
    NOW.getDate() + offset,
    hour
  ).toISOString();

describe("tranche 1 : cartes, graphiques, tableaux", () => {
  const cash = clinic({
    transactions: [
      line("t1", "income", 150_000, day(-1)),
      line("t2", "income", 2550, day(-12, 23)),
      line("t3", "expense", 20_000, day(-3)),
      line("t4", "income", 99_999, day(-200)),
      line("t5", "expense", 12_345, day(-29, 0)),
    ],
  });

  it("recettes et dépenses : quatre cartes, deux aires qui égalent les cartes et le tableau, au centime", () => {
    const answer = shown(
      answerQuestion("Recettes et dépenses des 30 derniers jours", cash, {
        now: NOW,
      })
    );
    expect(answer.cards.map((card) => card.figure)).toEqual([
      "income",
      "expense",
      "net",
      "rows",
    ]);
    expect(answer.cards.find((card) => card.figure === "income")?.tone).toBe(
      "positive"
    );
    expect(answer.cards.find((card) => card.figure === "expense")?.tone).toBe(
      "negative"
    );
    const chart = answer.chart!;
    expect(chart.kind).toBe("area");
    expect(chart.bucket).toBe("jour");
    expect(chart.series[0].points).toHaveLength(30);
    const figure = (id: string) =>
      answer.figures.find((item) => item.id === id)!.value;
    const table = answer.table!.rows.map((row) => Number(row.amount));
    expect(
      sum(chart.series.find((series) => series.id === "income")!.points)
    ).toBe(figure("income"));
    expect(
      sum(chart.series.find((series) => series.id === "expense")!.points)
    ).toBe(figure("expense"));
    expect(figure("income")).toBe(
      table.filter((amount) => amount > 0).reduce((a, b) => a + b, 0)
    );
    expect(figure("income")).toBe(152_550);
  });

  it("les recettes seules : la seule aire des encaissements", () => {
    const answer = shown(
      answerQuestion("Recettes des 30 derniers jours", cash, { now: NOW })
    );
    expect(answer.chart!.series.map((series) => series.id)).toEqual(["income"]);
  });

  it("une longue période passe aux semaines puis aux mois, et la somme tient toujours", () => {
    const quarter = shown(
      answerQuestion("Recettes des 90 derniers jours", cash, { now: NOW })
    );
    expect(quarter.chart!.bucket).toBe("semaine");
    expect(quarter.chart!.series[0].points).toHaveLength(13);
    const year = shown(
      answerQuestion(
        "Recettes de l'année dernière",
        clinic({
          transactions: [
            line(
              "y1",
              "income",
              5000,
              new Date(NOW.getFullYear() - 1, 5, 15, 10).toISOString()
            ),
          ],
        }),
        { now: NOW }
      )
    );
    expect(year.chart!.bucket).toBe("mois");
    expect(year.chart!.series[0].points).toHaveLength(12);
    expect(sum(year.chart!.series[0].points)).toBe(5000);
  });

  it("rendez-vous : cartes par état, barres par jour qui égalent le nombre de rendez-vous", () => {
    const data = clinic({
      patients: [patient("p1", "Rex")],
      appointments: [
        appointment("a1", "p1", day(-1), "completed"),
        appointment("a2", "p1", day(-1, 15), "no_show"),
        appointment("a3", "p1", day(-5), "cancelled"),
      ],
    });
    const answer = shown(
      answerQuestion("Rendez-vous des 30 derniers jours", data, { now: NOW })
    );
    expect(answer.cards.map((card) => card.figure)).toEqual([
      "rows",
      "completed",
      "cancelled",
      "no_show",
    ]);
    expect(answer.cards.find((card) => card.figure === "no_show")?.tone).toBe(
      "negative"
    );
    expect(answer.chart!.kind).toBe("bars");
    expect(sum(answer.chart!.series[0].points)).toBe(3);
  });

  it("patients : les dossiers actifs par espèce en barres, qui égalent la carte", () => {
    const data = clinic({
      patients: [
        patient("p1", "Rex"),
        patient("p2", "Mila", "o1", { species: "Chat" }),
        patient("p3", "Nova", "o1", { species: "Chat" }),
      ],
    });
    const answer = shown(
      answerQuestion("Combien de patients ?", data, { now: NOW })
    );
    expect(answer.chart!.bucket).toBe("espece");
    expect(sum(answer.chart!.series[0].points)).toBe(
      answer.figures.find((figure) => figure.id === "active")!.value
    );
  });

  it("tâches : des cartes, pas de graphique", () => {
    const answer = shown(
      answerQuestion("Tâches en retard", clinic({}), { now: NOW })
    );
    expect(answer.chart).toBeNull();
  });

  it("un point retouché, une carte sans chiffre, un point négatif : la réponse est refusée", () => {
    const answer = shown(
      answerQuestion("Recettes et dépenses des 30 derniers jours", cash, {
        now: NOW,
      })
    );
    const touched = structuredClone(answer);
    touched.chart!.series[0].points[3].value += 1;
    expect(verifyAnswer(touched).kind).toBe("refusal");
    const card = structuredClone(answer);
    card.cards.push({ figure: "invented", tone: "neutral" });
    expect(verifyAnswer(card).kind).toBe("refusal");
    const negative = structuredClone(answer);
    negative.chart!.series[0].points[0].value = -1;
    negative.chart!.series[0].points[1].value += 1;
    expect(verifyAnswer(negative).kind).toBe("refusal");
    expect(verifyAnswer(structuredClone(answer)).kind).toBe("answer");
  });

  it("les seaux couvrent la période jour pour jour, sans trou ni recouvrement, la dernière semaine entière", () => {
    const next = (key: string) => {
      const [y, m, d] = key.split("-").map(Number);
      const date = new Date(y, m - 1, d + 1, 12);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    };
    for (const days of [1, 2, 30, 62, 63, 92, 182, 183, 731]) {
      const from = new Date(2026, 0, 1);
      const to = new Date(2026, 0, days, 23, 59);
      const { unit, buckets } = bucketsOf({
        from,
        to,
        label: "",
        explicit: true,
      });
      expect(buckets[0].first, String(days)).toBe("2026-01-01");
      for (let i = 1; i < buckets.length; i++) {
        expect(buckets[i].first, `${days} jours, seau ${i}`).toBe(
          next(buckets[i - 1].last)
        );
      }
      if (unit === "semaine") {
        expect(buckets.at(-1)!.first, `${days} jours`).not.toBe(
          buckets.at(-1)!.last
        );
      }
      if (unit === "semaine") {
        expect(
          next(next(next(next(next(next(buckets.at(-1)!.first)))))),
          `${days} jours`
        ).toBe(buckets.at(-1)!.last);
      }
    }
  });

  it("un pays où l'heure change à minuit (Beyrouth, Santiago, Le Caire) : aucune réponse refusée sur toute une année", () => {
    // Run with TZ=Asia/Beirut, America/Santiago… to cross their changes: « today » walks the year, the rows sit at the
    // start of each local day, the moment a midnight change skips.
    const refused: string[] = [];
    for (let offset = 0; offset < 366; offset += 2) {
      const now = new Date(2026, 0, 1 + offset, 10);
      const rows = Array.from({ length: 100 }, (_, i) =>
        line(
          `d${i}`,
          "income",
          100 * (i + 1),
          new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - i,
            0,
            30
          ).toISOString()
        )
      );
      for (const question of [
        "Recettes des 10 derniers jours",
        "Recettes des 3 derniers mois",
      ]) {
        if (
          answerQuestion(question, clinic({ transactions: rows }), { now })
            .kind !== "answer"
        ) {
          refused.push(`${now.toDateString()} · ${question}`);
        }
      }
    }
    expect(refused).toEqual([]);
  });

  it("au-delà de huit espèces, le graphique garde les sept premières et additionne le reste, total inchangé", () => {
    const species = [
      "Chien",
      "Chat",
      "Lapin",
      "Cheval",
      "Furet",
      "Cobaye",
      "Perroquet",
      "Tortue",
      "Hamster",
      "Serpent",
    ];
    const data = clinic({
      patients: species.flatMap((name, i) =>
        Array.from({ length: 10 - i }, (_, k) =>
          patient(`${name}-${k}`, `${name} ${k}`, "o1", { species: name })
        )
      ),
    });
    const answer = shown(
      answerQuestion("Combien de patients ?", data, { now: NOW })
    );
    const points = answer.chart!.series[0].points;
    expect(points).toHaveLength(8);
    expect(points.at(-1)!.label).toBe("Autres");
    expect(sum(points)).toBe(
      answer.figures.find((figure) => figure.id === "active")!.value
    );
  });

  it("absences : la carte et le graphique disent « Absences », en ton négatif", () => {
    const data = clinic({
      patients: [patient("p1", "Rex")],
      appointments: [appointment("a1", "p1", day(-2), "no_show")],
    });
    const answer = shown(
      answerQuestion("Absences des 30 derniers jours", data, { now: NOW })
    );
    expect(answer.cards).toEqual([{ figure: "rows", tone: "negative" }]);
    expect(answer.chart!.series[0].label).toBe("Absences");
  });

  it("le contrôle refait les cartes et le graphique : un point déplacé, une série rattachée ailleurs, un ton inversé sont refusés", () => {
    const answer = shown(
      answerQuestion("Recettes et dépenses des 30 derniers jours", cash, {
        now: NOW,
      })
    );
    const moved = structuredClone(answer);
    const points = moved.chart!.series[0].points;
    const from = points.findIndex((point) => point.value > 0);
    points[(from + 1) % points.length].value += points[from].value;
    points[from].value = 0;
    expect(verifyAnswer(moved).kind).toBe("refusal");
    const tied = structuredClone(answer);
    tied.chart!.series[0].tie = "rows";
    expect(verifyAnswer(tied).kind).toBe("refusal");
    const tone = structuredClone(answer);
    tone.cards[0].tone = "negative";
    expect(verifyAnswer(tone).kind).toBe("refusal");
    const missing = structuredClone(answer) as unknown as Record<
      string,
      unknown
    >;
    delete missing.cards;
    expect(verifyAnswer(missing as unknown as Answer).kind).toBe("refusal");
  });
});
