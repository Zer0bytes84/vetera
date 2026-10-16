import { StockError, stockBalance, stockQuantity, insufficientStockMessage } from "@/domain/stock";
import { stockDate, stockDay, stockTimestamp } from "@/domain/stock-date";
import { selectFifoAllocations, type StockAllocation, type StockBucket, type StockSelection } from "@/domain/stock-fifo";
import { stockProductInDatabase, type StockDatabase, type StockProduct } from "./stock-database";

export interface InventoryBucket extends StockBucket {
  lotNumber: string | null; locationName: string; locationActive: number;
}
export interface InventoryLocation {id: string; name: string; active: number}
export interface LotRegistrationInput {
  id: string; productId: string; lotNumber: string; expiryDate: string | null;
  quantity: number; mode: "identify" | "receive"; locationId: string;
  receivedAt?: string; authorId: string; unitCostAmount?: number;
}
export interface StockOperationResult {movementId: string; quantityAfter: number}

export function stockSelectionKey(selection: StockSelection = {}): string {
  return JSON.stringify({...(selection.lotId === undefined ? {} : {lotId: selection.lotId}), ...(selection.locationId ? {locationId: selection.locationId} : {})});
}

export async function stockBucketsInDatabase(db: StockDatabase, productId: string): Promise<InventoryBucket[]> {
  const rows = await db.select<{
    id: string; product_id: string; lot_id: string | null; location_id: string; quantity: number;
    received_at: string; expiry_date: string | null; lot_number: string | null; location_name: string; location_active: number;
  }[]>(`SELECT b.*,CASE WHEN b.lot_id IS NULL THEN nullif(substr(p.expiry_date,1,10),'') ELSE l.expiry_date END AS expiry_date,
    l.lot_number,s.name AS location_name,s.active AS location_active
    FROM stock_balances b JOIN products p ON p.id=b.product_id
    LEFT JOIN product_lots l ON l.id=b.lot_id JOIN stock_locations s ON s.id=b.location_id
    WHERE b.product_id=? ORDER BY b.received_at,b.id`, [productId]);
  return rows.map(row => ({id: row.id, productId: row.product_id, lotId: row.lot_id, locationId: row.location_id,
    quantity: row.quantity, receivedAt: row.received_at, expiryDate: row.expiry_date, lotNumber: row.lot_number,
    locationName: row.location_name, locationActive: row.location_active}));
}

export async function assertInventoryBalance(db: StockDatabase, product: StockProduct): Promise<InventoryBucket[]> {
  const buckets = await stockBucketsInDatabase(db, product.id);
  for (const bucket of buckets) stockQuantity(Math.abs(bucket.quantity), true);
  if (!Number.isFinite(product.quantity) || stockBalance(buckets.reduce((sum, row) => sum + row.quantity, 0)) !== stockBalance(product.quantity)) {
    throw new StockError("SOURCE_CONFLICT", "Le stock du catalogue ne correspond pas aux lots. Vérifiez l’inventaire avant de valider.");
  }
  return buckets;
}

export async function prepareStockAllocations(db: StockDatabase, product: StockProduct, quantity: number, now: string, selection: StockSelection = {}) {
  const buckets = await assertInventoryBalance(db, product);
  if (selection.lotId) {
    const [lot] = await db.select<{product_id: string}[]>("SELECT product_id FROM product_lots WHERE id=?", [selection.lotId]);
    if (!lot || lot.product_id !== product.id) throw new StockError("PRODUCT_MISSING", "Ce lot n’appartient pas au produit sélectionné.");
  }
  if (selection.locationId) await activeLocation(db, selection.locationId);
  if (product.quantity < quantity) throw new StockError("INSUFFICIENT_STOCK", insufficientStockMessage(product.name, Math.max(0, product.quantity), quantity, product.unit));
  const allocations = selectFifoAllocations(buckets.filter(row => row.locationActive === 1), {
    productId: product.id, productName: product.name, unit: product.unit, quantity,
    onDate: stockDay(new Date(stockTimestamp(now))), ...selection,
  });
  return {buckets, allocations};
}

export async function activeLocation(db: StockDatabase, locationId: string): Promise<InventoryLocation> {
  const [location] = await db.select<InventoryLocation[]>("SELECT id,name,active FROM stock_locations WHERE id=?", [locationId]);
  if (!location || !location.active) throw new StockError("SOURCE_CONFLICT", "Choisissez un emplacement de stockage actif.");
  return location;
}

async function updateBucket(db: StockDatabase, bucket: InventoryBucket, delta: number, now: string) {
  const result = await db.execute("UPDATE stock_balances SET quantity=?,updated_at=? WHERE id=? AND quantity=?", [stockBalance(bucket.quantity + delta), now, bucket.id, bucket.quantity]) as {rowsAffected?: number};
  if (result?.rowsAffected !== 1) throw new StockError("SOURCE_CONFLICT", "Le stock du lot vient de changer. Actualisez avant de valider.");
}

export async function recordAllocation(db: StockDatabase, movementId: string, bucket: InventoryBucket, delta: number, id: () => string) {
  await db.execute(`INSERT INTO stock_movement_allocations(id,movement_id,balance_id,quantity_delta,lot_number_snapshot,expiry_date_snapshot,location_name_snapshot)
    VALUES (?,?,?,?,?,?,?)`, [id(), movementId, bucket.id, delta, bucket.lotNumber, bucket.expiryDate, bucket.locationName]);
}

export async function applyStockAllocations(db: StockDatabase, movementId: string, buckets: InventoryBucket[], allocations: StockAllocation[], now: string, id: () => string) {
  for (const allocation of allocations) {
    const bucket = buckets.find(row => row.id === allocation.balanceId)!;
    await updateBucket(db, bucket, -allocation.quantity, now);
    await recordAllocation(db, movementId, bucket, -allocation.quantity, id);
  }
}

export async function recordInventoryMovement(db: StockDatabase, product: StockProduct, input: {
  movementId: string; type: "opening" | "restock" | "adjustment" | "usage";
  delta: number; after: number; reason: string; now: string; authorId?: string;
  sourceType?: "manual" | "receipt" | "transfer"; sourceId?: string; unitCostAmount?: number;
}) {
  await db.execute(`INSERT INTO stock_movements(id,product_id,type,quantity_delta,quantity_after,reason,
    source_type,source_id,source_label,author_id,unit_cost_amount,unit_snapshot,product_name_snapshot,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [input.movementId, product.id, input.type, input.delta, input.after, input.reason,
    input.sourceType ?? "manual", input.sourceId ?? null, input.reason, input.authorId ?? null,
    input.unitCostAmount ?? null, product.unit, product.name, input.now, input.now]);
}

export async function updateProductBalance(db: StockDatabase, product: StockProduct, after: number, now: string) {
  const result = await db.execute("UPDATE products SET quantity=?,updated_at=? WHERE id=? AND quantity=?", [after, now, product.id, product.quantity]) as {rowsAffected?: number};
  if (result?.rowsAffected !== 1) throw new StockError("SOURCE_CONFLICT", "Le stock vient de changer. Actualisez avant de valider.");
}

export async function createStockBucket(db: StockDatabase, product: StockProduct, input: {
  lotId: string | null; lotNumber: string | null; expiryDate: string | null; locationId: string;
  quantity: number; receivedAt: string; reference?: string; now: string;
}, id: () => string): Promise<InventoryBucket> {
  const location = await activeLocation(db, input.locationId);
  const bucketId = id();
  await db.execute(`INSERT INTO stock_balances(id,product_id,lot_id,location_id,quantity,received_at,receipt_reference,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?)`, [bucketId, product.id, input.lotId, location.id, input.quantity, input.receivedAt, input.reference ?? null, input.now, input.now]);
  return {id: bucketId, productId: product.id, lotId: input.lotId, locationId: location.id, quantity: input.quantity,
    receivedAt: input.receivedAt, expiryDate: input.expiryDate, lotNumber: input.lotNumber, locationName: location.name, locationActive: 1};
}

export async function previousInventoryOperation(db: StockDatabase, operationId: string, kind: string, fingerprint: string): Promise<StockOperationResult | null> {
  const [previous] = await db.select<{kind: string; fingerprint: string; movement_id: string; quantity_after: number}[]>(
    "SELECT o.*,m.quantity_after FROM stock_inventory_operations o JOIN stock_movements m ON m.id=o.movement_id WHERE o.id=?", [operationId]);
  if (!previous) return null;
  if (previous.kind !== kind || previous.fingerprint !== fingerprint) throw new StockError("SOURCE_CONFLICT", "Cette opération a déjà été enregistrée avec d’autres informations.");
  return {movementId: previous.movement_id, quantityAfter: previous.quantity_after};
}

export async function completeInventoryOperation(db: StockDatabase, input: {id: string; kind: string; fingerprint: string; movementId: string; authorId?: string; now: string}) {
  await db.execute("INSERT INTO stock_inventory_operations(id,kind,fingerprint,movement_id,author_id,created_at) VALUES (?,?,?,?,?,?)",
    [input.id, input.kind, input.fingerprint, input.movementId, input.authorId ?? null, input.now]);
}

export async function receiveStockInDatabase(db: StockDatabase, product: StockProduct, input: {
  quantity: number; lotId?: string; locationId?: string; receivedAt: string; reason: string; now: string;
  authorId?: string; unitCostAmount?: number; sourceId?: string; type?: "restock" | "opening";
}, id: () => string): Promise<StockOperationResult> {
  const quantity = stockQuantity(input.quantity);
  if (!product.stock_tracked) throw new StockError("PRODUCT_MISSING", "Une prestation ne reçoit pas de stock physique.");
  await assertInventoryBalance(db, product);
  const receivedAt = stockTimestamp(input.receivedAt);
  if (Date.parse(receivedAt) > Date.parse(stockTimestamp(input.now))) throw new StockError("SOURCE_CONFLICT", "La réception ne peut pas être datée dans le futur.");
  if (input.unitCostAmount !== undefined && (!Number.isSafeInteger(input.unitCostAmount) || input.unitCostAmount < 0)) throw new StockError("SOURCE_CONFLICT", "Indiquez un coût unitaire positif ou nul.");
  let lot: {lot_number: string; expiry_date: string | null} | undefined;
  if (input.lotId) {
    [lot] = await db.select<{lot_number: string; expiry_date: string | null}[]>("SELECT lot_number,expiry_date FROM product_lots WHERE id=? AND product_id=?", [input.lotId, product.id]);
    if (!lot) throw new StockError("PRODUCT_MISSING", "Ce lot n’appartient pas au produit sélectionné.");
  }
  const after = stockQuantity(stockBalance(product.quantity + quantity), true);
  const movementId = id();
  await updateProductBalance(db, product, after, input.now);
  await recordInventoryMovement(db, product, {movementId, type: input.type ?? "restock", delta: quantity, after, reason: input.reason,
    now: input.now, authorId: input.authorId, unitCostAmount: input.unitCostAmount, sourceType: input.sourceId ? "receipt" : "manual", sourceId: input.sourceId});
  const bucket = await createStockBucket(db, product, {lotId: input.lotId ?? null, lotNumber: lot?.lot_number ?? null,
    expiryDate: input.lotId ? (lot?.expiry_date ?? null) : stockDate(product.expiry_date?.slice(0, 10)), locationId: input.locationId ?? "stock-main", quantity, receivedAt, reference: input.sourceId, now: input.now}, id);
  await recordAllocation(db, movementId, bucket, quantity, id);
  return {movementId, quantityAfter: after};
}

/** An aggregate count is safe only while no lot or secondary location is assigned. */
export async function countUnassignedStockInDatabase(db: StockDatabase, product: StockProduct, quantity: number, reason: string, now: string, id: () => string): Promise<StockOperationResult | null> {
  const counted = stockQuantity(quantity, true);
  const buckets = await assertInventoryBalance(db, product);
  const delta = stockBalance(counted - product.quantity);
  if (!delta) return null;
  if (!product.stock_tracked || buckets.some(row => row.quantity !== 0 && (row.lotId !== null || row.locationId !== "stock-main"))) {
    throw new StockError("SOURCE_CONFLICT", "Ce produit est suivi par lot ou emplacement. Corrigez les quantités dans l’onglet Lots pour conserver la traçabilité.");
  }
  const movementId = id();
  await recordInventoryMovement(db, product, {movementId, type: "adjustment", delta, after: counted, reason, now});
  // Preserve receipt order when reducing a count; clear legacy negative balances explicitly.
  const positive = buckets.filter(row => row.quantity > 0).sort((a, b) => Date.parse(stockTimestamp(a.receivedAt)) - Date.parse(stockTimestamp(b.receivedAt)) || a.id.localeCompare(b.id));
  let total = stockBalance(positive.reduce((sum, row) => sum + row.quantity, 0));
  for (const bucket of buckets.filter(row => row.quantity < 0)) {
    await updateBucket(db, bucket, -bucket.quantity, now);
    await recordAllocation(db, movementId, bucket, -bucket.quantity, id);
  }
  for (const bucket of positive) {
    const decrease = stockBalance(Math.min(bucket.quantity, Math.max(0, total - counted)));
    if (!decrease) continue;
    await updateBucket(db, bucket, -decrease, now);
    await recordAllocation(db, movementId, bucket, -decrease, id);
    total = stockBalance(total - decrease);
  }
  if (counted > total) {
    const addition = stockBalance(counted - total);
    const bucket = await createStockBucket(db, product, {lotId: null, lotNumber: null, expiryDate: stockDate(product.expiry_date?.slice(0, 10)), locationId: "stock-main", quantity: addition, receivedAt: stockTimestamp(now), now}, id);
    await recordAllocation(db, movementId, bucket, addition, id);
  }
  await updateProductBalance(db, product, counted, now);
  return {movementId, quantityAfter: counted};
}

export async function registerLotInDatabase(db: StockDatabase, input: LotRegistrationInput, id: () => string, now: string) {
  if (!input.id.trim() || !input.authorId.trim()) throw new StockError("SOURCE_CONFLICT", "Un utilisateur connecté est requis pour enregistrer un lot.");
  const lotNumber = input.lotNumber.trim();
  if (!lotNumber || lotNumber.length > 120) throw new StockError("SOURCE_CONFLICT", "Indiquez un numéro de lot de 1 à 120 caractères.");
  const expiry = stockDate(input.expiryDate);
  const quantity = stockQuantity(input.quantity);
  if (input.mode === "receive" && !input.receivedAt) throw new StockError("SOURCE_CONFLICT", "Choisissez la date de réception du lot.");
  const receivedAt = input.mode === "receive" ? stockTimestamp(input.receivedAt!) : null;
  const fingerprint = JSON.stringify({productId: input.productId, lotNumber, expiry, quantity, mode: input.mode, locationId: input.locationId, receivedAt, cost: input.unitCostAmount ?? null});
  const previous = await previousInventoryOperation(db, input.id, "lot-" + input.mode, fingerprint);
  if (previous) return previous;
  if (!["receive", "identify"].includes(input.mode)) throw new StockError("SOURCE_CONFLICT", "Choisissez une réception ou l’identification du stock existant.");
  const product = await stockProductInDatabase(db, input.productId);
  if (!product.stock_tracked) throw new StockError("PRODUCT_MISSING", "Une prestation ne possède pas de lots physiques.");
  const buckets = await assertInventoryBalance(db, product);
  await activeLocation(db, input.locationId);
  let [lot] = await db.select<{id: string; expiry_date: string | null}[]>("SELECT id,expiry_date FROM product_lots WHERE product_id=? AND lot_number=?", [product.id, lotNumber]);
  if (lot && lot.expiry_date !== expiry) throw new StockError("SOURCE_CONFLICT", "Ce numéro de lot a déjà une autre péremption. Vérifiez le numéro et la date.");
  if (!lot) {
    lot = {id: id(), expiry_date: expiry};
    await db.execute("INSERT INTO product_lots(id,product_id,lot_number,expiry_date,created_at,updated_at) VALUES (?,?,?,?,?,?)", [lot.id, product.id, lotNumber, expiry, now, now]);
  }
  let result: StockOperationResult;
  if (input.mode === "receive") {
    result = await receiveStockInDatabase(db, product, {quantity, lotId: lot.id, locationId: input.locationId, receivedAt: receivedAt!, reason: `Réception du lot ${lotNumber}`, sourceId: input.id, authorId: input.authorId, unitCostAmount: input.unitCostAmount, now}, id);
  } else {
    const unassigned = buckets.filter(row => row.lotId === null && row.locationId === input.locationId && row.quantity > 0).sort((a, b) => Date.parse(stockTimestamp(a.receivedAt)) - Date.parse(stockTimestamp(b.receivedAt)) || a.id.localeCompare(b.id));
    const available = stockBalance(unassigned.reduce((sum, row) => sum + row.quantity, 0));
    if (available < quantity || product.quantity < quantity) throw new StockError("INSUFFICIENT_STOCK", "Le stock sans lot de cet emplacement est insuffisant. Choisissez une réception pour ajouter du stock.");
    const movementId = id();
    await recordInventoryMovement(db, product, {movementId, type: "adjustment", delta: 0, after: product.quantity, reason: `Identification du lot ${lotNumber}`, now, authorId: input.authorId, sourceId: input.id});
    let remaining = quantity;
    for (const source of unassigned) {
      const part = stockBalance(Math.min(remaining, source.quantity));
      if (!part) break;
      await updateBucket(db, source, -part, now);
      await recordAllocation(db, movementId, source, -part, id);
      const target = await createStockBucket(db, product, {lotId: lot.id, lotNumber, expiryDate: expiry, locationId: source.locationId, quantity: part, receivedAt: stockTimestamp(source.receivedAt), now, reference: input.id}, id);
      await recordAllocation(db, movementId, target, part, id);
      remaining = stockBalance(remaining - part);
    }
    result = {movementId, quantityAfter: product.quantity};
  }
  await db.execute(`INSERT INTO stock_lot_registrations(id,lot_id,product_id,location_id,quantity,mode,fingerprint,movement_id,author_id,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`, [input.id, lot.id, product.id, input.locationId, quantity, input.mode, fingerprint, result.movementId, input.authorId, now]);
  await completeInventoryOperation(db, {id: input.id, kind: "lot-" + input.mode, fingerprint, movementId: result.movementId, authorId: input.authorId, now});
  return result;
}

export async function countStockBucketInDatabase(db: StockDatabase, input: {id: string; balanceId: string; quantity: number; reason: string; authorId: string}, id: () => string, now: string) {
  const quantity = stockQuantity(input.quantity, true);
  if (!input.id.trim() || !input.authorId.trim() || !input.reason.trim()) throw new StockError("SOURCE_CONFLICT", "Un motif et un utilisateur sont requis pour corriger un lot.");
  const fingerprint = JSON.stringify({balanceId: input.balanceId, quantity, reason: input.reason.trim()});
  const previous = await previousInventoryOperation(db, input.id, "count", fingerprint);
  if (previous) return previous;
  const [row] = await db.select<{product_id: string}[]>("SELECT product_id FROM stock_balances WHERE id=?", [input.balanceId]);
  if (!row) throw new StockError("PRODUCT_MISSING", "Ce stock n’existe plus.");
  const product = await stockProductInDatabase(db, row.product_id);
  const buckets = await assertInventoryBalance(db, product);
  const bucket = buckets.find(item => item.id === input.balanceId)!;
  const delta = stockBalance(quantity - bucket.quantity);
  const after = stockQuantity(stockBalance(product.quantity + delta), true);
  const movementId = id();
  await recordInventoryMovement(db, product, {movementId, type: "adjustment", delta, after, reason: input.reason.trim(), now, authorId: input.authorId});
  await updateBucket(db, bucket, delta, now);
  await recordAllocation(db, movementId, bucket, delta, id);
  await updateProductBalance(db, product, after, now);
  await completeInventoryOperation(db, {id: input.id, kind: "count", fingerprint, movementId, authorId: input.authorId, now});
  return {movementId, quantityAfter: after};
}
