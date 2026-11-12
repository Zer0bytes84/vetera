/** The quick actions, in the order of the patient's path through the practice: book, register, see, treat, document, stock, bill. */
export const QUICK_ACTIONS = [
  { id: "appointment", label: "Rendez-vous" },
  { id: "patient", label: "Patient" },
  { id: "consultation", label: "Consultation" },
  { id: "care", label: "Soin" },
  { id: "document", label: "Document" },
  { id: "product", label: "Produit" },
  { id: "invoice", label: "Facture" },
] as const;
export type QuickAction = (typeof QUICK_ACTIONS)[number]["id"];
