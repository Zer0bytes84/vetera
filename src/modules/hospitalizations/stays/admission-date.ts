/** Selected local calendar day and 24-hour time, serialized as the actual instant. */
export function admissionDateTime(day: Date | undefined, time: string): string | null {
  if (!day || !Number.isFinite(day.getTime()) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes);
  // A nonexistent local hour during a DST transition must not silently roll forward.
  if (date.getHours() !== hours || date.getMinutes() !== minutes) return null;
  return date.toISOString();
}
