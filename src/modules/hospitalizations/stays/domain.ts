export const STAY_STATUSES = ["admis", "en_cours", "sortie_prevue", "sorti", "annule"] as const;
export type StayStatus = (typeof STAY_STATUSES)[number];
export const ACTIVE_STAY_STATUSES: readonly StayStatus[] = ["admis", "en_cours", "sortie_prevue"];
export function assertStayTransition(from: StayStatus, to: StayStatus, author: string, reason?: string) {
  if (!author.trim()) throw new Error("Un utilisateur connecté est requis.");
  const next: Record<StayStatus, readonly StayStatus[]> = {
    admis: ["en_cours", "annule"], en_cours: ["sortie_prevue", "annule"],
    sortie_prevue: ["sorti", "annule"], sorti: [], annule: [],
  };
  if (!next[from].includes(to)) throw new Error("Ce changement de statut du séjour n’est pas autorisé.");
  if (to === "annule" && !reason?.trim()) throw new Error("Indiquez le motif de l’annulation.");
}
function validDate(value: Date) {
  if (!Number.isFinite(value.getTime())) throw new Error("La date du séjour est invalide.");
}
function calendarDay(value: Date) {
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
}
/** Calendar dates occupied, with a midnight discharge excluded. Never divides elapsed hours. */
export function stayDays(admitted: Date, discharged: Date): number {
  validDate(admitted); validDate(discharged);
  if (discharged < admitted) throw new Error("La sortie ne peut pas précéder l’admission.");
  const midnight = discharged.getHours() === 0 && discharged.getMinutes() === 0 && discharged.getSeconds() === 0 && discharged.getMilliseconds() === 0;
  return Math.max(1, Math.round((calendarDay(discharged) - calendarDay(admitted)) / 86400000) + (midnight ? 0 : 1));
}
/** Local wall-clock schedule: one occurrence per calendar day and explicitly selected time. */
export function carePlanOccurrences(start: Date, end: Date, times: readonly string[]): string[] {
  validDate(start); validDate(end);
  if (end < start) throw new Error("La fin du plan ne peut pas précéder son début.");
  if (!times.length || times.some(time => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) throw new Error("Choisissez des horaires valides pour les soins.");
  const result: string[] = [];
  const unique = [...new Set(times)].sort();
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  let days = 0;
  while (calendarDay(cursor) <= calendarDay(end)) {
    if (++days > 366) throw new Error("Un plan ne peut pas dépasser 366 jours.");
    for (const time of unique) {
      const [hours, minutes] = time.split(":").map(Number);
      const occurrence = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), hours, minutes);
      // Refuse a nonexistent wall-clock time during spring daylight saving changes.
      if (occurrence.getHours() !== hours || occurrence.getMinutes() !== minutes) throw new Error("Un horaire choisi n’existe pas lors du changement d’heure. Ajustez le plan.");
      if (occurrence >= start && occurrence <= end) result.push(occurrence.toISOString());
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}
