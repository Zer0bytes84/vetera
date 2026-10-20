import { describe, expect, it } from "vitest";
import { billingDraft, parseDinars } from "@/modules/billing/billing-draft";

const line = (desc: string, amount: string) => ({ desc, amount });

describe("fenêtre de facturation", () => {
  it("ne suppose aucun montant : prix et règlement doivent être saisis", () => {
    const empty = billingDraft([line("Consultation - Contrôle", "")], "");
    expect(empty).toMatchObject({ canConfirm: false, total: 0, received: null, free: false });
    expect(empty.problem).toMatch(/prix de chaque prestation/);

    const priced = billingDraft([line("Consultation - Contrôle", "3500")], "");
    expect(priced).toMatchObject({ canConfirm: false, total: 3500, due: 3500 });
    expect(priced.problem).toMatch(/montant réglé aujourd'hui/);
  });

  it("envoie exactement le prix et le règlement saisis", () => {
    const draft = billingDraft([line("Consultation", "3500"), line("Injection", "1 200")], "4000");
    expect(draft).toMatchObject({
      canConfirm: true,
      items: [
        { desc: "Consultation", amount: 3500 },
        { desc: "Injection", amount: 1200 },
      ],
      total: 4700,
      received: 4000,
      balanceAfter: 700,
    });
  });

  it("accepte 0 DA explicite pour une créance, refuse un règlement trop élevé", () => {
    expect(billingDraft([line("Consultation", "3500")], "0")).toMatchObject({ canConfirm: true, received: 0, balanceAfter: 3500 });
    expect(billingDraft([line("Consultation", "3500")], "5000").problem).toMatch(/dépasse le reste dû \(3\s?500 DA\)/);
  });

  it("traite un total saisi à 0 comme acte gratuit, sans règlement", () => {
    expect(billingDraft([line("Contrôle offert", "0")], "")).toMatchObject({ canConfirm: true, free: true, received: 0 });
  });

  it("reprend une facture déjà émise et ne propose que son reste réellement dû", () => {
    const existing = { number: "INV-2026-000018", grossDa: 5000, balanceDa: 2000, lines: [{ desc: "Consultation", amountDa: 5000 }] };
    const draft = billingDraft([line("ignoré", "")], "", existing);
    expect(draft).toMatchObject({ total: 5000, due: 2000, canConfirm: false, items: [{ desc: "Consultation", amount: 5000 }] });
    expect(billingDraft([], "2000", existing)).toMatchObject({ canConfirm: true, received: 2000, balanceAfter: 0 });
    expect(billingDraft([], "2500", existing).problem).toMatch(/reste dû/);
  });

  it("lit les montants comme une personne les tape", () => {
    expect(["", "  ", "abc", "-5"].map(parseDinars)).toEqual([null, null, null, null]);
    expect(["0", "2 500", "1500,5"].map(parseDinars)).toEqual([0, 2500, 1500.5]);
  });
});
