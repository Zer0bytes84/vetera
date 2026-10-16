import { emitSQLiteDataChanged } from "@/hooks/useSQLite";
import { generateId, runDbRead, runDbTransaction } from "@/services/sqlite/database";
import { consumeConsultationProductInDatabase, dispensePrescriptionInDatabase, type ClinicalStockUse, type ClinicalUseInput, type Dispensation, type DispensingInput } from "./clinical-stock-store";

function changed() {
  if (typeof window === "undefined") return;
  for (const table of ["products", "stock_movements", "prescriptions", "invoices"]) emitSQLiteDataChanged(table);
  window.dispatchEvent(new Event("clinical-stock-changed"));
}

export const clinicalStockService = {
  async useProduct(input: ClinicalUseInput) {
    const result = await runDbTransaction(db => consumeConsultationProductInDatabase(db, input, generateId, new Date().toISOString()), "IMMEDIATE");
    changed();
    return result;
  },
  async dispense(input: DispensingInput) {
    const result = await runDbTransaction(db => dispensePrescriptionInDatabase(db, input, generateId, new Date().toISOString()), "IMMEDIATE");
    changed();
    return result;
  },
  uses(appointmentId: string) {
    return runDbRead(db => db.select<ClinicalStockUse[]>("SELECT u.*,p.name AS product_name,p.unit FROM clinical_stock_uses u JOIN products p ON p.id=u.product_id WHERE u.appointment_id=? ORDER BY u.created_at,u.id", [appointmentId]));
  },
  async dispensation(prescriptionId: string) {
    return runDbRead(async db => (await db.select<Dispensation[]>("SELECT * FROM prescription_dispensations WHERE prescription_id=?", [prescriptionId]))[0] ?? null);
  },
};
