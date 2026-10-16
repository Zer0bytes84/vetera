import { emitSQLiteDataChanged } from "@/hooks/useSQLite";
import { generateId, runDbRead, runDbTransaction } from "@/services/sqlite/database";
import { announceInventoryChanged } from "./inventory-service";
import { purchasingSnapshotInDatabase, receivePurchaseOrderInDatabase, savePurchaseOrderInDatabase, saveSupplierInDatabase, transitionPurchaseOrderInDatabase,
  type OrderSaveInput, type PurchaseReceiveInput } from "./purchasing-store";

function changed() {
  if (typeof window === "undefined") return;
  for (const table of ["stock_suppliers", "purchase_orders", "purchase_order_lines", "purchase_receipts", "purchase_receipt_lines"]) emitSQLiteDataChanged(table);
}
export const purchasingService = {
  snapshot: () => runDbRead(purchasingSnapshotInDatabase),
  async supplier(input: Parameters<typeof saveSupplierInDatabase>[1]) {
    const result = await runDbTransaction(db => saveSupplierInDatabase(db, input, new Date().toISOString()), "IMMEDIATE");
    changed(); return result;
  },
  async saveOrder(input: OrderSaveInput) {
    const result = await runDbTransaction(db => savePurchaseOrderInDatabase(db, input, generateId, new Date().toISOString()), "IMMEDIATE");
    changed(); return result;
  },
  async transition(orderId: string, action: "order" | "cancel", authorId: string) {
    await runDbTransaction(db => transitionPurchaseOrderInDatabase(db, orderId, action, authorId, new Date().toISOString()), "IMMEDIATE");
    changed();
  },
  async receive(input: PurchaseReceiveInput) {
    const result = await runDbTransaction(db => receivePurchaseOrderInDatabase(db, input, generateId, new Date().toISOString()), "IMMEDIATE");
    announceInventoryChanged(); changed(); return result;
  },
};
