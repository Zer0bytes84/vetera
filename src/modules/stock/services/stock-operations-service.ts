import { emitSQLiteDataChanged } from "@/hooks/useSQLite";
import { generateId, runDbRead, runDbTransaction } from "@/services/sqlite/database";
import { announceInventoryChanged } from "./inventory-service";
import { applyConsumptionThresholdInDatabase, barcodeProductInDatabase, barcodeStockOperationInDatabase, saveBarcodeInDatabase,
  saveLocationInDatabase, stockOperationsSnapshotInDatabase, transferStockInDatabase, type BarcodeOperationInput, type TransferInput } from "./stock-operations-store";

function changed() {
  announceInventoryChanged();
  if (typeof window !== "undefined") for (const table of ["product_barcodes", "stock_transfers"]) emitSQLiteDataChanged(table);
}
export const stockOperationsService = {
  snapshot: () => runDbRead(db => stockOperationsSnapshotInDatabase(db, new Date().toISOString())),
  lookup: (code: string) => runDbRead(db => barcodeProductInDatabase(db, code)),
  async barcode(input: Parameters<typeof saveBarcodeInDatabase>[1]) {
    const result = await runDbTransaction(db => saveBarcodeInDatabase(db, input, new Date().toISOString()), "IMMEDIATE");
    changed(); return result;
  },
  async removeBarcode(id: string) {
    await runDbTransaction(db => db.execute("DELETE FROM product_barcodes WHERE id=?", [id]), "IMMEDIATE"); changed();
  },
  async scan(input: BarcodeOperationInput) {
    const result = await runDbTransaction(db => barcodeStockOperationInDatabase(db, input, generateId, new Date().toISOString()), "IMMEDIATE");
    changed(); return result;
  },
  async location(input: Parameters<typeof saveLocationInDatabase>[1]) {
    const result = await runDbTransaction(db => saveLocationInDatabase(db, input, new Date().toISOString()), "IMMEDIATE");
    changed(); return result;
  },
  async transfer(input: TransferInput) {
    const result = await runDbTransaction(db => transferStockInDatabase(db, input, generateId, new Date().toISOString()), "IMMEDIATE");
    changed(); return result;
  },
  async applyThreshold(productId: string, expected: number) {
    await runDbTransaction(db => applyConsumptionThresholdInDatabase(db, productId, expected, new Date().toISOString()), "IMMEDIATE"); changed();
  },
};
