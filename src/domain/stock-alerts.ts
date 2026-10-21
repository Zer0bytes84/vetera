import { stockBalance } from "./stock";
import { stockDay } from "./stock-date";

interface StockAlertProduct {
  stockTracked?: boolean; quantity: number; availableQuantity?: number; minStock: number;
  nearestExpiryDate?: string | null; expiryDate?: string; expiredQuantity?: number; expiringQuantity?: number;
}
export const stockExpiry = (product: StockAlertProduct) => product.nearestExpiryDate === undefined ? product.expiryDate : product.nearestExpiryDate ?? undefined;
export const usableStock = (product: StockAlertProduct) => product.availableQuantity ?? product.quantity;
export const restockNeed = (product: StockAlertProduct) => product.stockTracked === false ? 0 : stockBalance(Math.max(0, product.minStock - usableStock(product)));
export function stockAlert(product: StockAlertProduct, today = stockDay()): "healthy" | "expired" | "out" | "expiring" | "low" {
  if (product.stockTracked === false) return "healthy";
  const expiry = stockExpiry(product)?.slice(0, 10);
  if ((product.expiredQuantity ?? 0) > 0 || (product.quantity > 0 && expiry && expiry < today)) return "expired";
  if (usableStock(product) <= 0) return "out";
  const horizon = new Date(`${today}T12:00:00Z`); horizon.setUTCDate(horizon.getUTCDate() + 90);
  if ((product.expiringQuantity ?? 0) > 0 || (expiry && expiry <= horizon.toISOString().slice(0, 10))) return "expiring";
  if (restockNeed(product) > 0) return "low";
  return "healthy";
}

interface WordsProduct extends StockAlertProduct { unit: string }
/** "3 doses": the unit takes an s past one, unless it is already plural or a phrase. */
export function unitCount(quantity: number, unit: string) {
  const plural = Math.abs(quantity) > 1 && !!unit && !/[sx]$/i.test(unit) && !/\s/.test(unit);
  return `${quantity.toLocaleString("fr-FR", { maximumFractionDigits: 6 })} ${plural ? `${unit}s` : unit}`.trim();
}
/** Stock in words for a product that needs attention, empty when all is well. */
export function stockWords(product: WordsProduct, today = stockDay()): string {
  if (product.stockTracked === false) return "";
  const usable = usableStock(product);
  const need = restockNeed(product);
  const left = usable > 0 ? `${unitCount(usable, product.unit)} restante${usable > 1 ? "s" : ""}` : "Plus rien en stock";
  const alert = stockAlert(product, today);
  if (alert === "out" || need > 0) return `${left}, seuil ${product.minStock}`;
  return alert === "healthy" ? "" : left;
}
const DAY_MS = 86_400_000;
/** "Expire le 30 nov. 2026, dans 40 jours", or how long ago it expired. */
export function expiryWords(product: StockAlertProduct, today = stockDay()): string {
  const expiry = stockExpiry(product)?.slice(0, 10);
  if (!expiry) return "";
  const days = Math.round((Date.parse(`${expiry}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / DAY_MS);
  const date = new Date(`${expiry}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  if (days < 0) return `Périmé depuis le ${date}`;
  if (days === 0) return `Expire aujourd’hui`;
  return `Expire le ${date}, dans ${days} jour${days > 1 ? "s" : ""}`;
}
