import { describe, expect, it } from "vitest";
import { invoicedByNature, lineNature } from "@/modules/finances/invoice-natures";

const line = (invoiceId: string, issuedAt: string, amount: number, productId: string | null = null, appointmentType: string | null = null) =>
  ({ invoiceId, issuedAt, amount, productId, appointmentType });

const ranges = {
  current: { from: new Date("2026-10-01T00:00:00Z"), to: new Date("2026-10-31T23:59:59Z") },
  previous: { from: new Date("2026-09-01T00:00:00Z"), to: new Date("2026-09-30T23:59:59Z") },
};

describe("lineNature", () => {
  it("reads the nature from facts the invoice carries", () => {
    expect(lineNature(line("stay-invoice:s1", "", 0, "p"))).toBe("hospitalisation");
    expect(lineNature(line("i1", "", 0, "p", "Chirurgie"))).toBe("produits");
    expect(lineNature(line("i1", "", 0, null, "Chirurgie"))).toBe("chirurgie");
    expect(lineNature(line("i1", "", 0, null, "Vaccin"))).toBe("consultations");
    expect(lineNature(line("i1", "", 0))).toBe("consultations");
  });
});

describe("invoicedByNature", () => {
  it("sums each nature on both periods and gives the change", () => {
    const rows = invoicedByNature([
      line("i1", "2026-10-05 10:00:00", 400000, null, "Consultation"),
      line("i2", "2026-09-05 10:00:00", 200000, null, "Consultation"),
      line("i3", "2026-10-06 10:00:00", 300000, null, "Chirurgie"),
      line("stay-invoice:s1", "2026-10-07T10:00:00.000Z", 150000),
      line("i4", "2026-08-01 10:00:00", 999999, "p"),
    ], ranges);
    expect(rows.map((row) => [row.key, row.value, row.previous, row.change])).toEqual([
      ["consultations", 400000, 200000, 100],
      ["chirurgie", 300000, 0, null],
      ["produits", 0, 0, 0],
      ["hospitalisation", 150000, 0, null],
    ]);
  });
});
