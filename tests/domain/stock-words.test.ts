import { describe, expect, it } from "vitest";
import { expiryWords, stockWords, unitCount } from "@/domain/stock-alerts";

const product = (quantity: number, minStock: number, unit = "dose", expiryDate?: string) => ({
  quantity, minStock, unit, expiryDate, stockTracked: true,
});

describe("stock in words", () => {
  it("says what is left against the threshold", () => {
    expect(stockWords(product(3, 5), "2026-10-21")).toBe("3 doses restantes, seuil 5");
    expect(stockWords(product(1, 5, "boite"), "2026-10-21")).toBe("1 boite restante, seuil 5");
    expect(stockWords(product(0, 5), "2026-10-21")).toBe("Plus rien en stock, seuil 5");
    expect(stockWords(product(8, 5), "2026-10-21")).toBe("");
  });

  it("keeps units that are already plural or phrases", () => {
    expect(unitCount(4, "comprimés")).toBe("4 comprimés");
    expect(unitCount(2, "flacon 10 ml")).toBe("2 flacon 10 ml");
  });

  it("dates an expiry in days", () => {
    expect(expiryWords(product(3, 1, "dose", "2026-11-30"), "2026-10-21")).toBe("Expire le 30 nov. 2026, dans 40 jours");
    expect(expiryWords(product(3, 1, "dose", "2026-10-12"), "2026-10-21")).toBe("Périmé depuis le 12 oct. 2026");
    expect(expiryWords(product(3, 1), "2026-10-21")).toBe("");
  });
});
