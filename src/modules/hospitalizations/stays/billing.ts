import type { CreateInvoiceDraftInput } from "@/services/billingService";
import type { InvoiceDetail, Patient, Product } from "@/types/db";
import { stayDays } from "./domain";
import type { Stay } from "./store";

export function stayInvoiceInput(stay: Stay, patient: Pick<Patient, "id" | "ownerId">, product: Product, author: string): CreateInvoiceDraftInput {
  if (!author.trim()) throw new Error("Un utilisateur connecté est requis.");
  if (stay.status !== "sorti" || !stay.discharged_at) throw new Error("Confirmez la sortie avant de préparer la facture.");
  if (patient.id !== stay.patient_id || !patient.ownerId) throw new Error("Vérifiez le patient et son propriétaire.");
  if (product.archivedAt || !Number.isSafeInteger(product.salePriceAmount) || product.salePriceAmount < 0) throw new Error("Choisissez un tarif actif et valide.");
  const days = stayDays(new Date(stay.admitted_at), new Date(stay.discharged_at));
  return {
    id: `stay-invoice:${stay.id}`,
    patientId: patient.id,
    ownerId: patient.ownerId,
    actor: { userId: author },
    notes: `Hospitalisation : ${stay.reason}. ${stay.discharge_summary}`,
    // Price snapshot only: the daily service must not consume catalogue stock.
    lines: [{ description: `${product.name} · ${days} journée${days > 1 ? "s" : ""} d’hospitalisation`, quantityMilli: days * 1000, unitAmount: product.salePriceAmount }],
  };
}

export async function prepareStayInvoice(input: CreateInvoiceDraftInput, billing: {
  getInvoice: (id: string) => Promise<InvoiceDetail | null>;
  createInvoiceDraft: (input: CreateInvoiceDraftInput) => Promise<InvoiceDetail>;
}): Promise<InvoiceDetail> {
  if (!input.id?.startsWith("stay-invoice:")) throw new Error("Référence de séjour invalide.");
  const existing = await billing.getInvoice(input.id);
  if (existing) return existing;
  try { return await billing.createInvoiceDraft(input); }
  catch (error) {
    // A concurrent request may have committed the same deterministic reference.
    const committed = await billing.getInvoice(input.id);
    if (committed) return committed;
    throw error;
  }
}
