import { createStockSnapshotHook } from "./create-stock-snapshot";
import { stockOperationsService } from "../services/stock-operations-service";
import type { StockOperationsSnapshot } from "../services/stock-operations-store";

const useSnapshot = createStockSnapshotHook<StockOperationsSnapshot>(
  {barcodes: [], consumption: [], transfers: []}, stockOperationsService.snapshot,
  ["product_barcodes", "stock_transfers", "stock_movements", "products", "stock_balances", "stock_locations"],
  "Les opérations de stock n’ont pas pu être chargées. Actualisez la vue pour réessayer.", true,
);
export function useStockOperations() {const state = useSnapshot(); return {...state.data, ready: state.ready, error: state.error, refresh: state.refresh};}
