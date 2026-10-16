export const CARE_TYPES = [
  "medicament",
  "perfusion",
  "controle",
  "sortie",
  "autre",
] as const;
export type CareType = (typeof CARE_TYPES)[number];
export type CareStatus = "a_faire" | "en_cours" | "fait" | "annule";
export type CareDisplayStatus = CareStatus | "en_retard";
export interface CareTask {
  id: string;
  patient_id: string;
  label: string;
  type: CareType;
  heure_prevue: string;
  statut: CareStatus;
  execute_par: string | null;
  produit_id: string | null;
  /** Physical quantity in the product's stock unit, unrelated to clinical dosage. */
  produit_quantite?: number;
  note: string;
  motif_annulation: string | null;
  recurrence: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  completion_revision?: number;
}
export function careCompletionKey(taskId: string, revision = 0): string {
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("Ce soin vient d’être modifié. Actualisez la vue.");
  return revision === 0 ? taskId : `${taskId}:validation:${revision}`;
}
export function careInvoiceId(taskId: string, revision = 0): string {
  return `care-invoice:${careCompletionKey(taskId, revision)}`;
}
export interface CareHistory {
  id: string;
  task_id: string;
  from_status: CareStatus | null;
  to_status: CareStatus;
  author_id: string;
  changed_at: string;
  reason: string | null;
}
export function careDisplayStatus(
  task: Pick<CareTask, "statut" | "heure_prevue">,
  now = new Date()
): CareDisplayStatus {
  return (task.statut === "a_faire" || task.statut === "en_cours") &&
    new Date(task.heure_prevue).getTime() < now.getTime()
    ? "en_retard"
    : task.statut;
}
export function assertCareTransition(
  from: CareStatus,
  to: CareStatus,
  author: string,
  reason?: string
) {
  if (!author.trim()) throw new Error("Un utilisateur connecté est requis.");
  const allowed: Record<CareStatus, readonly CareStatus[]> = {
    a_faire: ["en_cours", "fait", "annule"],
    en_cours: ["fait", "annule"],
    fait: [],
    annule: [],
  };
  if (!allowed[from].includes(to))
    throw new Error("Ce changement de statut n’est pas autorisé.");
  if (to === "annule" && !reason?.trim())
    throw new Error("Indiquez le motif de l’annulation.");
}
export interface CareSuggestion {
  label: string;
  type: CareType;
  note: string;
}
/** Deterministic, verbatim candidates. Scheduling and confirmation remain human. */
export function suggestCareTasksFromPlan(plan: string): CareSuggestion[] {
  return plan
    .split(/\n+|(?<=[.!?])\s+/u)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((label) => ({
      label,
      type: /perfusion|fluidoth[eé]rapie/iu.test(label)
        ? "perfusion"
        : /sortie|retour [àa] domicile/iu.test(label)
          ? "sortie"
          : /contr[oô]le|surveill|temp[eé]rature|pes[eé]e/iu.test(label)
            ? "controle"
            : /m[eé]dicament|antibiotique|administr|traitement|injection/iu.test(
                  label
                )
              ? "medicament"
              : "autre",
      note: "",
    }));
}
/** Future assistant suggestion adapter. V1 never invokes a model automatically. */
export interface CareSuggestionProvider {
  suggest(plan: string, patientId: string): Promise<CareSuggestion[]>;
}
