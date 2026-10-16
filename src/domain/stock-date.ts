import { StockError } from "./stock";

export function stockDay(value: Date = new Date()): string {
  if (!Number.isFinite(value.getTime())) throw new StockError("SOURCE_CONFLICT", "La date du mouvement est incorrecte.");
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function stockDate(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T12:00:00Z`)) || new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) !== value) {
    throw new StockError("SOURCE_CONFLICT", "La date de péremption est incorrecte. Choisissez une date complète.");
  }
  return value;
}

/** Existing SQLite timestamps are UTC even when their suffix is omitted. */
export function stockTimestamp(value: string): string {
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value) ? value.replace(" ", "T") + "Z" : value;
  if (!Number.isFinite(Date.parse(normalized))) throw new StockError("SOURCE_CONFLICT", "La date de réception est incorrecte.");
  return new Date(normalized).toISOString();
}
