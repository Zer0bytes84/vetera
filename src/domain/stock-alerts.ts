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
