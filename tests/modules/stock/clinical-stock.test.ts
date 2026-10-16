import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { runSqliteMigrations } from "@/services/sqlite/migration-runner";
import { SQLITE_MIGRATIONS } from "@/services/sqlite/migrations";
import { createCareStore, type CareDatabase } from "@/modules/care-tasks/store";
import { subscribeCareTaskCompleted } from "@/modules/care-tasks/hooks";
import { StockError, stockQuantity } from "@/domain/stock";
import { consumeStockInDatabase, changeStockInDatabase } from "@/modules/stock/services/stock-store";

let db: DatabaseSync;
let adapter: CareDatabase;
let store: ReturnType<typeof createCareStore>;
let counter: number;
const nextId = () => `stock-test-${++counter}`;
async function transaction<T>(operation: (db: CareDatabase) => Promise<T>): Promise<T> {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = await operation(adapter);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
const draft = {
  patientId: "patient", label: "Produit administré", type: "medicament" as const,
  scheduledAt: "2026-10-14T10:00:00Z", productId: "product", productQuantity: 2.25,
};
beforeEach(async () => {
  db = new DatabaseSync(":memory:");
  counter = 0;
  adapter = {
    async select<T>(sql: string, values: unknown[] = []) {
      return db.prepare(sql.replace(/\$\d+/g, "?")).all(...values) as T;
    },
    async execute(sql: string, values: unknown[] = []) {
      if (!values.length) { db.exec(sql); return {rowsAffected: 0}; }
      return {rowsAffected: Number(db.prepare(sql.replace(/\$\d+/g, "?")).run(...values).changes)};
    },
  };
  await runSqliteMigrations(adapter, SQLITE_MIGRATIONS);
  db.exec(`PRAGMA foreign_keys=ON;
    INSERT INTO owners(id,first_name,last_name,phone) VALUES('owner','Test','Stock','');
    INSERT INTO patients(id,owner_id,name,species) VALUES('patient','owner','Patient de test','Chien');
    INSERT INTO products(id,name,category,unit,quantity,sale_price_amount,purchase_price_amount,created_at) VALUES('product','Produit de test','Médicaments','ml',10,500,0,'2026-01-01 00:00:00');
    INSERT INTO products(id,name,category,unit,quantity,sale_price_amount,stock_tracked,purchase_price_amount) VALUES('service','Consultation de test','Service','acte',0,2500,0,0);
  `);
  store = createCareStore({read: fn => fn(adapter), transaction}, nextId, () => new Date("2026-10-14T10:30:00Z"));
});
afterEach(() => db.close());

it("planifier et commencer ne consomment pas le stock", async () => {
  const task = await store.create(draft, "vet");
  await store.transition(task.id, "en_cours", "vet");
  expect(db.prepare("SELECT quantity FROM products WHERE id='product'").get()?.quantity).toBe(10);
  expect(db.prepare("SELECT * FROM stock_movements").all()).toHaveLength(0);
});
it("valide le soin et sa consommation décimale avant l’événement, une seule fois", async () => {
  const task = await store.create(draft, "vet");
  const listener = vi.fn(() => {
    expect(db.prepare("SELECT quantity FROM products WHERE id='product'").get()?.quantity).toBe(7.75);
    expect(db.prepare("SELECT * FROM stock_movements").get()).toMatchObject({
      type: "usage", quantity_delta: -2.25, quantity_after: 7.75, source_type: "care",
      source_id: task.id, source_line_id: task.id, source_label: draft.label,
      patient_id: "patient", author_id: "vet", created_at: "2026-10-14T10:30:00.000Z",
    });
  });
  const unsubscribe = subscribeCareTaskCompleted(listener);
  try {
    await store.transition(task.id, "fait", "vet");
    expect(listener).toHaveBeenCalledTimes(1);
    await expect(store.transition(task.id, "fait", "vet")).rejects.toThrow();
    expect(db.prepare("SELECT count(*) AS n FROM stock_movements").get()?.n).toBe(1);
  } finally { unsubscribe(); }
});
it("insuffisance : statut, historique et stock intacts, aucune notification de fin", async () => {
  const task = await store.create({...draft, productQuantity: 11}, "vet");
  const listener = vi.fn();
  const unsubscribe = subscribeCareTaskCompleted(listener);
  try {
    await expect(store.transition(task.id, "fait", "vet")).rejects.toMatchObject({code: "INSUFFICIENT_STOCK"});
    expect((await store.get(task.id))?.statut).toBe("a_faire");
    expect(await store.history(task.id)).toHaveLength(1);
    expect(db.prepare("SELECT quantity FROM products WHERE id='product'").get()?.quantity).toBe(10);
    expect(db.prepare("SELECT * FROM stock_movements").all()).toHaveLength(0);
    expect(listener).not.toHaveBeenCalled();
  } finally { unsubscribe(); }
});
it("une erreur de mouvement annule aussi le statut et le solde", async () => {
  const task = await store.create(draft, "vet");
  db.exec("CREATE TRIGGER fail_stock BEFORE INSERT ON stock_movements BEGIN SELECT RAISE(ABORT,'test failure'); END;");
  await expect(store.transition(task.id, "fait", "vet")).rejects.toThrow();
  expect((await store.get(task.id))?.statut).toBe("a_faire");
  expect(db.prepare("SELECT quantity FROM products WHERE id='product'").get()?.quantity).toBe(10);
});
it("les prestations tarifées sans stock restent validables à zéro", async () => {
  const task = await store.create({...draft, productId: "service", productQuantity: 1}, "vet");
  await store.transition(task.id, "fait", "vet");
  expect(db.prepare("SELECT quantity FROM products WHERE id='service'").get()?.quantity).toBe(0);
  expect(db.prepare("SELECT * FROM stock_movements").all()).toHaveLength(0);
});
it("deux soins relisent le solde courant au lieu du stock affiché lors de la planification", async () => {
  const first = await store.create({...draft, productQuantity: 8}, "vet");
  const second = await store.create({...draft, productQuantity: 8}, "vet");
  await store.transition(first.id, "fait", "vet");
  await expect(store.transition(second.id, "fait", "vet")).rejects.toMatchObject({code: "INSUFFICIENT_STOCK"});
  expect(db.prepare("SELECT quantity FROM products WHERE id='product'").get()?.quantity).toBe(2);
  expect((await store.get(second.id))?.statut).toBe("a_faire");
});
it("origine rejouée : même mouvement, conflit de quantité refusé", async () => {
  const input = {productId: "product", quantity: 0.1, sourceType: "consultation" as const,
    sourceId: "consultation", sourceLineId: "usage", sourceLabel: "Utilisation", patientId: "patient", authorId: "vet", occurredAt: "2026-10-14T10:30:00Z"};
  const movement = await transaction(db => consumeStockInDatabase(db, input, nextId));
  expect(await transaction(db => consumeStockInDatabase(db, input, nextId))).toBe(movement);
  await expect(transaction(db => consumeStockInDatabase(db, {...input, quantity: 0.2}, nextId))).rejects.toMatchObject({code: "SOURCE_CONFLICT"});
  expect(db.prepare("SELECT quantity FROM products WHERE id='product'").get()?.quantity).toBe(9.9);
});
it("quantités absentes, négatives, infinies ou trop précises refusées", async () => {
  for (const quantity of [0, -1, NaN, Infinity, 0.0000001]) {
    expect(() => stockQuantity(quantity)).toThrow(StockError);
    await expect(store.create({...draft, productQuantity: quantity}, "vet")).rejects.toThrow(StockError);
  }
  expect(stockQuantity(0.000001)).toBe(0.000001);
  expect(db.prepare("SELECT * FROM care_tasks").all()).toHaveLength(0);
});
it("un produit supprimé ou archivé ne peut pas être lié à un nouveau soin", async () => {
  await expect(store.create({...draft, productId: "missing"}, "vet")).rejects.toMatchObject({code: "PRODUCT_MISSING"});
  db.exec("UPDATE products SET archived_at='2026-10-14' WHERE id='product'");
  await expect(store.create(draft, "vet")).rejects.toMatchObject({code: "PRODUCT_MISSING"});
});
it("le réapprovisionnement relit une consommation récente et l’inventaire trace le vrai écart", async () => {
  const task = await store.create({...draft, productQuantity: 2}, "vet");
  await store.transition(task.id, "fait", "vet");
  await transaction(db => changeStockInDatabase(db, {productId: "product", quantity: 3, mode: "restock", reason: "Réception", occurredAt: "2026-10-14T11:00:00Z"}, nextId));
  expect(db.prepare("SELECT quantity FROM products WHERE id='product'").get()?.quantity).toBe(11);
  await transaction(db => changeStockInDatabase(db, {productId: "product", quantity: 7, mode: "adjustment", reason: "Comptage", occurredAt: "2026-10-14T11:05:00Z"}, nextId));
  expect(db.prepare("SELECT * FROM stock_movements WHERE type='adjustment'").get()).toMatchObject({quantity_delta: -4, quantity_after: 7});
});
it("corriger la quantité d’un soin en attente ne consomme rien et journalise la correction", async () => {
  const task = await store.create({...draft, productQuantity: 11}, "vet");
  const corrected = await store.updateProductUsage(task.id, "product", 1.5, "vet");
  expect(corrected.produit_quantite).toBe(1.5);
  expect(db.prepare("SELECT quantity FROM products WHERE id='product'").get()?.quantity).toBe(10);
  expect(await store.history(task.id)).toHaveLength(2);
  await store.transition(task.id, "fait", "vet");
  expect(db.prepare("SELECT quantity FROM products WHERE id='product'").get()?.quantity).toBe(8.5);
  await expect(store.updateProductUsage(task.id, "product", 1, "vet")).rejects.toThrow("terminé");
});

it("les mouvements conservent le nom et l’unité utilisés même si le catalogue change", async () => {
  const task = await store.create(draft, "vet");
  await store.transition(task.id, "fait", "vet");
  await transaction(db => changeStockInDatabase(db, {productId: "product", quantity: 1, mode: "restock", reason: "Réception", occurredAt: "2026-10-14T11:00:00Z"}, nextId));
  db.exec("UPDATE products SET name='Nouveau libellé',unit='boîte' WHERE id='product'");
  for (const movement of db.prepare("SELECT unit_snapshot,product_name_snapshot FROM stock_movements").all()) {
    expect(movement).toMatchObject({unit_snapshot: "ml", product_name_snapshot: "Produit de test"});
  }
});
