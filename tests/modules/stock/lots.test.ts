import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, expect, it } from "vitest";
import { runSqliteMigrations } from "@/services/sqlite/migration-runner";
import { SQLITE_MIGRATIONS } from "@/services/sqlite/migrations";
import { STOCK_LOTS_MIGRATION_SQL } from "@/modules/stock/stock-lots-migration";
import { stockProductInDatabase, type StockDatabase } from "@/modules/stock/services/stock-database";
import { assertInventoryBalance, countStockBucketInDatabase, countUnassignedStockInDatabase, registerLotInDatabase, stockBucketsInDatabase } from "@/modules/stock/services/lot-store";
import { consumeStockLotsInDatabase, hasStockLots } from "@/modules/stock/services/lot-consumption-store";
import { inventorySnapshotInDatabase, saveCatalogueProductInDatabase, summarizeInventory } from "@/modules/stock/services/inventory-store";

let connection: DatabaseSync;
let db: StockDatabase;
let serial: number;
const id = () => `lot-test-${++serial}`;
const now = "2026-10-14T12:00:00Z";
const migration = {version: "031", name: "stock-lots-and-receipts", sql: STOCK_LOTS_MIGRATION_SQL};
async function transaction<T>(operation: () => Promise<T>): Promise<T> {
  connection.exec("BEGIN IMMEDIATE");
  try {const result = await operation(); connection.exec("COMMIT"); return result;}
  catch (error) {connection.exec("ROLLBACK"); throw error;}
}
const balance = () => Number(connection.prepare("SELECT quantity FROM products WHERE id='product'").get()?.quantity);
const incoming = (lotNumber: string, quantity: number, receivedAt = "2026-09-01T10:00:00Z", expiryDate: string | null = "2027-12-01") => ({
  id: `receipt-${lotNumber}-${receivedAt}`, productId: "product", lotNumber, quantity, receivedAt,
  expiryDate, mode: "receive" as const, locationId: "stock-main", authorId: "vet",
});
const consume = (quantity: number, selection: {lotId?: string | null; locationId?: string} = {}) => transaction(() => consumeStockLotsInDatabase(db, {
  productId: "product", quantity, patientId: "patient", authorId: "vet", sourceType: "consultation",
  sourceId: "consultation", sourceLineId: `use-${serial}`, sourceLabel: "Produit utilisé", occurredAt: now, ...selection,
}, id));
beforeEach(async () => {
  connection = new DatabaseSync(":memory:"); serial = 0;
  db = {async select<T>(sql: string, values: unknown[] = []) {return connection.prepare(sql.replace(/\$\d+/g, "?")).all(...values) as T;},
    async execute(sql, values = []) {if (!values.length) {connection.exec(sql); return {rowsAffected: 0};}
      return {rowsAffected: Number(connection.prepare(sql.replace(/\$\d+/g, "?")).run(...values).changes)};}};
  await runSqliteMigrations(db, SQLITE_MIGRATIONS.some(row => row.version === "031") ? SQLITE_MIGRATIONS : [...SQLITE_MIGRATIONS, migration]);
  connection.exec(`PRAGMA foreign_keys=ON;
    INSERT INTO owners(id,first_name,last_name,phone) VALUES('owner','Test','Lots','');
    INSERT INTO patients(id,owner_id,name,species) VALUES('patient','owner','Patient de test','Chien');
    INSERT INTO products(id,name,category,unit,quantity,purchase_price_amount,sale_price_amount,created_at)
      VALUES('product','Produit de test','Médicaments','ml',0,500,1000,'2026-08-01 00:00:00');`);
});
afterEach(() => connection.close());

it("un produit avec stock ou trace de lot s’archive sans effacer les quantités ni l’historique", async () => {
  await transaction(() => registerLotInDatabase(db, incoming("TRACE", 3), id, now));
  const balances = connection.prepare("SELECT * FROM stock_balances ORDER BY id").all();
  const movements = connection.prepare("SELECT * FROM stock_movements ORDER BY id").all();
  const allocations = connection.prepare("SELECT * FROM stock_movement_allocations ORDER BY id").all();
  expect(() => connection.exec("DELETE FROM products WHERE id='product'")).toThrow(/FOREIGN KEY/);
  await transaction(() => saveCatalogueProductInDatabase(db, {id: "product", create: false, draft: {archivedAt: now}, authorId: "vet"}, id, now));
  expect(balance()).toBe(3);
  expect(connection.prepare("SELECT archived_at FROM products WHERE id='product'").get()?.archived_at).toBe(now);
  expect(connection.prepare("SELECT * FROM stock_balances ORDER BY id").all()).toEqual(balances);
  expect(connection.prepare("SELECT * FROM stock_movements ORDER BY id").all()).toEqual(movements);
  expect(connection.prepare("SELECT * FROM stock_movement_allocations ORDER BY id").all()).toEqual(allocations);
  await expect(consume(1)).rejects.toMatchObject({code: "PRODUCT_MISSING"});
});

it("migration : le stock existant reste sans lot inventé et conserve sa quantité exacte", async () => {
  const other = new DatabaseSync(":memory:");
  const adapter: StockDatabase = {async select<T>(sql: string, values: unknown[] = []) {return other.prepare(sql).all(...values) as T;},
    async execute(sql, values = []) {if (!values.length) {other.exec(sql); return {rowsAffected: 0};} return {rowsAffected: Number(other.prepare(sql).run(...values).changes)};}};
  try {
    const beforeLots = SQLITE_MIGRATIONS.filter(row => row.version < "031");
    await runSqliteMigrations(adapter, beforeLots);
    other.exec("INSERT INTO products(id,name,category,unit,quantity,purchase_price_amount,sale_price_amount,created_at) VALUES('legacy','Stock réel','Médicaments','ml',7.25,0,0,'2026-09-01 12:00:00')");
    expect(await hasStockLots(adapter)).toBe(false);
    await runSqliteMigrations(adapter, [...beforeLots, migration]);
    expect(await hasStockLots(adapter)).toBe(true);
    expect(other.prepare("SELECT quantity,lot_id,location_id,received_at FROM stock_balances").get()).toMatchObject({quantity: 7.25, lot_id: null, location_id: "stock-main", received_at: "2026-09-01T12:00:00.000Z"});
    expect(other.prepare("SELECT * FROM product_lots").all()).toHaveLength(0);
    expect(other.prepare("SELECT * FROM stock_movements").all()).toHaveLength(0);
  } finally {other.close();}
});

it("les produits importés après migration ont un solde sans lot fidèle au catalogue", () => {
  connection.exec("INSERT INTO products(id,name,category,unit,quantity,purchase_price_amount,sale_price_amount) VALUES('imported','Import réel','Médicaments','unité',4.5,0,0)");
  expect(connection.prepare("SELECT quantity,lot_id FROM stock_balances WHERE product_id='imported'").get()).toMatchObject({quantity: 4.5, lot_id: null});
});

it("une réception crée ensemble lot, solde physique, mouvement et attribution, avec réessai idempotent", async () => {
  const request = incoming("A", 2.25);
  const saved = await transaction(() => registerLotInDatabase(db, request, id, now));
  expect(balance()).toBe(2.25);
  expect(connection.prepare("SELECT * FROM stock_movement_allocations WHERE movement_id=?").get(saved.movementId)).toMatchObject({quantity_delta: 2.25, lot_number_snapshot: "A", expiry_date_snapshot: "2027-12-01", location_name_snapshot: "Stock principal"});
  expect(await transaction(() => registerLotInDatabase(db, request, id, "2026-10-15T12:00:00Z"))).toEqual(saved);
  await expect(transaction(() => registerLotInDatabase(db, {...request, quantity: 3}, id, now))).rejects.toThrow("déjà été enregistrée");
  expect(connection.prepare("SELECT * FROM stock_movements").all()).toHaveLength(1);
  await assertInventoryBalance(db, await stockProductInDatabase(db, "product"));
});

it("FIFO suit les dates de réception, même si un lot plus récent périme avant", async () => {
  await transaction(() => registerLotInDatabase(db, incoming("ANCIEN", 3), id, now));
  await transaction(() => registerLotInDatabase(db, incoming("RECENT", 4, "2026-09-10T10:00:00Z", "2026-10-30"), id, now));
  const movement = await consume(5);
  expect(balance()).toBe(2);
  expect(connection.prepare("SELECT lot_number_snapshot,quantity_delta FROM stock_movement_allocations WHERE movement_id=? ORDER BY rowid").all(movement)).toEqual([
    {lot_number_snapshot: "ANCIEN", quantity_delta: -3}, {lot_number_snapshot: "RECENT", quantity_delta: -2},
  ]);
});

it("réception répétée du même lot : chaque arrivée conserve son vrai rang FIFO", async () => {
  await transaction(() => registerLotInDatabase(db, incoming("A", 2), id, now));
  await transaction(() => registerLotInDatabase(db, incoming("B", 2, "2026-09-05T10:00:00Z"), id, now));
  await transaction(() => registerLotInDatabase(db, incoming("A", 2, "2026-09-10T10:00:00Z"), id, now));
  const movement = await consume(3);
  expect(connection.prepare("SELECT lot_number_snapshot,quantity_delta FROM stock_movement_allocations WHERE movement_id=? ORDER BY rowid").all(movement)).toEqual([
    {lot_number_snapshot: "A", quantity_delta: -2}, {lot_number_snapshot: "B", quantity_delta: -1},
  ]);
});

it("un lot explicitement choisi est utilisé et ne déborde pas sur un autre lot", async () => {
  await transaction(() => registerLotInDatabase(db, incoming("A", 4), id, now));
  await transaction(() => registerLotInDatabase(db, incoming("B", 2), id, now));
  const lotId = String(connection.prepare("SELECT id FROM product_lots WHERE lot_number='B'").get()?.id);
  await consume(1, {lotId});
  await expect(consume(2, {lotId})).rejects.toThrow("Stock insuffisant");
  expect(balance()).toBe(5);
  expect((await stockBucketsInDatabase(db, "product")).find(row => row.lotNumber === "A")?.quantity).toBe(4);
});

it("les lots périmés restent visibles dans le stock mais ne sont jamais dispensables", async () => {
  await transaction(() => registerLotInDatabase(db, incoming("PERIME", 8, "2026-09-01T10:00:00Z", "2026-10-13"), id, now));
  await transaction(() => registerLotInDatabase(db, incoming("VALIDE", 2, "2026-09-10T10:00:00Z", "2026-10-14"), id, now));
  await expect(consume(3)).rejects.toThrow("Stock insuffisant");
  expect(balance()).toBe(10);
  await consume(2);
  expect(balance()).toBe(8);
  const expiredId = String(connection.prepare("SELECT id FROM product_lots WHERE lot_number='PERIME'").get()?.id);
  await expect(consume(1, {lotId: expiredId})).rejects.toThrow("Stock insuffisant");
});

it("la consommation rejouée compare aussi la sélection de lot", async () => {
  await transaction(() => registerLotInDatabase(db, incoming("A", 4), id, now));
  const request = {productId: "product", quantity: 1, patientId: "patient", authorId: "vet", sourceType: "consultation" as const, sourceId: "consultation", sourceLineId: "same", sourceLabel: "Utilisation", occurredAt: now};
  const movement = await transaction(() => consumeStockLotsInDatabase(db, request, id));
  expect(await transaction(() => consumeStockLotsInDatabase(db, request, id))).toBe(movement);
  const lotId = String(connection.prepare("SELECT id FROM product_lots").get()?.id);
  await expect(transaction(() => consumeStockLotsInDatabase(db, {...request, lotId}, id))).rejects.toThrow("autre lot");
  expect(balance()).toBe(3);
});

it("un échec d’attribution annule réception, lot, mouvement et solde", async () => {
  connection.exec("CREATE TRIGGER fail_allocation BEFORE INSERT ON stock_movement_allocations BEGIN SELECT RAISE(ABORT,'failure'); END;");
  await expect(transaction(() => registerLotInDatabase(db, incoming("A", 4), id, now))).rejects.toThrow();
  expect(balance()).toBe(0);
  for (const table of ["product_lots", "stock_balances", "stock_movements", "stock_inventory_operations"]) expect(connection.prepare(`SELECT * FROM ${table}`).all()).toHaveLength(0);
});

it("un échec d’attribution annule aussi la consommation entière", async () => {
  await transaction(() => registerLotInDatabase(db, incoming("A", 4), id, now));
  connection.exec("CREATE TRIGGER fail_allocation BEFORE INSERT ON stock_movement_allocations BEGIN SELECT RAISE(ABORT,'failure'); END;");
  await expect(consume(2)).rejects.toThrow();
  expect(balance()).toBe(4);
  expect((await stockBucketsInDatabase(db, "product"))[0].quantity).toBe(4);
  expect(connection.prepare("SELECT * FROM stock_movements WHERE type='usage'").all()).toHaveLength(0);
});

it("identification : aucune augmentation de stock ni invention de date de réception", async () => {
  await transaction(async () => countUnassignedStockInDatabase(db, await stockProductInDatabase(db, "product"), 10, "Stock compté", "2026-08-01T10:00:00Z", id));
  const request = {...incoming("IDENTIFIE", 3), mode: "identify" as const, receivedAt: undefined};
  await transaction(() => registerLotInDatabase(db, request, id, now));
  expect(balance()).toBe(10);
  expect((await stockBucketsInDatabase(db, "product")).find(row => row.lotNumber === "IDENTIFIE")).toMatchObject({quantity: 3, receivedAt: "2026-08-01T10:00:00.000Z"});
  expect(connection.prepare("SELECT quantity_delta FROM stock_movements WHERE reason LIKE 'Identification%'").get()?.quantity_delta).toBe(0);
  await expect(transaction(() => registerLotInDatabase(db, {...request, id: "too-much", quantity: 8}, id, now))).rejects.toThrow("sans lot");
});

it("le comptage global refuse d’écraser les lots; un comptage ciblé est traçable et rejouable", async () => {
  await transaction(() => registerLotInDatabase(db, incoming("A", 4), id, now));
  const product = await stockProductInDatabase(db, "product");
  await expect(transaction(() => countUnassignedStockInDatabase(db, product, 1, "Comptage", now, id))).rejects.toThrow("onglet Lots");
  const bucket = (await stockBucketsInDatabase(db, "product"))[0];
  const request = {id: "count", balanceId: bucket.id, quantity: 1.5, reason: "Comptage physique", authorId: "vet"};
  const saved = await transaction(() => countStockBucketInDatabase(db, request, id, now));
  expect(balance()).toBe(1.5);
  expect(await transaction(() => countStockBucketInDatabase(db, request, id, now))).toEqual(saved);
  await assertInventoryBalance(db, await stockProductInDatabase(db, "product"));
});

it("données incorrectes ou lot étranger ne produisent aucune sortie silencieuse", async () => {
  for (const expiryDate of ["2026-02-30", "2026-13-01", "inconnue"]) await expect(transaction(() => registerLotInDatabase(db, incoming("A", 1, "2026-09-01T10:00:00Z", expiryDate), id, now))).rejects.toThrow("date de péremption");
  await expect(transaction(() => registerLotInDatabase(db, incoming("A", 1, "2027-01-01T10:00:00Z"), id, now))).rejects.toThrow("futur");
  await transaction(() => registerLotInDatabase(db, incoming("A", 4), id, now));
  await expect(consume(1, {lotId: "missing"})).rejects.toThrow("n’appartient pas");
  connection.exec("UPDATE products SET quantity=8 WHERE id='product'");
  await expect(consume(1)).rejects.toThrow("ne correspond pas");
  expect(connection.prepare("SELECT * FROM stock_movements WHERE type='usage'").all()).toHaveLength(0);
});

it("création catalogue : produit, stock initial, mouvement et réception sont atomiques", async () => {
  const saved = await transaction(() => saveCatalogueProductInDatabase(db, {id: "created", create: true, authorId: "vet", draft: {name: "Nouveau produit", category: "Médicaments", unit: "ml", quantity: 2.5, minStock: 1, purchasePriceAmount: 300, salePriceAmount: 500}}, id, now));
  expect(saved).toMatchObject({quantity: 2.5, stockTracked: true, unit: "ml"});
  expect(connection.prepare("SELECT * FROM stock_movements WHERE product_id='created'").get()).toMatchObject({type: "opening", quantity_delta: 2.5, quantity_after: 2.5, author_id: "vet"});
  await assertInventoryBalance(db, await stockProductInDatabase(db, saved.id));
  connection.exec("CREATE TRIGGER fail_created BEFORE INSERT ON stock_movement_allocations BEGIN SELECT RAISE(ABORT,'failure'); END;");
  await expect(transaction(() => saveCatalogueProductInDatabase(db, {id: "failure", create: true, draft: {name: "Création refusée", category: "Médicaments", unit: "ml", quantity: 1}}, id, now))).rejects.toThrow();
  expect(connection.prepare("SELECT * FROM products WHERE id='failure'").get()).toBeUndefined();
});

it("modification catalogue : le comptage sans lot est tracé, l’unité d’un stock présent reste protégée", async () => {
  await transaction(() => saveCatalogueProductInDatabase(db, {id: "product", create: false, draft: {quantity: 4}}, id, now));
  await assertInventoryBalance(db, await stockProductInDatabase(db, "product"));
  await expect(transaction(() => saveCatalogueProductInDatabase(db, {id: "product", create: false, draft: {unit: "boîte"}}, id, now))).rejects.toThrow("unité ne peut pas changer");
  await expect(transaction(() => saveCatalogueProductInDatabase(db, {id: "product", create: false, draft: {stockTracked: false, quantity: 0}}, id, now))).rejects.toThrow("suivi ne peut pas");
  expect(balance()).toBe(4);
  expect(connection.prepare("SELECT unit FROM products WHERE id='product'").get()?.unit).toBe("ml");
});

it("un comptage refusé ne sauvegarde pas partiellement les autres champs du catalogue", async () => {
  await transaction(() => registerLotInDatabase(db, incoming("A", 4), id, now));
  await expect(transaction(() => saveCatalogueProductInDatabase(db, {id: "product", create: false, draft: {name: "Modification non validée", quantity: 1}}, id, now))).rejects.toThrow("onglet Lots");
  expect(connection.prepare("SELECT name FROM products WHERE id='product'").get()?.name).toBe("Produit de test");
  expect(balance()).toBe(4);
});

it("le suivi peut démarrer sur une référence vide sans inventer ni perdre de stock", async () => {
  connection.exec("UPDATE products SET stock_tracked=0 WHERE id='product'");
  await transaction(() => saveCatalogueProductInDatabase(db, {id: "product", create: false, draft: {stockTracked: true, unit: "boîte", quantity: 2}}, id, now));
  expect(balance()).toBe(2);
  expect(connection.prepare("SELECT unit_snapshot FROM stock_movements").get()?.unit_snapshot).toBe("boîte");
  await assertInventoryBalance(db, await stockProductInDatabase(db, "product"));
});

it("disponibilité et alerte : quantités utilisables, périmées et proches péremption proviennent des vrais lots", async () => {
  await transaction(() => registerLotInDatabase(db, incoming("PERIME", 3, "2026-08-01T10:00:00Z", "2026-10-13"), id, now));
  await transaction(() => registerLotInDatabase(db, incoming("PROCHE", 2.5, "2026-09-01T10:00:00Z", "2026-11-01"), id, now));
  await transaction(() => registerLotInDatabase(db, incoming("LOINTAIN", 4, "2026-09-10T10:00:00Z", "2027-12-01"), id, now));
  const snapshot = await inventorySnapshotInDatabase(db);
  expect(snapshot.supported).toBe(true);
  expect(summarizeInventory(snapshot.balances, "2026-10-14").get("product")).toMatchObject({availableQuantity: 6.5, expiredQuantity: 3, expiringQuantity: 2.5, lotsCount: 3, invalid: false});
  expect(balance()).toBe(9.5);
});

it("un lot sans péremption ne récupère pas une date générique du catalogue", async () => {
  connection.exec("UPDATE products SET expiry_date='2026-10-13' WHERE id='product'");
  const saved = await transaction(() => registerLotInDatabase(db, incoming("SANS-DATE", 2, "2026-09-01T10:00:00Z", null), id, now));
  expect(connection.prepare("SELECT expiry_date_snapshot FROM stock_movement_allocations WHERE movement_id=?").get(saved.movementId)?.expiry_date_snapshot).toBeNull();
  await consume(1);
  expect(balance()).toBe(1);
});
