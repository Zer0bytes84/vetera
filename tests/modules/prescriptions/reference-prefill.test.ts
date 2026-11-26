import { describe, expect, it } from "vitest";
import reference from "@/data/vet-knowledge/doses-validees-aissa.json";
import rcp from "@/data/vet-knowledge/medications-rcp.json";
import {
  computeDose,
  formatNumber,
} from "@/modules/prescriptions/lib/dose-calculator";
import {
  followReferenceDose,
  referenceLineFields,
} from "@/modules/prescriptions/lib/reference-line";
import {
  referencePrefill,
  validatedDose,
} from "@/modules/prescriptions/lib/validated-doses";

/**
 * The prescription line of a validated molecule is prefilled from the reference Aïssa read, or left empty where the
 * reference gives no dose (release 5.2.0 bilan, § 4: the older parser prefilled Glucantime 10 times too low, Capstar
 * and Prilium outside their weight band, 0 mg for Galastop, Antisedan and Karsivan).
 */
const catalogue = (
  rcp as unknown as { rcpMedications: { id: string; nom: string }[] }
).rcpMedications;
const ref = reference as unknown as {
  molecules: { nom: string; especes: Record<string, unknown> }[];
};
const ids = ref.molecules.map(
  (molecule) => catalogue.find((item) => item.nom === molecule.nom)!.id
);

/** What the line computes once prefilled: the builder's own calculation (`computeItemDose`). */
function lineMg(
  id: string,
  species: string | null,
  weight: number | undefined
) {
  const prefill = referencePrefill(id, species, weight);
  if (!prefill) return "non validée";
  if (!prefill.dose) return "vide";
  const { min, max, unit } = prefill.dose;
  // Une dose fixe par animal est la dose de la ligne, même sans poids (carbimazole).
  if (unit === "mg/tot") return { min, max };
  const computed = computeDose({ min, max, unit, range: min !== max }, weight);
  return { min: computed.computedMg, max: max * weight! };
}

describe("préremplissage de la ligne depuis la référence validée", () => {
  it("les cas du bilan : Glucantime, Capstar, Prilium, Galastop, Antisedan, Karsivan", () => {
    // Glucantime : « 27 mg d'antimoine/kg » n'est pas une dose de produit, la référence refuse : ligne vide, plus 27 mg.
    expect(lineMg("antimoniate-de-meglumine", "chien", 10)).toBe("vide");
    // Capstar : 11,4 mg par animal de 1 à 11 kg, rien au-delà.
    expect(lineMg("nitenpyrame", "chien", 10)).toEqual({
      min: 11.4,
      max: 11.4,
    });
    expect(lineMg("nitenpyrame", "chien", 12)).toBe("vide");
    expect(lineMg("nitenpyrame", "chat", 0.8)).toBe("vide");
    // Prilium : chiens de plus de 4 kg.
    expect(lineMg("imidapril", "chien", 4)).toBe("vide");
    expect(lineMg("imidapril", "chien", 10)).toEqual({ min: 2.5, max: 2.5 });
    // Galastop : 5 µg/kg, soit 50 µg à 10 kg (0,05 mg), au lieu de 0 mg.
    expect(referencePrefill("cabergoline", "chien", 10)).toEqual({
      dose: { min: 0.005, max: 0.005, unit: "mg/kg" },
    });
    expect(lineMg("cabergoline", "chien", 10)).toEqual({
      min: 0.05,
      max: 0.05,
    });
    // Antisedan, Karsivan : la référence n'écrit pas la dose en nombre.
    expect(lineMg("atipamezole", "chien", 10)).toBe("vide");
    expect(lineMg("propentofylline", "chien", 10)).toBe("vide");
  });

  it("une molécule hors des 24 garde l'ancien analyseur", () => {
    expect(referencePrefill("meloxicam", "chien", 10)).toBeNull();
  });

  it("équipe rouge : la ligne est remplie si et seulement si le panneau donne une dose, et avec la même valeur", () => {
    const species = [
      "chien",
      "chat",
      "bovins",
      "equins",
      "porcins",
      "ovins",
      "lapin",
      "nac",
      "Porc",
      "",
      null,
    ];
    const weights = [
      undefined,
      Number.NaN,
      -1,
      0,
      0.0001,
      0.29,
      0.3,
      0.8,
      0.9999,
      1,
      1.0001,
      3,
      3.3,
      3.9999,
      4,
      4.0001,
      4.5,
      10,
      10.9999,
      11,
      11.0001,
      12,
      15,
      15.0001,
      30,
      99,
      100,
      100.1,
      500,
      1e6,
      Number.POSITIVE_INFINITY,
    ];
    let cases = 0;
    for (const id of ids) {
      for (const sp of species) {
        for (const weight of weights) {
          cases += 1;
          const panel = validatedDose(id, sp, weight);
          const line = lineMg(id, sp, weight);
          const label = `${id} ${sp} ${weight}`;
          expect(panel, label).not.toBeNull();
          if (panel!.kind === "refus") {
            expect(line, label).toBe("vide");
            continue;
          }
          expect(line, label).not.toBe("vide");
          // Le panneau arrondit à trois décimales, la ligne garde la valeur exacte.
          const toMg = panel!.unit === "µg" ? 1 / 1000 : 1;
          const { min, max } = line as { min: number; max: number };
          expect(Math.abs(min - panel!.min * toMg), label).toBeLessThanOrEqual(
            5e-4 * toMg + 1e-12
          );
          expect(Math.abs(max - panel!.max * toMg), label).toBeLessThanOrEqual(
            5e-4 * toMg + 1e-12
          );
        }
      }
    }
    expect(cases).toBe(24 * 11 * 31);
  });

  it("une ligne vide ne calcule pas « 0 mg », ni à l'écran ni sur l'ordonnance imprimée", () => {
    expect(
      computeDose({ min: 0, max: 0, unit: "mg/kg", range: false }, 10)
        .computedMg
    ).toBeUndefined();
  });

  it("les petites doses gardent leur précision à l'impression", () => {
    expect(formatNumber(0.015)).toBe("0.015");
    expect(formatNumber(0.0279)).toBe("0.0279");
    expect(formatNumber(0.05)).toBe("0.05");
    expect(formatNumber(16.5)).toBe("16.5");
    expect(formatNumber(2.125 * 3)).toBe("6.38");
    expect(formatNumber(0)).toBe("0");
  });
});

describe("la ligne de la référence suit le poids tant que le vétérinaire ne la retouche pas", () => {
  const line = (weight: number | undefined) => ({
    medicationId: "nitenpyrame",
    referenceDose: true,
    ...referenceLineFields("nitenpyrame", "chien", weight)!,
  });

  it("Capstar ajouté avant le poids : vide, rempli à 10 kg, vidé à 12 kg", () => {
    const added = line(undefined);
    expect(added).toMatchObject({ dosagePerKg: 0 });
    const at10 = followReferenceDose(added, "chien", 10);
    expect(at10).toMatchObject({ dosagePerKg: 11.4, dosageUnit: "mg/tot" });
    expect(followReferenceDose(at10, "chien", 12)).toMatchObject({
      dosagePerKg: 0,
    });
  });

  it("une dose retouchée par le vétérinaire ne bouge plus", () => {
    const edited = { ...line(10), dosagePerKg: 11, referenceDose: false };
    expect(followReferenceDose(edited, "chien", 25)).toBe(edited);
  });

  it("Glucantime ajouté à 10 kg : dose vide ; une molécule hors référence : rien", () => {
    expect(
      referenceLineFields("antimoniate-de-meglumine", "chien", 10)
    ).toEqual({
      dosagePerKg: 0,
      dosageMin: undefined,
      dosageMax: undefined,
      dosageUnit: "mg/kg",
    });
    expect(referenceLineFields("meloxicam", "chien", 10)).toBeNull();
  });
});
