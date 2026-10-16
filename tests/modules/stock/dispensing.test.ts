import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { runSqliteMigrations } from "@/services/sqlite/migration-runner";
import { SQLITE_MIGRATIONS } from "@/services/sqlite/migrations";
import type { StockDatabase } from "@/modules/stock/services/stock-store";

const harness = vi.hoisted(() => ({db: null as StockDatabase | null, nextId: 0}));
vi.mock("@/services/sqlite/database", () => ({
  generateId: () => `dispensing-id-${++harness.nextId}`,
  toSQLiteTimestamp: (date: Date) => date.toISOString(),
  runDbRead: (operation: (db: StockDatabase) => Promise<unknown>) => operation(harness.db!),
  runDbTransaction: async (operation: (db: StockDatabase) => Promise<unknown>) => {
    const db = harness.db!;
    await db.execute("BEGIN IMMEDIATE");
    try { const result = await operation(db); await db.execute("COMMIT"); return result; }
    catch (error) { await db.execute("ROLLBACK"); throw error; }
  },
}));
import { createInvoiceDraft, getInvoice, issueInvoice, updateInvoiceDraft } from "@/services/billingService";
import { consumeConsultationProductInDatabase, dispensePrescriptionInDatabase } from "@/modules/stock/services/clinical-stock-store";
import { draftPriceLines } from "@/modules/finances/lib/draft-prices";
import { registerLotInDatabase } from "@/modules/stock/services/lot-store";
let connection: DatabaseSync;
let db: StockDatabase;
let count = 0;
const id = () => `clinical-test-${++count}`;
const now = "2026-10-14T11:00:00Z";
async function transaction<T>(operation: () => Promise<T>): Promise<T> {
  connection.exec("BEGIN IMMEDIATE");
  try { const result = await operation(); connection.exec("COMMIT"); return result; }
  catch (error) { connection.exec("ROLLBACK"); throw error; }
}
const input = {id: "dispensation", prescriptionId: "rx", authorId: "vet", lines: [{prescriptionItemId: "item", productId: "product", quantity: 2.5}]};
beforeEach(async () => {
  connection = new DatabaseSync(":memory:"); count = 0; harness.nextId = 0;
  db = {
    async execute(sql, values = []) { if (!values.length) {connection.exec(sql); return {rowsAffected: 0};}
      return {rowsAffected: Number(connection.prepare(sql.replace(/\$\d+/g, "?")).run(...values).changes)}; },
    async select<T>(sql: string, values: unknown[] = []) { return connection.prepare(sql.replace(/\$\d+/g, "?")).all(...values) as T; },
  };
  harness.db = db;
  await runSqliteMigrations(db, SQLITE_MIGRATIONS);
  connection.exec(`PRAGMA foreign_keys=ON;
    INSERT INTO users(id,email,password_hash,display_name,role) VALUES('vet','test@example.invalid','test','Vétérinaire de test','vet_principal');
    INSERT INTO owners(id,first_name,last_name,phone) VALUES('owner','Test','Stock','');
    INSERT INTO patients(id,owner_id,name,species) VALUES('patient','owner','Patient de test','Chien'),('other','owner','Autre patient de test','Chat');
    INSERT INTO appointments(id,patient_id,owner_id,vet_id,title,start_time,end_time,status,type) VALUES('appointment','patient','owner','vet','Consultation de test','2026-10-14T10:00:00Z','2026-10-14T11:00:00Z','in_progress','Consultation');
    INSERT INTO products(id,name,category,unit,quantity,purchase_price_amount,sale_price_amount,created_at) VALUES('product','Produit de test','Médicaments','ml',10,500,1200,'2026-01-01 00:00:00');
    INSERT INTO prescriptions(id,appointment_id,patient_id,vet_id,prescription_date,status,signed_at) VALUES('rx','appointment','patient','vet','2026-10-14','signed','2026-10-14T10:50:00Z');
    INSERT INTO prescription_items(id,prescription_id,medication_name,dosage_per_kg,dosage_unit,frequency,duration,quantity,sort_order) VALUES('item','rx','Produit prescrit',1,'mg/kg','2 fois/jour','7 jours','4 comprimés/jour pendant 7 jours',0);
  `);
});
afterEach(() => {harness.db = null; connection.close();});

it("la signature et les instructions n’entraînent aucune sortie de stock", () => {
  expect(connection.prepare("SELECT quantity FROM products").get()?.quantity).toBe(10);
  expect(connection.prepare("SELECT * FROM stock_movements").all()).toHaveLength(0);
});
it("consultation : consommation, brouillon et trace dans un seul commit, puis reprise sans doublon", async () => {
  const request = {id: "use", appointmentId: "appointment", patientId: "patient", productId: "product", quantity: 2, authorId: "vet"};
  const saved = await transaction(() => consumeConsultationProductInDatabase(db, request, id, now));
  expect(connection.prepare("SELECT quantity FROM products").get()?.quantity).toBe(8);
  const invoice = await getInvoice(saved.invoice_id!);
  expect(invoice).toMatchObject({documentStatus: "draft", patientId: "patient", grossAmount: 2400});
  expect(connection.prepare("SELECT invoice_id,invoice_line_id FROM stock_movements").get()).toEqual({invoice_id: invoice!.id, invoice_line_id: invoice!.lines[0].id});
  await transaction(() => consumeConsultationProductInDatabase(db, request, id, now));
  expect(connection.prepare("SELECT * FROM stock_movements").all()).toHaveLength(1);
  await expect(transaction(() => consumeConsultationProductInDatabase(db, {...request, patientId: "other"}, id, now))).rejects.toThrow();
});
it("dispensation : quantité humaine, produit, patient, facture et statut conservés", async () => {
  const saved = await transaction(() => dispensePrescriptionInDatabase(db, input, id, now));
  expect(connection.prepare("SELECT quantity FROM products").get()?.quantity).toBe(7.5);
  expect(connection.prepare("SELECT status FROM prescriptions").get()?.status).toBe("dispensed");
  expect(connection.prepare("SELECT quantity FROM prescription_items").get()?.quantity).toBe("4 comprimés/jour pendant 7 jours");
  const invoice = await getInvoice(saved.invoice_id!);
  expect(invoice).toMatchObject({documentStatus: "draft", patientId: "patient", appointmentId: "appointment", grossAmount: 3000});
  expect(invoice!.lines[0]).toMatchObject({productId: "product", quantityMilli: 2500, unitAmount: 1200});
  expect(connection.prepare("SELECT * FROM stock_movements").get()).toMatchObject({source_type: "prescription", source_id: "rx", source_line_id: "item", quantity_delta: -2.5, invoice_id: invoice!.id, invoice_line_id: invoice!.lines[0].id});
  expect(connection.prepare("SELECT * FROM prescription_dispensation_lines").get()).toMatchObject({prescription_item_id: "item", quantity: 2.5, product_id: "product"});
});
it("rejouer une dispensation ne consomme ni ne facture deux fois, et un autre contenu est refusé", async () => {
  const first = await transaction(() => dispensePrescriptionInDatabase(db, input, id, now));
  expect(await transaction(() => dispensePrescriptionInDatabase(db, {...input, id: "retry"}, id, now))).toMatchObject(first);
  await expect(transaction(() => dispensePrescriptionInDatabase(db, {...input, lines: [{...input.lines[0], quantity: 3}]}, id, now))).rejects.toThrow("déjà été dispensée");
  expect(connection.prepare("SELECT count(*) AS n FROM invoice_lines").get()?.n).toBe(1);
  expect(connection.prepare("SELECT quantity FROM products").get()?.quantity).toBe(7.5);
});
it("échec de facture : tout revient à l’état initial, réessai possible", async () => {
  connection.exec("CREATE TRIGGER fail_invoice BEFORE INSERT ON invoice_lines BEGIN SELECT RAISE(ABORT,'test failure'); END;");
  await expect(transaction(() => dispensePrescriptionInDatabase(db, input, id, now))).rejects.toThrow();
  expect(connection.prepare("SELECT quantity FROM products").get()?.quantity).toBe(10);
  expect(connection.prepare("SELECT status FROM prescriptions").get()?.status).toBe("signed");
  for (const table of ["stock_movements", "invoices", "prescription_dispensations"]) expect(connection.prepare(`SELECT * FROM ${table}`).all()).toHaveLength(0);
  connection.exec("DROP TRIGGER fail_invoice");
  await transaction(() => dispensePrescriptionInDatabase(db, input, id, now));
  expect(connection.prepare("SELECT quantity FROM products").get()?.quantity).toBe(7.5);
});
it("additionne les lignes d’un même produit avant de vérifier la disponibilité", async () => {
  connection.exec("INSERT INTO prescription_items(id,prescription_id,medication_name,dosage_per_kg,dosage_unit,frequency,duration,sort_order) VALUES('item-2','rx','Autre ligne',1,'mg/kg','1 fois/jour','3 jours',1)");
  await expect(transaction(() => dispensePrescriptionInDatabase(db, {...input, lines: [{prescriptionItemId: "item", productId: "product", quantity: 6}, {prescriptionItemId: "item-2", productId: "product", quantity: 6}]}, id, now))).rejects.toMatchObject({code: "INSUFFICIENT_STOCK"});
  expect(connection.prepare("SELECT quantity FROM products").get()?.quantity).toBe(10);
  expect(connection.prepare("SELECT * FROM stock_movements").all()).toHaveLength(0);
});
it("une ordonnance en brouillon, une ligne étrangère ou incomplète ne peut pas être dispensée", async () => {
  connection.exec("UPDATE prescriptions SET status='draft' WHERE id='rx'");
  await expect(transaction(() => dispensePrescriptionInDatabase(db, input, id, now))).rejects.toThrow("Signez");
  connection.exec("UPDATE prescriptions SET status='signed' WHERE id='rx'");
  for (const lines of [[], [{...input.lines[0], prescriptionItemId: "foreign"}], [input.lines[0], input.lines[0]]]) {
    await expect(transaction(() => dispensePrescriptionInDatabase(db, {...input, lines}, id, now))).rejects.toThrow("chaque ligne");
  }
});
it("ajoute au brouillon de la consultation et préserve les lignes existantes", async () => {
  const original = await createInvoiceDraft({id: "current-draft", appointmentId: "appointment", patientId: "patient", ownerId: "owner", lines: [{description: "Acte déjà saisi", quantityMilli: 1000, unitAmount: 4000}]});
  const saved = await transaction(() => dispensePrescriptionInDatabase(db, input, id, now));
  expect(saved.invoice_id).toBe(original.id);
  const invoice = await getInvoice(original.id);
  expect(invoice!.lines[0].id).toBe(original.lines[0].id);
  expect(invoice!.grossAmount).toBe(7000);
});
it("modifier le tarif puis émettre conserve la trace et ne consomme pas une seconde fois", async () => {
  const saved = await transaction(() => dispensePrescriptionInDatabase(db, input, id, now));
  const draft = (await getInvoice(saved.invoice_id!))!;
  const prices = draftPriceLines(draft, {[draft.lines[0].id]: "15,00"});
  const updated = await updateInvoiceDraft({invoiceId: draft.id, lines: prices});
  expect(updated.lines[0].id).toBe(draft.lines[0].id);
  expect(connection.prepare("SELECT invoice_line_id FROM stock_movements").get()?.invoice_line_id).toBe(updated.lines[0].id);
  await issueInvoice({invoiceId: draft.id, idempotencyKey: "issue-dispensed", clinicSnapshot: {name: "Clinique de test"}});
  expect(connection.prepare("SELECT quantity FROM products").get()?.quantity).toBe(7.5);
  expect(connection.prepare("SELECT * FROM stock_movements").all()).toHaveLength(1);
});
it("le contenu d’une ordonnance dispensée est protégé jusqu’en SQLite", async () => {
  await transaction(() => dispensePrescriptionInDatabase(db, input, id, now));
  expect(() => connection.exec("UPDATE prescriptions SET status='draft' WHERE id='rx'")).toThrow();
  expect(() => connection.exec("UPDATE prescription_items SET quantity='99 boîtes' WHERE id='item'")).toThrow();
  expect(() => connection.exec("DELETE FROM prescription_items WHERE id='item'")).toThrow();
});

async function identifyLot(quantity: number, expiryDate: string | null = "2027-10-01") {
  await transaction(() => registerLotInDatabase(db, {id: "identify", productId: "product", lotNumber: "LOT-CHOISI", quantity,
    expiryDate, mode: "identify", locationId: "stock-main", authorId: "vet"}, id, now));
  return String(connection.prepare("SELECT id FROM product_lots WHERE lot_number='LOT-CHOISI'").get()!.id);
}

it("lot choisi : allocation, facture et reprise conservent le choix explicite", async () => {
  const lotId = await identifyLot(3);
  const selected = {...input, lines: [{...input.lines[0], lotId}]};
  const saved = await transaction(() => dispensePrescriptionInDatabase(db, selected, id, now));
  expect(connection.prepare("SELECT quantity FROM stock_balances WHERE lot_id=?").get(lotId)?.quantity).toBe(0.5);
  const line = connection.prepare("SELECT * FROM prescription_dispensation_lines").get()!;
  expect(line.selection_json).toBe(JSON.stringify({lotId}));
  expect(connection.prepare("SELECT lot_number_snapshot,quantity_delta FROM stock_movement_allocations WHERE movement_id=?").all(line.movement_id)).toEqual([{lot_number_snapshot: "LOT-CHOISI", quantity_delta: -2.5}]);
  expect((await getInvoice(saved.invoice_id!))!.lines[0].id).toBe(line.invoice_line_id);
  expect(await transaction(() => dispensePrescriptionInDatabase(db, selected, id, now))).toMatchObject(saved);
  await expect(transaction(() => dispensePrescriptionInDatabase(db, input, id, now))).rejects.toThrow("déjà été dispensée");
  expect(connection.prepare("SELECT quantity FROM products").get()?.quantity).toBe(7.5);
});

it("réserve le lot imposé avant une ligne FIFO et garde l’ordre de la facture", async () => {
  const lotId = await identifyLot(5);
  connection.exec("INSERT INTO prescription_items(id,prescription_id,medication_name,dosage_per_kg,dosage_unit,frequency,duration,sort_order) VALUES('item-2','rx','Deuxième produit',1,'mg/kg','1 fois/jour','3 jours',1)");
  const selected = {...input, lines: [{prescriptionItemId: "item", productId: "product", quantity: 5}, {prescriptionItemId: "item-2", productId: "product", quantity: 5, lotId}]};
  const saved = await transaction(() => dispensePrescriptionInDatabase(db, selected, id, now));
  expect(connection.prepare("SELECT quantity FROM products").get()?.quantity).toBe(0);
  const allocated = connection.prepare(`SELECT d.prescription_item_id,a.lot_number_snapshot FROM prescription_dispensation_lines d
    JOIN stock_movement_allocations a ON a.movement_id=d.movement_id ORDER BY d.prescription_item_id`).all();
  expect(allocated).toEqual([{prescription_item_id: "item", lot_number_snapshot: null}, {prescription_item_id: "item-2", lot_number_snapshot: "LOT-CHOISI"}]);
  const detail = (await getInvoice(saved.invoice_id!))!;
  const dispensed = connection.prepare("SELECT prescription_item_id,invoice_line_id FROM prescription_dispensation_lines ORDER BY prescription_item_id").all();
  expect(dispensed.map(row => row.invoice_line_id)).toEqual(detail.lines.map(row => row.id));
});

it("le total disponible ne suffit pas à autoriser un lot choisi insuffisant ou périmé", async () => {
  const lotId = await identifyLot(1);
  await expect(transaction(() => dispensePrescriptionInDatabase(db, {...input, lines: [{...input.lines[0], lotId}]}, id, now))).rejects.toMatchObject({code: "INSUFFICIENT_STOCK"});
  connection.prepare("UPDATE product_lots SET expiry_date='2026-09-01' WHERE id=?").run(lotId);
  await expect(transaction(() => dispensePrescriptionInDatabase(db, {...input, lines: [{...input.lines[0], quantity: 1, lotId}]}, id, now))).rejects.toMatchObject({code: "INSUFFICIENT_STOCK"});
  expect(connection.prepare("SELECT quantity FROM products").get()?.quantity).toBe(10);
  expect(connection.prepare("SELECT status FROM prescriptions").get()?.status).toBe("signed");
  expect(connection.prepare("SELECT * FROM invoices").all()).toHaveLength(0);
});

it("un échec de facture restaure aussi les soldes par lot et toutes les allocations", async () => {
  const lotId = await identifyLot(3);
  const initial = connection.prepare("SELECT * FROM stock_balances ORDER BY id").all();
  const allocations = connection.prepare("SELECT * FROM stock_movement_allocations ORDER BY id").all();
  connection.exec("CREATE TRIGGER fail_lot_invoice BEFORE INSERT ON invoice_lines BEGIN SELECT RAISE(ABORT,'test failure'); END;");
  await expect(transaction(() => dispensePrescriptionInDatabase(db, {...input, lines: [{...input.lines[0], lotId}]}, id, now))).rejects.toThrow("test failure");
  expect(connection.prepare("SELECT * FROM stock_balances ORDER BY id").all()).toEqual(initial);
  expect(connection.prepare("SELECT * FROM stock_movement_allocations ORDER BY id").all()).toEqual(allocations);
  expect(connection.prepare("SELECT quantity FROM products").get()?.quantity).toBe(10);
  expect(connection.prepare("SELECT * FROM prescription_dispensations").all()).toHaveLength(0);
});
