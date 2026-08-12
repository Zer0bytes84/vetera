import {
  BillingDomainError,
  assertCreditWithinRemaining,
  assertPaymentWithinBalance,
  assertPositiveAmount,
  assertRefundWithinAvailable,
  calculateInvoiceBalance,
  deriveInvoiceSettlementStatus,
  normalizeBillingLine,
  remainingCreditableAmount,
  refundablePaymentAmount,
  sumBillingLines,
} from "@/domain/billing";
import {
  generateId,
  runDbRead,
  runDbTransaction,
  toSQLiteTimestamp,
} from "@/services/sqlite/database";
import type {
  BillingClinicSnapshot,
  BillingDocumentStatus,
  BillingLineInput,
  BillingOwnerSnapshot,
  CreditNote,
  CreditNoteLine,
  Invoice,
  InvoiceDetail,
  InvoiceLine,
  InvoicePayment,
  InvoiceSettlementStatus,
  Refund,
  TransactionPaymentMethod,
  TransactionSourceType,
} from "@/types/db";

interface BillingDatabase {
  execute(query: string, bindValues?: unknown[]): Promise<unknown>;
  select<T>(query: string, bindValues?: unknown[]): Promise<T>;
}

type DatabaseRow = Record<string, unknown>;
type BillingDocumentKind = "invoice" | "credit_note";
type IdempotentBillingCommand =
  | "issue-invoice"
  | "record-payment"
  | "issue-credit-note"
  | "record-refund";

interface IdempotencyRecord {
  command: IdempotentBillingCommand;
  id: string;
}

interface NormalizedCreditNoteLine {
  invoiceLineId: string | null;
  line: ReturnType<typeof normalizeBillingLine>;
}

/**
 * Credit-note line product provenance is persisted for command replay, while
 * the public CreditNoteLine contract deliberately remains the financial
 * snapshot exposed to callers.
 */
interface PersistedCreditNoteLine extends CreditNoteLine {
  productId: string | null;
}

interface LoadedCreditNote extends Omit<CreditNote, "lines"> {
  lines: PersistedCreditNoteLine[];
}

export interface BillingActor {
  userDisplayName?: string | null;
  userId?: string | null;
}

interface BillingCommandContext {
  actor?: BillingActor;
}

export interface CreateInvoiceDraftInput extends BillingCommandContext {
  appointmentId?: string | null;
  currency?: string;
  dueAt?: Date | string | null;
  id?: string;
  lines?: readonly BillingLineInput[];
  notes?: string | null;
  ownerId: string;
  patientId?: string | null;
}

export interface UpdateInvoiceDraftInput extends BillingCommandContext {
  appointmentId?: string | null;
  currency?: string;
  dueAt?: Date | string | null;
  invoiceId: string;
  lines?: readonly BillingLineInput[];
  notes?: string | null;
  ownerId?: string;
  patientId?: string | null;
}

export interface IssueInvoiceInput extends BillingCommandContext {
  clinicSnapshot: BillingClinicSnapshot;
  dueAt?: Date | string | null;
  idempotencyKey: string;
  invoiceId: string;
  issuedAt?: Date | string;
}

export interface RecordPaymentInput extends BillingCommandContext {
  amount: number;
  idempotencyKey: string;
  invoiceId: string;
  method: TransactionPaymentMethod;
  paidAt?: Date | string;
  reference?: string | null;
}

export interface CreditNoteLineInput extends BillingLineInput {
  invoiceLineId?: string | null;
}

export interface IssueCreditNoteInput extends BillingCommandContext {
  idempotencyKey: string;
  invoiceId: string;
  issuedAt?: Date | string;
  lines: readonly CreditNoteLineInput[];
  reason?: string | null;
}

export interface RecordRefundInput extends BillingCommandContext {
  amount: number;
  idempotencyKey: string;
  method?: TransactionPaymentMethod;
  paymentId: string;
  reason?: string | null;
  refundedAt?: Date | string;
}

export interface VoidPaymentInput extends BillingCommandContext {
  paymentId: string;
  reason?: string | null;
  voidedAt?: Date | string;
}

export interface VoidRefundInput extends BillingCommandContext {
  reason?: string | null;
  refundId: string;
  voidedAt?: Date | string;
}

export interface VoidInvoiceInput extends BillingCommandContext {
  invoiceId: string;
  reason?: string | null;
  voidedAt?: Date | string;
}

export interface VoidCreditNoteInput extends BillingCommandContext {
  creditNoteId: string;
  reason: string;
  voidedAt?: Date | string;
}

export interface ListInvoicesOptions {
  documentStatus?: BillingDocumentStatus;
  limit?: number;
  now?: Date;
  ownerId?: string;
  settlementStatus?: InvoiceSettlementStatus;
}

const INVOICE_SELECT = `
  SELECT
    i.*,
    COALESCE((
      SELECT SUM(c.gross_amount)
      FROM credit_notes c
      WHERE c.invoice_id = i.id AND c.document_status = 'issued'
    ), 0) AS issued_credit_amount,
    COALESCE((
      SELECT SUM(p.amount)
      FROM payments p
      WHERE p.invoice_id = i.id AND p.status = 'completed'
    ), 0) AS completed_payment_amount,
    COALESCE((
      SELECT SUM(r.amount)
      FROM refunds r
      JOIN payments p ON p.id = r.payment_id
      WHERE p.invoice_id = i.id AND r.status = 'completed'
    ), 0) AS completed_refund_amount
  FROM invoices i
`;

const PAYMENT_METHODS = new Set<TransactionPaymentMethod>([
  "cash",
  "card",
  "bank_transfer",
  "check",
  "other",
]);

function valueAsString(value: unknown, fallback = ""): string {
  return value === null || value === undefined ? fallback : String(value);
}

function valueAsNullableString(value: unknown): string | null {
  const result = valueAsString(value).trim();
  return result.length > 0 ? result : null;
}

function valueAsAmount(value: unknown): number {
  const amount = Number(value ?? 0);
  if (!Number.isSafeInteger(amount)) {
    throw new BillingDomainError(
      "MONEY_OVERFLOW",
      "La base contient un montant qui dépasse la précision monétaire prise en charge."
    );
  }
  return amount;
}

function parseSnapshot<T>(value: unknown): T | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as T) : null;
  } catch {
    return null;
  }
}

function toDocumentStatus(value: unknown): BillingDocumentStatus {
  const status = valueAsString(value) as BillingDocumentStatus;
  if (status === "draft" || status === "issued" || status === "void") {
    return status;
  }
  throw new BillingDomainError(
    "INVOICE_TOTAL_INVALID",
    "La base contient un statut de document de facturation invalide."
  );
}

function toPaymentMethod(value: unknown): TransactionPaymentMethod {
  const method = valueAsString(value) as TransactionPaymentMethod;
  if (!PAYMENT_METHODS.has(method)) {
    throw new BillingDomainError(
      "PAYMENT_METHOD_INVALID",
      "Le moyen de paiement est invalide."
    );
  }
  return method;
}

function toPaymentStatus(value: unknown): "completed" | "void" {
  const status = valueAsString(value);
  if (status === "completed" || status === "void") {
    return status;
  }
  throw new BillingDomainError(
    "INVOICE_TOTAL_INVALID",
    "La base contient un statut de paiement invalide."
  );
}

function rowToInvoice(row: DatabaseRow, now = new Date()): Invoice {
  const documentStatus = toDocumentStatus(row.document_status);
  const grossAmount = valueAsAmount(row.gross_amount);
  const creditAmount = valueAsAmount(row.issued_credit_amount);
  const completedPaymentAmount = valueAsAmount(row.completed_payment_amount);
  const completedRefundAmount = valueAsAmount(row.completed_refund_amount);
  const balanceAmount = calculateInvoiceBalance({
    grossAmount,
    issuedCreditAmount: creditAmount,
    completedPaymentAmount,
    completedRefundAmount,
  });

  return {
    id: valueAsString(row.id),
    ownerId: valueAsString(row.owner_id),
    patientId: valueAsNullableString(row.patient_id),
    appointmentId: valueAsNullableString(row.appointment_id),
    documentStatus,
    number: valueAsNullableString(row.number),
    currency: valueAsString(row.currency, "DZD"),
    dueAt: valueAsNullableString(row.due_at),
    issuedAt: valueAsNullableString(row.issued_at),
    voidedAt: valueAsNullableString(row.voided_at),
    voidReason: valueAsNullableString(row.void_reason),
    ownerSnapshot: parseSnapshot<BillingOwnerSnapshot>(row.owner_snapshot),
    clinicSnapshot: parseSnapshot<BillingClinicSnapshot>(row.clinic_snapshot),
    notes: valueAsNullableString(row.notes),
    subtotalAmount: valueAsAmount(row.subtotal_amount),
    discountAmount: valueAsAmount(row.discount_amount),
    taxAmount: valueAsAmount(row.tax_amount),
    grossAmount,
    creditAmount,
    completedPaymentAmount,
    completedRefundAmount,
    balanceAmount,
    settlementStatus: deriveInvoiceSettlementStatus(
      documentStatus,
      {
        grossAmount,
        issuedCreditAmount: creditAmount,
        completedPaymentAmount,
        completedRefundAmount,
      },
      valueAsNullableString(row.due_at),
      now
    ),
    legacySourceTransactionId: valueAsNullableString(
      row.legacy_source_transaction_id
    ),
    createdAt: valueAsString(row.created_at),
    updatedAt: valueAsString(row.updated_at),
  };
}

function rowToInvoiceLine(row: DatabaseRow): InvoiceLine {
  return {
    id: valueAsString(row.id),
    invoiceId: valueAsString(row.invoice_id),
    productId: valueAsNullableString(row.product_id),
    description: valueAsString(row.description),
    quantityMilli: valueAsAmount(row.quantity_milli),
    unitAmount: valueAsAmount(row.unit_amount),
    discountBps: valueAsAmount(row.discount_bps),
    taxBps: valueAsAmount(row.tax_bps),
    baseAmount: valueAsAmount(row.base_amount),
    discountAmount: valueAsAmount(row.discount_amount),
    taxAmount: valueAsAmount(row.tax_amount),
    grossAmount: valueAsAmount(row.gross_amount),
    sortOrder: valueAsAmount(row.sort_order),
    createdAt: valueAsString(row.created_at),
    updatedAt: valueAsString(row.updated_at),
  };
}

function rowToCreditNoteLine(row: DatabaseRow): PersistedCreditNoteLine {
  return {
    id: valueAsString(row.id),
    creditNoteId: valueAsString(row.credit_note_id),
    invoiceLineId: valueAsNullableString(row.invoice_line_id),
    productId: valueAsNullableString(row.product_id),
    description: valueAsString(row.description),
    quantityMilli: valueAsAmount(row.quantity_milli),
    unitAmount: valueAsAmount(row.unit_amount),
    discountBps: valueAsAmount(row.discount_bps),
    taxBps: valueAsAmount(row.tax_bps),
    baseAmount: valueAsAmount(row.base_amount),
    discountAmount: valueAsAmount(row.discount_amount),
    taxAmount: valueAsAmount(row.tax_amount),
    grossAmount: valueAsAmount(row.gross_amount),
    sortOrder: valueAsAmount(row.sort_order),
    createdAt: valueAsString(row.created_at),
    updatedAt: valueAsString(row.updated_at),
  };
}

function rowToCreditNote(row: DatabaseRow): CreditNote {
  return {
    id: valueAsString(row.id),
    invoiceId: valueAsString(row.invoice_id),
    documentStatus: toDocumentStatus(row.document_status),
    number: valueAsNullableString(row.number),
    issuedAt: valueAsNullableString(row.issued_at),
    voidedAt: valueAsNullableString(row.voided_at),
    voidReason: valueAsNullableString(row.void_reason),
    ownerSnapshot: parseSnapshot<BillingOwnerSnapshot>(row.owner_snapshot),
    clinicSnapshot: parseSnapshot<BillingClinicSnapshot>(row.clinic_snapshot),
    reason: valueAsNullableString(row.reason),
    subtotalAmount: valueAsAmount(row.subtotal_amount),
    discountAmount: valueAsAmount(row.discount_amount),
    taxAmount: valueAsAmount(row.tax_amount),
    grossAmount: valueAsAmount(row.gross_amount),
    createdAt: valueAsString(row.created_at),
    updatedAt: valueAsString(row.updated_at),
  };
}

function rowToPayment(row: DatabaseRow): InvoicePayment {
  return {
    id: valueAsString(row.id),
    invoiceId: valueAsString(row.invoice_id),
    amount: valueAsAmount(row.amount),
    method: toPaymentMethod(row.method),
    status: toPaymentStatus(row.status),
    paidAt: valueAsString(row.paid_at),
    voidedAt: valueAsNullableString(row.voided_at),
    voidReason: valueAsNullableString(row.void_reason),
    reference: valueAsNullableString(row.reference),
    journalTransactionId: valueAsString(row.journal_transaction_id),
    idempotencyKey: valueAsNullableString(row.idempotency_key),
    createdAt: valueAsString(row.created_at),
    updatedAt: valueAsString(row.updated_at),
  };
}

function rowToRefund(row: DatabaseRow): Refund {
  return {
    id: valueAsString(row.id),
    paymentId: valueAsString(row.payment_id),
    amount: valueAsAmount(row.amount),
    method: toPaymentMethod(row.method),
    status: toPaymentStatus(row.status),
    refundedAt: valueAsString(row.refunded_at),
    voidedAt: valueAsNullableString(row.voided_at),
    voidReason: valueAsNullableString(row.void_reason),
    reason: valueAsNullableString(row.reason),
    journalTransactionId: valueAsString(row.journal_transaction_id),
    idempotencyKey: valueAsNullableString(row.idempotency_key),
    createdAt: valueAsString(row.created_at),
    updatedAt: valueAsString(row.updated_at),
  };
}

async function loadInvoice(
  database: BillingDatabase,
  invoiceId: string,
  now = new Date()
): Promise<Invoice | null> {
  const rows = await database.select<DatabaseRow[]>(
    `${INVOICE_SELECT} WHERE i.id = ?`,
    [invoiceId]
  );
  return rows[0] ? rowToInvoice(rows[0], now) : null;
}

async function loadInvoiceDetail(
  database: BillingDatabase,
  invoiceId: string,
  now = new Date()
): Promise<InvoiceDetail | null> {
  const invoice = await loadInvoice(database, invoiceId, now);
  if (!invoice) {
    return null;
  }

  const [lineRows, creditRows, creditLineRows, paymentRows, refundRows] =
    await Promise.all([
      database.select<DatabaseRow[]>(
        "SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY sort_order, id",
        [invoiceId]
      ),
      database.select<DatabaseRow[]>(
        "SELECT * FROM credit_notes WHERE invoice_id = ? ORDER BY issued_at, created_at, id",
        [invoiceId]
      ),
      database.select<DatabaseRow[]>(
        `SELECT cl.*
         FROM credit_note_lines cl
         JOIN credit_notes c ON c.id = cl.credit_note_id
         WHERE c.invoice_id = ?
         ORDER BY cl.sort_order, cl.id`,
        [invoiceId]
      ),
      database.select<DatabaseRow[]>(
        "SELECT * FROM payments WHERE invoice_id = ? ORDER BY paid_at, created_at, id",
        [invoiceId]
      ),
      database.select<DatabaseRow[]>(
        `SELECT r.*
         FROM refunds r
         JOIN payments p ON p.id = r.payment_id
         WHERE p.invoice_id = ?
         ORDER BY r.refunded_at, r.created_at, r.id`,
        [invoiceId]
      ),
    ]);

  const linesByCredit = new Map<string, PersistedCreditNoteLine[]>();
  for (const row of creditLineRows) {
    const line = rowToCreditNoteLine(row);
    const current = linesByCredit.get(line.creditNoteId) ?? [];
    current.push(line);
    linesByCredit.set(line.creditNoteId, current);
  }

  return {
    ...invoice,
    lines: lineRows.map(rowToInvoiceLine),
    creditNotes: creditRows.map((row) => {
      const credit = rowToCreditNote(row);
      return { ...credit, lines: linesByCredit.get(credit.id) ?? [] };
    }),
    payments: paymentRows.map(rowToPayment),
    refunds: refundRows.map(rowToRefund),
  };
}

async function loadCreditNote(
  database: BillingDatabase,
  creditNoteId: string
): Promise<LoadedCreditNote | null> {
  const rows = await database.select<DatabaseRow[]>(
    "SELECT * FROM credit_notes WHERE id = ?",
    [creditNoteId]
  );
  if (!rows[0]) {
    return null;
  }
  const lineRows = await database.select<DatabaseRow[]>(
    "SELECT * FROM credit_note_lines WHERE credit_note_id = ? ORDER BY sort_order, id",
    [creditNoteId]
  );
  return { ...rowToCreditNote(rows[0]), lines: lineRows.map(rowToCreditNoteLine) };
}

async function loadPayment(
  database: BillingDatabase,
  paymentId: string
): Promise<InvoicePayment | null> {
  const rows = await database.select<DatabaseRow[]>(
    "SELECT * FROM payments WHERE id = ?",
    [paymentId]
  );
  return rows[0] ? rowToPayment(rows[0]) : null;
}

async function loadRefund(
  database: BillingDatabase,
  refundId: string
): Promise<Refund | null> {
  const rows = await database.select<DatabaseRow[]>(
    "SELECT * FROM refunds WHERE id = ?",
    [refundId]
  );
  return rows[0] ? rowToRefund(rows[0]) : null;
}

function requireId(value: string, code: "INVOICE_NOT_FOUND" | "PAYMENT_NOT_FOUND" | "REFUND_NOT_FOUND" | "OWNER_NOT_FOUND" | "APPOINTMENT_NOT_FOUND"): string {
  const id = value.trim();
  if (!id) {
    throw new BillingDomainError(code, "L'identifiant de facturation est requis.");
  }
  return id;
}

function normalizeNullableId(value?: string | null): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const id = value.trim();
  return id || null;
}

function normalizeOptionalText(value?: string | null): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  return normalized || null;
}

function normalizeCurrency(value?: string): string {
  const currency = value?.trim().toUpperCase() || "DZD";
  if (!currency) {
    throw new BillingDomainError(
      "INVOICE_TOTAL_INVALID",
      "La devise de la facture est obligatoire."
    );
  }
  return currency;
}

function normalizeTimestamp(
  value: Date | string | undefined,
  fallback = new Date()
): { date: Date; value: string } {
  const date = value === undefined ? fallback : value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BillingDomainError("DATE_INVALID", "La date de facturation est invalide.");
  }
  return { date, value: toSQLiteTimestamp(date) };
}

function normalizeOptionalTimestamp(value?: Date | string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return normalizeTimestamp(value).value;
}

function normalizeClinicSnapshot(
  snapshot: BillingClinicSnapshot
): BillingClinicSnapshot {
  const name = snapshot?.name?.trim();
  if (!name) {
    throw new BillingDomainError(
      "CLINIC_SNAPSHOT_INVALID",
      "Le nom de la clinique est obligatoire lors de l'émission."
    );
  }
  return {
    id: normalizeOptionalText(snapshot.id),
    name,
    legalName: normalizeOptionalText(snapshot.legalName),
    registrationNumber: normalizeOptionalText(snapshot.registrationNumber),
    phone: normalizeOptionalText(snapshot.phone),
    email: normalizeOptionalText(snapshot.email),
    address: normalizeOptionalText(snapshot.address),
  };
}

function normalizeIdempotencyKey(value: string): string {
  const key = value?.trim();
  if (!key) {
    throw new BillingDomainError(
      "IDEMPOTENCY_KEY_REQUIRED",
      "Une clé d'idempotence est obligatoire pour cette opération comptable."
    );
  }
  return key;
}

function throwIdempotencyConflict(): never {
  throw new BillingDomainError(
    "IDEMPOTENCY_KEY_CONFLICT",
    "Cette clé d'idempotence est déjà associée à une commande comptable différente."
  );
}

async function findIdempotencyRecord(
  database: BillingDatabase,
  idempotencyKey: string
): Promise<IdempotencyRecord | null> {
  const rows = await database.select<DatabaseRow[]>(
    `SELECT 'issue-invoice' AS command, id
       FROM invoices
       WHERE issue_idempotency_key = ?
     UNION ALL
     SELECT 'record-payment' AS command, id
       FROM payments
       WHERE idempotency_key = ?
     UNION ALL
     SELECT 'issue-credit-note' AS command, id
       FROM credit_notes
       WHERE idempotency_key = ?
     UNION ALL
     SELECT 'record-refund' AS command, id
       FROM refunds
       WHERE idempotency_key = ?`,
    [idempotencyKey, idempotencyKey, idempotencyKey, idempotencyKey]
  );

  if (rows.length === 0) {
    return null;
  }
  if (rows.length !== 1) {
    throwIdempotencyConflict();
  }

  const command = valueAsString(rows[0].command) as IdempotentBillingCommand;
  if (
    command !== "issue-invoice" &&
    command !== "record-payment" &&
    command !== "issue-credit-note" &&
    command !== "record-refund"
  ) {
    throw new BillingDomainError(
      "INVOICE_TOTAL_INVALID",
      "La base contient une commande d'idempotence invalide."
    );
  }
  const id = valueAsString(rows[0].id).trim();
  if (!id) {
    throw new BillingDomainError(
      "INVOICE_TOTAL_INVALID",
      "La base contient une commande d'idempotence incomplète."
    );
  }
  return { command, id };
}

function assertIdempotencyCommand(
  record: IdempotencyRecord,
  command: IdempotentBillingCommand
): void {
  if (record.command !== command) {
    throwIdempotencyConflict();
  }
}

/**
 * Server-assigned timestamps are intentionally omitted from the replay
 * comparison. A supplied timestamp is part of the command identity; an
 * omitted one means "assign at first execution" and cannot safely be
 * reconstructed from the persisted document.
 */
function matchesPersistedCommandTimestamp(
  requested: Date | string | undefined,
  persisted: string | null | undefined
): boolean {
  return (
    requested === undefined ||
    normalizeTimestamp(requested).value === valueAsNullableString(persisted)
  );
}

function matchesPersistedOptionalValue<T>(
  requested: T | undefined,
  persisted: T | null | undefined
): boolean {
  return requested === undefined || requested === (persisted ?? null);
}

function normalizedClinicSnapshotIdentity(
  snapshot: BillingClinicSnapshot | null
): string | null {
  if (!snapshot) {
    return null;
  }
  try {
    return JSON.stringify(normalizeClinicSnapshot(snapshot));
  } catch {
    return null;
  }
}

function sameClinicSnapshot(
  left: BillingClinicSnapshot | null,
  right: BillingClinicSnapshot
): boolean {
  return (
    normalizedClinicSnapshotIdentity(left) ===
    normalizedClinicSnapshotIdentity(right)
  );
}

function normalizeCreditNoteLines(
  lines: readonly CreditNoteLineInput[]
): NormalizedCreditNoteLine[] {
  return lines.map((input) => ({
    invoiceLineId: normalizeNullableId(input.invoiceLineId),
    line: normalizeBillingLine(input),
  }));
}

function sameCreditNoteLines(
  requested: readonly NormalizedCreditNoteLine[],
  persisted: readonly PersistedCreditNoteLine[]
): boolean {
  return (
    requested.length === persisted.length &&
    requested.every(({ invoiceLineId, line }, index) => {
      const stored = persisted[index];
      return (
        stored.sortOrder === index &&
        stored.invoiceLineId === invoiceLineId &&
        stored.productId === (line.productId ?? null) &&
        stored.description === line.description &&
        stored.quantityMilli === line.quantityMilli &&
        stored.unitAmount === line.unitAmount &&
        stored.discountBps === line.discountBps &&
        stored.taxBps === line.taxBps &&
        stored.baseAmount === line.baseAmount &&
        stored.discountAmount === line.discountAmount &&
        stored.taxAmount === line.taxAmount &&
        stored.grossAmount === line.grossAmount
      );
    })
  );
}

async function validateCreditNoteLineInvoiceLinks(
  database: BillingDatabase,
  invoiceId: string,
  lines: readonly NormalizedCreditNoteLine[]
): Promise<void> {
  const invoiceLineIds = new Set(
    lines.flatMap(({ invoiceLineId }) => (invoiceLineId ? [invoiceLineId] : []))
  );

  for (const invoiceLineId of invoiceLineIds) {
    const rows = await database.select<DatabaseRow[]>(
      `SELECT id
       FROM invoice_lines
       WHERE id = ? AND invoice_id = ?`,
      [invoiceLineId, invoiceId]
    );
    if (!rows[0]) {
      throw new BillingDomainError(
        "INVOICE_TOTAL_INVALID",
        "Chaque ligne d'avoir référencée doit appartenir à la facture concernée."
      );
    }
  }
}

function requireVoidReason(value: string): string {
  const reason = normalizeOptionalText(value);
  if (!reason) {
    throw new BillingDomainError(
      "INVOICE_TOTAL_INVALID",
      "Un motif est obligatoire pour annuler un avoir émis."
    );
  }
  return reason;
}

function assertPaymentMethod(value: TransactionPaymentMethod): TransactionPaymentMethod {
  return toPaymentMethod(value);
}

function hasOwn(input: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(input, key);
}

async function resolveInvoiceRelationships(
  database: BillingDatabase,
  input: {
    appointmentId?: string | null;
    ownerId: string;
    patientId?: string | null;
  }
): Promise<{ appointmentId: string | null; ownerId: string; patientId: string | null }> {
  const ownerId = requireId(input.ownerId, "OWNER_NOT_FOUND");
  const ownerRows = await database.select<DatabaseRow[]>(
    "SELECT id FROM owners WHERE id = ?",
    [ownerId]
  );
  if (!ownerRows[0]) {
    throw new BillingDomainError("OWNER_NOT_FOUND", "Le propriétaire de la facture est introuvable.");
  }

  let patientId = normalizeNullableId(input.patientId);
  const appointmentId = normalizeNullableId(input.appointmentId);

  if (patientId) {
    const patientRows = await database.select<DatabaseRow[]>(
      "SELECT owner_id FROM patients WHERE id = ?",
      [patientId]
    );
    if (!patientRows[0]) {
      throw new BillingDomainError("PATIENT_NOT_FOUND", "Le patient de la facture est introuvable.");
    }
    if (valueAsString(patientRows[0].owner_id) !== ownerId) {
      throw new BillingDomainError(
        "PATIENT_OWNER_MISMATCH",
        "Le patient doit appartenir au propriétaire facturé."
      );
    }
  }

  if (appointmentId) {
    const appointmentRows = await database.select<DatabaseRow[]>(
      "SELECT owner_id, patient_id FROM appointments WHERE id = ?",
      [appointmentId]
    );
    const appointment = appointmentRows[0];
    if (!appointment) {
      throw new BillingDomainError(
        "APPOINTMENT_NOT_FOUND",
        "Le rendez-vous de la facture est introuvable."
      );
    }
    if (valueAsString(appointment.owner_id) !== ownerId) {
      throw new BillingDomainError(
        "APPOINTMENT_OWNER_MISMATCH",
        "Le rendez-vous doit appartenir au propriétaire facturé."
      );
    }
    const appointmentPatientId = valueAsString(appointment.patient_id);
    if (patientId && patientId !== appointmentPatientId) {
      throw new BillingDomainError(
        "APPOINTMENT_PATIENT_MISMATCH",
        "Le patient de la facture ne correspond pas au rendez-vous choisi."
      );
    }
    patientId = patientId ?? appointmentPatientId;
  }

  return { ownerId, patientId, appointmentId };
}

async function loadOwnerSnapshot(
  database: BillingDatabase,
  ownerId: string
): Promise<BillingOwnerSnapshot> {
  const rows = await database.select<DatabaseRow[]>(
    `SELECT id, first_name, last_name, phone, email, address, city
     FROM owners
     WHERE id = ?`,
    [ownerId]
  );
  const owner = rows[0];
  if (!owner) {
    throw new BillingDomainError("OWNER_NOT_FOUND", "Le propriétaire de la facture est introuvable.");
  }
  return {
    id: valueAsString(owner.id),
    firstName: valueAsString(owner.first_name),
    lastName: valueAsString(owner.last_name),
    phone: valueAsString(owner.phone),
    email: valueAsNullableString(owner.email),
    address: valueAsNullableString(owner.address),
    city: valueAsNullableString(owner.city),
  };
}

async function insertAudit(
  database: BillingDatabase,
  input: {
    action: "create" | "update";
    actor?: BillingActor;
    entityId: string;
    occurredAt: string;
    payload: Record<string, unknown>;
  }
): Promise<void> {
  await database.execute(
    `INSERT INTO audit_log (
      id, action, entity, entity_id, user_id, user_display_name,
      payload, metadata, created_at
    ) VALUES (?, ?, 'billing', ?, ?, ?, ?, ?, ?)`,
    [
      generateId(),
      input.action,
      input.entityId,
      input.actor?.userId ?? null,
      input.actor?.userDisplayName ?? null,
      JSON.stringify(input.payload),
      JSON.stringify({ command: input.payload.command }),
      input.occurredAt,
    ]
  );
}

function formatOfficialNumber(
  kind: BillingDocumentKind,
  year: number,
  sequence: number
): string {
  const prefix = kind === "invoice" ? "INV" : "CRN";
  return `${prefix}-${year}-${String(sequence).padStart(6, "0")}`;
}

async function allocateOfficialNumber(
  database: BillingDatabase,
  kind: BillingDocumentKind,
  issuedAt: Date
): Promise<string> {
  const year = issuedAt.getUTCFullYear();
  if (year < 2000 || year > 9999) {
    throw new BillingDomainError(
      "DATE_INVALID",
      "L'année d'émission doit être comprise entre 2000 et 9999."
    );
  }
  await database.execute(
    `INSERT INTO billing_sequences (kind, sequence_year, next_value)
     VALUES (?, ?, 2)
     ON CONFLICT(kind, sequence_year)
     DO UPDATE SET next_value = billing_sequences.next_value + 1`,
    [kind, year]
  );
  const rows = await database.select<DatabaseRow[]>(
    "SELECT next_value FROM billing_sequences WHERE kind = ? AND sequence_year = ?",
    [kind, year]
  );
  const sequence = valueAsAmount(rows[0]?.next_value) - 1;
  if (sequence <= 0) {
    throw new BillingDomainError(
      "INVOICE_TOTAL_INVALID",
      "La séquence officielle de facturation est invalide."
    );
  }
  return formatOfficialNumber(kind, year, sequence);
}

async function insertInvoiceLine(
  database: BillingDatabase,
  invoiceId: string,
  line: ReturnType<typeof normalizeBillingLine>,
  sortOrder: number,
  occurredAt: string
): Promise<void> {
  await database.execute(
    `INSERT INTO invoice_lines (
      id, invoice_id, product_id, description, quantity_milli, unit_amount,
      discount_bps, tax_bps, base_amount, discount_amount, tax_amount,
      gross_amount, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      generateId(),
      invoiceId,
      line.productId ?? null,
      line.description,
      line.quantityMilli,
      line.unitAmount,
      line.discountBps,
      line.taxBps,
      line.baseAmount,
      line.discountAmount,
      line.taxAmount,
      line.grossAmount,
      sortOrder,
      occurredAt,
      occurredAt,
    ]
  );
}

async function replaceInvoiceDraftLines(
  database: BillingDatabase,
  invoiceId: string,
  lines: readonly ReturnType<typeof normalizeBillingLine>[],
  occurredAt: string
): Promise<void> {
  await database.execute("DELETE FROM invoice_lines WHERE invoice_id = ?", [invoiceId]);
  for (const [sortOrder, line] of lines.entries()) {
    await insertInvoiceLine(database, invoiceId, line, sortOrder, occurredAt);
  }
}

async function updateInvoiceLineCalculations(
  database: BillingDatabase,
  invoiceId: string,
  lines: readonly InvoiceLine[],
  occurredAt: string
): Promise<ReturnType<typeof normalizeBillingLine>[]> {
  const normalized = lines.map((line) =>
    normalizeBillingLine({
      description: line.description,
      productId: line.productId,
      quantityMilli: line.quantityMilli,
      unitAmount: line.unitAmount,
      discountBps: line.discountBps,
      taxBps: line.taxBps,
    })
  );

  for (const [index, line] of normalized.entries()) {
    const original = lines[index];
    await database.execute(
      `UPDATE invoice_lines
       SET product_id = ?, description = ?, quantity_milli = ?, unit_amount = ?,
           discount_bps = ?, tax_bps = ?, base_amount = ?, discount_amount = ?,
           tax_amount = ?, gross_amount = ?, updated_at = ?
       WHERE id = ? AND invoice_id = ?`,
      [
        line.productId ?? null,
        line.description,
        line.quantityMilli,
        line.unitAmount,
        line.discountBps,
        line.taxBps,
        line.baseAmount,
        line.discountAmount,
        line.taxAmount,
        line.grossAmount,
        occurredAt,
        original.id,
        invoiceId,
      ]
    );
  }
  return normalized;
}

async function insertCreditNoteLine(
  database: BillingDatabase,
  creditNoteId: string,
  line: ReturnType<typeof normalizeBillingLine>,
  invoiceLineId: string | null,
  sortOrder: number,
  occurredAt: string
): Promise<void> {
  await database.execute(
    `INSERT INTO credit_note_lines (
      id, credit_note_id, invoice_line_id, product_id, description, quantity_milli,
      unit_amount, discount_bps, tax_bps, base_amount, discount_amount,
      tax_amount, gross_amount, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      generateId(),
      creditNoteId,
      invoiceLineId,
      line.productId ?? null,
      line.description,
      line.quantityMilli,
      line.unitAmount,
      line.discountBps,
      line.taxBps,
      line.baseAmount,
      line.discountAmount,
      line.taxAmount,
      line.grossAmount,
      sortOrder,
      occurredAt,
      occurredAt,
    ]
  );
}

async function insertLockedJournalProjection(
  database: BillingDatabase,
  input: {
    amount: number;
    date: string;
    description: string;
    method: TransactionPaymentMethod;
    referenceId: string;
    sourceId: string;
    sourceType: TransactionSourceType;
    type: "income" | "expense";
  }
): Promise<string> {
  const transactionId = generateId();
  await database.execute(
    `INSERT INTO transactions (
      id, date, amount, type, category, description, reference_id, method,
      status, source_type, source_id, is_locked, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'Billing', ?, ?, ?, 'paid', ?, ?, 1, ?, ?)`,
    [
      transactionId,
      input.date,
      input.amount,
      input.type,
      input.description,
      input.referenceId,
      input.method,
      input.sourceType,
      input.sourceId,
      input.date,
      input.date,
    ]
  );
  return transactionId;
}

async function countCompletedRefunds(
  database: BillingDatabase,
  paymentId: string
): Promise<number> {
  const rows = await database.select<DatabaseRow[]>(
    `SELECT COALESCE(SUM(amount), 0) AS amount
     FROM refunds
     WHERE payment_id = ? AND status = 'completed'`,
    [paymentId]
  );
  return valueAsAmount(rows[0]?.amount);
}

async function runBillingCommand<T>(
  operation: (database: BillingDatabase) => Promise<T>
): Promise<T> {
  return runDbTransaction(
    async (database) => operation(database as BillingDatabase),
    "IMMEDIATE"
  );
}

function requireInvoiceDraft(invoice: InvoiceDetail | null): InvoiceDetail {
  if (!invoice) {
    throw new BillingDomainError("INVOICE_NOT_FOUND", "La facture est introuvable.");
  }
  if (invoice.documentStatus !== "draft") {
    throw new BillingDomainError(
      "INVOICE_NOT_DRAFT",
      "Seule une facture brouillon peut être modifiée ou émise."
    );
  }
  return invoice;
}

function requireIssuedInvoice(invoice: InvoiceDetail | null): InvoiceDetail {
  if (!invoice) {
    throw new BillingDomainError("INVOICE_NOT_FOUND", "La facture est introuvable.");
  }
  if (invoice.documentStatus !== "issued") {
    throw new BillingDomainError(
      "INVOICE_NOT_ISSUED",
      "Cette opération requiert une facture émise."
    );
  }
  return invoice;
}

/** Lists invoices with settlement calculated from immutable documents and ledgers. */
export async function listInvoices(
  options: ListInvoicesOptions = {}
): Promise<Invoice[]> {
  return runDbRead(async (database) => {
    const clauses: string[] = [];
    const bindValues: unknown[] = [];
    if (options.ownerId) {
      clauses.push("i.owner_id = ?");
      bindValues.push(options.ownerId);
    }
    if (options.documentStatus) {
      clauses.push("i.document_status = ?");
      bindValues.push(options.documentStatus);
    }
    const where = clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "";
    const rows = await database.select<DatabaseRow[]>(
      `${INVOICE_SELECT}${where} ORDER BY COALESCE(i.issued_at, i.created_at) DESC, i.id DESC`,
      bindValues
    );
    const invoices = rows.map((row) => rowToInvoice(row, options.now));
    const filtered = options.settlementStatus
      ? invoices.filter((invoice) => invoice.settlementStatus === options.settlementStatus)
      : invoices;
    const limit = options.limit;
    return typeof limit === "number" && Number.isSafeInteger(limit) && limit >= 0
      ? filtered.slice(0, limit)
      : filtered;
  });
}

/** Returns an invoice document with its immutable lines and related ledger records. */
export async function getInvoice(invoiceId: string): Promise<InvoiceDetail | null> {
  return runDbRead((database) => loadInvoiceDetail(database, invoiceId));
}

export async function createInvoiceDraft(
  input: CreateInvoiceDraftInput
): Promise<InvoiceDetail> {
  return runBillingCommand(async (database) => {
    const occurredAt = normalizeTimestamp().value;
    const invoiceId = input.id?.trim() || generateId();
    const relationships = await resolveInvoiceRelationships(database, input);
    const lines = (input.lines ?? []).map(normalizeBillingLine);
    const totals = sumBillingLines(lines);

    await database.execute(
      `INSERT INTO invoices (
        id, owner_id, patient_id, appointment_id, document_status, currency,
        due_at, notes, subtotal_amount, discount_amount, tax_amount,
        gross_amount, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceId,
        relationships.ownerId,
        relationships.patientId,
        relationships.appointmentId,
        normalizeCurrency(input.currency),
        normalizeOptionalTimestamp(input.dueAt),
        normalizeOptionalText(input.notes),
        totals.baseAmount,
        totals.discountAmount,
        totals.taxAmount,
        totals.grossAmount,
        occurredAt,
        occurredAt,
      ]
    );
    for (const [sortOrder, line] of lines.entries()) {
      await insertInvoiceLine(database, invoiceId, line, sortOrder, occurredAt);
    }
    await insertAudit(database, {
      action: "create",
      actor: input.actor,
      entityId: invoiceId,
      occurredAt,
      payload: { command: "create-invoice-draft", lineCount: lines.length },
    });

    const created = await loadInvoiceDetail(database, invoiceId);
    if (!created) {
      throw new BillingDomainError("INVOICE_NOT_FOUND", "La facture créée est introuvable.");
    }
    return created;
  });
}

export async function updateInvoiceDraft(
  input: UpdateInvoiceDraftInput
): Promise<InvoiceDetail> {
  return runBillingCommand(async (database) => {
    const occurredAt = normalizeTimestamp().value;
    const invoiceId = requireId(input.invoiceId, "INVOICE_NOT_FOUND");
    const current = requireInvoiceDraft(await loadInvoiceDetail(database, invoiceId));
    const relationships = await resolveInvoiceRelationships(database, {
      ownerId: input.ownerId ?? current.ownerId,
      patientId: hasOwn(input, "patientId") ? input.patientId : current.patientId,
      appointmentId: hasOwn(input, "appointmentId")
        ? input.appointmentId
        : current.appointmentId,
    });
    const lines = input.lines
      ? input.lines.map(normalizeBillingLine)
      : current.lines.map((line) =>
          normalizeBillingLine({
            description: line.description,
            productId: line.productId,
            quantityMilli: line.quantityMilli,
            unitAmount: line.unitAmount,
            discountBps: line.discountBps,
            taxBps: line.taxBps,
          })
        );
    const totals = sumBillingLines(lines);
    const dueAt = hasOwn(input, "dueAt")
      ? normalizeOptionalTimestamp(input.dueAt)
      : current.dueAt ?? null;
    const notes = hasOwn(input, "notes")
      ? normalizeOptionalText(input.notes)
      : current.notes ?? null;
    const currency = hasOwn(input, "currency")
      ? normalizeCurrency(input.currency)
      : current.currency;

    await database.execute(
      `UPDATE invoices
       SET owner_id = ?, patient_id = ?, appointment_id = ?, currency = ?, due_at = ?,
           notes = ?, subtotal_amount = ?, discount_amount = ?, tax_amount = ?,
           gross_amount = ?, updated_at = ?
       WHERE id = ?`,
      [
        relationships.ownerId,
        relationships.patientId,
        relationships.appointmentId,
        currency,
        dueAt,
        notes,
        totals.baseAmount,
        totals.discountAmount,
        totals.taxAmount,
        totals.grossAmount,
        occurredAt,
        invoiceId,
      ]
    );
    if (input.lines !== undefined) {
      await replaceInvoiceDraftLines(database, invoiceId, lines, occurredAt);
    }
    await insertAudit(database, {
      action: "update",
      actor: input.actor,
      entityId: invoiceId,
      occurredAt,
      payload: { command: "update-invoice-draft", lineCount: lines.length },
    });

    const updated = await loadInvoiceDetail(database, invoiceId);
    if (!updated) {
      throw new BillingDomainError("INVOICE_NOT_FOUND", "La facture mise à jour est introuvable.");
    }
    return updated;
  });
}

export async function issueInvoice(input: IssueInvoiceInput): Promise<InvoiceDetail> {
  return runBillingCommand(async (database) => {
    const invoiceId = requireId(input.invoiceId, "INVOICE_NOT_FOUND");
    const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
    const issued = normalizeTimestamp(input.issuedAt);
    const clinicSnapshot = normalizeClinicSnapshot(input.clinicSnapshot);
    const requestedDueAt = hasOwn(input, "dueAt")
      ? normalizeOptionalTimestamp(input.dueAt)
      : undefined;
    const idempotencyRecord = await findIdempotencyRecord(database, idempotencyKey);
    if (idempotencyRecord) {
      assertIdempotencyCommand(idempotencyRecord, "issue-invoice");
      const existing = await loadInvoiceDetail(database, idempotencyRecord.id);
      if (!existing) {
        throw new BillingDomainError("INVOICE_NOT_FOUND", "La facture idempotente est introuvable.");
      }
      if (
        existing.id !== invoiceId ||
        (existing.documentStatus !== "issued" && existing.documentStatus !== "void") ||
        !sameClinicSnapshot(existing.clinicSnapshot, clinicSnapshot) ||
        !matchesPersistedOptionalValue(requestedDueAt, existing.dueAt) ||
        !matchesPersistedCommandTimestamp(input.issuedAt, existing.issuedAt)
      ) {
        throwIdempotencyConflict();
      }
      return existing;
    }

    const draft = requireInvoiceDraft(await loadInvoiceDetail(database, invoiceId));
    if (draft.lines.length === 0) {
      throw new BillingDomainError(
        "INVOICE_TOTAL_INVALID",
        "Une facture doit contenir au moins une ligne avant son émission."
      );
    }
    const lines = await updateInvoiceLineCalculations(
      database,
      invoiceId,
      draft.lines,
      issued.value
    );
    const totals = sumBillingLines(lines);
    assertPositiveAmount(
      totals.grossAmount,
      "Le total d'une facture émise doit être strictement positif."
    );
    const ownerSnapshot = await loadOwnerSnapshot(database, draft.ownerId);
    const dueAt =
      requestedDueAt === undefined ? draft.dueAt ?? null : requestedDueAt;
    const number = await allocateOfficialNumber(database, "invoice", issued.date);

    await database.execute(
      `UPDATE invoices
       SET document_status = 'issued', number = ?, issued_at = ?, due_at = ?,
           owner_snapshot = ?, clinic_snapshot = ?, subtotal_amount = ?,
           discount_amount = ?, tax_amount = ?, gross_amount = ?,
           issue_idempotency_key = ?, updated_at = ?
       WHERE id = ?`,
      [
        number,
        issued.value,
        dueAt,
        JSON.stringify(ownerSnapshot),
        JSON.stringify(clinicSnapshot),
        totals.baseAmount,
        totals.discountAmount,
        totals.taxAmount,
        totals.grossAmount,
        idempotencyKey,
        issued.value,
        invoiceId,
      ]
    );
    await insertAudit(database, {
      action: "update",
      actor: input.actor,
      entityId: invoiceId,
      occurredAt: issued.value,
      payload: { command: "issue-invoice", number, grossAmount: totals.grossAmount },
    });

    const result = await loadInvoiceDetail(database, invoiceId);
    if (!result) {
      throw new BillingDomainError("INVOICE_NOT_FOUND", "La facture émise est introuvable.");
    }
    return result;
  });
}

export async function recordPayment(
  input: RecordPaymentInput
): Promise<InvoicePayment> {
  return runBillingCommand(async (database) => {
    const invoiceId = requireId(input.invoiceId, "INVOICE_NOT_FOUND");
    const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
    const paid = normalizeTimestamp(input.paidAt);
    const amount = assertPositiveAmount(input.amount);
    const method = assertPaymentMethod(input.method);
    const reference = normalizeOptionalText(input.reference);
    const idempotencyRecord = await findIdempotencyRecord(database, idempotencyKey);
    if (idempotencyRecord) {
      assertIdempotencyCommand(idempotencyRecord, "record-payment");
      const existing = await loadPayment(database, idempotencyRecord.id);
      if (!existing) {
        throw new BillingDomainError("PAYMENT_NOT_FOUND", "Le paiement idempotent est introuvable.");
      }
      if (
        existing.invoiceId !== invoiceId ||
        existing.amount !== amount ||
        existing.method !== method ||
        existing.reference !== reference ||
        !matchesPersistedCommandTimestamp(input.paidAt, existing.paidAt)
      ) {
        throwIdempotencyConflict();
      }
      return existing;
    }

    const invoice = requireIssuedInvoice(await loadInvoiceDetail(database, invoiceId));
    assertPaymentWithinBalance(amount, invoice.balanceAmount);
    const paymentId = generateId();
    const journalTransactionId = await insertLockedJournalProjection(database, {
      amount,
      date: paid.value,
      description: `Paiement ${invoice.number ?? invoice.id}`,
      method,
      referenceId: invoice.id,
      sourceType: "billing_payment",
      sourceId: paymentId,
      type: "income",
    });

    await database.execute(
      `INSERT INTO payments (
        id, invoice_id, amount, method, status, paid_at, reference,
        journal_transaction_id, idempotency_key, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        invoice.id,
        amount,
        method,
        paid.value,
        reference,
        journalTransactionId,
        idempotencyKey,
        paid.value,
        paid.value,
      ]
    );
    await insertAudit(database, {
      action: "create",
      actor: input.actor,
      entityId: paymentId,
      occurredAt: paid.value,
      payload: {
        command: "record-payment",
        invoiceId: invoice.id,
        amount,
        journalTransactionId,
      },
    });

    const payment = await loadPayment(database, paymentId);
    if (!payment) {
      throw new BillingDomainError("PAYMENT_NOT_FOUND", "Le paiement créé est introuvable.");
    }
    return payment;
  });
}

export async function issueCreditNote(
  input: IssueCreditNoteInput
): Promise<CreditNote> {
  return runBillingCommand(async (database) => {
    const invoiceId = requireId(input.invoiceId, "INVOICE_NOT_FOUND");
    const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
    const issued = normalizeTimestamp(input.issuedAt);
    const creditNoteLines = normalizeCreditNoteLines(input.lines);
    const reason = normalizeOptionalText(input.reason);
    const idempotencyRecord = await findIdempotencyRecord(database, idempotencyKey);
    if (idempotencyRecord) {
      assertIdempotencyCommand(idempotencyRecord, "issue-credit-note");
      const existing = await loadCreditNote(database, idempotencyRecord.id);
      if (!existing) {
        throw new BillingDomainError("INVOICE_NOT_FOUND", "L'avoir idempotent est introuvable.");
      }
      if (
        existing.invoiceId !== invoiceId ||
        (existing.documentStatus !== "issued" && existing.documentStatus !== "void") ||
        existing.reason !== reason ||
        !matchesPersistedCommandTimestamp(input.issuedAt, existing.issuedAt) ||
        !sameCreditNoteLines(creditNoteLines, existing.lines ?? [])
      ) {
        throwIdempotencyConflict();
      }
      return existing;
    }

    const invoice = requireIssuedInvoice(await loadInvoiceDetail(database, invoiceId));
    if (creditNoteLines.length === 0) {
      throw new BillingDomainError(
        "INVOICE_TOTAL_INVALID",
        "Un avoir doit contenir au moins une ligne."
      );
    }
    await validateCreditNoteLineInvoiceLinks(
      database,
      invoice.id,
      creditNoteLines
    );
    const lines = creditNoteLines.map(({ line }) => line);
    const totals = sumBillingLines(lines);
    assertPositiveAmount(
      totals.grossAmount,
      "Le total d'un avoir émis doit être strictement positif."
    );
    assertCreditWithinRemaining(
      totals.grossAmount,
      remainingCreditableAmount({
        grossAmount: invoice.grossAmount,
        issuedCreditAmount: invoice.creditAmount,
      })
    );
    const creditNoteId = generateId();
    await database.execute(
      `INSERT INTO credit_notes (
        id, invoice_id, document_status, owner_snapshot, clinic_snapshot, reason,
        subtotal_amount, discount_amount, tax_amount, gross_amount,
        idempotency_key, created_at, updated_at
      ) VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        creditNoteId,
        invoice.id,
        JSON.stringify(invoice.ownerSnapshot),
        JSON.stringify(invoice.clinicSnapshot),
        reason,
        totals.baseAmount,
        totals.discountAmount,
        totals.taxAmount,
        totals.grossAmount,
        idempotencyKey,
        issued.value,
        issued.value,
      ]
    );
    for (const [sortOrder, line] of lines.entries()) {
      await insertCreditNoteLine(
        database,
        creditNoteId,
        line,
        creditNoteLines[sortOrder].invoiceLineId,
        sortOrder,
        issued.value
      );
    }
    const number = await allocateOfficialNumber(database, "credit_note", issued.date);
    await database.execute(
      `UPDATE credit_notes
       SET document_status = 'issued', number = ?, issued_at = ?, updated_at = ?
       WHERE id = ?`,
      [number, issued.value, issued.value, creditNoteId]
    );
    await insertAudit(database, {
      action: "create",
      actor: input.actor,
      entityId: creditNoteId,
      occurredAt: issued.value,
      payload: {
        command: "issue-credit-note",
        invoiceId: invoice.id,
        number,
        grossAmount: totals.grossAmount,
      },
    });

    const credit = await loadCreditNote(database, creditNoteId);
    if (!credit) {
      throw new BillingDomainError("INVOICE_NOT_FOUND", "L'avoir émis est introuvable.");
    }
    return credit;
  });
}

export async function recordRefund(input: RecordRefundInput): Promise<Refund> {
  return runBillingCommand(async (database) => {
    const paymentId = requireId(input.paymentId, "PAYMENT_NOT_FOUND");
    const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
    const refunded = normalizeTimestamp(input.refundedAt);
    const amount = assertPositiveAmount(input.amount);
    const reason = normalizeOptionalText(input.reason);
    const requestedMethod =
      input.method === undefined ? undefined : assertPaymentMethod(input.method);
    const idempotencyRecord = await findIdempotencyRecord(database, idempotencyKey);
    if (idempotencyRecord) {
      assertIdempotencyCommand(idempotencyRecord, "record-refund");
      const existing = await loadRefund(database, idempotencyRecord.id);
      if (!existing) {
        throw new BillingDomainError("REFUND_NOT_FOUND", "Le remboursement idempotent est introuvable.");
      }
      const existingPayment =
        requestedMethod === undefined
          ? await loadPayment(database, existing.paymentId)
          : null;
      const method = requestedMethod ?? existingPayment?.method;
      if (
        !method ||
        existing.paymentId !== paymentId ||
        existing.amount !== amount ||
        existing.method !== method ||
        existing.reason !== reason ||
        !matchesPersistedCommandTimestamp(input.refundedAt, existing.refundedAt)
      ) {
        throwIdempotencyConflict();
      }
      return existing;
    }

    const payment = await loadPayment(database, paymentId);
    if (!payment) {
      throw new BillingDomainError("PAYMENT_NOT_FOUND", "Le paiement est introuvable.");
    }
    if (payment.status !== "completed") {
      throw new BillingDomainError(
        "PAYMENT_NOT_COMPLETED",
        "Un remboursement requiert un paiement complété."
      );
    }
    const completedRefundAmount = await countCompletedRefunds(database, payment.id);
    assertRefundWithinAvailable(
      amount,
      refundablePaymentAmount({
        completedPaymentAmount: payment.amount,
        completedRefundAmount,
      })
    );
    const invoice = requireIssuedInvoice(await loadInvoiceDetail(database, payment.invoiceId));
    const method = requestedMethod ?? payment.method;
    const refundId = generateId();
    const journalTransactionId = await insertLockedJournalProjection(database, {
      amount,
      date: refunded.value,
      description: `Remboursement ${invoice.number ?? invoice.id}`,
      method,
      referenceId: invoice.id,
      sourceType: "billing_refund",
      sourceId: refundId,
      type: "expense",
    });
    await database.execute(
      `INSERT INTO refunds (
        id, payment_id, amount, method, status, refunded_at, reason,
        journal_transaction_id, idempotency_key, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?)`,
      [
        refundId,
        payment.id,
        amount,
        method,
        refunded.value,
        reason,
        journalTransactionId,
        idempotencyKey,
        refunded.value,
        refunded.value,
      ]
    );
    await insertAudit(database, {
      action: "create",
      actor: input.actor,
      entityId: refundId,
      occurredAt: refunded.value,
      payload: {
        command: "record-refund",
        paymentId: payment.id,
        amount,
        journalTransactionId,
      },
    });

    const refund = await loadRefund(database, refundId);
    if (!refund) {
      throw new BillingDomainError("REFUND_NOT_FOUND", "Le remboursement créé est introuvable.");
    }
    return refund;
  });
}

export async function voidPayment(input: VoidPaymentInput): Promise<InvoicePayment> {
  return runBillingCommand(async (database) => {
    const voided = normalizeTimestamp(input.voidedAt);
    const paymentId = requireId(input.paymentId, "PAYMENT_NOT_FOUND");
    const payment = await loadPayment(database, paymentId);
    if (!payment) {
      throw new BillingDomainError("PAYMENT_NOT_FOUND", "Le paiement est introuvable.");
    }
    if (payment.status === "void") {
      return payment;
    }
    const completedRefundAmount = await countCompletedRefunds(database, payment.id);
    if (completedRefundAmount > 0) {
      throw new BillingDomainError(
        "PAYMENT_HAS_COMPLETED_REFUNDS",
        "Les remboursements complétés doivent être annulés avant le paiement."
      );
    }
    await database.execute(
      `UPDATE payments
       SET status = 'void', voided_at = ?, void_reason = ?, updated_at = ?
       WHERE id = ?`,
      [voided.value, normalizeOptionalText(input.reason), voided.value, payment.id]
    );
    const journalTransactionId = await insertLockedJournalProjection(database, {
      amount: payment.amount,
      date: voided.value,
      description: `Annulation paiement ${payment.id}`,
      method: payment.method,
      referenceId: payment.invoiceId,
      sourceType: "billing_payment_void",
      sourceId: payment.id,
      type: "expense",
    });
    await insertAudit(database, {
      action: "update",
      actor: input.actor,
      entityId: payment.id,
      occurredAt: voided.value,
      payload: { command: "void-payment", journalTransactionId },
    });

    const result = await loadPayment(database, payment.id);
    if (!result) {
      throw new BillingDomainError("PAYMENT_NOT_FOUND", "Le paiement annulé est introuvable.");
    }
    return result;
  });
}

export async function voidRefund(input: VoidRefundInput): Promise<Refund> {
  return runBillingCommand(async (database) => {
    const voided = normalizeTimestamp(input.voidedAt);
    const refundId = requireId(input.refundId, "REFUND_NOT_FOUND");
    const refund = await loadRefund(database, refundId);
    if (!refund) {
      throw new BillingDomainError("REFUND_NOT_FOUND", "Le remboursement est introuvable.");
    }
    if (refund.status === "void") {
      return refund;
    }
    const payment = await loadPayment(database, refund.paymentId);
    if (!payment) {
      throw new BillingDomainError("PAYMENT_NOT_FOUND", "Le paiement du remboursement est introuvable.");
    }
    await database.execute(
      `UPDATE refunds
       SET status = 'void', voided_at = ?, void_reason = ?, updated_at = ?
       WHERE id = ?`,
      [voided.value, normalizeOptionalText(input.reason), voided.value, refund.id]
    );
    const journalTransactionId = await insertLockedJournalProjection(database, {
      amount: refund.amount,
      date: voided.value,
      description: `Annulation remboursement ${refund.id}`,
      method: refund.method,
      referenceId: payment.invoiceId,
      sourceType: "billing_refund_void",
      sourceId: refund.id,
      type: "income",
    });
    await insertAudit(database, {
      action: "update",
      actor: input.actor,
      entityId: refund.id,
      occurredAt: voided.value,
      payload: { command: "void-refund", journalTransactionId },
    });

    const result = await loadRefund(database, refund.id);
    if (!result) {
      throw new BillingDomainError("REFUND_NOT_FOUND", "Le remboursement annulé est introuvable.");
    }
    return result;
  });
}

export async function voidInvoice(input: VoidInvoiceInput): Promise<InvoiceDetail> {
  return runBillingCommand(async (database) => {
    const voided = normalizeTimestamp(input.voidedAt);
    const invoiceId = requireId(input.invoiceId, "INVOICE_NOT_FOUND");
    const invoice = await loadInvoiceDetail(database, invoiceId);
    if (!invoice) {
      throw new BillingDomainError("INVOICE_NOT_FOUND", "La facture est introuvable.");
    }
    if (invoice.documentStatus === "void") {
      return invoice;
    }
    if (
      invoice.completedPaymentAmount > 0 ||
      invoice.completedRefundAmount > 0 ||
      invoice.creditAmount > 0
    ) {
      throw new BillingDomainError(
        "INVOICE_VOID_NOT_ALLOWED",
        "Les paiements, remboursements et avoirs émis doivent être annulés avant la facture."
      );
    }
    await database.execute(
      `UPDATE invoices
       SET document_status = 'void', voided_at = ?, void_reason = ?, updated_at = ?
       WHERE id = ?`,
      [voided.value, normalizeOptionalText(input.reason), voided.value, invoice.id]
    );
    await insertAudit(database, {
      action: "update",
      actor: input.actor,
      entityId: invoice.id,
      occurredAt: voided.value,
      payload: { command: "void-invoice" },
    });

    const result = await loadInvoiceDetail(database, invoice.id);
    if (!result) {
      throw new BillingDomainError("INVOICE_NOT_FOUND", "La facture annulée est introuvable.");
    }
    return result;
  });
}

/**
 * Voids an issued credit note without changing its issued document content.
 * Invoice settlement is derived from issued credits, so reloading the invoice
 * in this same transaction recalculates the post-void settlement state.
 */
export async function voidCreditNote(
  input: VoidCreditNoteInput
): Promise<CreditNote> {
  return runBillingCommand(async (database) => {
    const creditNoteId = input.creditNoteId?.trim();
    if (!creditNoteId) {
      throw new BillingDomainError(
        "INVOICE_NOT_FOUND",
        "L'identifiant de l'avoir est requis."
      );
    }
    const reason = requireVoidReason(input.reason);
    const voided = normalizeTimestamp(input.voidedAt);
    const creditNote = await loadCreditNote(database, creditNoteId);
    if (!creditNote) {
      throw new BillingDomainError("INVOICE_NOT_FOUND", "L'avoir est introuvable.");
    }
    if (creditNote.documentStatus !== "issued") {
      throw new BillingDomainError(
        "INVOICE_NOT_ISSUED",
        "Seul un avoir émis peut être annulé."
      );
    }

    await database.execute(
      `UPDATE credit_notes
       SET document_status = 'void', voided_at = ?, void_reason = ?, updated_at = ?
       WHERE id = ?`,
      [voided.value, reason, voided.value, creditNote.id]
    );
    await insertAudit(database, {
      action: "update",
      actor: input.actor,
      entityId: creditNote.id,
      occurredAt: voided.value,
      payload: {
        command: "void-credit-note",
        invoiceId: creditNote.invoiceId,
        reason,
      },
    });

    const result = await loadCreditNote(database, creditNote.id);
    if (!result) {
      throw new BillingDomainError("INVOICE_NOT_FOUND", "L'avoir annulé est introuvable.");
    }
    const settledInvoice = await loadInvoiceDetail(database, creditNote.invoiceId);
    if (!settledInvoice) {
      throw new BillingDomainError(
        "INVOICE_NOT_FOUND",
        "La facture liée à l'avoir annulé est introuvable."
      );
    }
    return result;
  });
}

export const billingService = {
  listInvoices,
  getInvoice,
  createInvoiceDraft,
  updateInvoiceDraft,
  issueInvoice,
  recordPayment,
  issueCreditNote,
  recordRefund,
  voidPayment,
  voidRefund,
  voidInvoice,
  voidCreditNote,
};

export { formatOfficialNumber };
