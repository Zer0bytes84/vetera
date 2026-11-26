import { describe, expect, it } from "vitest";
import reference from "@/data/vet-knowledge/doses-validees-aissa.json";
import rcp from "@/data/vet-knowledge/medications-rcp.json";
import {
  differencesFromReference,
  VALIDATION,
  validatedDose,
  WEIGHT_BANDS,
} from "@/modules/prescriptions/lib/validated-doses";

/**
 * The doses Aïssa read and found correct, in the product (19 November 2026, port from the agent harness, where the
 * same reference was replayed on 358 questions with no false positive).
 */
const molecules = (
  rcp as unknown as { rcpMedications: { id: string; nom: string }[] }
).rcpMedications;
const ref = reference as unknown as {
  molecules: {
    nom: string;
    especes: Record<string, { attention?: string; attendu: unknown }>;
  }[];
};

describe("doses validées par Aïssa dans le produit", () => {
  it("les 24 molécules du catalogue sont, champ pour champ, celles de la référence relue", () => {
    expect(ref.molecules).toHaveLength(24);
    for (const molecule of molecules) {
      expect(differencesFromReference(molecule.id), molecule.nom).toEqual([]);
    }
    expect(VALIDATION).toMatchObject({ par: "Aïssa", le: "2026-11-18" });
  });

  it("une molécule hors de la référence n'est pas dite validée", () => {
    expect(differencesFromReference("meloxicam")).toBeNull();
    expect(validatedDose("meloxicam", "chien", 10)).toBeNull();
  });

  it("la dose validée pour un poids : par kilo, fixe, en microgrammes", () => {
    expect(validatedDose("acide-tolfenamique", "chat", 4)).toMatchObject({
      kind: "dose",
      min: 16,
      max: 16,
      unit: "mg",
      calcul: "4 mg/kg × 4 kg",
    });
    expect(validatedDose("xylazine", "bovins", 500)).toMatchObject({
      kind: "dose",
      min: 25,
      max: 150,
    });
    expect(validatedDose("carbimazole", "chat", 4)).toMatchObject({
      kind: "dose",
      min: 15,
      max: 15,
      calcul: "15 mg par animal",
    });
    expect(validatedDose("cabergoline", "chien", 3.3)).toMatchObject({
      kind: "dose",
      min: 16.5,
      unit: "µg",
    });
  });

  it("la mise en garde de la référence vient avec la dose, mot pour mot", () => {
    const dose = validatedDose("acide-tolfenamique", "chat", 4);
    expect(dose?.line?.attention).toBe(
      "Ne pas utiliser la voie intramusculaire chez le chat."
    );
    const carbimazole = validatedDose("carbimazole", "chat", 4);
    expect(carbimazole?.line?.attention).toContain(
      "10 mg si la TT4 est entre 50 et 100 nmol/L"
    );
  });

  it("aucune dose hors de la tranche de poids que la référence écrit, et la raison est dite", () => {
    expect(validatedDose("nitenpyrame", "chien", 10)?.kind).toBe("dose");
    expect(validatedDose("nitenpyrame", "chien", 25)).toMatchObject({
      kind: "refus",
    });
    expect(validatedDose("nitenpyrame", "chat", 0.8)?.kind).toBe("refus");
    expect(validatedDose("imidapril", "chien", 4)?.kind).toBe("refus");
    expect(validatedDose("imidapril", "chien", 4.5)).toMatchObject({
      kind: "dose",
      min: 1.125,
    });
    for (const band of WEIGHT_BANDS) {
      const molecule = ref.molecules.find((item) =>
        item.nom.toLowerCase().startsWith(band.molecule.slice(0, 5))
      );
      expect(
        molecule?.especes[band.espece]?.attention,
        band.molecule
      ).toContain(band.texte);
    }
  });

  it("une dose que la référence n'écrit pas en nombre, une espèce sans ligne, un poids manquant ou invraisemblable : refus motivé", () => {
    for (const [id, species] of [
      ["atipamezole", "chien"],
      ["antimoniate-de-meglumine", "chien"],
      ["propentofylline", "chien"],
    ] as const) {
      const answer = validatedDose(id, species, 10);
      expect(answer?.kind, id).toBe("refus");
      expect(answer?.line?.dose, id).toBeTruthy();
    }
    expect(validatedDose("ketoprofene", "chien", 10)).toMatchObject({
      kind: "refus",
    });
    expect(
      validatedDose("acide-tolfenamique", "chien", undefined)
    ).toMatchObject({ kind: "refus" });
    expect(
      validatedDose("acide-tolfenamique", "chien", 1_000_000)
    ).toMatchObject({ kind: "refus" });
    expect(validatedDose("acide-tolfenamique", null, 10)).toMatchObject({
      kind: "refus",
    });
  });
});

describe("corrections de l'équipe rouge (19 novembre)", () => {
  it("une dose fixe par animal se donne sans poids, sauf si la référence la lie à une tranche de poids", () => {
    expect(validatedDose("carbimazole", "chat", undefined)).toMatchObject({
      kind: "dose",
      min: 15,
    });
    expect(validatedDose("nitenpyrame", "chat", undefined)?.kind).toBe("refus");
  });
  it("les raisons de refus disent l'espèce non reconnue et nomment les espèces en clair", () => {
    expect(validatedDose("acide-tolfenamique", null, 10)).toMatchObject({
      reason: expect.stringContaining("n’est pas une espèce de la référence"),
    });
    const answer = validatedDose("ketoprofene", "chien", 10);
    expect(answer?.kind === "refus" && answer.reason).toContain(
      "elle couvre :"
    );
  });
});
