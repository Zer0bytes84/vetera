import { StockError, stockBalance, stockQuantity } from "@/domain/stock";
import { hasStockLots } from "./lot-consumption-store";
import { assertInventoryBalance, createStockBucket, updateProductBalance } from "./lot-store";
import type { StockDatabase, StockProduct } from "./stock-database";

interface CareMovement {
  id: string; product_id: string; quantity_delta: number; patient_id: string | null;
  unit_snapshot: string | null; product_name_snapshot: string | null;
}
interface OriginalAllocation {
  balance_id: string; quantity_delta: number; lot_number_snapshot: string | null;
  expiry_date_snapshot: string | null; location_name_snapshot: string;
}

/** Caller owns the transaction with care status, invoice and history. Never infer a debit from the care's current quantity. */
export async function returnCareStockInDatabase(db: StockDatabase, input: {
  taskId: string; completionKey: string; authorId: string; reason: string; now: string;
}, id: () => string): Promise<string | null> {
  if (!input.authorId.trim() || !input.reason.trim()) throw new StockError("SOURCE_CONFLICT", "Indiquez le motif et l’auteur de l’annulation de validation.");
  const [movement] = await db.select<CareMovement[]>(`SELECT id,product_id,quantity_delta,patient_id,unit_snapshot,product_name_snapshot
    FROM stock_movements WHERE source_type='care' AND source_id=? AND source_line_id=? AND type='usage'`, [input.taskId, input.completionKey]);
  // Historical care and services may never have consumed stock.
  if (!movement) return null;
  const quantity = stockQuantity(-movement.quantity_delta);
  const sourceLineId = `rollback:${movement.id}`;
  const [previous] = await db.select<{id: string; quantity_delta: number; reference_id: string}[]>(
    "SELECT id,quantity_delta,reference_id FROM stock_movements WHERE source_type='care' AND source_id=? AND source_line_id=? AND product_id=?",
    [input.taskId, sourceLineId, movement.product_id]);
  if (previous) {
    if (previous.reference_id !== movement.id || previous.quantity_delta !== quantity) throw new StockError("SOURCE_CONFLICT", "La restitution de ce soin est à vérifier dans les mouvements de stock.");
    return previous.id;
  }
  const [product] = await db.select<StockProduct[]>("SELECT * FROM products WHERE id=?", [movement.product_id]);
  if (!product) throw new StockError("PRODUCT_MISSING", "Le produit consommé est introuvable. Vérifiez le catalogue avant d’annuler la validation.");
  if (!product.stock_tracked || (movement.unit_snapshot && product.unit !== movement.unit_snapshot)) {
    throw new StockError("SOURCE_CONFLICT", "Le suivi ou l’unité du produit a changé. Rétablissez son suivi et son unité d’origine avant d’annuler la validation.");
  }
  const lots = await hasStockLots(db);
  const buckets = lots ? await assertInventoryBalance(db, product) : [];
  const allocations = lots ? await db.select<OriginalAllocation[]>(
    "SELECT balance_id,quantity_delta,lot_number_snapshot,expiry_date_snapshot,location_name_snapshot FROM stock_movement_allocations WHERE movement_id=? ORDER BY id", [movement.id]) : [];
  if (lots && allocations.length === 0) {
    // Debits predating lot tracking have no allocation. Return their exact
    // recorded quantity as unassigned stock, without inventing a lot/receipt.
    const bucket = await createStockBucket(db, product, {lotId: null, lotNumber: null, expiryDate: product.expiry_date,
      locationId: "stock-main", quantity: 0, receivedAt: input.now, reference: movement.id, now: input.now}, id);
    buckets.push(bucket);
    allocations.push({balance_id: bucket.id, quantity_delta: -quantity, lot_number_snapshot: null,
      expiry_date_snapshot: product.expiry_date, location_name_snapshot: bucket.locationName});
  }
  if (lots && (stockBalance(allocations.reduce((sum, row) => sum - row.quantity_delta, 0)) !== quantity ||
    allocations.some(row => row.quantity_delta >= 0 || !buckets.some(bucket => bucket.id === row.balance_id)))) {
    throw new StockError("SOURCE_CONFLICT", "Les lots consommés par ce soin sont incomplets. Vérifiez ses mouvements avant d’annuler la validation.");
  }
  const after = stockBalance(product.quantity + quantity);
  stockQuantity(after, true);
  await updateProductBalance(db, product, after, input.now);
  const movementId = id();
  await db.execute(`INSERT INTO stock_movements(id,product_id,type,quantity_delta,quantity_after,reason,reference_id,
    source_type,source_id,source_line_id,source_label,patient_id,author_id,unit_snapshot,product_name_snapshot,created_at,updated_at)
    VALUES (?,?,'return',?,?,?,?,'care',?,?,?,?,?,?,?,?,?)`, [movementId, product.id, quantity, after, input.reason.trim(), movement.id,
    input.taskId, sourceLineId, "Annulation de validation du soin", movement.patient_id, input.authorId,
    movement.unit_snapshot ?? product.unit, movement.product_name_snapshot ?? product.name, input.now, input.now]);
  for (const allocation of allocations) {
    const [bucket] = await db.select<{quantity: number}[]>("SELECT quantity FROM stock_balances WHERE id=?", [allocation.balance_id]);
    const updated = await db.execute("UPDATE stock_balances SET quantity=?,updated_at=? WHERE id=? AND quantity=?",
      [stockBalance(bucket.quantity - allocation.quantity_delta), input.now, allocation.balance_id, bucket.quantity]) as {rowsAffected?: number};
    if (updated?.rowsAffected !== 1) throw new StockError("SOURCE_CONFLICT", "Le stock du lot vient de changer. Actualisez avant de valider.");
    await db.execute(`INSERT INTO stock_movement_allocations(id,movement_id,balance_id,quantity_delta,lot_number_snapshot,expiry_date_snapshot,location_name_snapshot)
      VALUES (?,?,?,?,?,?,?)`, [id(), movementId, allocation.balance_id, -allocation.quantity_delta,
      allocation.lot_number_snapshot, allocation.expiry_date_snapshot, allocation.location_name_snapshot]);
  }
  return movementId;
}
