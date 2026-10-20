/**
 * What the billing dialog may submit. No amount is ever assumed: each line
 * needs a price typed by the veterinarian, and the payment of the day must
 * be entered explicitly, 0 included, before the visit can be closed.
 */

export interface DraftLine {
  /** Typed text, empty until a price is entered. */
  amount: string;
  desc: string;
}

/** An invoice already issued for the visit: its lines and real balance rule. */
export interface ExistingInvoice {
  balanceDa: number;
  grossDa: number;
  lines: Array<{ amountDa: number; desc: string }>;
  number: string | null;
}

/** Whole dinars typed by a person; anything else (empty, negative, letters) is null. */
export function parseDinars(text: string): number | null {
  const clean = text.replace(/\s/g, "").replace(",", ".");
  if (!clean) return null;
  const value = Number(clean);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export interface BillingDraft {
  /** What is still owed once today's payment is recorded. */
  balanceAfter: number;
  canConfirm: boolean;
  /** Owed before today's payment: the total, or what an issued invoice still awaits. */
  due: number;
  /** Total of 0 DA on purpose: closed without invoice. */
  free: boolean;
  items: Array<{ amount: number; desc: string }>;
  problem: string | null;
  received: number | null;
  total: number;
}

export function billingDraft(lines: readonly DraftLine[], receivedText: string, existing?: ExistingInvoice | null): BillingDraft {
  const items = existing
    ? existing.lines.map((line) => ({ amount: line.amountDa, desc: line.desc }))
    : lines.map((line) => ({ amount: parseDinars(line.amount), desc: line.desc.trim() }));
  const missingPrice = items.some((item) => item.amount === null);
  const missingLabel = items.some((item) => !item.desc);
  const total = existing ? existing.grossDa : items.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const due = existing ? existing.balanceDa : total;
  const free = !existing && !missingPrice && total === 0;
  const received = free ? 0 : parseDinars(receivedText);

  let problem: string | null = null;
  if (items.length === 0) problem = "Ajoutez au moins une prestation.";
  else if (missingLabel) problem = "Donnez un libellé à chaque prestation.";
  else if (missingPrice) problem = "Indiquez le prix de chaque prestation.";
  else if (received === null) problem = "Indiquez le montant réglé aujourd'hui, 0 DA si le client ne paie pas maintenant.";
  else if (received > due) problem = `Le règlement dépasse le reste dû (${due.toLocaleString("fr-FR")} DA).`;

  return {
    balanceAfter: Math.max(0, due - (received ?? 0)),
    canConfirm: problem === null,
    due,
    free,
    items: items.map((item) => ({ amount: item.amount ?? 0, desc: item.desc })),
    problem,
    received,
    total,
  };
}
