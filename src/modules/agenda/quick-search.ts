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
