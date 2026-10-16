import { describe, expect, it } from "vitest";
import { assertStayTransition, carePlanOccurrences, stayDays, STAY_STATUSES } from "../../../src/modules/hospitalizations/stays/domain";
describe("Séjours : machine à états", () => {
  for (const from of STAY_STATUSES) for (const to of STAY_STATUSES) it(`${from} vers ${to}`, () => {
    const permitted = (from === "admis" && to === "en_cours") || (from === "en_cours" && to === "sortie_prevue") || (from === "sortie_prevue" && to === "sorti") || (["admis", "en_cours", "sortie_prevue"].includes(from) && to === "annule");
    const action = () => assertStayTransition(from, to, "vet", "Motif");
    if (permitted) expect(action).not.toThrow(); else expect(action).toThrow();
  });
  it("exige un auteur et un motif d’annulation", () => {
    expect(() => assertStayTransition("admis", "en_cours", " ")).toThrow();
    expect(() => assertStayTransition("admis", "annule", "vet", " ")).toThrow();
  });
});
describe("Journées calendaires", () => {
  it("minimum une journée et sortie exactement à minuit exclue", () => {
    expect(stayDays(new Date(2026, 9, 12, 23), new Date(2026, 9, 13, 0))).toBe(1);
    expect(stayDays(new Date(2026, 9, 12, 23), new Date(2026, 9, 13, 1))).toBe(2);
    expect(stayDays(new Date(2026, 9, 12, 10), new Date(2026, 9, 12, 10))).toBe(1);
  });
  it("refuse dates invalides et sortie antérieure", () => {
    expect(() => stayDays(new Date(NaN), new Date())).toThrow();
    expect(() => stayDays(new Date(2026, 9, 13), new Date(2026, 9, 12))).toThrow();
  });
});
describe("Plan de soins explicite", () => {
  it("déduplique les horaires, respecte les bornes, reste déterministe", () => {
    const start = new Date(2026, 9, 12, 10), end = new Date(2026, 9, 14, 10);
    const result = carePlanOccurrences(start, end, ["08:00", "18:00", "08:00"]);
    expect(result).toHaveLength(4);
    expect(result).toEqual(carePlanOccurrences(start, end, ["18:00", "08:00"]));
    expect(result.map(value => new Date(value).getHours())).toEqual([18, 8, 18, 8]);
  });
  it("refuse horaires invalides et plan excessif", () => {
    expect(() => carePlanOccurrences(new Date(2026, 0, 1), new Date(2026, 0, 2), ["25:00"])).toThrow();
    expect(() => carePlanOccurrences(new Date(2026, 0, 1), new Date(2028, 0, 1), ["08:00"])).toThrow();
  });
});

describe("Horaires locaux lors du changement d’heure", () => {
  it("conserve l’heure choisie malgré une journée de 23 ou 25 heures", () => {
    const previous=process.env.TZ; process.env.TZ="America/Toronto";
    try {
      for (const [month,day] of [[2,7],[9,31]]) {
        const occurrences=carePlanOccurrences(new Date(2026,month,day,0),new Date(2026,month,day+2,23,59),["08:00"]);
        expect(occurrences).toHaveLength(3);
        expect(occurrences.map(value => new Date(value).getHours())).toEqual([8,8,8]);
        expect(stayDays(new Date(2026,month,day,10),new Date(2026,month,day+2,0))).toBe(2);
      }
    } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ=previous; }
  });
  it("refuse une heure inexistante au passage à l’heure d’été", () => {
    const previous=process.env.TZ; process.env.TZ="America/Toronto";
    try { expect(() => carePlanOccurrences(new Date(2026,2,8,0),new Date(2026,2,8,23),["02:30"])).toThrow("n’existe pas"); }
    finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ=previous; }
  });
});
