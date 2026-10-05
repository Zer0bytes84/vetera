/** Preserve saved positions, discard retired blocks, append newly added ones. */
export function normalizeDashboardOrder(
  value: unknown,
  availableIds: string[]
): string[] {
  if (!Array.isArray(value)) return [...availableIds];
  const available = new Set(availableIds);
  const known = value.filter(
    (id): id is string => typeof id === "string" && available.has(id)
  );
  return [
    ...new Set(known),
    ...availableIds.filter((id) => !known.includes(id)),
  ];
}

export function migrateClassicDashboardOrder(
  value: unknown,
  availableIds: string[]
): string[] {
  const aliases: Record<string, string> = {
    "studio-now": "clinical-now",
    "studio-overview": "clinical-followup",
    "studio-finance": "clinical-followup",
    "studio-activity": "clinical-day",
    "studio-followup": "clinical-day",
    "studio-insights": "clinical-trends",
  };
  const mapped = Array.isArray(value)
    ? value.map((id) => (typeof id === "string" ? aliases[id] : undefined))
    : [];
  return normalizeDashboardOrder(mapped, availableIds);
}
