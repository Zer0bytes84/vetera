import { createStockSnapshotHook } from "./create-stock-snapshot";
import { purchasingService } from "../services/purchasing-service";
import type { PurchasingSnapshot } from "../services/purchasing-store";

const useSnapshot = createStockSnapshotHook<PurchasingSnapshot>(
  {suppliers: [], orders: [], lines: [], receipts: [], receiptLines: []}, purchasingService.snapshot,
  ["stock_suppliers", "purchase_orders", "purchase_order_lines", "purchase_receipts", "purchase_receipt_lines"],
  "Les approvisionnements n’ont pas pu être chargés. Actualisez la vue pour réessayer.",
);
export function usePurchasing() {
  const snapshot = useSnapshot();
  return {...snapshot.data, ready: snapshot.ready, error: snapshot.error, refresh: snapshot.refresh};
}
