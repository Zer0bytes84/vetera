import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { runSqliteMigrations } from "@/services/sqlite/migration-runner";
import { SQLITE_MIGRATIONS } from "@/services/sqlite/migrations";
import { createCareStore, type CareDatabase } from "@/modules/care-tasks/store";
import { careInvoiceId } from "@/modules/care-tasks/domain";
import { registerLotInDatabase } from "@/modules/stock/services/lot-store";
import { returnCareStockInDatabase } from "@/modules/stock/services/care-stock-rollback";
import { stockOperationsSnapshotInDatabase } from "@/modules/stock/services/stock-operations-store";
import { inventorySnapshotInDatabase, summarizeInventory } from "@/modules/stock/services/inventory-store";

const harness = vi.hoisted(() => ({db: null as CareDatabase | null, serial: 0, queue: Promise.resolve()}));
vi.mock("@/services/sqlite/database", () => ({
  generateId: () => `billing-${++harness.serial}`,
  toSQLiteTimestamp: (date: Date) => date.toISOString(),
  runDbRead: async (operation: (db: CareDatabase) => Promise<unknown>) => {
    await harness.queue;
    return operation(harness.db!);
  },
  runDbTransaction: (operation: (db: CareDatabase) => Promise<unknown>) => transaction(operation),
}));
import { billCompletedCareTask, getInvoice, issueCreditNote, issueInvoice, recordPayment } from "@/services/billingService";

let sqlite: DatabaseSync;
let db: CareDatabase;
let store: ReturnType<typeof createCareStore>;
let serial = 0;
const now = "2026-10-15T12:00:00.000Z";
const id = () => `rollback-${++serial}`;
const draft = {patientId: "patient", label: "Injection prescrite", type: "medicament" as const,
  scheduledAt: now, productId: "product", productQuantity: 2.25};

function transaction<T>(operation: (db: CareDatabase) => Promise<T>): Promise<T> {
  const result = harness.queue.then(async () => {
    sqlite.exec("BEGIN IMMEDIATE");
    try {const value = await operation(db); sqlite.exec("COMMIT"); return value;}
    catch (error) {sqlite.exec("ROLLBACK"); throw error;}
  });
  harness.queue = result.then(() => undefined, () => undefined);
  return result;
}
const balance = () => Number(sqlite.prepare("SELECT quantity FROM products WHERE id='product'").get()?.quantity);
const lots = () => sqlite.prepare("SELECT l.lot_number,b.quantity FROM stock_balances b JOIN product_lots l ON l.id=b.lot_id ORDER BY l.lot_number").all();
const snapshot = () => Object.fromEntries(["care_tasks", "care_task_history", "stock_movements", "stock_balances", "stock_movement_allocations", "invoices", "invoice_lines", "audit_log", "payments", "credit_notes"]
  .map(table => [table, sqlite.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]));
async function completed() {
  const task = await store.create(draft, "vet");
  return store.transition(task.id, "fait", "vet");
}
async function issued(taskId: string) {
  const invoice = await billCompletedCareTask(taskId);
  return issueInvoice({invoiceId: invoice.id, idempotencyKey: `issue:${invoice.id}`, clinicSnapshot: {name: "Clinique de test"}, issuedAt: now});
}

beforeEach(async () => {
  sqlite = new DatabaseSync(":memory:"); serial = 0; harness.serial = 0; harness.queue = Promise.resolve();
  db = {
    async select<T>(sql: string, args: unknown[] = []) {return sqlite.prepare(sql.replace(/\$\d+/g, "?")).all(...args) as T;},
    async execute(sql, args = []) {if (!args.length) {sqlite.exec(sql); return {rowsAffected: 0};}
      return {rowsAffected: Number(sqlite.prepare(sql.replace(/\$\d+/g, "?")).run(...args).changes)};},
  };
  harness.db = db;
  await runSqliteMigrations(db, SQLITE_MIGRATIONS);
  sqlite.exec(`PRAGMA foreign_keys=ON;
    INSERT INTO owners(id,first_name,last_name,phone) VALUES('owner','Test','Correction','');
    INSERT INTO patients(id,owner_id,name,species) VALUES('patient','owner','Patient de test','Chien');
    INSERT INTO products(id,name,category,unit,quantity,purchase_price_amount,sale_price_amount)
      VALUES('product','Produit de test','Médicaments','ml',0,100,500);
  `);
  store = createCareStore({read: operation => operation(db), transaction}, id, () => new Date(now));
  for (const [lotNumber, quantity, receivedAt] of [["LOT-A", 2, "2026-01-01T00:00:00Z"], ["LOT-B", 8, "2026-02-01T00:00:00Z"]] as const) {
    await transaction(db => registerLotInDatabase(db, {id: `receipt:${lotNumber}`, productId: "product", lotNumber, quantity,
      receivedAt, expiryDate: "2028-01-01", mode: "receive", locationId: "stock-main", authorId: "vet"}, id, now));
  }
});
afterEach(() => {sqlite.close(); harness.db = null;});

it("revient à faire, restitue la quantité décimale aux lots exacts et conserve auteur et motif", async () => {
  const task = await completed();
  expect(balance()).toBe(7.75);
  const undone = await store.undoCompletion(task.id, "autre-vet", "Validation par erreur", 0);
  expect(undone).toMatchObject({statut: "a_faire", completed_at: null, execute_par: null, completion_revision: 1});
  expect(balance()).toBe(10);
  expect(lots()).toEqual([{lot_number: "LOT-A", quantity: 2}, {lot_number: "LOT-B", quantity: 8}]);
  expect((await store.history(task.id)).at(-1)).toMatchObject({from_status: "fait", to_status: "a_faire", author_id: "autre-vet", reason: "Validation par erreur"});
  const debit = sqlite.prepare("SELECT * FROM stock_movements WHERE type='usage'").get()!;
  expect(sqlite.prepare("SELECT * FROM stock_movements WHERE type='return'").get()).toMatchObject({reference_id: debit.id, quantity_delta: 2.25, quantity_after: 10, author_id: "autre-vet"});
  expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
});

it("un double clic ne crédite jamais deux fois le stock et un appel périmé ne défait pas une nouvelle validation", async () => {
  const task = await completed();
  const results = await Promise.allSettled([store.undoCompletion(task.id, "vet", "Erreur", 0), store.undoCompletion(task.id, "vet", "Erreur", 0)]);
  expect(results.map(result => result.status)).toEqual(["fulfilled", "rejected"]);
  expect(balance()).toBe(10);
  await store.transition(task.id, "fait", "vet");
  await expect(store.undoCompletion(task.id, "vet", "Ancienne action", 0)).rejects.toThrow("vient d’être modifié");
  expect(balance()).toBe(7.75);
  expect((await store.get(task.id))?.statut).toBe("fait");
});

it("le retour de stock est lui-même idempotent, sans réécrire les allocations", async () => {
  const task = await completed();
  const input = {taskId: task.id, completionKey: task.id, authorId: "vet", reason: "Erreur", now};
  const first = await transaction(db => returnCareStockInDatabase(db, input, id));
  const before = snapshot();
  expect(await transaction(db => returnCareStockInDatabase(db, input, id))).toBe(first);
  expect(snapshot()).toEqual(before);
  expect(balance()).toBe(10);
});

it("exige un auteur, un motif et un soin encore validé avant toute écriture", async () => {
  const task = await completed(); const before = snapshot();
  await expect(store.undoCompletion(task.id, " ", "Erreur", 0)).rejects.toThrow("utilisateur connecté");
  await expect(store.undoCompletion(task.id, "vet", " ", 0)).rejects.toThrow("motif");
  await expect(store.undoCompletion("absent", "vet", "Erreur", 0)).rejects.toThrow("n’existe plus");
  expect(snapshot()).toEqual(before);
});

it("annule le brouillon sans effacer ses tarifs, puis revalide avec un nouveau débit et un nouveau brouillon", async () => {
  const task = await completed();
  const first = await billCompletedCareTask(task.id);
  await store.undoCompletion(task.id, "vet", "Erreur", 0);
  expect(await getInvoice(first.id)).toMatchObject({documentStatus: "void", grossAmount: first.grossAmount, lines: first.lines});
  expect((await getInvoice(first.id))?.voidReason).toContain("Erreur");
  await store.transition(task.id, "fait", "vet");
  const second = await billCompletedCareTask(task.id);
  expect(second.id).toBe(careInvoiceId(task.id, 1));
  expect(second.documentStatus).toBe("draft");
  expect(second.id).not.toBe(first.id);
  expect((await billCompletedCareTask(task.id)).id).toBe(second.id);
  expect(balance()).toBe(7.75);
  const debits = sqlite.prepare("SELECT source_line_id,invoice_id FROM stock_movements WHERE type='usage' ORDER BY rowid").all();
  expect(debits).toEqual([{source_line_id: task.id, invoice_id: first.id}, {source_line_id: `${task.id}:validation:1`, invoice_id: second.id}]);
  await store.undoCompletion(task.id, "vet", "Seconde correction", 1);
  expect(balance()).toBe(10);
  expect((await getInvoice(second.id))?.documentStatus).toBe("void");
});

it("ne restitue que le débit du soin corrigé après la consommation d’un autre patient", async () => {
  const task = await completed();
  sqlite.exec("INSERT INTO patients(id,owner_id,name,species) VALUES('other','owner','Autre patient','Chat')");
  const other = await store.create({...draft, patientId: "other", productQuantity: 3}, "vet");
  await store.transition(other.id, "fait", "vet");
  await store.undoCompletion(task.id, "vet", "Erreur", 0);
  expect(balance()).toBe(7);
  expect(lots()).toEqual([{lot_number: "LOT-A", quantity: 2}, {lot_number: "LOT-B", quantity: 5}]);
  expect((await store.get(other.id))?.statut).toBe("fait");
});

it("une péremption ou un archivage ultérieur n’empêche pas la restitution physique", async () => {
  const task = await completed();
  sqlite.exec("UPDATE product_lots SET expiry_date='2026-01-01'; UPDATE products SET archived_at='2026-10-15' WHERE id='product'");
  await store.undoCompletion(task.id, "vet", "Erreur", 0);
  expect(balance()).toBe(10);
  expect(lots()).toEqual([{lot_number: "LOT-A", quantity: 2}, {lot_number: "LOT-B", quantity: 8}]);
  const inventory = await inventorySnapshotInDatabase(db);
  expect(summarizeInventory(inventory.balances, "2026-10-15").get("product")?.availableQuantity).toBe(0);
});

it("restitue un ancien débit sans répartition par lot en stock non affecté, sans inventer de lot", async () => {
  const task = await completed();
  const movement = sqlite.prepare("SELECT id FROM stock_movements WHERE type='usage'").get()!;
  sqlite.prepare("DELETE FROM stock_movement_allocations WHERE movement_id=?").run(movement.id);
  const initialLots = lots();
  await store.undoCompletion(task.id, "vet", "Ancienne validation", 0);
  expect(balance()).toBe(10);
  expect(lots()).toEqual(initialLots);
  expect(sqlite.prepare("SELECT quantity,lot_id,receipt_reference FROM stock_balances WHERE lot_id IS NULL").get())
    .toEqual({quantity: 2.25, lot_id: null, receipt_reference: movement.id});
});

it("un échec d’historique annule ensemble le retour de stock, le statut et l’annulation de facture", async () => {
  const task = await completed(); await billCompletedCareTask(task.id);
  const before = snapshot();
  sqlite.exec("CREATE TRIGGER fail_undo_history BEFORE INSERT ON care_task_history WHEN NEW.from_status='fait' BEGIN SELECT RAISE(ABORT,'history failure'); END;");
  await expect(store.undoCompletion(task.id, "vet", "Erreur", 0)).rejects.toThrow("history failure");
  expect(snapshot()).toEqual(before);
});

it("un échec de restitution d’un lot ne laisse ni retour partiel ni facture annulée", async () => {
  const task = await completed(); await billCompletedCareTask(task.id);
  const before = snapshot();
  sqlite.exec("CREATE TRIGGER fail_return BEFORE INSERT ON stock_movement_allocations WHEN NEW.quantity_delta>0 BEGIN SELECT RAISE(ABORT,'return failure'); END;");
  await expect(store.undoCompletion(task.id, "vet", "Erreur", 0)).rejects.toThrow("return failure");
  expect(snapshot()).toEqual(before);
});

it("refuse une unité modifiée sans convertir implicitement les quantités ni toucher à la facture", async () => {
  const task = await completed(); await billCompletedCareTask(task.id);
  sqlite.exec("UPDATE products SET unit='boîte' WHERE id='product'");
  const before = snapshot();
  await expect(store.undoCompletion(task.id, "vet", "Erreur", 0)).rejects.toThrow("unité d’origine");
  expect(snapshot()).toEqual(before);
});

it("n’invente aucun retour pour un ancien soin sans débit ni pour un soin sans produit", async () => {
  const old = await store.create(draft, "vet");
  sqlite.prepare("UPDATE care_tasks SET statut='fait',execute_par='vet',completed_at=? WHERE id=?").run(now, old.id);
  await store.undoCompletion(old.id, "vet", "Ancienne erreur", 0);
  const task = await store.create({...draft, productId: null}, "vet");
  await store.transition(task.id, "fait", "vet");
  await billCompletedCareTask(task.id);
  await store.undoCompletion(task.id, "vet", "Erreur", 0);
  expect(balance()).toBe(10);
  expect(sqlite.prepare("SELECT * FROM stock_movements WHERE type='return'").all()).toEqual([]);
  expect((await store.get(task.id))?.statut).toBe("a_faire");
});

it("annule une facture émise sans règlement en conservant son numéro et ses lignes", async () => {
  const task = await completed(); const invoice = await issued(task.id);
  await store.undoCompletion(task.id, "vet", "Erreur", 0);
  expect(await getInvoice(invoice.id)).toMatchObject({documentStatus: "void", number: invoice.number, lines: invoice.lines, grossAmount: invoice.grossAmount});
  expect(balance()).toBe(10);
});

it.each(["règlement", "avoir"])("protège une facture avec %s et laisse tout intact avec une erreur en français", async kind => {
  const task = await completed(); const invoice = await issued(task.id);
  if (kind === "règlement") await recordPayment({invoiceId: invoice.id, idempotencyKey: "paid", amount: 100, method: "cash", paidAt: now});
  else await issueCreditNote({invoiceId: invoice.id, idempotencyKey: "credit", issuedAt: now, lines: [{invoiceLineId: invoice.lines[0].id, description: "Correction", quantityMilli: 1000, unitAmount: 100}]});
  const before = snapshot();
  await expect(store.undoCompletion(task.id, "vet", "Erreur", 0)).rejects.toThrow("Régularisez-la dans Finances");
  expect(snapshot()).toEqual(before);
});

it("retire les consommations annulées des propositions de réapprovisionnement", async () => {
  const task = await completed();
  expect((await stockOperationsSnapshotInDatabase(db, now)).consumption[0].quantity).toBe(2.25);
  await store.undoCompletion(task.id, "vet", "Erreur", 0);
  expect((await stockOperationsSnapshotInDatabase(db, now)).consumption).toEqual([]);
  await store.transition(task.id, "fait", "vet");
  expect((await stockOperationsSnapshotInDatabase(db, now)).consumption[0].quantity).toBe(2.25);
});

it("la mise à niveau conserve les soins validés existants et initialise leur révision sans changer leur historique", async () => {
  const old = new DatabaseSync(":memory:");
  const adapter: CareDatabase = {
    async select<T>(sql: string, args: unknown[] = []) {return old.prepare(sql).all(...args) as T;},
    async execute(sql, args = []) {if (!args.length) {old.exec(sql); return {rowsAffected: 0};} return {rowsAffected: Number(old.prepare(sql).run(...args).changes)};},
  };
  try {
    await runSqliteMigrations(adapter, SQLITE_MIGRATIONS.filter(row => row.version <= "034"));
    old.exec(`INSERT INTO owners(id,first_name,last_name,phone) VALUES('o','Test','Migration','');
      INSERT INTO patients(id,owner_id,name,species) VALUES('p','o','Patient de test','Chien');
      INSERT INTO care_tasks(id,patient_id,label,type,heure_prevue,statut,execute_par,completed_at,created_at,updated_at)
        VALUES('c','p','Soin existant','controle','${now}','fait','vet','${now}','${now}','${now}');
      INSERT INTO care_task_history(id,task_id,from_status,to_status,author_id,changed_at) VALUES('h','c','a_faire','fait','vet','${now}');`);
    const original = old.prepare("SELECT * FROM care_tasks").get();
    const history = old.prepare("SELECT * FROM care_task_history").all();
    await expect(runSqliteMigrations(adapter, SQLITE_MIGRATIONS)).resolves.toEqual(["035"]);
    expect(old.prepare("SELECT * FROM care_tasks").get()).toEqual({...original, completion_revision: 0});
    expect(old.prepare("SELECT * FROM care_task_history").all()).toEqual(history);
    expect(() => old.exec("UPDATE care_tasks SET completion_revision=-1")).toThrow();
    await expect(runSqliteMigrations(adapter, SQLITE_MIGRATIONS)).resolves.toEqual([]);
  } finally {old.close();}
});
