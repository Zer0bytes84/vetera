import { describe, expect, it } from "vitest";
import { summarizeOwnerBalance } from "@/modules/patients/components/patient-header";

const inv = (over: Record<string, unknown>) => ({ ownerId: "o1", documentStatus: "issued", balanceAmount: 0, settlementStatus: "paid", ...over }) as never;

describe("solde du propriétaire, dans sa ligne", () => {
  it("additionne ce que le propriétaire doit sur ses factures émises, tous animaux confondus", () => {
    const r = summarizeOwnerBalance([inv({ balanceAmount: 12000, settlementStatus: "open" }), inv({ balanceAmount: 3000, settlementStatus: "partial" }), inv({ balanceAmount: 500, ownerId: "o2" })], "o1");
    expect(r).toEqual({ cents: 15000, late: false });
  });
  it("est en retard dès qu'une facture ouverte l'est", () => {
    expect(summarizeOwnerBalance([inv({ balanceAmount: 100, settlementStatus: "open" }), inv({ balanceAmount: 200, settlementStatus: "overdue" })], "o1").late).toBe(true);
  });
  it("ignore brouillons, annulées et soldées : zéro, rien de spécial", () => {
    const r = summarizeOwnerBalance([inv({ documentStatus: "draft", balanceAmount: 9000 }), inv({ documentStatus: "void", balanceAmount: 9000 }), inv({ balanceAmount: 0 }), inv({ balanceAmount: -50 })], "o1");
    expect(r).toEqual({ cents: 0, late: false });
  });
  it("une facture en retard déjà soldée ne rend pas le solde en retard", () => {
    expect(summarizeOwnerBalance([inv({ balanceAmount: 0, settlementStatus: "overdue" })], "o1").late).toBe(false);
  });
});
