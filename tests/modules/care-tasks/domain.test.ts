import { describe, expect, it } from "vitest";
import {
  assertCareTransition,
  careDisplayStatus,
  suggestCareTasksFromPlan,
  type CareStatus,
} from "../../../src/modules/care-tasks/domain";
const statuses: CareStatus[] = ["a_faire", "en_cours", "fait", "annule"];
describe("Transitions des soins", () => {
  for (const from of statuses)
    for (const to of statuses) {
      it(`${from} vers ${to}`, () => {
        const allowed =
          from === "a_faire"
            ? ["en_cours", "fait", "annule"]
            : from === "en_cours"
              ? ["fait", "annule"]
              : [];
        const action = () =>
          assertCareTransition(from, to, "vet", "Motif explicite");
        if (allowed.includes(to)) expect(action).not.toThrow();
        else expect(action).toThrow();
      });
    }
  it("exige auteur et motif", () => {
    expect(() => assertCareTransition("a_faire", "fait", " ")).toThrow();
    expect(() =>
      assertCareTransition("en_cours", "annule", "vet", " ")
    ).toThrow();
  });
});
describe("Retard dérivé", () => {
  const now = new Date("2026-10-12T12:00:00Z");
  it("ne déclenche pas à l’heure exacte", () =>
    expect(
      careDisplayStatus(
        { statut: "a_faire", heure_prevue: now.toISOString() },
        now
      )
    ).toBe("a_faire"));
  for (const statut of statuses)
    it(`respecte ${statut}`, () =>
      expect(
        careDisplayStatus({ statut, heure_prevue: "2026-10-12T11:59:59Z" }, now)
      ).toBe(
        statut === "a_faire" || statut === "en_cours" ? "en_retard" : statut
      ));
});
it("préserve le Plan mot pour mot et n’invente ni dose ni horaire", () => {
  const result = suggestCareTasksFromPlan(
    "Administrer le traitement prescrit.\nContrôle de température à 14 h."
  );
  expect(result).toEqual([
    {
      label: "Administrer le traitement prescrit.",
      type: "medicament",
      note: "",
    },
    { label: "Contrôle de température à 14 h.", type: "controle", note: "" },
  ]);
  expect(suggestCareTasksFromPlan(" ")).toEqual([]);
});
