/**
 * Lecture par patient des tables d'un dossier. Un écran de dossier n'a besoin que des lignes de son patient : il les lit
 * avec `WHERE patient_id = ?` au lieu de relire la table entière, dont le coût croît avec toute la clinique.
 * Seules les tables qui portent une colonne `patient_id` sont concernées ; une autre table demandée avec un patient
 * reste lue entière.
 */
export const PATIENT_SCOPED_TABLES: ReadonlySet<string> = new Set([
  "appointments",
  "consultation_documents",
  "consultation_soaps",
  "hospitalizations",
  "anesthesia_sheets",
  "notes",
  "prescriptions",
  "tasks",
  "vaccinations",
  "weight_entries",
]);

/** Où vivent les lignes d'une lecture : la table entière, ou les lignes d'un seul patient. */
export interface CacheTarget {
  /** Clé du cache : le nom de la table, ou la table suivie du patient. */
  key: string;
  patientId?: string;
  table: string;
}

export function cacheTarget(table: string, patientId?: string): CacheTarget {
  if (patientId && PATIENT_SCOPED_TABLES.has(table)) {
    return { key: `${table}@patient:${patientId}`, patientId, table };
  }
  return { key: table, table };
}

/** La requête d'une lecture par patient ; son seul paramètre est l'identifiant du patient. */
export const patientScopedReadSql = (table: string) =>
  `SELECT * FROM ${table} WHERE patient_id = ?`;

/** Une ligne telle que les dépôts la tiennent (clés en camelCase) appartient-elle à cette lecture ? */
export const rowInTarget = (
  target: CacheTarget,
  row: Readonly<Record<string, unknown>>
) => target.patientId === undefined || row.patientId === target.patientId;
