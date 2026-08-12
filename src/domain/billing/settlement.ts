import type {
  BillingDocumentStatus,
  InvoiceSettlementStatus,
} from "@/types/db";
import { BillingDomainError } from "./errors";
import { assertNonNegativeAmount, assertPositiveAmount } from "./money";

export interface InvoiceLedgerTotals {
  completedPaymentAmount: number;
  completedRefundAmount: number;
  grossAmount: number;
  issuedCreditAmount: number;
}

export function calculateInvoiceBalance({
  grossAmount,
  issuedCreditAmount,
  completedPaymentAmount,
  completedRefundAmount,
}: InvoiceLedgerTotals): number {
  assertNonNegativeAmount(grossAmount);
  assertNonNegativeAmount(issuedCreditAmount);
  assertNonNegativeAmount(completedPaymentAmount);
  assertNonNegativeAmount(completedRefundAmount);

  const balance =
    grossAmount -
    issuedCreditAmount -
    completedPaymentAmount +
    completedRefundAmount;
  if (!Number.isSafeInteger(balance)) {
    throw new BillingDomainError(
      "MONEY_OVERFLOW",
      "Le solde calculé dépasse la précision monétaire prise en charge."
    );
  }
  return balance;
}

export function remainingCreditableAmount({
  grossAmount,
  issuedCreditAmount,
}: Pick<InvoiceLedgerTotals, "grossAmount" | "issuedCreditAmount">): number {
  assertNonNegativeAmount(grossAmount);
  assertNonNegativeAmount(issuedCreditAmount);
  return grossAmount - issuedCreditAmount;
}

export function refundablePaymentAmount({
  completedPaymentAmount,
  completedRefundAmount,
}: Pick<
  InvoiceLedgerTotals,
  "completedPaymentAmount" | "completedRefundAmount"
>): number {
  assertNonNegativeAmount(completedPaymentAmount);
  assertNonNegativeAmount(completedRefundAmount);
  return completedPaymentAmount - completedRefundAmount;
}

export function assertPaymentWithinBalance(
  amount: number,
  currentBalance: number
): void {
  assertPositiveAmount(amount);
  if (!Number.isSafeInteger(currentBalance) || currentBalance < 0) {
    throw new BillingDomainError(
      "PAYMENT_EXCEEDS_BALANCE",
      "Aucun paiement supplémentaire ne peut être enregistré sur ce solde."
    );
  }
  if (amount > currentBalance) {
    throw new BillingDomainError(
      "PAYMENT_EXCEEDS_BALANCE",
      "Le paiement dépasse le solde courant de la facture."
    );
  }
}

export function assertCreditWithinRemaining(
  amount: number,
  remainingAmount: number
): void {
  assertPositiveAmount(amount);
  if (!Number.isSafeInteger(remainingAmount) || remainingAmount < 0 || amount > remainingAmount) {
    throw new BillingDomainError(
      "CREDIT_EXCEEDS_REMAINING",
      "L'avoir dépasse le total encore créditable de la facture."
    );
  }
}

export function assertRefundWithinAvailable(
  amount: number,
  availableAmount: number
): void {
  assertPositiveAmount(amount);
  if (!Number.isSafeInteger(availableAmount) || availableAmount < 0 || amount > availableAmount) {
    throw new BillingDomainError(
      "REFUND_EXCEEDS_AVAILABLE",
      "Le remboursement dépasse le montant encore remboursable du paiement."
    );
  }
}

export function deriveInvoiceSettlementStatus(
  documentStatus: BillingDocumentStatus,
  totals: InvoiceLedgerTotals,
  dueAt?: string | null,
  now: Date = new Date()
): InvoiceSettlementStatus | null {
  if (documentStatus !== "issued") {
    return null;
  }

  const balance = calculateInvoiceBalance(totals);
  if (totals.grossAmount > 0 && totals.issuedCreditAmount >= totals.grossAmount) {
    return "credited";
  }
  if (balance <= 0) {
    return "paid";
  }
  if (dueAt) {
    const dueDate = new Date(dueAt);
    if (!Number.isNaN(dueDate.getTime()) && dueDate.getTime() < now.getTime()) {
      return "overdue";
    }
  }
  if (balance < totals.grossAmount) {
    return "partial";
  }
  return "open";
}
