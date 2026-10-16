import { StockError, stockBalance, stockQuantity } from "@/domain/stock";
import { stockDate, stockDay, stockTimestamp } from "@/domain/stock-date";
import { stockProductInDatabase, type StockDatabase } from "./stock-database";
import { receiveStockInDatabase, registerLotInDatabase } from "./lot-store";

export interface StockSupplier {
  id: string; name: string; phone: string; email: string; address: string; notes: string;
  archived_at: string | null; created_at: string; updated_at: string;
}
export interface PurchaseOrder {
  id: string; reference: string; supplier_id: string; supplier_name: string;
  status: "draft" | "ordered" | "partial" | "received" | "cancelled";
  fingerprint: string; author_id: string; ordered_at: string | null;
  created_at: string; updated_at: string; total_amount: number;
}
export interface PurchaseOrderLine {
  id: string; order_id: string; product_id: string; product_name: string; unit: string;
  quantity: number; received_quantity: number; unit_cost_amount: number; sort_order: number;
}
export interface PurchaseReceipt {
  id: string; order_id: string; reference: string; received_at: string; author_id: string; created_at: string;
}
export interface PurchaseReceiptLine {
  id: string; receipt_id: string; order_line_id: string; quantity: number; movement_id: string;
  lot_number: string | null; expiry_date: string | null; location_id: string;
}
export interface PurchasingSnapshot {
  suppliers: StockSupplier[]; orders: PurchaseOrder[]; lines: PurchaseOrderLine[];
  receipts: PurchaseReceipt[]; receiptLines: PurchaseReceiptLine[];
}
export interface OrderDraftLine {productId: string; quantity: number; unitCostAmount: number}
export interface OrderSaveInput {
  id: string; create: boolean; supplierId: string; lines: OrderDraftLine[];
  authorId: string; expectedFingerprint?: string;
}
export interface PurchaseReceiveInput {
  id: string; orderId: string; reference: string; receivedAt: string; authorId: string;
  lines: {orderLineId: string; quantity: number; lotNumber?: string; expiryDate?: string | null; locationId: string}[];
}

function fail(message: string): never {throw new StockError("SOURCE_CONFLICT", message);}
function actor(value: string) {if (!value.trim()) fail("Un utilisateur connecté est requis pour cette opération.");}
function text(value: string, label: string, max = 500) {
  const result = value.trim();
  if (result.length > max) fail(`${label} est trop long (${max} caractères maximum).`);
  return result;
}
function cost(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) fail("Le coût unitaire doit être un montant positif ou nul.");
  return value;
}

export async function purchasingSnapshotInDatabase(db: StockDatabase): Promise<PurchasingSnapshot> {
  const suppliers = await db.select<StockSupplier[]>("SELECT * FROM stock_suppliers ORDER BY name,id");
  const orders = await db.select<PurchaseOrder[]>(`SELECT o.*,s.name AS supplier_name,
    coalesce((SELECT sum(round(l.quantity*l.unit_cost_amount)) FROM purchase_order_lines l WHERE l.order_id=o.id),0) AS total_amount
    FROM purchase_orders o JOIN stock_suppliers s ON s.id=o.supplier_id ORDER BY o.created_at DESC,o.id`);
  const lines = await db.select<PurchaseOrderLine[]>(`SELECT l.*,coalesce((SELECT sum(r.quantity)
    FROM purchase_receipt_lines r WHERE r.order_line_id=l.id),0) AS received_quantity
    FROM purchase_order_lines l ORDER BY l.order_id,l.sort_order,l.id`);
  return {suppliers, orders, lines,
    receipts: await db.select<PurchaseReceipt[]>("SELECT * FROM purchase_receipts ORDER BY received_at DESC,id"),
    receiptLines: await db.select<PurchaseReceiptLine[]>("SELECT * FROM purchase_receipt_lines ORDER BY receipt_id,id")};
}

export async function saveSupplierInDatabase(db: StockDatabase, input: {
  id: string; name: string; phone?: string; email?: string; address?: string; notes?: string; archivedAt?: string | null;
}, now: string) {
  const name = text(input.name, "Le nom", 120);
  if (!name || !input.id.trim()) fail("Indiquez le nom du fournisseur.");
  const [old] = await db.select<StockSupplier[]>("SELECT * FROM stock_suppliers WHERE id=?", [input.id]);
  const phone = text(input.phone ?? old?.phone ?? "", "Le téléphone", 60);
  const email = text(input.email ?? old?.email ?? "", "L’adresse e-mail", 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Vérifiez l’adresse e-mail du fournisseur.");
  const archived = input.archivedAt === undefined ? old?.archived_at ?? null : input.archivedAt ? stockTimestamp(input.archivedAt) : null;
  await db.execute(`INSERT INTO stock_suppliers(id,name,phone,email,address,notes,archived_at,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,phone=excluded.phone,email=excluded.email,
    address=excluded.address,notes=excluded.notes,archived_at=excluded.archived_at,updated_at=excluded.updated_at`,
  [input.id, name, phone, email, text(input.address ?? old?.address ?? "", "L’adresse"), text(input.notes ?? old?.notes ?? "", "La note", 2000), archived, old?.created_at ?? now, now]);
  return input.id;
}

async function activeSupplier(db: StockDatabase, id: string) {
  const [supplier] = await db.select<StockSupplier[]>("SELECT * FROM stock_suppliers WHERE id=?", [id]);
  if (!supplier || supplier.archived_at) fail("Choisissez un fournisseur actif.");
  return supplier;
}

export async function savePurchaseOrderInDatabase(db: StockDatabase, input: OrderSaveInput, id: () => string, now: string) {
  actor(input.authorId);
  if (!input.id.trim() || !input.lines.length) fail("Ajoutez au moins un produit à commander.");
  if (new Set(input.lines.map(line => line.productId)).size !== input.lines.length) fail("Regroupez les quantités d’un produit sur une seule ligne.");
  const prepared: (OrderDraftLine & {productName: string; unit: string})[] = [];
  let total = 0;
  for (const line of input.lines) {
    const quantity = stockQuantity(line.quantity);
    const unitCostAmount = cost(line.unitCostAmount);
    const product = await stockProductInDatabase(db, line.productId);
    if (!product.stock_tracked) fail("Une commande de stock contient uniquement des produits physiques.");
    total += Math.round(quantity * unitCostAmount);
    if (!Number.isSafeInteger(total)) fail("Le montant de la commande dépasse la limite autorisée.");
    prepared.push({productId: product.id, productName: product.name, unit: product.unit, quantity, unitCostAmount});
  }
  const fingerprint = JSON.stringify({supplierId: input.supplierId, lines: prepared});
  const [old] = await db.select<PurchaseOrder[]>("SELECT * FROM purchase_orders WHERE id=?", [input.id]);
  if (old?.fingerprint === fingerprint) return old.id;
  if (input.create ? !!old : !old) fail(input.create ? "Cette commande existe déjà avec d’autres lignes." : "Cette commande n’existe plus.");
  if (old && (old.status !== "draft" || input.expectedFingerprint !== old.fingerprint)) fail("La commande a changé. Actualisez-la avant de modifier son brouillon.");
  await activeSupplier(db, input.supplierId);
  if (!old) {
    const reference = `BC-${stockDay(new Date(stockTimestamp(now))).replaceAll("-", "")}-${input.id.slice(0, 8).toLocaleUpperCase("fr-FR")}`;
    await db.execute(`INSERT INTO purchase_orders(id,reference,supplier_id,status,fingerprint,author_id,created_at,updated_at)
      VALUES (?,?,?,'draft',?,?,?,?)`, [input.id, reference, input.supplierId, fingerprint, input.authorId, now, now]);
  } else {
    await db.execute("DELETE FROM purchase_order_lines WHERE order_id=?", [old.id]);
    await db.execute("UPDATE purchase_orders SET supplier_id=?,fingerprint=?,author_id=?,updated_at=? WHERE id=?", [input.supplierId, fingerprint, input.authorId, now, old.id]);
  }
  for (const [index, line] of prepared.entries()) {
    await db.execute(`INSERT INTO purchase_order_lines(id,order_id,product_id,product_name,unit,quantity,unit_cost_amount,sort_order)
      VALUES (?,?,?,?,?,?,?,?)`, [id(), input.id, line.productId, line.productName, line.unit, line.quantity, line.unitCostAmount, index]);
  }
  return input.id;
}

export async function transitionPurchaseOrderInDatabase(db: StockDatabase, orderId: string, action: "order" | "cancel", authorId: string, now: string) {
  actor(authorId);
  if (!["order", "cancel"].includes(action)) fail("Choisissez une confirmation ou une annulation de commande.");
  const [order] = await db.select<PurchaseOrder[]>("SELECT * FROM purchase_orders WHERE id=?", [orderId]);
  if (!order) fail("Cette commande n’existe plus.");
  if (action === "order") {
    if (["ordered", "partial", "received"].includes(order.status)) return;
    if (order.status !== "draft") fail("Une commande annulée ne peut pas être confirmée.");
    await activeSupplier(db, order.supplier_id);
    const lines = await db.select<{id: string}[]>("SELECT id FROM purchase_order_lines WHERE order_id=?", [orderId]);
    if (!lines.length) fail("Ajoutez des produits avant de confirmer la commande.");
    await db.execute("UPDATE purchase_orders SET status='ordered',ordered_at=?,updated_at=? WHERE id=?", [now, now, orderId]);
  } else {
    if (order.status === "cancelled") return;
    if (order.status === "received") fail("Une commande entièrement reçue ne peut pas être annulée.");
    await db.execute("UPDATE purchase_orders SET status='cancelled',updated_at=? WHERE id=?", [now, orderId]);
  }
}

/** The caller owns an IMMEDIATE transaction for the receipt and every stock line. */
export async function receivePurchaseOrderInDatabase(db: StockDatabase, input: PurchaseReceiveInput, id: () => string, now: string) {
  actor(input.authorId);
  const receivedAt = stockTimestamp(input.receivedAt);
  const reference = text(input.reference, "La référence de livraison", 120);
  if (!input.id.trim() || !input.lines.length) fail("Saisissez au moins une quantité reçue.");
  if (new Set(input.lines.map(line => line.orderLineId)).size !== input.lines.length) fail("Une ligne de commande ne peut apparaître qu’une fois par réception.");
  const lines = input.lines.map(line => ({...line, quantity: stockQuantity(line.quantity), lotNumber: text(line.lotNumber ?? "", "Le numéro de lot", 120), expiryDate: stockDate(line.expiryDate)}));
  const fingerprint = JSON.stringify({orderId: input.orderId, reference, receivedAt, lines: [...lines].sort((a, b) => a.orderLineId.localeCompare(b.orderLineId))});
  const [existing] = await db.select<{id: string; fingerprint: string}[]>("SELECT id,fingerprint FROM purchase_receipts WHERE id=?", [input.id]);
  if (existing) {
    if (existing.fingerprint !== fingerprint) fail("Cette réception a déjà été enregistrée avec d’autres informations.");
    return existing.id;
  }
  const [order] = await db.select<PurchaseOrder[]>("SELECT * FROM purchase_orders WHERE id=?", [input.orderId]);
  if (!order || !["ordered", "partial"].includes(order.status)) fail("Confirmez la commande avant de réceptionner ses produits.");
  const ordered = await db.select<PurchaseOrderLine[]>(`SELECT l.*,coalesce((SELECT sum(r.quantity) FROM purchase_receipt_lines r WHERE r.order_line_id=l.id),0) AS received_quantity
    FROM purchase_order_lines l WHERE l.order_id=? ORDER BY l.sort_order,l.id`, [order.id]);
  await db.execute("INSERT INTO purchase_receipts(id,order_id,reference,fingerprint,received_at,author_id,created_at) VALUES (?,?,?,?,?,?,?)",
    [input.id, order.id, reference, fingerprint, receivedAt, input.authorId, now]);
  for (const line of lines) {
    const source = ordered.find(row => row.id === line.orderLineId);
    if (!source) fail("Une ligne reçue n’appartient pas à cette commande.");
    const remaining = stockBalance(source.quantity - source.received_quantity);
    if (line.quantity > remaining) fail(`La quantité reçue de ${source.product_name} dépasse les ${remaining.toLocaleString("fr-FR")} ${source.unit} restant à recevoir.`);
    const product = await stockProductInDatabase(db, source.product_id);
    if (!product.stock_tracked || product.unit !== source.unit) fail(`L’unité ou le suivi de ${source.product_name} a changé. Vérifiez le catalogue avant réception.`);
    const operation = `purchase:${input.id}:${source.id}`;
    let movementId: string;
    if (line.lotNumber) {
      const result = await registerLotInDatabase(db, {id: operation, productId: product.id, lotNumber: line.lotNumber,
        quantity: line.quantity, expiryDate: line.expiryDate, mode: "receive", locationId: line.locationId,
        receivedAt, authorId: input.authorId, unitCostAmount: source.unit_cost_amount}, id, now);
      movementId = result.movementId;
    } else {
      if (line.expiryDate) fail("Indiquez le numéro du lot pour enregistrer sa péremption.");
      const result = await receiveStockInDatabase(db, product, {quantity: line.quantity, receivedAt, locationId: line.locationId,
        reason: `Réception ${order.reference}`, sourceId: operation, authorId: input.authorId, unitCostAmount: source.unit_cost_amount, now}, id);
      movementId = result.movementId;
    }
    await db.execute(`INSERT INTO purchase_receipt_lines(id,receipt_id,order_line_id,quantity,movement_id,lot_number,expiry_date,location_id)
      VALUES (?,?,?,?,?,?,?,?)`, [id(), input.id, source.id, line.quantity, movementId, line.lotNumber || null, line.expiryDate, line.locationId]);
  }
  const completed = ordered.every(row => stockBalance(row.received_quantity + (lines.find(line => line.orderLineId === row.id)?.quantity ?? 0)) === row.quantity);
  await db.execute("UPDATE purchase_orders SET status=?,updated_at=? WHERE id=?", [completed ? "received" : "partial", now, order.id]);
  return input.id;
}
