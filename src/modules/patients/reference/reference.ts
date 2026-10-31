/** « ID-0011 »: the prefix, a dash, the number padded to four digits at least. */
export function formatPatientReference(sequenceNumber: number) {
  return `ID-${String(sequenceNumber).padStart(4, "0")}`;
}

/**
 * Reads what was typed as a patient reference: « ID-0011 », « ID0011 »,
 * « id 11 » or « 0011 ». Bare digits count only when padded to four digits,
 * so that a phone or chip fragment such as « 11 » is not taken for one.
 */
export function patientReferenceNumber(query: string) {
  const match = /^\s*(?:(id)[\s-]*)?(\d+)\s*$/i.exec(query);
  if (!match || (!match[1] && match[2].length < 4)) {
    return null;
  }
  const value = Number(match[2]);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

/** True when the query designates exactly this reference. */
export function matchesPatientReference(reference: string | undefined, query: string) {
  const typed = patientReferenceNumber(query);
  const stored = reference ? patientReferenceNumber(reference) : null;
  return typed !== null && typed === stored;
}

/**
 * Patients read with their reference. The reference lives in its own table,
 * so the patients table itself is never touched.
 */
export const PATIENTS_WITH_REFERENCE_SQL =
  "SELECT patients.*, patient_references.reference AS reference FROM patients LEFT JOIN patient_references ON patient_references.patient_id = patients.id";

/**
 * Text a search index holds for a reference, so that « ID-0011 », « ID0011 »
 * and « 0011 » all find it with a plain substring match.
 */
export function patientReferenceSearchText(reference: string | undefined) {
  return reference ? `${reference} ${reference.replace("-", "")}` : "";
}

/** The patient as printed on a document: « Rex · ID-0011 ». */
export function patientDocumentName(patient: { name: string; reference?: string }) {
  return patient.reference ? `${patient.name} · ${patient.reference}` : patient.name;
}
