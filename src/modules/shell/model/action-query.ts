export type PaletteIntent = {
  kind: "consultation" | "invoice" | "vaccination";
  entity: string;
};
export function parseActionQuery(value: string): PaletteIntent | null {
  const query = value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  const rules = [
    ["consultation", /^(?:nouvelle\s+)?consultation(?:\s+pour)?(?:\s+(.*))?$/],
    ["invoice", /^(?:facturer|facture)(?:\s+pour)?(?:\s+(.*))?$/],
    ["vaccination", /^(?:vaccination|vaccin)(?:\s+(?:pour|de))?(?:\s+(.*))?$/],
  ] as const;
  for (const [kind, rule] of rules) {
    const match = query.match(rule);
    if (match) return { kind, entity: (match[1] ?? "").trim() };
  }
  return null;
}
