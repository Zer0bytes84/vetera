import type { Product } from "@/types/db";
import { StockError, stockBalance, stockQuantity } from "@/domain/stock";
import { stockDate, stockDay, stockTimestamp } from "@/domain/stock-date";
import { hasStockLots } from "./lot-consumption-store";
import { countUnassignedStockInDatabase, receiveStockInDatabase, stockBucketsInDatabase, type InventoryBucket, type InventoryLocation } from "./lot-store";
import { stockProductInDatabase, type StockDatabase } from "./stock-database";

export interface StockInventoryBalance extends InventoryBucket {productName: string; unit: string; productArchived: boolean}
export interface StockInventorySnapshot {supported: boolean; balances: StockInventoryBalance[]; locations: InventoryLocation[]}
export interface ProductStockSummary {
  availableQuantity: number; expiredQuantity: number; expiringQuantity: number;
  lotsCount: number; nearestExpiryDate: string | null; invalid: boolean;
}

export async function inventorySnapshotInDatabase(db: StockDatabase): Promise<StockInventorySnapshot> {
  if (!await hasStockLots(db)) return {supported: false, balances: [], locations: []};
  const rows = await db.select<{
    id: string; product_id: string; lot_id: string | null; location_id: string; quantity: number;
    received_at: string; expiry_date: string | null; lot_number: string | null;
    location_name: string; location_active: number; name: string; unit: string; archived_at: string | null;
  }[]>(`SELECT b.*,CASE WHEN b.lot_id IS NULL THEN nullif(substr(p.expiry_date,1,10),'') ELSE l.expiry_date END AS expiry_date,
    l.lot_number,s.name AS location_name,s.active AS location_active,p.name,p.unit,p.archived_at
    FROM stock_balances b JOIN products p ON p.id=b.product_id
    LEFT JOIN product_lots l ON l.id=b.lot_id JOIN stock_locations s ON s.id=b.location_id
    ORDER BY p.name,l.lot_number,b.received_at,b.id`);
  return {supported: true, balances: rows.map(row => ({id: row.id, productId: row.product_id, lotId: row.lot_id,
    locationId: row.location_id, quantity: row.quantity, receivedAt: row.received_at, expiryDate: row.expiry_date,
    lotNumber: row.lot_number, locationName: row.location_name, locationActive: row.location_active,
    productName: row.name, unit: row.unit, productArchived: !!row.archived_at})),
  locations: await db.select<InventoryLocation[]>("SELECT id,name,active FROM stock_locations ORDER BY name,id")};
}

/** Display availability includes only usable physical stock; total stock remains unchanged. */
export function summarizeInventory(balances: readonly StockInventoryBalance[], today = stockDay()) {
  if (!stockDate(today)) throw new StockError("SOURCE_CONFLICT", "La date de contrôle du stock est requise.");
  const horizon = new Date(`${today}T12:00:00Z`); horizon.setUTCDate(horizon.getUTCDate() + 90);
  const near = horizon.toISOString().slice(0, 10);
  const result = new Map<string, ProductStockSummary>();
  const lots = new Map<string, Set<string>>();
  for (const row of balances) {
    const summary = result.get(row.productId) ?? {availableQuantity: 0, expiredQuantity: 0, expiringQuantity: 0, lotsCount: 0, nearestExpiryDate: null, invalid: false};
    result.set(row.productId, summary);
    let expiry: string | null;
    try {stockQuantity(Math.abs(row.quantity), true); expiry = stockDate(row.expiryDate); stockTimestamp(row.receivedAt);}
    catch {summary.invalid = true; continue;}
    if (row.quantity <= 0 || row.productArchived) continue;
    if (row.lotId) {
      const set = lots.get(row.productId) ?? new Set<string>(); set.add(row.lotId); lots.set(row.productId, set); summary.lotsCount = set.size;
    }
    if (expiry && (!summary.nearestExpiryDate || expiry < summary.nearestExpiryDate)) summary.nearestExpiryDate = expiry;
    if (expiry && expiry < today) {summary.expiredQuantity = stockBalance(summary.expiredQuantity + row.quantity); continue;}
    if (expiry && expiry <= near) summary.expiringQuantity = stockBalance(summary.expiringQuantity + row.quantity);
    if (row.locationActive && stockDay(new Date(stockTimestamp(row.receivedAt))) <= today) summary.availableQuantity = stockBalance(summary.availableQuantity + row.quantity);
  }
  for (const summary of result.values()) if (summary.invalid) summary.availableQuantity = 0;
  return result;
}

type ProductDraft = Omit<Product, "id" | "createdAt">;
function mapProduct(row: Record<string, unknown>): Product {
  return {id: String(row.id), name: String(row.name), category: String(row.category), subCategory: row.sub_category ? String(row.sub_category) : undefined,
    unit: String(row.unit), stockTracked: Number(row.stock_tracked) === 1, quantity: Number(row.quantity), minStock: Number(row.min_stock),
    purchasePriceAmount: Number(row.purchase_price_amount), salePriceAmount: Number(row.sale_price_amount),
    expiryDate: row.expiry_date ? String(row.expiry_date) : undefined, archivedAt: row.archived_at ? String(row.archived_at) : undefined, createdAt: String(row.created_at)};
}

export async function saveCatalogueProductInDatabase(db: StockDatabase, input: {id: string; draft: Partial<ProductDraft>; create: boolean; authorId?: string}, id: () => string, now: string): Promise<Product> {
  const [old] = await db.select<Record<string, unknown>[]>("SELECT * FROM products WHERE id=?", [input.id]);
  if (input.create ? !!old : !old) throw new StockError("SOURCE_CONFLICT", input.create ? "Cette référence existe déjà. Modifiez-la depuis le catalogue." : "Ce produit n’existe plus.");
  const existing = old ? mapProduct(old) : null;
  const draft = {...existing, ...input.draft};
  const name = draft.name?.trim(); const unit = draft.unit?.trim(); const category = draft.category?.trim();
  if (!name || !unit || !category) throw new StockError("SOURCE_CONFLICT", "Indiquez le nom, la catégorie et l’unité du produit.");
  const quantity = stockQuantity(draft.quantity ?? 0, true);
  const minStock = stockQuantity(draft.minStock ?? 0, true);
  const tracked = draft.stockTracked !== false;
  const purchase = draft.purchasePriceAmount ?? 0; const sale = draft.salePriceAmount ?? 0;
  if (![purchase, sale].every(value => Number.isSafeInteger(value) && value >= 0)) throw new StockError("SOURCE_CONFLICT", "Les tarifs doivent être des montants positifs ou nuls.");
  const expiry = stockDate(draft.expiryDate?.slice(0, 10));
  if (!tracked && quantity !== 0) throw new StockError("SOURCE_CONFLICT", "Une prestation sans suivi de stock doit avoir une quantité physique nulle.");
  const physical = existing && (existing.unit !== unit || !tracked) ? (await stockBucketsInDatabase(db, input.id)).some(row => row.quantity !== 0) : false;
  if (existing?.unit !== unit && existing && (existing.quantity !== 0 || physical)) throw new StockError("SOURCE_CONFLICT", "L’unité ne peut pas changer tant que du stock est présent. Comptez d’abord le stock à zéro.");
  if (existing?.stockTracked !== false && existing && (existing.quantity !== 0 || physical) && !tracked) throw new StockError("SOURCE_CONFLICT", "Le suivi ne peut pas être désactivé tant que du stock est présent.");
  if (input.create) {
    await db.execute(`INSERT INTO products(id,name,category,sub_category,quantity,unit,min_stock,purchase_price_amount,sale_price_amount,expiry_date,stock_tracked,created_at,updated_at)
      VALUES (?,?,?,?,0,?,?,?,?,?,?,?,?)`, [input.id, name, category, draft.subCategory ?? null, unit, minStock, purchase, sale, expiry, tracked ? 1 : 0, now, now]);
    if (tracked && quantity > 0) await receiveStockInDatabase(db, await stockProductInDatabase(db, input.id), {quantity, receivedAt: now, now, type: "opening", reason: "Stock initial", authorId: input.authorId, unitCostAmount: purchase}, id);
  } else {
    await db.execute(`UPDATE products SET name=?,category=?,sub_category=?,unit=?,min_stock=?,purchase_price_amount=?,sale_price_amount=?,expiry_date=?,stock_tracked=?,archived_at=?,updated_at=? WHERE id=?`,
      [name, category, draft.subCategory ?? null, unit, minStock, purchase, sale, expiry, tracked ? 1 : 0, draft.archivedAt || null, now, input.id]);
    if (existing!.quantity !== quantity) await countUnassignedStockInDatabase(db, await stockProductInDatabase(db, input.id), quantity, "Comptage depuis la fiche produit", now, id);
  }
  const [saved] = await db.select<Record<string, unknown>[]>("SELECT * FROM products WHERE id=?", [input.id]);
  return mapProduct(saved);
}
