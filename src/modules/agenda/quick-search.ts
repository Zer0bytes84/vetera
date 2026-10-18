/**
 * Quick search of the appointment dialog: every word of the query must appear
 * in the dossier, in any order. Selecting a dossier writes "patient + owner"
 * into the field, and species or breed sit between those words in the index.
 */
export function matchesEveryWord(searchIndex: string, query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  const index = searchIndex.toLowerCase();
  return words.every((word) => index.includes(word));
}
