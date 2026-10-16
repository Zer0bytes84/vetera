export type StockErrorCode = "PRODUCT_MISSING" | "INVALID_QUANTITY" | "INSUFFICIENT_STOCK" | "SOURCE_CONFLICT";

export class StockError extends Error {
  constructor(readonly code: StockErrorCode, message: string) {
    super(message);
    this.name = "StockError";
  }
}

const PRECISION = 1_000_000;

/** Physical stock quantities, not doses. Never interpret prescription free text. */
export function stockQuantity(value: number, allowZero = false): number {
  const scaled = value * PRECISION;
  if (!Number.isFinite(value) || !Number.isSafeInteger(Math.round(scaled)) ||
    value < 0 || (!allowZero && value === 0) || Math.abs(scaled - Math.round(scaled)) > 0.0001) {
    throw new StockError("INVALID_QUANTITY", "Indiquez une quantité positive, avec au maximum six décimales, dans l’unité du stock.");
  }
  return Math.round(scaled) / PRECISION;
}

export function stockBalance(value: number): number {
  return Math.round(value * PRECISION) / PRECISION;
}

export function parseStockQuantityInput(value: string): number {
  const text = value.trim().replace(/[\s\u00a0\u202f]/g, "");
  return /^\d+(?:[.,]\d{0,6})?$/.test(text) ? Number(text.replace(",", ".")) : NaN;
}

export function stockQuantityLabel(value: number, unit: string): string {
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 6 })} ${unit}`;
}

export function insufficientStockMessage(name: string, available: number, requested: number, unit: string): string {
  return `Stock insuffisant pour ${name} : ${stockQuantityLabel(available, unit)} disponibles, ${stockQuantityLabel(requested, unit)} demandés. Réapprovisionnez ou corrigez la quantité avant de valider.`;
}
