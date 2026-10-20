/**
 * Quick search of the appointment dialog: every word of the query must appear
 * in the dossier, in any order. Selecting a dossier writes "patient + owner"
 * into the field, and species or breed sit between those words in the index.
 */
/**
 * Text written into the quick search when a dossier is selected: the
 * patient's name and the owner's real names only. A placeholder such as
 * "Propriétaire non lié" would never match the index and hid the dossier.
 */
export function selectedDossierSearchLabel(
  patientName: string,
  owner?: { firstName?: string | null; lastName?: string | null } | null
) {
  return [patientName, owner?.firstName, owner?.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

export function matchesEveryWord(searchIndex: string, query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  const index = searchIndex.toLowerCase();
  return words.every((word) => index.includes(word));
}

export interface DossierMatch<P, O> {
  owner?: O;
  patient: P;
  searchIndex: string;
}

/** Dossiers whose patient or owner holds every word of the query, at most `limit`. */
export function findDossiers<
  P extends { breed?: string | null; name: string; ownerId: string; species: string },
  O extends { email?: string | null; firstName?: string | null; lastName?: string | null; phone?: string | null },
>(patients: readonly P[], ownersById: ReadonlyMap<string, O>, query: string, limit = 8): DossierMatch<P, O>[] {
  if (!query.trim()) return [];
  return patients
    .map((patient) => {
      const owner = ownersById.get(patient.ownerId);
      const searchIndex = [
        patient.name,
        patient.species,
        patient.breed,
        owner?.firstName,
        owner?.lastName,
        owner?.phone,
        owner?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return { owner, patient, searchIndex };
    })
    .filter((entry) => matchesEveryWord(entry.searchIndex, query))
    .slice(0, limit);
}
