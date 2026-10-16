import { emitSQLiteDataChanged } from "@/hooks/useSQLite";
import { generateId, runDbRead, runDbTransaction } from "@/services/sqlite/database";
import type { Product } from "@/types/db";
import { hasStockLots } from "./lot-consumption-store";
import { inventorySnapshotInDatabase, saveCatalogueProductInDatabase } from "./inventory-store";
import { countStockBucketInDatabase, registerLotInDatabase, type LotRegistrationInput } from "./lot-store";

export function announceInventoryChanged() {
  if (typeof window === "undefined") return;
  for (const table of ["products", "stock_movements", "product_lots", "stock_balances", "stock_locations"]) emitSQLiteDataChanged(table);
}

export const inventoryService = {
  supported: () => runDbRead(hasStockLots),
  snapshot: () => runDbRead(inventorySnapshotInDatabase),
  async saveProduct(input: {id: string; create: boolean; draft: Partial<Product>; authorId?: string}) {
    const result = await runDbTransaction(db => saveCatalogueProductInDatabase(db, input, generateId, new Date().toISOString()), "IMMEDIATE");
    announceInventoryChanged(); return result;
  },
  async registerLot(input: LotRegistrationInput) {
    const result = await runDbTransaction(db => registerLotInDatabase(db, input, generateId, new Date().toISOString()), "IMMEDIATE");
    announceInventoryChanged(); return result;
  },
  async count(input: {id: string; balanceId: string; quantity: number; reason: string; authorId: string}) {
    const result = await runDbTransaction(db => countStockBucketInDatabase(db, input, generateId, new Date().toISOString()), "IMMEDIATE");
    announceInventoryChanged(); return result;
  },
  allocations(movementId: string) {
    return runDbRead(db => db.select<{id: string; quantity_delta: number; lot_number_snapshot: string | null; expiry_date_snapshot: string | null; location_name_snapshot: string}[]>(
      "SELECT * FROM stock_movement_allocations WHERE movement_id=? ORDER BY rowid", [movementId]));
  },
};
