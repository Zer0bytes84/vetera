/**
 * Wrapper léger autour de `vetKnowledgeService` pour l'UI ordonnance.
 *
 * But : exposer une API stable et typée, facile à consommer depuis les
 * composants React (recherche fuzzy, filtre par espèce, normalisation des
 * posologies).
 *
 * Ne PAS muter `vetKnowledgeService` : tout passe par des copies légères.
 */

import { vetKnowledgeService } from "@/services/vetKnowledgeService";
import type { Medication } from "@/services/vetKnowledgeService";

import { parsePosology } from "./dose-calculator";

export type SpeciesKey =
  | "chien"
  | "chat"
  | "bovins"
  | "ovins"
  | "equins"
  | "lapin";

const SPECIES_LABEL_FR: Record<SpeciesKey, string> = {
  chien: "Chien",
  chat: "Chat",
  bovins: "Bovins",
  ovins: "Ovins",
  equins: "Équins",
  lapin: "Lapin",
};

const SPECIES_LABEL_EN: Record<SpeciesKey, string> = {
  chien: "Dog",
  chat: "Cat",
  bovins: "Cattle",
  ovins: "Sheep",
  equins: "Horse",
  lapin: "Rabbit",
};

/** Mapping species Patient → clé catalogue (best-effort). */
export function patientSpeciesToCatalogKey(
  species: string | undefined
): SpeciesKey | null {
  if (!species) return null;
  const normalized = species.toLowerCase().trim();
  if (normalized.startsWith("chien") || normalized === "dog") return "chien";
  if (normalized.startsWith("chat") || normalized === "cat") return "chat";
  if (normalized.startsWith("bovin")) return "bovins";
  if (normalized.startsWith("ovin")) return "ovins";
  if (
    normalized.startsWith("cheval") ||
    normalized.startsWith("equin") ||
    normalized === "horse"
  ) {
    return "equins";
  }
  if (normalized.startsWith("lapin") || normalized === "rabbit") {
    return "lapin";
  }
  return null;
}

export function speciesLabel(
  key: SpeciesKey,
  language: "fr" | "en" = "fr"
): string {
  return language === "fr" ? SPECIES_LABEL_FR[key] : SPECIES_LABEL_EN[key];
}

export interface MedicationSearchResult extends Medication {
  /** Posologie résolue pour l'espèce du patient (texte original). */
  posologyForSpecies?: string;
  /** Voie d'administration préférée pour l'espèce. */
  routeForSpecies?: string;
  /** Durée recommandée pour l'espèce. */
  durationForSpecies?: string;
  /** Fréquence recommandée pour l'espèce. */
  frequencyForSpecies?: string;
  /** true si la posologie est parsable en mg/kg. */
  hasComputableDose: boolean;
}

/**
 * Liste les médicaments disponibles, enrichis d'une posologie par espèce
 * si possible.
 */
export function listMedications(speciesKey?: SpeciesKey | null): MedicationSearchResult[] {
  return vetKnowledgeService.medications.map((med) => {
    const poso = speciesKey ? med.posologies?.[speciesKey] : undefined;
    const parsed = poso ? parsePosology(poso.dose) : null;
    return {
      ...med,
      posologyForSpecies: poso?.dose,
      routeForSpecies: poso?.voie,
      durationForSpecies: poso?.duree,
      frequencyForSpecies: poso?.frequence,
      hasComputableDose: Boolean(parsed),
    };
  });
}

/**
 * Recherche fuzzy dans le catalogue.
 *
 * Match sur : nom, nom commercial (1er), classe, indications.
 * Tri : meilleur match en premier (par longueur du terme matched).
 */
export function searchMedications(
  query: string,
  speciesKey?: SpeciesKey | null
): MedicationSearchResult[] {
  const term = query.trim().toLowerCase();
  if (!term) return listMedications(speciesKey);

  const candidates = listMedications(speciesKey);
  const scored = candidates
    .map((med) => {
      const haystack = [
        med.nom,
        med.nomCommercial?.[0] ?? "",
        med.classe,
        ...(med.indications ?? []),
      ]
        .join(" ")
        .toLowerCase();
      const index = haystack.indexOf(term);
      if (index < 0) return null;
      return { med, score: index };
    })
    .filter((entry): entry is { med: MedicationSearchResult; score: number } =>
      Boolean(entry)
    );

  scored.sort((a, b) => a.score - b.score);
  return scored.map((entry) => entry.med);
}

/**
 * Récupère un médicament par son id (typiquement depuis l'ordonnance).
 */
export function getMedicationById(
  id: string
): MedicationSearchResult | null {
  const med = vetKnowledgeService.medications.find((m) => m.id === id);
  if (!med) return null;
  return {
    ...med,
    hasComputableDose: false,
  };
}
