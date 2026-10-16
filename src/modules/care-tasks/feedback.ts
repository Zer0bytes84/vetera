const careBusinessMessages = new Set([
  "Un utilisateur connecté est requis.",
  "Choisissez un patient et indiquez le soin.",
  "Vérifiez le type et l’heure prévue du soin.",
  "Ce soin n’existe plus.",
  "Ce changement de statut n’est pas autorisé.",
  "Indiquez le motif de l’annulation.",
  "Indiquez le motif de l’annulation de validation.",
  "Ce soin vient d’être modifié. Actualisez la vue.",
  "Le produit d’un soin terminé ne peut plus être modifié.",
]);

/** Only deliberate French guidance may be shown; driver details stay internal. */
export function careErrorMessage(error: unknown, operation: "create" | "update") {
  if (error instanceof StockError) return error.message;
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (careBusinessMessages.has(message)) return message;
  return operation === "create"
    ? "Le soin n’a pas pu être enregistré. Réessayez."
    : "Le soin n’a pas pu être modifié. Réessayez.";
}
import { StockError } from "@/domain/stock";
