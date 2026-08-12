import { describe, expect, it } from "vitest";
import {
  BillingDomainError,
  assertCreditWithinRemaining,
  assertPaymentWithinBalance,
  assertRefundWithinAvailable,
  calculateInvoiceBalance,
  calculateLineAmounts,
  deriveInvoiceSettlementStatus,
  normalizeBillingLine,
  sumBillingLines,
} from "../../src/domain/billing";

describe("billing money arithmetic", () => {
  it("rounds each line deterministically before summing", () => {
    const line = normalizeBillingLine({
      description: " Consultation  ",
      quantityMilli: 1500,
      unitAmount: 101,
      discountBps: 3333,
      taxBps: 1900,
    });

    expect(line).toMatchObject({
      description: "Consultation",
      baseAmount: 152,
      discountAmount: 51,
      taxAmount: 19,
      grossAmount: 120,
    });
    expect(
      sumBillingLines([
        line,
        calculateLineAmounts({
          quantityMilli: 1000,
          unitAmount: 200,
          discountBps: 0,
          taxBps: 0,
        }),
      ])
    ).toEqual({
      baseAmount: 352,
      discountAmount: 51,
      taxAmount: 19,
      grossAmount: 320,
    });
  });

  it("rejects non-integral or invalid monetary inputs", () => {
    expect(() =>
      calculateLineAmounts({
        quantityMilli: 0,
        unitAmount: 100,
        discountBps: 0,
        taxBps: 0,
      })
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "QUANTITY_INVALID",
      })
    );
    expect(() =>
      calculateLineAmounts({
        quantityMilli: 1000,
        unitAmount: 100.5,
        discountBps: 0,
        taxBps: 0,
      })
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "UNIT_AMOUNT_INVALID",
      })
    );
    expect(() =>
      calculateLineAmounts({
        quantityMilli: 1000,
        unitAmount: 100,
        discountBps: 10001,
        taxBps: 0,
      })
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "DISCOUNT_BPS_INVALID",
      })
    );
    expect(() =>
      normalizeBillingLine({
        description: "   ",
        quantityMilli: 1000,
        unitAmount: 100,
      })
    ).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "DESCRIPTION_REQUIRED",
      })
    );
  });
});

describe("billing settlement ledger", () => {
  it("derives balance solely from issued credits and completed cash movements", () => {
    expect(
      calculateInvoiceBalance({
        grossAmount: 10_000,
        issuedCreditAmount: 1_000,
        completedPaymentAmount: 5_000,
        completedRefundAmount: 500,
      })
    ).toBe(4_500);
  });

  it("derives open, partial, paid, overdue, and credited without storing settlement", () => {
    const now = new Date("2026-08-01T12:00:00.000Z");
    const base = {
      grossAmount: 10_000,
      issuedCreditAmount: 0,
      completedPaymentAmount: 0,
      completedRefundAmount: 0,
    };

    expect(deriveInvoiceSettlementStatus("issued", base, null, now)).toBe("open");
    expect(
      deriveInvoiceSettlementStatus(
        "issued",
        { ...base, completedPaymentAmount: 2_500 },
        null,
        now
      )
    ).toBe("partial");
    expect(
      deriveInvoiceSettlementStatus(
        "issued",
        { ...base, completedPaymentAmount: 10_000 },
        null,
        now
      )
    ).toBe("paid");
    expect(
      deriveInvoiceSettlementStatus(
        "issued",
        base,
        "2026-07-31T12:00:00.000Z",
        now
      )
    ).toBe("overdue");
    expect(
      deriveInvoiceSettlementStatus(
        "issued",
        { ...base, completedPaymentAmount: 2_500 },
        "2026-07-31T12:00:00.000Z",
        now
      )
    ).toBe("overdue");
    expect(
      deriveInvoiceSettlementStatus(
        "issued",
        { ...base, issuedCreditAmount: 10_000, completedPaymentAmount: 10_000 },
        null,
        now
      )
    ).toBe("credited");
    expect(deriveInvoiceSettlementStatus("void", base, null, now)).toBeNull();
  });

  it("enforces payment, credit, and refund ceilings", () => {
    expect(() => assertPaymentWithinBalance(1_001, 1_000)).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "PAYMENT_EXCEEDS_BALANCE",
      })
    );
    expect(() => assertCreditWithinRemaining(1_001, 1_000)).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "CREDIT_EXCEEDS_REMAINING",
      })
    );
    expect(() => assertRefundWithinAvailable(1_001, 1_000)).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "REFUND_EXCEEDS_AVAILABLE",
      })
    );
    expect(() => assertPaymentWithinBalance(0, 1_000)).toThrowError(
      expect.objectContaining<Partial<BillingDomainError>>({
        code: "AMOUNT_INVALID",
      })
    );
  });
});
