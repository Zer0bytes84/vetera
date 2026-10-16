import { StockError, stockBalance, stockQuantity, insufficientStockMessage } from "@/domain/stock";
import { stockTimestamp } from "@/domain/stock-date";
import type { StockSelection } from "@/domain/stock-fifo";
import { stockProductInDatabase, type StockDatabase } from "./stock-database";
import { activeLocation, applyStockAllocations, assertInventoryBalance, completeInventoryOperation, createStockBucket,
  prepareStockAllocations, previousInventoryOperation, receiveStockInDatabase, recordAllocation, recordInventoryMovement,
  registerLotInDatabase, updateProductBalance } from "./lot-store";

export interface ProductBarcode {id: string; product_id: string; code: string; product_name: string; unit: string; archived_at: string | null}
export interface ConsumptionSummary {product_id: string; product_name: string; unit: string; quantity: number; min_stock: number; suggested_minimum: number}
export interface StockTransfer {id: string; product_id: string; product_name: string; unit: string; source_name: string; target_name: string; quantity: number; movement_id: string; created_at: string}
export interface StockOperationsSnapshot {barcodes: ProductBarcode[]; consumption: ConsumptionSummary[]; transfers: StockTransfer[]}
export interface BarcodeOperationInput extends StockSelection {
  id: string; code: string; direction: "in" | "out"; quantity: number; locationId: string;
  lotNumber?: string; expiryDate?: string | null; authorId: string;
}
export interface TransferInput {
  id: string; productId: string; fromLocationId: string; toLocationId: string; quantity: number; authorId: string;
  lotId?: string | null;
}
function fail(message: string): never {throw new StockError("SOURCE_CONFLICT", message);}
function actor(value: string) {if (!value.trim()) fail("Un utilisateur connecté est requis pour cette opération.");}

export function normalizeBarcode(value: string) {
  const code = value.trim();
  if (!code || code.length > 128 || [...code].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) fail("Scannez ou saisissez un code-barres de 1 à 128 caractères, sans caractère de contrôle.");
  return code;
}

export async function saveBarcodeInDatabase(db: StockDatabase, input: {id: string; productId: string; code: string}, now: string) {
  const code = normalizeBarcode(input.code);
  const product = await stockProductInDatabase(db, input.productId);
  if (!product.stock_tracked) fail("Un code de stock doit être associé à un produit physique.");
  const [existing] = await db.select<{id: string; product_id: string}[]>("SELECT id,product_id FROM product_barcodes WHERE code=?", [code]);
  if (existing) {
    if (existing.product_id !== product.id) fail("Ce code-barres est déjà associé à un autre produit.");
    return existing.id;
  }
  if (!input.id.trim()) fail("La référence du code-barres est requise.");
  await db.execute("INSERT INTO product_barcodes(id,product_id,code,created_at) VALUES (?,?,?,?)", [input.id, product.id, code, now]);
  return input.id;
}

export async function barcodeProductInDatabase(db: StockDatabase, value: string) {
  const code = normalizeBarcode(value);
  const [barcode] = await db.select<{product_id: string}[]>("SELECT product_id FROM product_barcodes WHERE code=?", [code]);
  if (!barcode) fail("Ce code-barres n’est associé à aucun produit. Associez-le dans l’onglet Codes-barres.");
  return stockProductInDatabase(db, barcode.product_id);
}

export async function saveLocationInDatabase(db: StockDatabase, input: {id: string; name: string; active?: boolean}, now: string) {
  const name = input.name.trim();
  if (!input.id.trim() || !name || name.length > 80) fail("Indiquez un nom d’emplacement de 1 à 80 caractères.");
  const [old] = await db.select<{active: number; created_at: string}[]>("SELECT active,created_at FROM stock_locations WHERE id=?", [input.id]);
  const active = input.active === undefined ? old?.active ?? 1 : Number(input.active);
  if (!active) {
    if (input.id === "stock-main") fail("L’emplacement principal doit rester actif.");
    const [occupied] = await db.select<{id: string}[]>("SELECT id FROM stock_balances WHERE location_id=? AND quantity!=0 LIMIT 1", [input.id]);
    if (occupied) fail("Transférez ou comptez le stock de cet emplacement à zéro avant de le désactiver.");
  }
  const [duplicate] = await db.select<{id: string}[]>("SELECT id FROM stock_locations WHERE lower(name)=lower(?) AND id!=?", [name, input.id]);
  if (duplicate) fail("Un emplacement porte déjà ce nom.");
  await db.execute(`INSERT INTO stock_locations(id,name,active,created_at,updated_at) VALUES (?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,active=excluded.active,updated_at=excluded.updated_at`, [input.id, name, active, old?.created_at ?? now, now]);
  return input.id;
}

export async function transferStockInDatabase(db: StockDatabase, input: TransferInput, id: () => string, now: string) {
  actor(input.authorId);
  const quantity = stockQuantity(input.quantity);
  if (!input.id.trim() || input.fromLocationId === input.toLocationId) fail("Choisissez deux emplacements différents pour le transfert.");
  const fingerprint = JSON.stringify({productId: input.productId, quantity, from: input.fromLocationId, to: input.toLocationId, lotId: input.lotId});
  const previous = await previousInventoryOperation(db, input.id, "transfer", fingerprint);
  if (previous) return previous;
  const sourceLocation = await activeLocation(db, input.fromLocationId);
  const targetLocation = await activeLocation(db, input.toLocationId);
  const product = await stockProductInDatabase(db, input.productId);
  if (!product.stock_tracked) fail("Une prestation ne possède pas de stock à transférer.");
  const buckets = await assertInventoryBalance(db, product);
  if (buckets.some(bucket => bucket.quantity < 0)) fail("Corrigez les soldes négatifs avant de transférer ce produit.");
  // Internal transfers can move expired stock to isolation. They do not make it usable.
  const available = buckets.filter(bucket => bucket.locationId === input.fromLocationId && bucket.quantity > 0 &&
    (input.lotId === undefined || bucket.lotId === input.lotId)).sort((a, b) => Date.parse(stockTimestamp(a.receivedAt)) - Date.parse(stockTimestamp(b.receivedAt)) || a.id.localeCompare(b.id));
  const total = stockBalance(available.reduce((sum, row) => sum + row.quantity, 0));
  if (total < quantity) throw new StockError("INSUFFICIENT_STOCK", insufficientStockMessage(product.name, total, quantity, product.unit));
  const movementId = id();
  await recordInventoryMovement(db, product, {movementId, type: "adjustment", delta: 0, after: product.quantity,
    reason: `Transfert ${sourceLocation.name} vers ${targetLocation.name}`, sourceType: "transfer", sourceId: input.id, authorId: input.authorId, now});
  let remaining = quantity;
  for (const source of available) {
    const part = stockBalance(Math.min(source.quantity, remaining));
    if (!part) break;
    await applyStockAllocations(db, movementId, [source], [{balanceId: source.id, quantity: part}], now, id);
    const target = await createStockBucket(db, product, {lotId: source.lotId, lotNumber: source.lotNumber, expiryDate: source.expiryDate,
      locationId: targetLocation.id, quantity: part, receivedAt: stockTimestamp(source.receivedAt), reference: input.id, now}, id);
    await recordAllocation(db, movementId, target, part, id);
    remaining = stockBalance(remaining - part);
  }
  await db.execute("INSERT INTO stock_transfers(id,product_id,source_location_id,target_location_id,source_name,target_name,quantity,fingerprint,movement_id,author_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    [input.id, product.id, sourceLocation.id, targetLocation.id, sourceLocation.name, targetLocation.name, quantity, fingerprint, movementId, input.authorId, now]);
  await completeInventoryOperation(db, {id: input.id, kind: "transfer", fingerprint, movementId, authorId: input.authorId, now});
  return {movementId, quantityAfter: product.quantity};
}

export async function barcodeStockOperationInDatabase(db: StockDatabase, input: BarcodeOperationInput, id: () => string, now: string) {
  actor(input.authorId);
  const code = normalizeBarcode(input.code);
  const quantity = stockQuantity(input.quantity);
  if (!input.id.trim() || !["in", "out"].includes(input.direction)) fail("Choisissez une entrée ou une sortie de stock.");
  if (input.direction === "in" && input.lotId !== undefined) fail("À l’entrée, saisissez le numéro du lot reçu.");
  if (input.direction === "out" && (input.lotNumber?.trim() || input.expiryDate)) fail("À la sortie, choisissez un lot existant ou le FIFO automatique.");
  const fingerprint = JSON.stringify({code, quantity, direction: input.direction, locationId: input.locationId,
    lotId: input.lotId, lotNumber: input.lotNumber?.trim() || null, expiryDate: input.expiryDate || null});
  const previous = await previousInventoryOperation(db, input.id, "barcode-" + input.direction, fingerprint);
  if (previous) return previous;
  const product = await barcodeProductInDatabase(db, code);
  if (!product.stock_tracked) fail("Ce produit n’est pas suivi en stock.");
  await activeLocation(db, input.locationId);
  let result: {movementId: string; quantityAfter: number};
  if (input.direction === "in") {
    if (input.lotNumber?.trim()) {
      result = await registerLotInDatabase(db, {id: `${input.id}:lot`, productId: product.id, lotNumber: input.lotNumber.trim(), expiryDate: input.expiryDate ?? null,
        quantity, mode: "receive", locationId: input.locationId, receivedAt: now, authorId: input.authorId}, id, now);
    } else {
      if (input.expiryDate || input.lotId !== undefined) fail("Saisissez le numéro du lot pour enregistrer sa péremption à l’entrée.");
      result = await receiveStockInDatabase(db, product, {quantity, receivedAt: now, now, locationId: input.locationId,
        authorId: input.authorId, sourceId: input.id, reason: `Entrée par code-barres ${code}`}, id);
    }
  } else {
    const {buckets, allocations} = await prepareStockAllocations(db, product, quantity, now, {lotId: input.lotId, locationId: input.locationId});
    const after = stockBalance(product.quantity - quantity); const movementId = id();
    await updateProductBalance(db, product, after, now);
    await recordInventoryMovement(db, product, {movementId, type: "usage", delta: -quantity, after,
      reason: `Sortie par code-barres ${code}`, authorId: input.authorId, sourceId: input.id, now});
    await applyStockAllocations(db, movementId, buckets, allocations, now, id);
    result = {movementId, quantityAfter: after};
  }
  if (input.direction === "in" && input.lotNumber?.trim()) await db.execute("UPDATE stock_movements SET source_label=?,reason=? WHERE id=?",
    [`Entrée par code-barres ${code} · Lot ${input.lotNumber.trim()}`, `Entrée par code-barres ${code} · Lot ${input.lotNumber.trim()}`, result.movementId]);
  await completeInventoryOperation(db, {id: input.id, kind: "barcode-" + input.direction, fingerprint, movementId: result.movementId, authorId: input.authorId, now});
  return result;
}

export async function stockOperationsSnapshotInDatabase(db: StockDatabase, now: string): Promise<StockOperationsSnapshot> {
  const end = stockTimestamp(now); const start = new Date(Date.parse(end) - 30 * 86_400_000).toISOString();
  const consumption = await db.select<Omit<ConsumptionSummary,"suggested_minimum">[]>(`SELECT p.id AS product_id,p.name AS product_name,p.unit,p.min_stock,
    sum(-m.quantity_delta) AS quantity FROM stock_movements m JOIN products p ON p.id=m.product_id
    WHERE m.type='usage' AND m.quantity_delta<0 AND julianday(m.created_at)>=julianday(?) AND julianday(m.created_at)<=julianday(?)
    AND p.stock_tracked=1 AND (p.archived_at IS NULL OR p.archived_at='')
    AND NOT EXISTS (SELECT 1 FROM stock_movements r WHERE r.type='return' AND r.source_type='care' AND r.reference_id=m.id)
    GROUP BY p.id ORDER BY quantity DESC,p.name,p.id`, [start, end]);
  return {
    barcodes: await db.select<ProductBarcode[]>("SELECT b.*,p.name AS product_name,p.unit,p.archived_at FROM product_barcodes b JOIN products p ON p.id=b.product_id ORDER BY p.name,b.code"),
    consumption: consumption.map(row => ({...row, quantity: stockBalance(row.quantity), suggested_minimum: Math.ceil(stockBalance(row.quantity) / 30 * 14 * 1_000_000) / 1_000_000})),
    transfers: await db.select<StockTransfer[]>("SELECT t.*,p.name AS product_name,p.unit FROM stock_transfers t JOIN products p ON p.id=t.product_id ORDER BY t.created_at DESC,t.id"),
  };
}

export async function applyConsumptionThresholdInDatabase(db: StockDatabase, productId: string, expected: number, now: string) {
  const snapshot = await stockOperationsSnapshotInDatabase(db, now);
  const proposal = snapshot.consumption.find(row => row.product_id === productId);
  if (!proposal || proposal.suggested_minimum !== stockQuantity(expected, true)) fail("La consommation a changé. Actualisez la proposition avant de l’appliquer.");
  await stockProductInDatabase(db, productId);
  await db.execute("UPDATE products SET min_stock=?,updated_at=? WHERE id=?", [proposal.suggested_minimum, now, productId]);
}
