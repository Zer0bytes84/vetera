import { describe, expect, it } from "vitest";
import {
  advancePage,
  normalizePage,
  resolvePage,
} from "../../src/hooks/use-page";

describe("usePage : la page courante calculée au rendu", () => {
  it("revient à 1 dès que la clé change, sans passer par une page périmée", () => {
    const state = { key: "a", page: 4 };
    expect(resolvePage(state, "a", 5)).toBe(4);
    expect(resolvePage(state, "b", 5)).toBe(1);
  });

  it("ne dépasse jamais le nombre de pages", () => {
    expect(resolvePage({ key: "", page: 5 }, "", 2)).toBe(2);
    expect(resolvePage({ key: "", page: 5 }, "", 1)).toBe(1);
  });

  it("la fonction passée au setter voit la page effective, comme l'ancien état déjà corrigé", () => {
    // Page 5 choisie, la liste n'a plus que 3 pages : « page précédente » mène à 2, pas à 4.
    expect(
      advancePage({ key: "", page: 5 }, "", 3, (page) => page - 1)
    ).toEqual({ key: "", page: 2 });
    // Après un changement de filtre, « page suivante » part de 1.
    expect(
      advancePage({ key: "a", page: 4 }, "b", 5, (page) => page + 1)
    ).toEqual({ key: "b", page: 2 });
  });

  it("une valeur directe est prise telle quelle et rattachée à la clé courante", () => {
    expect(advancePage({ key: "a", page: 4 }, "b", 5, 3)).toEqual({
      key: "b",
      page: 3,
    });
  });

  it("une page bornée est réécrite dans l'état : elle ne revient pas si le nombre de pages remonte (comme l'ancien effet)", () => {
    const chosen = { key: "", page: 5 };
    const clamped = normalizePage(chosen, "", 2);
    expect(clamped).toEqual({ key: "", page: 2 });
    expect(resolvePage(clamped, "", 5)).toBe(2);
  });

  it("un changement de clé réécrit la page à 1 ; sans changement, c'est le même objet (aucun rendu de plus)", () => {
    const state = { key: "a", page: 4 };
    expect(normalizePage(state, "b", 5)).toEqual({ key: "b", page: 1 });
    expect(normalizePage(state, "a", 5)).toBe(state);
  });
});
