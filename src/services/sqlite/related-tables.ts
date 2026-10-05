// Foreign-key cascades and SET NULL may change descendants without going
// through their repositories. Keep warm snapshots coherent after a delete.
const children: Record<string, readonly string[]> = {
  owners: [
    "patients",
    "appointments",
    "consultation_documents",
    "consultation_soaps",
    "prescriptions",
  ],
  patients: [
    "appointments",
    "tasks",
    "notes",
    "consultation_documents",
    "weight_entries",
    "vaccinations",
    "consultation_soaps",
    "prescriptions",
    "hospitalizations",
    "anesthesia_sheets",
    "invoices",
  ],
  appointments: [
    "consultation_documents",
    "consultation_soaps",
    "prescriptions",
    "anesthesia_sheets",
    "hospitalizations",
    "appointment_recurrences",
    "reminders",
    "invoices",
  ],
  users: [
    "sessions",
    "appointments",
    "notes",
    "tasks",
    "weight_entries",
    "vaccinations",
    "consultation_documents",
    "consultation_soaps",
    "prescriptions",
    "hospitalizations",
    "hospitalization_vitals",
    "anesthesia_sheets",
    "anesthesia_drug_log",
  ],
  prescriptions: ["prescription_items"],
  hospitalizations: ["hospitalization_vitals", "anesthesia_sheets"],
  anesthesia_sheets: ["anesthesia_drug_log", "anesthesia_monitoring"],
  products: ["invoice_lines"],
};

export function tablesAffectedByDelete(table: string): string[] {
  const visited = new Set([table]);
  const affected: string[] = [];
  const visit = (parent: string) => {
    for (const child of children[parent] ?? []) {
      if (visited.has(child)) continue;
      visited.add(child);
      affected.push(child);
      visit(child);
    }
  };
  visit(table);
  return affected;
}
