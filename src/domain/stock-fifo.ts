import { StockError, insufficientStockMessage, stockBalance, stockQuantity } from "./stock";
import { stockDate, stockDay, stockTimestamp } from "./stock-date";

export interface StockBucket {
  id: string;
  productId: string;
  lotId: string | null;
  locationId: string;
  quantity: number;
  receivedAt: string;
  expiryDate: string | null;
}
export interface StockSelection {
  /** Undefined: FIFO. Null: explicitly use stock without a lot. */
  lotId?: string | null;
  locationId?: string;
}
export interface StockAllocation { balanceId: string; quantity: number }

/** FIFO orders physical receipts, never expiry dates. Expired stock is excluded. */
export function selectFifoAllocations(buckets: readonly StockBucket[], input: {
  productId: string; productName: string; unit: string; quantity: number; onDate: string;
} & StockSelection): StockAllocation[] {
  const requested = stockQuantity(input.quantity);
  if (!stockDate(input.onDate)) throw new StockError("SOURCE_CONFLICT", "La date de consommation est requise.");
  const candidates = buckets.filter(bucket => bucket.productId === input.productId &&
    (input.lotId === undefined || bucket.lotId === input.lotId) &&
    (!input.locationId || bucket.locationId === input.locationId));
  for (const bucket of candidates) {
    stockQuantity(Math.abs(bucket.quantity), true);
    stockDate(bucket.expiryDate);
    stockTimestamp(bucket.receivedAt);
  }
  const eligible = candidates.filter(bucket => bucket.quantity > 0 && (!bucket.expiryDate || bucket.expiryDate >= input.onDate) && stockDay(new Date(stockTimestamp(bucket.receivedAt))) <= input.onDate);
  eligible.sort((a, b) => Date.parse(stockTimestamp(a.receivedAt)) - Date.parse(stockTimestamp(b.receivedAt)) || (a.id < b.id ? -1 : a.id === b.id ? 0 : 1));
  const available = stockBalance(eligible.reduce((sum, bucket) => sum + bucket.quantity, 0));
  if (available < requested) throw new StockError("INSUFFICIENT_STOCK", insufficientStockMessage(input.productName, available, requested, input.unit));
  const allocations: StockAllocation[] = [];
  let remaining = requested;
  for (const bucket of eligible) {
    if (remaining === 0) break;
    const quantity = stockBalance(Math.min(remaining, bucket.quantity));
    if (quantity > 0) allocations.push({balanceId: bucket.id, quantity});
    remaining = stockBalance(remaining - quantity);
  }
  if (remaining !== 0) throw new StockError("SOURCE_CONFLICT", "La répartition du stock est incohérente. Vérifiez les quantités avant de valider.");
  return allocations;
}
