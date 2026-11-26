const CONSULTATION_ACTION =
  /^(?:nouvelle?\s+)?(?:consultation|rdv|rendez-vous)(?:\s+pour)?(?:\s+(.*))?$/;
const INVOICE_ACTION = /^(?:facturer|facture)(?:\s+pour)?(?:\s+(.*))?$/;
const VACCINATION_ACTION =
  /^(?:vaccination|vaccin)(?:\s+(?:pour|de))?(?:\s+(.*))?$/;

export interface PaletteIntent {
  entity: string;
  kind: "consultation" | "invoice" | "vaccination";
}
export function parseActionQuery(value: string): PaletteIntent | null {
  const query = value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  const rules = [
    ["consultation", CONSULTATION_ACTION],
    ["invoice", INVOICE_ACTION],
    ["vaccination", VACCINATION_ACTION],
  ] as const;
  for (const [kind, rule] of rules) {
    const match = query.match(rule);
    if (match) {
      return { kind, entity: (match[1] ?? "").trim() };
    }
  }
  return null;
}
