/**
 * La référence d'un règlement, telle qu'on la montre au vétérinaire. Un règlement encaissé en terminant un rendez-vous
 * porte l'identifiant de ce rendez-vous comme référence (la reprise idempotente le compare) : c'est un identifiant
 * technique, il ne s'affiche pas. Une référence saisie à la main reste visible.
 */
export function visiblePaymentReference(
  reference: string | null | undefined,
  invoice: { appointmentId?: string | null; id: string }
): string | null {
  const value = reference?.trim();
  if (!value) {
    return null;
  }
  if (
    value === invoice.appointmentId ||
    invoice.id === `appointment-invoice-${value}`
  ) {
    return null;
  }
  return value;
}
