import { StockError, insufficientStockMessage, stockBalance, stockQuantity } from "@/domain/stock";
import type { StockSelection } from "@/domain/stock-fifo";
import { hasStockLots, consumeStockLotsInDatabase } from "./lot-consumption-store";
import { prepareStockAllocations, receiveStockInDatabase, countUnassignedStockInDatabase } from "./lot-store";
import { stockProductInDatabase as lotProductInDatabase } from "./stock-database";

export interface StockDatabase {
  select<T>(sql: string, values?: unknown[]): Promise<T>;
  execute(sql: string, values?: unknown[]): Promise<unknown>;
}

export interface StockProduct {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  stock_tracked: number;
  archived_at: string | null;
  sale_price_amount: number;
}

export interface StockConsumption extends StockSelection {
  productId: string;
  quantity: number;
  sourceType: "care" | "consultation" | "prescription";
  sourceId: string;
  sourceLineId: string;
  sourceLabel: string;
  patientId: string;
  authorId: string;
  occurredAt: string;
}

export async function stockProductInDatabase(db: StockDatabase, productId: string): Promise<StockProduct> {
  const [product] = await db.select<StockProduct[]>(
    "SELECT id,name,unit,quantity,stock_tracked,archived_at,sale_price_amount FROM products WHERE id = ?", [productId],
  );
  if (!product || product.archived_at) throw new StockError("PRODUCT_MISSING", "Le produit n’est plus disponible. Choisissez un produit actif avant de valider.");
  return product;
}

export async function assertStockAvailable(db: StockDatabase, productId: string, quantity: number, selection: StockSelection = {}, now = new Date().toISOString()) {
  const requested = stockQuantity(quantity);
  const product = await stockProductInDatabase(db, productId);
  if (product.stock_tracked && await hasStockLots(db)) {
    await prepareStockAllocations(db, await lotProductInDatabase(db, productId), requested, now, selection);
    return product;
  }
  if (product.stock_tracked && stockBalance(product.quantity) < requested) {
    throw new StockError("INSUFFICIENT_STOCK", insufficientStockMessage(product.name, product.quantity, requested, product.unit));
  }
  return product;
}

/** Caller owns the transaction, so status/history/invoice can share its rollback. */
export async function consumeStockInDatabase(db: StockDatabase, input: StockConsumption, id: () => string): Promise<string | null> {
  if (await hasStockLots(db)) return consumeStockLotsInDatabase(db, input, id);
  if (input.lotId !== undefined || input.locationId) throw new StockError("SOURCE_CONFLICT", "La gestion des lots doit être activée avant cette sélection. Rouvrez l’application pour appliquer la mise à jour.");
  const quantity = stockQuantity(input.quantity);
  if (!input.sourceId.trim() || !input.sourceLineId.trim() || !input.authorId.trim()) {
    throw new StockError("SOURCE_CONFLICT", "L’origine et l’utilisateur de la consommation sont requis.");
  }
  const [existing] = await db.select<{id: string; quantity_delta: number; patient_id: string | null}[]>(
    "SELECT id,quantity_delta,patient_id FROM stock_movements WHERE source_type=? AND source_id=? AND source_line_id=? AND product_id=?",
    [input.sourceType, input.sourceId, input.sourceLineId, input.productId],
  );
  if (existing) {
    if (stockBalance(-existing.quantity_delta) !== quantity || existing.patient_id !== input.patientId) {
      throw new StockError("SOURCE_CONFLICT", "Cette consommation a déjà été enregistrée avec une autre quantité ou un autre patient.");
    }
    return existing.id;
  }
  const product = await assertStockAvailable(db, input.productId, quantity);
  if (!product.stock_tracked) return null;
  const after = stockBalance(product.quantity - quantity);
  const result = await db.execute(
    "UPDATE products SET quantity=?,updated_at=? WHERE id=? AND quantity=? AND stock_tracked=1 AND (archived_at IS NULL OR archived_at='')",
    [after, input.occurredAt, product.id, product.quantity],
  ) as {rowsAffected?: number} | undefined;
  if (result?.rowsAffected !== 1) throw new StockError("SOURCE_CONFLICT", "Le stock vient de changer. Actualisez avant de valider.");
  const movementId = id();
  await db.execute(
    `INSERT INTO stock_movements (id,product_id,type,quantity_delta,quantity_after,reason,reference_id,
      source_type,source_id,source_line_id,source_label,patient_id,author_id,unit_snapshot,product_name_snapshot,created_at,updated_at)
     VALUES (?,?,'usage',?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [movementId, product.id, -quantity, after, input.sourceLabel, input.sourceId,
      input.sourceType, input.sourceId, input.sourceLineId, input.sourceLabel, input.patientId, input.authorId, product.unit, product.name, input.occurredAt, input.occurredAt],
  );
  return movementId;
}

/** Manual receipts/counts read the authoritative balance inside their transaction. */
export async function changeStockInDatabase(db: StockDatabase, input: {
  productId: string; quantity: number; mode: "restock" | "adjustment";
  reason: string; unitCostAmount?: number; occurredAt: string;
}, id: () => string): Promise<StockProduct> {
  const quantity = stockQuantity(input.quantity, input.mode === "adjustment");
  if (!input.reason.trim()) throw new StockError("SOURCE_CONFLICT", "Indiquez le motif du mouvement de stock.");
  const product = await stockProductInDatabase(db, input.productId);
  if (await hasStockLots(db)) {
    const tracked = await lotProductInDatabase(db, input.productId);
    if (input.mode === "restock") {
      const result = await receiveStockInDatabase(db, tracked, {quantity, receivedAt: input.occurredAt, now: input.occurredAt, reason: input.reason.trim(), unitCostAmount: input.unitCostAmount}, id);
      return {...product, quantity: result.quantityAfter};
    }
    await countUnassignedStockInDatabase(db, tracked, quantity, input.reason.trim(), input.occurredAt, id);
    return {...product, quantity};
  }
  const after = input.mode === "restock" ? stockBalance(product.quantity + quantity) : quantity;
  const delta = stockBalance(after - product.quantity);
  if (delta === 0) return product;
  const result = await db.execute("UPDATE products SET quantity=?,updated_at=? WHERE id=? AND quantity=?", [after, input.occurredAt, product.id, product.quantity]) as {rowsAffected?: number};
  if (result?.rowsAffected !== 1) throw new StockError("SOURCE_CONFLICT", "Le stock vient de changer. Actualisez avant de valider.");
  await db.execute(`INSERT INTO stock_movements(id,product_id,type,quantity_delta,quantity_after,unit_cost_amount,reason,unit_snapshot,product_name_snapshot,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [id(), product.id, input.mode, delta, after, input.unitCostAmount ?? null, input.reason.trim(), product.unit, product.name, input.occurredAt, input.occurredAt]);
  return {...product, quantity: after};
}
