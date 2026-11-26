/**
 * The dose of a prescription line whose molecule is one of the 24 of the validated reference (Aïssa, 18 November
 * 2026): the reference's dose for the weight, or an empty dose where the reference gives none. The line never says
 * another thing than the reference panel above it.
 */

import type { PrescriptionItem } from "@/types/db";
import { referencePrefill } from "./validated-doses";

export interface LineDoseFields {
  dosageMax?: number;
  dosageMin?: number;
  dosagePerKg: number;
  dosageUnit: PrescriptionItem["dosageUnit"];
}

/** The line's dose fields from the reference, or `null` for a molecule outside it (the catalogue parser then applies). */
export function referenceLineFields(
  medicationId: string | undefined,
  species: string | null,
  weightKg: number | undefined
): LineDoseFields | null {
  const prefill = referencePrefill(medicationId, species, weightKg);
  if (!prefill) {
    return null;
  }
  const dose = prefill.dose;
  return dose
    ? {
        dosagePerKg: dose.min,
        dosageMin: dose.min,
        dosageMax: dose.max,
        dosageUnit: dose.unit,
      }
    : {
        dosagePerKg: 0,
        dosageMin: undefined,
        dosageMax: undefined,
        dosageUnit: "mg/kg",
      };
}

/**
 * A line prefilled from the reference and not edited by the vet (`referenceDose`) follows the weight: filled when the
 * weight enters the reference's band (Capstar from 1 to 11 kg, Prilium above 4 kg) or is entered at all, emptied when
 * it leaves it. A line the vet has edited is theirs and is returned unchanged.
 */
export function followReferenceDose<
  T extends LineDoseFields & { medicationId?: string; referenceDose?: boolean },
>(item: T, species: string | null, weightKg: number | undefined): T {
  if (!item.referenceDose) {
    return item;
  }
  const fields = referenceLineFields(item.medicationId, species, weightKg);
  return fields ? { ...item, ...fields } : item;
}
