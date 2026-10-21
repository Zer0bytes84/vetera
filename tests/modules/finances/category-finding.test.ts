import { describe, expect, it } from "vitest";
import { categoryFinding, otherIncome } from "@/modules/finances/category-finding";

describe("categoryFinding", () => {
  it("names the leading source and the next one", () => {
    expect(categoryFinding([{ label: "Pharmacie", value: 2100 }, { label: "Consultation", value: 6200 }], 10000))
      .toBe("Consultation représente 62 % des encaissements des 30 derniers jours, devant Pharmacie (21 %).");
  });
  it("says when a single source makes everything", () => {
    expect(categoryFinding([{ label: "billing", value: 500 }], 500)).toBe("Tous les encaissements des 30 derniers jours viennent de Facturation.");
  });
  it("says nothing without income", () => {
    expect(categoryFinding([{ label: "Consultation", value: 0 }], 0)).toBe("");
  });
});

describe("otherIncome", () => {
  it("is what the listed sources leave out", () => {
    expect(otherIncome([{ value: 60 }, { value: 30 }], 100)).toBe(10);
    expect(otherIncome([{ value: 100 }], 100)).toBe(0);
  });
});
