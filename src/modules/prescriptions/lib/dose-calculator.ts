/**
 * Calcul de dose vétérinaire — fonctions pures.
 *
 * Le calculateur accepte une posologie textuelle (ex: "10-20 mg/kg", "5 mg",
 * "0.5 mL/kg") et un poids en kg, et renvoie la dose calculée (mg / mL) et
 * la plage posologique. La fonction est tolérante aux espaces, aux virgules
 * décimales françaises et aux unités communes.
 *
 * Unités supportées :
 *   - mg/kg   : mg par kg de poids corporel
 *   - mg/tot  : mg total (indépendant du poids)
 *   - mL/kg   : mL par kg de poids corporel
 *   - UI/kg   : UI par kg
 *   - cp/kg   : comprimés par kg (rare)
 *
 * Le parser est volontairement permissif car les posologies sont souvent
 * écrites "à la main" dans la base de connaissances. Toute chaîne non
 * reconnue retourne `null` plutôt que de lancer.
 */

import type { PrescriptionDosageUnit } from "@/types/db";

export type DoseUnit = PrescriptionDosageUnit | string;

export interface ParsedPosology {
  /** Borne haute (idem) */
  max: number;
  /** Borne basse (en unité de `unit`, ex. 10 mg/kg) */
  min: number;
  /** Si intervalle (min != max) */
  range: boolean;
  /** Unité reconnue */
  unit: DoseUnit;
}

export interface DoseComputation {
  /** Dose totale calculée (mg), si calculable */
  computedMg?: number;
  /** Volume calculé (mL), si concentration fournie */
  computedMl?: number;
  /** Erreur éventuelle (parsing) */
  error?: string;
  max: number;
  min: number;
  range: boolean;
  /** Texte original (debug / affichage) */
  raw: string;
  unit: DoseUnit;
}

const NUMBER = "\\d+(?:[.,]\\d+)?";
const UNIT_ALT =
  "(mg/kg|mg\\/kg|mg\\s*\\/\\s*kg|mg/mL|mg\\/mL|mg\\s*\\/\\s*mL|mg|UI/kg|UI\\/kg|mL/kg|mL\\/kg|mL|cp/kg|cp\\/kg)";

/**
 * Parse une posologie textuelle.
 * Exemples acceptés : "10-20 mg/kg", "10 mg/kg", "5 mg", "0.5 mL/kg",
 *                     "20 mg / kg", "10–20 mg/kg" (tiret en dash).
 */
export function parsePosology(input: string): ParsedPosology | null {
  if (!input) {
    return null;
  }
  const text = input.trim().toLowerCase().replace(/\s+/g, " ");

  // 1. Intervalle : "min-max unit"
  const rangeMatch = text.match(
    new RegExp(`^(${NUMBER})\\s*[–-]\\s*(${NUMBER})\\s*${UNIT_ALT}$`)
  );
  if (rangeMatch) {
    return {
      unit: rangeMatch[3].replace(/\s/g, ""),
      min: toNumber(rangeMatch[1]),
      max: toNumber(rangeMatch[2]),
      range: true,
    };
  }

  // 2. Valeur unique : "val unit"
  const singleMatch = text.match(new RegExp(`^(${NUMBER})\\s*${UNIT_ALT}$`));
  if (singleMatch) {
    return {
      unit: singleMatch[2].replace(/\s/g, ""),
      min: toNumber(singleMatch[1]),
      max: toNumber(singleMatch[1]),
      range: false,
    };
  }

  return null;
}

function toNumber(raw: string): number {
  return Number.parseFloat(raw.replace(",", "."));
}

/**
 * Calcule la dose en mg / mL à partir d'une posologie parsée et d'un poids.
 *
 * @param parsed    Posologie parsée
 * @param weightKg  Poids du patient en kg
 * @param concentrationMgPerMl  Concentration de la spécialité (mg/mL)
 *                              pour convertir mg → mL
 */
export function computeDose(
  parsed: ParsedPosology,
  weightKg: number | undefined,
  concentrationMgPerMl?: number
): DoseComputation {
  const base: DoseComputation = {
    unit: parsed.unit,
    min: parsed.min,
    max: parsed.max,
    range: parsed.range,
    raw: `${parsed.min}${parsed.range ? `-${parsed.max}` : ""} ${parsed.unit}`,
  };

  if (!weightKg || weightKg <= 0) {
    return base;
  }

  // mg total (mg/kg → mg en multipliant par le poids)
  if (parsed.unit === "mg/kg") {
    base.computedMg = parsed.min * weightKg;
    if (concentrationMgPerMl && concentrationMgPerMl > 0) {
      base.computedMl = base.computedMg / concentrationMgPerMl;
    }
    return base;
  }

  // mL/kg → mL total
  if (parsed.unit === "mL/kg") {
    base.computedMl = parsed.min * weightKg;
    if (concentrationMgPerMl && concentrationMgPerMl > 0) {
      base.computedMg = base.computedMl * concentrationMgPerMl;
    }
    return base;
  }

  // mg/tot → on garde tel quel
  if (parsed.unit === "mg" || parsed.unit === "mg/tot") {
    base.computedMg = parsed.min;
    if (concentrationMgPerMl && concentrationMgPerMl > 0) {
      base.computedMl = base.computedMg / concentrationMgPerMl;
    }
    return base;
  }

  // UI/kg, cp/kg : on conserve la valeur mais on ne convertit pas.
  return base;
}

/**
 * Formate une dose calculée en chaîne lisible : "15 mg · 0.6 mL".
 */
export function formatComputedDose(computation: DoseComputation): string {
  const parts: string[] = [];
  if (computation.computedMg != null) {
    parts.push(`${formatNumber(computation.computedMg)} mg`);
  }
  if (computation.computedMl != null) {
    parts.push(`${formatNumber(computation.computedMl)} mL`);
  }
  if (parts.length === 0) {
    return computation.raw;
  }
  return parts.join(" · ");
}

/**
 * Formate un nombre avec 2 décimales max et suppression des zéros inutiles.
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  const fixed = value.toFixed(2);
  return fixed.replace(/\.?0+$/, "");
}
