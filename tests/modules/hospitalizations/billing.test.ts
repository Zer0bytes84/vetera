import { expect, it, vi } from "vitest";
import { prepareStayInvoice, stayInvoiceInput } from "../../../src/modules/hospitalizations/stays/billing";
import type { Stay } from "../../../src/modules/hospitalizations/stays/store";
import type { InvoiceDetail, Product } from "../../../src/types/db";
const stay: Stay = { id: "stay", patient_id: "patient", location_id: null, status: "sorti", admitted_at: new Date(2026, 9, 12, 10).toISOString(), discharged_at: new Date(2026, 9, 14, 0).toISOString(), planned_discharge_at: null, reason: "Observation", discharge_summary: "Retour à domicile", cancellation_reason: null, author_id: "vet", created_at: "", updated_at: "" };
const patient = { id: "patient", ownerId: "owner" };
const product: Product = { id: "tariff", name: "Journée", category: "Service", createdAt: "", minStock: 0, quantity: 0, salePriceAmount: 10000, purchasePriceAmount: 0, unit: "jour" };
it("calcule les journées au tarif réel sans mouvement de stock et prépare seulement un brouillon", () => {
 const input = stayInvoiceInput(stay, patient, product, "vet");
 expect(input).toMatchObject({ id: "stay-invoice:stay", patientId: "patient", ownerId: "owner", lines: [{ quantityMilli: 2000, unitAmount: 10000 }] });
 expect(input.lines?.[0].productId).toBeUndefined();
});
it("refuse séjour actif, autre patient, tarif archivé et auteur absent", () => {
 expect(() => stayInvoiceInput({ ...stay, status: "en_cours" }, patient, product, "vet")).toThrow();
 expect(() => stayInvoiceInput(stay, { ...patient, id: "other" }, product, "vet")).toThrow();
 expect(() => stayInvoiceInput(stay, patient, { ...product, archivedAt: "2026-10-12" }, "vet")).toThrow();
 expect(() => stayInvoiceInput(stay, patient, product, "")).toThrow();
});
it("réutilise une facture existante sans la recréer ni l’émettre", async () => {
 const input = stayInvoiceInput(stay, patient, product, "vet");
 const invoice = { id: input.id } as InvoiceDetail;
 const createInvoiceDraft = vi.fn();
 expect(await prepareStayInvoice(input, { getInvoice: async () => invoice, createInvoiceDraft })).toBe(invoice);
 expect(createInvoiceDraft).not.toHaveBeenCalled();
});
it("retrouve le brouillon après une création concurrente et propage une véritable erreur", async () => {
 const input = stayInvoiceInput(stay, patient, product, "vet");
 const invoice = { id: input.id } as InvoiceDetail;
 const getInvoice = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(invoice);
 expect(await prepareStayInvoice(input, { getInvoice, createInvoiceDraft: async () => { throw new Error("unique"); } })).toBe(invoice);
 await expect(prepareStayInvoice(input, { getInvoice: async () => null, createInvoiceDraft: async () => { throw new Error("disk"); } })).rejects.toThrow("disk");
});
