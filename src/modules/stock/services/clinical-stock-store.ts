import { StockError, stockQuantity, stockQuantityLabel } from "@/domain/stock";
import { appendInvoiceDraftLinesInDatabase, createInvoiceDraftInDatabase } from "@/services/billingService";
import type { BillingLineInput, InvoiceDetail } from "@/types/db";
import { assertStockAvailable, consumeStockInDatabase, stockProductInDatabase, type StockDatabase, type StockProduct } from "./stock-store";
import type { StockSelection } from "@/domain/stock-fifo";
import { hasStockLots } from "./lot-consumption-store";
import { stockSelectionKey } from "./lot-store";

export interface ClinicalUseInput {
  id: string; appointmentId: string; patientId: string; productId: string; quantity: number; authorId: string;
}
export interface DispensingLineInput extends StockSelection { prescriptionItemId: string; productId: string; quantity: number }
export interface DispensingInput { id: string; prescriptionId: string; authorId: string; lines: DispensingLineInput[] }
export interface ClinicalStockUse { id: string; product_id: string; product_name: string; unit: string; quantity: number; invoice_id: string | null; movement_id: string | null; created_at: string }
export interface Dispensation { id: string; prescription_id: string; invoice_id: string | null; created_at: string }

function requireActor(author: string) {
  if (!author.trim()) throw new StockError("SOURCE_CONFLICT", "Un utilisateur connecté est requis pour valider l’utilisation du stock.");
}

export function stockInvoiceLine(product: StockProduct, quantity: number, label: string): BillingLineInput {
  const exactMilli = Number.isSafeInteger(quantity * 1000);
  return {
    productId: product.id,
    description: `${label} · ${product.name}${exactMilli ? "" : ` (${stockQuantityLabel(quantity, product.unit)})`}`,
    quantityMilli: exactMilli ? quantity * 1000 : 1000,
    unitAmount: exactMilli ? product.sale_price_amount : Math.round(quantity * product.sale_price_amount),
  };
}

async function addClinicalInvoice(db: StockDatabase, input: {appointmentId: string; patientId: string; ownerId: string; authorId: string; id: string}, lines: BillingLineInput[]): Promise<InvoiceDetail> {
  const [draft] = await db.select<{id: string}[]>(
    "SELECT id FROM invoices WHERE appointment_id=? AND patient_id=? AND owner_id=? AND document_status='draft' ORDER BY created_at DESC,id DESC LIMIT 1",
    [input.appointmentId, input.patientId, input.ownerId],
  );
  return draft
    ? appendInvoiceDraftLinesInDatabase(db, draft.id, lines, {userId: input.authorId})
    : createInvoiceDraftInDatabase(db, {id: input.id, appointmentId: input.appointmentId, patientId: input.patientId, ownerId: input.ownerId,
      actor: {userId: input.authorId}, notes: "Produits utilisés ou dispensés. Vérifiez les tarifs avant émission.", lines});
}

export async function consumeConsultationProductInDatabase(db: StockDatabase, input: ClinicalUseInput, id: () => string, now: string): Promise<ClinicalStockUse> {
  requireActor(input.authorId);
  const quantity = stockQuantity(input.quantity);
  const [existing] = await db.select<(ClinicalStockUse & {patient_id: string; appointment_id: string})[]>(
    "SELECT u.*,p.name AS product_name,p.unit FROM clinical_stock_uses u JOIN products p ON p.id=u.product_id WHERE u.id=?", [input.id]);
  if (existing) {
    if (existing.product_id !== input.productId || existing.quantity !== quantity || existing.patient_id !== input.patientId || existing.appointment_id !== input.appointmentId) {
      throw new StockError("SOURCE_CONFLICT", "Cette utilisation a déjà été enregistrée avec d’autres informations.");
    }
    return existing;
  }
  const [context] = await db.select<{owner_id: string; status: string}[]>(
    "SELECT p.owner_id,a.status FROM appointments a JOIN patients p ON p.id=a.patient_id WHERE a.id=? AND a.patient_id=?", [input.appointmentId, input.patientId]);
  if (!context || ["cancelled", "no_show"].includes(context.status)) throw new StockError("SOURCE_CONFLICT", "Choisissez une consultation valide pour ce patient avant d’utiliser un produit.");
  const product = await assertStockAvailable(db, input.productId, quantity, {}, now);
  const movementId = await consumeStockInDatabase(db, {productId: input.productId, quantity, sourceType: "consultation", sourceId: input.appointmentId,
    sourceLineId: input.id, sourceLabel: "Produit utilisé en consultation", patientId: input.patientId, authorId: input.authorId, occurredAt: now}, id);
  const invoice = await addClinicalInvoice(db, {...input, ownerId: context.owner_id, id: `clinical-use-invoice:${input.id}`}, [stockInvoiceLine(product, quantity, "Consultation")]);
  const invoiceLine = invoice.lines.at(-1)!;
  if (movementId) await db.execute("UPDATE stock_movements SET invoice_id=?,invoice_line_id=? WHERE id=?", [invoice.id, invoiceLine.id, movementId]);
  await db.execute("INSERT INTO clinical_stock_uses(id,appointment_id,patient_id,product_id,quantity,author_id,invoice_id,movement_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    [input.id, input.appointmentId, input.patientId, input.productId, quantity, input.authorId, invoice.id, movementId, now]);
  return {id: input.id, product_id: product.id, product_name: product.name, unit: product.unit, quantity, invoice_id: invoice.id, movement_id: movementId, created_at: now};
}

export async function dispensePrescriptionInDatabase(db: StockDatabase, input: DispensingInput, id: () => string, now: string): Promise<Dispensation> {
  requireActor(input.authorId);
  const [rx] = await db.select<{id: string; status: string; patient_id: string; appointment_id: string; owner_id: string}[]>(
    "SELECT r.*,p.owner_id FROM prescriptions r JOIN patients p ON p.id=r.patient_id WHERE r.id=?", [input.prescriptionId]);
  if (!rx) throw new StockError("SOURCE_CONFLICT", "Cette ordonnance n’existe plus.");
  const preparedInput = input.lines.map(line => ({...line, quantity: stockQuantity(line.quantity)}));
  const lotsEnabled = await hasStockLots(db);
  if (!lotsEnabled && preparedInput.some(line => line.lotId !== undefined || line.locationId)) throw new StockError("SOURCE_CONFLICT", "Rouvrez l’application pour activer la gestion des lots avant cette sélection.");
  const [existing] = await db.select<Dispensation[]>("SELECT * FROM prescription_dispensations WHERE prescription_id=?", [rx.id]);
  if (existing) {
    const recorded = await db.select<{prescription_item_id: string; product_id: string; quantity: number; selection_json: string}[]>(
      `SELECT prescription_item_id,product_id,quantity,${lotsEnabled ? "selection_json" : "'{}' AS selection_json"} FROM prescription_dispensation_lines WHERE dispensation_id=?`, [existing.id]);
    if (recorded.length !== preparedInput.length || !recorded.every(line => preparedInput.some(item => item.prescriptionItemId === line.prescription_item_id && item.productId === line.product_id && item.quantity === line.quantity && stockSelectionKey(item) === line.selection_json))) {
      throw new StockError("SOURCE_CONFLICT", "Cette ordonnance a déjà été dispensée. Sa consommation ne peut pas être modifiée.");
    }
    return existing;
  }
  if (rx.status !== "signed") throw new StockError("SOURCE_CONFLICT", "Signez l’ordonnance avant de la dispenser.");
  const items = await db.select<{id: string; medication_name: string}[]>("SELECT id,medication_name FROM prescription_items WHERE prescription_id=? ORDER BY sort_order,id", [rx.id]);
  if (!items.length || items.length !== preparedInput.length || new Set(preparedInput.map(item => item.prescriptionItemId)).size !== items.length || items.some(item => !preparedInput.some(line => line.prescriptionItemId === item.id))) {
    throw new StockError("SOURCE_CONFLICT", "Vérifiez le produit et la quantité de chaque ligne de l’ordonnance avant de dispenser.");
  }
  const totals = new Map<string, number>();
  for (const line of preparedInput) totals.set(line.productId, stockQuantity((totals.get(line.productId) ?? 0) + line.quantity));
  for (const [productId, total] of totals) {
    const product = await assertStockAvailable(db, productId, total, {}, now);
    if (!product.stock_tracked) throw new StockError("PRODUCT_MISSING", "Une ordonnance se dispense avec des produits physiques, pas avec une prestation.");
  }
  const prepared: {line: DispensingLineInput; product: StockProduct; movementId: string | null; invoiceLine: BillingLineInput}[] = [];
  for (const item of items) {
    const line = preparedInput.find(line => line.prescriptionItemId === item.id)!;
    const product = await stockProductInDatabase(db, line.productId);
    prepared.push({line, product, movementId: null, invoiceLine: stockInvoiceLine(product, line.quantity, "Ordonnance")});
  }
  // Reserve explicit choices first, so a preceding automatic line cannot consume a chosen lot.
  const specificity = (line: DispensingLineInput) => (line.lotId === undefined ? 0 : 2) + (line.locationId ? 1 : 0);
  for (const row of [...prepared].sort((a, b) => specificity(b.line) - specificity(a.line))) {
    row.movementId = await consumeStockInDatabase(db, {productId: row.product.id, quantity: row.line.quantity,
      lotId: row.line.lotId, locationId: row.line.locationId, sourceType: "prescription", sourceId: rx.id,
      sourceLineId: row.line.prescriptionItemId, sourceLabel: `Ordonnance · ${items.find(item => item.id === row.line.prescriptionItemId)!.medication_name}`,
      patientId: rx.patient_id, authorId: input.authorId, occurredAt: now}, id);
  }
  const invoice = await addClinicalInvoice(db, {appointmentId: rx.appointment_id, patientId: rx.patient_id, ownerId: rx.owner_id,
    authorId: input.authorId, id: `dispense-invoice:${rx.id}`}, prepared.map(line => line.invoiceLine));
  await db.execute("INSERT INTO prescription_dispensations(id,prescription_id,patient_id,author_id,invoice_id,created_at) VALUES (?,?,?,?,?,?)", [input.id, rx.id, rx.patient_id, input.authorId, invoice.id, now]);
  const appended = invoice.lines.slice(-prepared.length);
  for (const [index, row] of prepared.entries()) {
    await db.execute(`INSERT INTO prescription_dispensation_lines(id,dispensation_id,prescription_item_id,product_id,product_name,unit,quantity,movement_id,invoice_line_id${lotsEnabled ? ",selection_json" : ""}) VALUES (?,?,?,?,?,?,?,?,?${lotsEnabled ? ",?" : ""})`,
      [id(), input.id, row.line.prescriptionItemId, row.product.id, row.product.name, row.product.unit, row.line.quantity, row.movementId, appended[index].id, ...(lotsEnabled ? [stockSelectionKey(row.line)] : [])]);
    await db.execute("UPDATE stock_movements SET invoice_id=?,invoice_line_id=? WHERE id=?", [invoice.id, appended[index].id, row.movementId]);
  }
  await db.execute("UPDATE prescriptions SET status='dispensed',updated_at=? WHERE id=? AND status='signed'", [now, rx.id]);
  return {id: input.id, prescription_id: rx.id, invoice_id: invoice.id, created_at: now};
}
