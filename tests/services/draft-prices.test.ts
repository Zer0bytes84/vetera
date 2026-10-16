import { expect, it } from "vitest";
import { draftPriceLines, priceInput } from "@/modules/finances/lib/draft-prices";
const line = { id: "line", description: "Soin", productId: "product", quantityMilli: 2500, unitAmount: 0, discountBps: 1000, taxBps: 1900 };
const invoice = { documentStatus: "draft" as const, lines: [line] };
it("convertit les prix en DA exactement et conserve les autres données", () => {
  expect(draftPriceLines(invoice, { line: "123,45" })).toEqual([{ id: "line", description: "Soin", productId: "product", quantityMilli: 2500, unitAmount: 12345, discountBps: 1000, taxBps: 1900 }]);
  expect(draftPriceLines(invoice, { line: "0" })[0].unitAmount).toBe(0);
  expect(draftPriceLines(invoice, { line: "0.01" })[0].unitAmount).toBe(1);
  expect(priceInput(12345)).toBe("123,45");
});
it("refuse les prix invalides ou hors précision sans accepter une saisie partielle", () => {
  for (const value of ["", "-1", "1,234", "12 euros", "1e3", "90071992547410", "1."]) {
    expect(() => draftPriceLines(invoice, { line: value })).toThrow();
  }
  expect(() => draftPriceLines(invoice, {})).toThrow();
});
it("refuse la modification d’une facture émise ou annulée", () => {
  for (const documentStatus of ["issued", "void"] as const) {
    expect(() => draftPriceLines({ ...invoice, documentStatus }, { line: "123" })).toThrow("Seul un brouillon");
  }
});
