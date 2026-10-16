import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, expect, it } from "vitest";
import { SQLITE_MIGRATIONS } from "@/services/sqlite/migrations";
import { runSqliteMigrations } from "@/services/sqlite/migration-runner";
import { PURCHASING_MIGRATION_SQL } from "@/modules/stock/purchasing-migration";
import { purchasingSnapshotInDatabase, receivePurchaseOrderInDatabase, savePurchaseOrderInDatabase, saveSupplierInDatabase, transitionPurchaseOrderInDatabase } from "@/modules/stock/services/purchasing-store";
import type { StockDatabase } from "@/modules/stock/services/stock-database";

let sqlite: DatabaseSync; let db: StockDatabase; let serial: number;
const now = "2026-10-15T12:00:00Z";
const id = () => `purchase-test-${++serial}`;
async function transaction<T>(operation: () => Promise<T>): Promise<T> {
  sqlite.exec("BEGIN IMMEDIATE");
  try {const result = await operation(); sqlite.exec("COMMIT"); return result;}
  catch (error) {sqlite.exec("ROLLBACK"); throw error;}
}
const order = {id: "order", create: true, supplierId: "supplier", authorId: "vet", lines: [
  {productId: "p1", quantity: 6, unitCostAmount: 1200}, {productId: "p2", quantity: 10, unitCostAmount: 250},
]};
const balance = (product = "p1") => Number(sqlite.prepare("SELECT quantity FROM products WHERE id=?").get(product)?.quantity);
async function confirm() {await transaction(() => savePurchaseOrderInDatabase(db, order, id, now)); await transaction(() => transitionPurchaseOrderInDatabase(db, "order", "order", "vet", now));}
function receipt(qty = 2, product = "p1", receiptId = "receipt") {
  const line = sqlite.prepare("SELECT id FROM purchase_order_lines WHERE order_id='order' AND product_id=?").get(product)!;
  return {id: receiptId, orderId: "order", authorId: "vet", reference: "BL-001", receivedAt: "2026-10-15T09:00:00Z",
    lines: [{orderLineId: String(line.id), quantity: qty, locationId: "stock-main", lotNumber: "LOT-001", expiryDate: "2027-06-30"}]};
}
beforeEach(async () => {
  sqlite = new DatabaseSync(":memory:"); serial = 0;
  db = {async select<T>(sql: string, args: unknown[] = []) {return sqlite.prepare(sql.replace(/\$\d+/g, "?")).all(...args) as T;},
    async execute(sql, args = []) {if (!args.length) {sqlite.exec(sql); return {rowsAffected: 0};} return {rowsAffected: Number(sqlite.prepare(sql.replace(/\$\d+/g, "?")).run(...args).changes)};}};
  const migrations = SQLITE_MIGRATIONS.some(m => m.version === "032") ? SQLITE_MIGRATIONS : [...SQLITE_MIGRATIONS, {version: "032", name: "stock-purchasing", sql: PURCHASING_MIGRATION_SQL}];
  await runSqliteMigrations(db, migrations); sqlite.exec("PRAGMA foreign_keys=ON");
  sqlite.exec(`INSERT INTO products(id,name,category,unit,quantity,purchase_price_amount,sale_price_amount) VALUES
    ('p1','Produit liquide','Médicaments','ml',0,1200,1500),('p2','Produit solide','Médicaments','comprimé',0,250,500);`);
  await saveSupplierInDatabase(db, {id: "supplier", name: "Fournisseur de validation", phone: "+213550100107", email: "stock@example.invalid"}, now);
});
afterEach(() => sqlite.close());

it("fiche fournisseur, brouillon et confirmation ne créent aucune quantité physique", async () => {
  await confirm();
  expect(balance()).toBe(0);
  expect(sqlite.prepare("SELECT * FROM stock_movements").all()).toHaveLength(0);
  const snapshot = await purchasingSnapshotInDatabase(db);
  expect(snapshot.suppliers[0]).toMatchObject({name: "Fournisseur de validation", phone: "+213550100107"});
  expect(snapshot.orders[0]).toMatchObject({status: "ordered", supplier_id: "supplier", total_amount: 9700});
  expect(snapshot.lines.map(l => l.received_quantity)).toEqual([0, 0]);
});

it("le brouillon se modifie avec contrôle de concurrence, mais plus après confirmation", async () => {
  await transaction(() => savePurchaseOrderInDatabase(db, order, id, now));
  const current = (await purchasingSnapshotInDatabase(db)).orders[0];
  const edited = {...order, create: false, expectedFingerprint: current.fingerprint, lines: [{...order.lines[0], quantity: 3}]};
  await transaction(() => savePurchaseOrderInDatabase(db, edited, id, now));
  await expect(transaction(() => savePurchaseOrderInDatabase(db, {...edited, lines: [{...edited.lines[0], quantity: 4}]}, id, now))).rejects.toThrow("a changé");
  await transaction(() => transitionPurchaseOrderInDatabase(db, "order", "order", "vet", now));
  const placed = (await purchasingSnapshotInDatabase(db)).orders[0];
  await expect(transaction(() => savePurchaseOrderInDatabase(db, {...edited, expectedFingerprint: placed.fingerprint, lines: order.lines}, id, now))).rejects.toThrow("a changé");
  expect(balance()).toBe(0);
});

it("réception partielle puis complète : lot, mouvements, coût et historique fournisseur liés", async () => {
  await confirm(); const first = receipt();
  await transaction(() => receivePurchaseOrderInDatabase(db, first, id, now));
  expect(balance()).toBe(2);
  let snapshot = await purchasingSnapshotInDatabase(db);
  expect(snapshot.orders[0].status).toBe("partial");
  expect(snapshot.lines.find(l => l.product_id === "p1")?.received_quantity).toBe(2);
  const movement = sqlite.prepare("SELECT * FROM stock_movements").get()!;
  expect(movement).toMatchObject({quantity_delta: 2, unit_cost_amount: 1200, source_type: "receipt", author_id: "vet"});
  expect(snapshot.receiptLines[0].movement_id).toBe(movement.id);
  expect(sqlite.prepare("SELECT lot_number_snapshot FROM stock_movement_allocations").get()?.lot_number_snapshot).toBe("LOT-001");
  const second = receipt(4, "p1", "second"); second.lines.push(receipt(10, "p2").lines[0]);
  await transaction(() => receivePurchaseOrderInDatabase(db, second, id, now));
  expect(balance()).toBe(6); expect(balance("p2")).toBe(10);
  snapshot = await purchasingSnapshotInDatabase(db);
  expect(snapshot.orders[0].status).toBe("received");
  expect(snapshot.receipts.map(r => r.order_id)).toEqual(["order", "order"]);
  expect(snapshot.receiptLines).toHaveLength(3);
});

it("rejouer une réception complète ne crédite pas deux fois et refuse un contenu différent", async () => {
  await confirm(); const request = receipt(6); request.lines.push(receipt(10, "p2").lines[0]);
  await transaction(() => receivePurchaseOrderInDatabase(db, request, id, now));
  await transaction(() => receivePurchaseOrderInDatabase(db, {...request, lines: [...request.lines].reverse()}, id, now));
  expect(balance()).toBe(6); expect(balance("p2")).toBe(10);
  await expect(transaction(() => receivePurchaseOrderInDatabase(db, {...request, reference: "autre"}, id, now))).rejects.toThrow("autres informations");
  expect(sqlite.prepare("SELECT * FROM stock_movements").all()).toHaveLength(2);
});

it("dépassement sur la deuxième ligne : annule aussi la première, les lots et la réception", async () => {
  await confirm(); const request = receipt(2); request.lines.push(receipt(11, "p2").lines[0]);
  await expect(transaction(() => receivePurchaseOrderInDatabase(db, request, id, now))).rejects.toThrow("dépasse");
  for (const table of ["purchase_receipts", "purchase_receipt_lines", "stock_balances", "product_lots", "stock_movements"]) expect(sqlite.prepare(`SELECT * FROM ${table}`).all()).toHaveLength(0);
  expect(balance()).toBe(0); expect(balance("p2")).toBe(0);
  expect((await purchasingSnapshotInDatabase(db)).orders[0].status).toBe("ordered");
});

it("une erreur SQLite sur la trace de réception annule tous les stocks", async () => {
  await confirm();
  sqlite.exec("CREATE TRIGGER fail_receipt BEFORE INSERT ON purchase_receipt_lines BEGIN SELECT RAISE(ABORT,'receipt failure'); END;");
  await expect(transaction(() => receivePurchaseOrderInDatabase(db, receipt(), id, now))).rejects.toThrow("receipt failure");
  expect(balance()).toBe(0);
  expect(sqlite.prepare("SELECT * FROM stock_movements").all()).toHaveLength(0);
  expect(sqlite.prepare("SELECT * FROM purchase_receipts").all()).toHaveLength(0);
});

it("annuler le reliquat d’une commande partielle garde le stock reçu et son historique", async () => {
  await confirm(); await transaction(() => receivePurchaseOrderInDatabase(db, receipt(), id, now));
  await transaction(() => transitionPurchaseOrderInDatabase(db, "order", "cancel", "vet", now));
  await expect(transaction(() => receivePurchaseOrderInDatabase(db, receipt(1, "p1", "later"), id, now))).rejects.toThrow("Confirmez");
  expect(balance()).toBe(2);
  expect((await purchasingSnapshotInDatabase(db)).receipts).toHaveLength(1);
  expect((await purchasingSnapshotInDatabase(db)).orders[0].status).toBe("cancelled");
});

it("archiver un fournisseur conserve ses bons et interdit une nouvelle commande", async () => {
  await confirm();
  await saveSupplierInDatabase(db, {id: "supplier", name: "Fournisseur archivé", archivedAt: now}, now);
  await expect(transaction(() => savePurchaseOrderInDatabase(db, {...order, id: "new-order"}, id, now))).rejects.toThrow("actif");
  await transaction(() => receivePurchaseOrderInDatabase(db, receipt(), id, now));
  const snapshot = await purchasingSnapshotInDatabase(db);
  expect(snapshot.orders[0]).toMatchObject({supplier_name: "Fournisseur archivé", supplier_id: "supplier"});
  expect(snapshot.suppliers[0]).toMatchObject({phone: "+213550100107", email: "stock@example.invalid"});
  expect(snapshot.receipts).toHaveLength(1);
});

it("unité modifiée, ligne étrangère et péremption incohérente sont bloquées sans réception partielle", async () => {
  await confirm(); const request = receipt();
  sqlite.exec("UPDATE products SET unit='flacon' WHERE id='p1'");
  await expect(transaction(() => receivePurchaseOrderInDatabase(db, request, id, now))).rejects.toThrow("unité");
  sqlite.exec("UPDATE products SET unit='ml' WHERE id='p1'");
  await expect(transaction(() => receivePurchaseOrderInDatabase(db, {...request, lines: [{...request.lines[0], orderLineId: "foreign"}]}, id, now))).rejects.toThrow("n’appartient pas");
  await transaction(() => receivePurchaseOrderInDatabase(db, request, id, now));
  await expect(transaction(() => receivePurchaseOrderInDatabase(db, {...receipt(1, "p1", "different-expiry"), lines: [{...request.lines[0], quantity: 1, expiryDate: "2028-01-01"}]}, id, now))).rejects.toThrow("autre péremption");
  expect(balance()).toBe(2);
});

it("valide les entrées physiques, tarifs, auteur et date sans calcul de conditionnement", async () => {
  for (const quantity of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    await expect(transaction(() => savePurchaseOrderInDatabase(db, {...order, lines: [{...order.lines[0], quantity}]}, id, now))).rejects.toThrow();
  }
  await expect(transaction(() => savePurchaseOrderInDatabase(db, {...order, authorId: ""}, id, now))).rejects.toThrow("utilisateur");
  await expect(transaction(() => savePurchaseOrderInDatabase(db, {...order, lines: [{...order.lines[0], unitCostAmount: 1.2}]}, id, now))).rejects.toThrow("coût");
  await confirm();
  await expect(transaction(() => receivePurchaseOrderInDatabase(db, {...receipt(), receivedAt: "2026-10-16T00:00:00Z"}, id, now))).rejects.toThrow("futur");
  await transaction(() => receivePurchaseOrderInDatabase(db, receipt(0.125), id, now));
  expect(balance()).toBe(0.125);
});
