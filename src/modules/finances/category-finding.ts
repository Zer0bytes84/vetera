const share = (value: number, total: number) =>
  `${((value / total) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} %`;
const name = (label: string) => (label.toLowerCase() === "billing" ? "Facturation" : label);

/**
 * One sentence on where the money came from: the leading source and its
 * share, then the next one. Nothing is said without income.
 */
export function categoryFinding(categories: { label: string; value: number }[], total: number) {
  const sources = categories.filter((category) => category.value > 0).sort((left, right) => right.value - left.value);
  if (total <= 0 || !sources.length) return "";
  const [first, second] = sources;
  if (first.value >= total) return `Tous les encaissements des 30 derniers jours viennent de ${name(first.label)}.`;
  const lead = `${name(first.label)} représente ${share(first.value, total)} des encaissements des 30 derniers jours`;
  return second ? `${lead}, devant ${name(second.label)} (${share(second.value, total)}).` : `${lead}.`;
}

/** What the listed sources leave out of the total, so the rows add up. */
export function otherIncome(categories: { value: number }[], total: number) {
  return Math.max(0, total - categories.reduce((sum, category) => sum + category.value, 0));
}
