import { describe, expect, it } from "vitest";
import { formatCentimes, formatCurrency } from "./model";

describe("dashboard currency units", () => {
  it("converts repository centimes without changing dinar chart metrics", () => {
    expect(formatCentimes(200000)).toBe(formatCurrency(2000));
    expect(formatCentimes(200000)).not.toBe(formatCurrency(200000));
    expect(formatCentimes(0)).toBe(formatCurrency(0));
  });
});
