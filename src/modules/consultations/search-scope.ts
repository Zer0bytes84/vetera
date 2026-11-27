/**
 * The scope of a « Cas similaires » search, said in words: on a patient's record the search starts on that record
 * only, and an empty answer must say so, with what the other records hold, instead of looking like a failure.
 */
export interface OutsideMatches {
  capped: boolean;
  patients: number;
  results: number;
}

export function patientScopeLabel(patientName: string | null) {
  return patientName ? `Dossier de ${patientName}` : "Ce dossier";
}

/** The answer when nothing was found in the patient's record. */
export function emptyPatientScopeMessage(
  patientName: string | null,
  query: string,
  outside: OutsideMatches | null
) {
  const where = patientName ? `le dossier de ${patientName}` : "ce dossier";
  const head = `Rien dans ${where} pour « ${query} » : la recherche est limitée à ce dossier.`;
  if (!outside) {
    return `${head} Elle peut chercher dans tous les dossiers.`;
  }
  if (!outside.results) {
    return `${head} La recherche par mots ne trouve rien non plus dans les autres dossiers ; la recherche par le sens peut encore y trouver des cas proches.`;
  }
  const results = `${outside.results}${outside.capped ? " ou plus" : ""} résultat${outside.results > 1 ? "s" : ""}`;
  const records = `${outside.patients} autre${outside.patients > 1 ? "s" : ""} dossier${outside.patients > 1 ? "s" : ""}`;
  return `${head} ${results} par mots dans ${records}.`;
}
