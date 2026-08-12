import type { BillingLineAmounts, BillingLineInput } from "@/types/db";
import { BillingDomainError } from "./errors";

export interface CalculatedBillingLine extends BillingLineAmounts {
  description: string;
  discountBps: number;
  productId?: string | null;
  quantityMilli: number;
  taxBps: number;
  unitAmount: number;
}

export type BillingTotals = BillingLineAmounts;

const CENTIMES_PER_UNIT = 1000n;
const BASIS_POINTS = 10000n;

function assertSafeInteger(
  value: number,
  code: "AMOUNT_INVALID" | "QUANTITY_INVALID" | "UNIT_AMOUNT_INVALID" | "DISCOUNT_BPS_INVALID" | "TAX_BPS_INVALID",
  message: string,
  minimum: number
): number {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new BillingDomainError(code, message);
  }
  return value;
}

function toSafeNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new BillingDomainError(
      "MONEY_OVERFLOW",
      "Le montant calculé dépasse la précision monétaire prise en charge."
    );
  }
  return Number(value);
}

/** Positive integer division rounded half-up. Inputs are all non-negative. */
function roundDivision(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}

export function assertNonNegativeAmount(
  amount: number,
  message = "Le montant doit être un nombre entier positif ou nul."
): number {
  return assertSafeInteger(amount, "AMOUNT_INVALID", message, 0);
}

export function assertPositiveAmount(
  amount: number,
  message = "Le montant doit être strictement positif."
): number {
  return assertSafeInteger(amount, "AMOUNT_INVALID", message, 1);
}

export function calculateLineAmounts(
  input: Pick<
    BillingLineInput,
    "quantityMilli" | "unitAmount" | "discountBps" | "taxBps"
  >
): BillingLineAmounts {
  const quantityMilli = assertSafeInteger(
    input.quantityMilli,
    "QUANTITY_INVALID",
    "La quantité doit être un nombre entier de millièmes strictement positif.",
    1
  );
  const unitAmount = assertSafeInteger(
    input.unitAmount,
    "UNIT_AMOUNT_INVALID",
    "Le prix unitaire doit être un nombre entier de centimes positif ou nul.",
    0
  );
  const discountBps = assertSafeInteger(
    input.discountBps ?? 0,
    "DISCOUNT_BPS_INVALID",
    "La remise doit être comprise entre 0 et 10 000 points de base.",
    0
  );
  if (discountBps > 10000) {
    throw new BillingDomainError(
      "DISCOUNT_BPS_INVALID",
      "La remise doit être comprise entre 0 et 10 000 points de base."
    );
  }
  const taxBps = assertSafeInteger(
    input.taxBps ?? 0,
    "TAX_BPS_INVALID",
    "La taxe doit être un nombre entier de points de base positif ou nul.",
    0
  );

  const base = roundDivision(
    BigInt(quantityMilli) * BigInt(unitAmount),
    CENTIMES_PER_UNIT
  );
  const discount = roundDivision(base * BigInt(discountBps), BASIS_POINTS);
  const taxable = base - discount;
  const tax = roundDivision(taxable * BigInt(taxBps), BASIS_POINTS);
  const gross = taxable + tax;

  return {
    baseAmount: toSafeNumber(base),
    discountAmount: toSafeNumber(discount),
    taxAmount: toSafeNumber(tax),
    grossAmount: toSafeNumber(gross),
  };
}

export function normalizeBillingLine(
  input: BillingLineInput
): CalculatedBillingLine {
  const description = input.description?.trim();
  if (!description) {
    throw new BillingDomainError(
      "DESCRIPTION_REQUIRED",
      "Chaque ligne de facturation doit contenir une description."
    );
  }

  const discountBps = input.discountBps ?? 0;
  const taxBps = input.taxBps ?? 0;
  const amounts = calculateLineAmounts({
    quantityMilli: input.quantityMilli,
    unitAmount: input.unitAmount,
    discountBps,
    taxBps,
  });

  return {
    ...amounts,
    description,
    productId: input.productId ?? null,
    quantityMilli: input.quantityMilli,
    unitAmount: input.unitAmount,
    discountBps,
    taxBps,
  };
}

export function sumBillingLines(
  lines: readonly Pick<BillingLineAmounts, keyof BillingLineAmounts>[]
): BillingTotals {
  const totals = lines.reduce(
    (accumulator, line) => ({
      baseAmount: accumulator.baseAmount + assertNonNegativeAmount(line.baseAmount),
      discountAmount:
        accumulator.discountAmount + assertNonNegativeAmount(line.discountAmount),
      taxAmount: accumulator.taxAmount + assertNonNegativeAmount(line.taxAmount),
      grossAmount: accumulator.grossAmount + assertNonNegativeAmount(line.grossAmount),
    }),
    {
      baseAmount: 0,
      discountAmount: 0,
      taxAmount: 0,
      grossAmount: 0,
    } satisfies BillingTotals
  );

  assertNonNegativeAmount(totals.baseAmount);
  assertNonNegativeAmount(totals.discountAmount);
  assertNonNegativeAmount(totals.taxAmount);
  assertNonNegativeAmount(totals.grossAmount);
  return totals;
}
