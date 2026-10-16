import { StockError, stockBalance, stockQuantity } from "@/domain/stock";
import type { StockSelection } from "@/domain/stock-fifo";
import type { StockConsumption } from "./stock-store";
import { stockProductInDatabase, type StockDatabase } from "./stock-database";
import { applyStockAllocations, prepareStockAllocations, stockSelectionKey } from "./lot-store";

/** Compatible with databases restored from a version preceding lot management. */
export async function hasStockLots(db: StockDatabase): Promise<boolean> {
  const [table] = await db.select<{name: string}[]>("SELECT name FROM sqlite_master WHERE type='table' AND name='stock_inventory_operations'");
  return !!table;
}

/** Call only inside the transaction which validates the clinical source. */
export async function consumeStockLotsInDatabase(db: StockDatabase, input: StockConsumption & StockSelection, id: () => string): Promise<string | null> {
  const quantity = stockQuantity(input.quantity);
  if (!input.sourceId.trim() || !input.sourceLineId.trim() || !input.authorId.trim()) {
    throw new StockError("SOURCE_CONFLICT", "L’origine et l’utilisateur de la consommation sont requis.");
  }
  const selection = stockSelectionKey(input);
  const [existing] = await db.select<{id: string; quantity_delta: number; patient_id: string | null; selection_json: string}[]>(
    "SELECT id,quantity_delta,patient_id,selection_json FROM stock_movements WHERE source_type=? AND source_id=? AND source_line_id=? AND product_id=?",
    [input.sourceType, input.sourceId, input.sourceLineId, input.productId]);
  if (existing) {
    if (stockBalance(-existing.quantity_delta) !== quantity || existing.patient_id !== input.patientId || existing.selection_json !== selection) {
      throw new StockError("SOURCE_CONFLICT", "Cette consommation a déjà été enregistrée avec une autre quantité, un autre lot ou un autre patient.");
    }
    return existing.id;
  }
  const product = await stockProductInDatabase(db, input.productId);
  if (!product.stock_tracked) return null;
  const {buckets, allocations} = await prepareStockAllocations(db, product, quantity, input.occurredAt, input);
  const after = stockBalance(product.quantity - quantity);
  const result = await db.execute("UPDATE products SET quantity=?,updated_at=? WHERE id=? AND quantity=? AND stock_tracked=1 AND (archived_at IS NULL OR archived_at='')",
    [after, input.occurredAt, product.id, product.quantity]) as {rowsAffected?: number};
  if (result?.rowsAffected !== 1) throw new StockError("SOURCE_CONFLICT", "Le stock vient de changer. Actualisez avant de valider.");
  const movementId = id();
  await db.execute(`INSERT INTO stock_movements(id,product_id,type,quantity_delta,quantity_after,reason,reference_id,
    source_type,source_id,source_line_id,source_label,patient_id,author_id,unit_snapshot,product_name_snapshot,selection_json,created_at,updated_at)
    VALUES (?,?,'usage',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [movementId, product.id, -quantity, after, input.sourceLabel, input.sourceId, input.sourceType, input.sourceId,
      input.sourceLineId, input.sourceLabel, input.patientId, input.authorId, product.unit, product.name, selection, input.occurredAt, input.occurredAt]);
  await applyStockAllocations(db, movementId, buckets, allocations, input.occurredAt, id);
  return movementId;
}
