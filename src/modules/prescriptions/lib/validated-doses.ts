/**
 * The dose reference Aïssa read and found correct (19 November 2026, port from the agent harness): 24 molecules from
 * the ANMV's RCP, the form of 9 and 10 November, read from its PDF into doses-validees-aissa.json.
 *
 * A catalogue molecule is « validée » only while its posology lines are, field for field, the ones of that reference
 * (dose, route, frequency, duration, warning): a later edit of the catalogue makes it unvalidated again, molecule by
 * molecule. For a validated line the screen shows the dose for the patient's weight, the route, frequency and duration,
 * and the reference's warning word for word. No dose is given outside a weight band the reference states, for a
 * weight that cannot be an animal's, or for a dose the reference does not write as a number (« 5 fois la dose de
 * médétomidine »): the reason is said instead, with the reference's own text.
 */

import reference from "@/data/vet-knowledge/doses-validees-aissa.json";
import rcp from "@/data/vet-knowledge/medications-rcp.json";

interface Line {
  dose: string;
  voie?: string;
  frequence?: string;
  duree?: string;
  attention?: string;
  attendu:
    | { min: number; max: number; unite: "mg/kg" | "µg/kg" | "mg" }
    | "REFUS";
}
interface ReferenceMolecule {
  nom: string;
  noms_commerciaux: string[];
  especes: Record<string, Line>;
  sources: string[];
}
interface CatalogueMolecule {
  id: string;
  nom: string;
  nomCommercial?: string[];
  posologies: Record<
    string,
    {
      dose: string;
      voie?: string;
      frequence?: string;
      duree?: string;
      attention?: string;
    }
  >;
  sources?: { titre: string }[];
}

const REFERENCE = reference as unknown as {
  validation: { par: string; le: string; comment: string };
  molecules: ReferenceMolecule[];
};
const CATALOGUE = (rcp as unknown as { rcpMedications: CatalogueMolecule[] })
  .rcpMedications;

export const VALIDATION = REFERENCE.validation;

/** The weight bands the reference states in words, each with its sentence (checked word for word by the tests). */
export const WEIGHT_BANDS: {
  molecule: string;
  espece: string;
  min: number | null;
  minIncluded: boolean;
  max: number | null;
  texte: string;
}[] = [
  {
    molecule: "nitenpyrame",
    espece: "chien",
    min: 1,
    minIncluded: true,
    max: 11,
    texte: "par animal de 1 à 11 kg",
  },
  {
    molecule: "nitenpyrame",
    espece: "chat",
    min: 1,
    minIncluded: true,
    max: 11,
    texte: "par chat de 1 à 11 kg",
  },
  {
    molecule: "imidapril",
    espece: "chien",
    min: 4,
    minIncluded: false,
    max: null,
    texte: "chiens de plus de 4 kg",
  },
];

/** Plausible weights, a guard against a typing error (« 1000 » for « 10 »), not a reference value: to confirm by a vet. */
export const PLAUSIBLE_WEIGHT_KG: Record<string, [number, number]> = {
  chien: [0.3, 100],
  chat: [0.3, 15],
  bovins: [20, 1500],
  equins: [50, 1200],
  porcins: [1, 400],
};

const same = (a?: string, b?: string) =>
  (a ?? "").replace(/\s+/g, " ").trim() ===
  (b ?? "").replace(/\s+/g, " ").trim();

/** Is this catalogue molecule, as shipped today, the one Aïssa read? The list of differences (empty: yes). */
export function differencesFromReference(
  medicationId: string
): string[] | null {
  const medication = CATALOGUE.find((item) => item.id === medicationId);
  if (!medication) {
    return null;
  }
  const ref = REFERENCE.molecules.find((item) => item.nom === medication.nom);
  if (!ref) {
    return ["absente de la référence"];
  }
  const out: string[] = [];
  if (
    JSON.stringify(medication.nomCommercial ?? []) !==
    JSON.stringify(ref.noms_commerciaux)
  ) {
    out.push("noms commerciaux");
  }
  if (
    JSON.stringify(Object.keys(medication.posologies).sort()) !==
    JSON.stringify(Object.keys(ref.especes).sort())
  ) {
    out.push("espèces");
  }
  for (const [species, line] of Object.entries(medication.posologies)) {
    const expected = ref.especes[species];
    if (!expected) {
      continue;
    }
    for (const field of [
      "dose",
      "voie",
      "frequence",
      "duree",
      "attention",
    ] as const) {
      if (!same(line[field], expected[field])) {
        out.push(`${species}.${field}`);
      }
    }
  }
  return out;
}

export type ValidatedDose =
  | {
      kind: "dose";
      min: number;
      max: number;
      unit: "mg" | "µg";
      calcul: string;
      line: Line;
      sources: string[];
      molecule: string;
    }
  | {
      kind: "refus";
      reason: string;
      line: Line | null;
      sources: string[];
      molecule: string;
    };

const round = (value: number) => Math.round(value * 1000) / 1000;

const SPECIES_LABELS: Record<string, string> = {
  chien: "chien",
  chat: "chat",
  bovins: "bovins",
  equins: "équins",
  ovins: "ovins",
  caprins: "caprins",
  porcins: "porcins",
  lapin: "lapin",
  nac: "NAC",
};

/**
 * The validated dose of a catalogue molecule for a species and a weight, or why there is none. `null` when the molecule
 * is not in the validated reference (or no longer matches it): the screen then shows nothing new.
 */
export function validatedDose(
  medicationId: string | undefined,
  species: string | null,
  weightKg: number | undefined
): ValidatedDose | null {
  if (!medicationId) {
    return null;
  }
  const differences = differencesFromReference(medicationId);
  if (!differences || differences.length) {
    return null;
  }
  const medication = CATALOGUE.find((item) => item.id === medicationId)!;
  const ref = REFERENCE.molecules.find((item) => item.nom === medication.nom)!;
  // Every RCP of the reference (Tolfedine has its injectable and its two tablets): the first alone would cite the
  // injectable for an oral dose.
  const source = ref.sources;
  const name = medication.nom;
  // `null` also when the record's species is written in a way the catalogue does not recognise (« Porc », « Félin »).
  if (!species) {
    return {
      kind: "refus",
      reason:
        "L’espèce du patient n’est pas renseignée, ou n’est pas une espèce de la référence.",
      line: null,
      sources: source,
      molecule: name,
    };
  }
  const line = ref.especes[species] ?? null;
  if (!line) {
    return {
      kind: "refus",
      reason: `La référence validée n’a pas de ligne pour cette espèce (elle couvre : ${Object.keys(
        ref.especes
      )
        .map((key) => SPECIES_LABELS[key] ?? key)
        .join(", ")}).`,
      line: null,
      sources: source,
      molecule: name,
    };
  }
  if (line.attendu === "REFUS") {
    return {
      kind: "refus",
      reason:
        "La référence ne donne pas cette dose sous forme de nombre : lire le texte de la référence et le RCP.",
      line,
      sources: source,
      molecule: name,
    };
  }
  const fixed = line.attendu.unite === "mg";
  const band = WEIGHT_BANDS.find(
    (item) => item.molecule === medicationId && item.espece === species
  );
  // A fixed dose per animal needs no weight, unless the reference ties it to a weight band (Capstar).
  if (fixed && !band && weightKg === undefined) {
    return {
      kind: "dose",
      min: round(line.attendu.min),
      max: round(line.attendu.max),
      unit: "mg",
      calcul: `${line.dose} par animal`,
      line,
      sources: source,
      molecule: name,
    };
  }
  if (!(weightKg && weightKg > 0 && Number.isFinite(weightKg))) {
    return {
      kind: "refus",
      reason: "Le poids du patient manque : la dose dépend du poids.",
      line,
      sources: source,
      molecule: name,
    };
  }
  const plausible = PLAUSIBLE_WEIGHT_KG[species];
  if (plausible && (weightKg < plausible[0] || weightKg > plausible[1])) {
    return {
      kind: "refus",
      reason: `Un poids de ${weightKg} kg n’est pas vraisemblable pour cette espèce : vérifier la saisie.`,
      line,
      sources: source,
      molecule: name,
    };
  }
  if (band) {
    const below =
      band.min !== null &&
      (band.minIncluded ? weightKg < band.min : weightKg <= band.min);
    const above = band.max !== null && weightKg > band.max;
    if (below || above) {
      return {
        kind: "refus",
        reason: `La référence couvre ce produit « ${band.texte} » : aucune dose n’est donnée pour ${weightKg} kg.`,
        line,
        sources: source,
        molecule: name,
      };
    }
  }
  const factor = fixed ? 1 : weightKg;
  return {
    kind: "dose",
    min: round(line.attendu.min * factor),
    max: round(line.attendu.max * factor),
    unit: line.attendu.unite === "µg/kg" ? "µg" : "mg",
    calcul: fixed ? `${line.dose} par animal` : `${line.dose} × ${weightKg} kg`,
    line,
    sources: source,
    molecule: name,
  };
}

/** The dose a prescription line is prefilled with, in the line's own units (mg/kg or mg per animal). */
export interface ReferenceLineDose {
  min: number;
  max: number;
  unit: "mg/kg" | "mg/tot";
}

/**
 * What a new prescription line of a validated molecule is prefilled with, so that the line never says another thing
 * than the reference panel above it (19 November bilan, § 4: Glucantime, Capstar, Prilium, Galastop…).
 *
 * - `null`: the molecule is not one of the validated reference (or no longer matches it). The older catalogue parser
 *   keeps prefilling the line.
 * - `{ dose: null }`: the reference gives no dose for this case (dose not written as a number, weight outside the
 *   reference's band, weight missing or not plausible, species without a line). The line is left empty for the vet.
 * - `{ dose }`: the reference's dose, a µg/kg dose written in mg/kg (the line has no µg unit), a fixed dose per animal
 *   as « mg/tot ».
 *
 * It follows `validatedDose` exactly: the line is filled when, and only when, the panel shows a dose.
 */
export function referencePrefill(
  medicationId: string | undefined,
  species: string | null,
  weightKg: number | undefined
): { dose: ReferenceLineDose | null } | null {
  const result = validatedDose(medicationId, species, weightKg);
  if (!result) {
    return null;
  }
  if (result.kind === "refus" || result.line.attendu === "REFUS") {
    return { dose: null };
  }
  const expected = result.line.attendu;
  if (expected.unite === "mg") {
    return { dose: { min: expected.min, max: expected.max, unit: "mg/tot" } };
  }
  // 5 µg/kg is 0.005 mg/kg: the precision is kept, the floating point noise is not.
  const scale = expected.unite === "µg/kg" ? 1 / 1000 : 1;
  const exact = (value: number) => Number((value * scale).toPrecision(12));
  return {
    dose: { min: exact(expected.min), max: exact(expected.max), unit: "mg/kg" },
  };
}
