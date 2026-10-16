import { useEffect, useSyncExternalStore } from "react";
import { isTauriRuntime } from "@/services/browser-store";
import { inventoryService } from "../services/inventory-service";
import type { StockInventorySnapshot } from "../services/inventory-store";

const DATA_CHANGED_EVENT = "sqlite-data-changed";

type State = StockInventorySnapshot & {ready: boolean; error: string | null};
const empty: State = {supported: false, balances: [], locations: [], ready: false, error: null};
const web: State = {...empty, ready: true};
let state = empty;
let generation = 0;
let pending: Promise<void> | null = null;
const subscribers = new Set<() => void>();
const notify = () => subscribers.forEach(listener => listener());

async function refresh() {
  if (!isTauriRuntime() || pending) return pending;
  const request = generation;
  pending = (async () => {
    try {
      const result = await inventoryService.snapshot();
      if (request === generation) {state = {...result, ready: true, error: null}; notify();}
    } catch {
      if (request === generation) {state = {...state, ready: false, error: "La disponibilité du stock n’a pas pu être vérifiée. Actualisez la vue."}; notify();}
    } finally {
      pending = null;
      if (request !== generation && subscribers.size) void refresh();
    }
  })();
  return pending;
}

function invalidate() {
  generation++;
  state = {...state, ready: false}; notify();
  queueMicrotask(() => {void refresh();});
}
function changed(event: Event) {
  const table = (event as CustomEvent<{tableName: string}>).detail?.tableName;
  if (["products", "stock_movements", "product_lots", "stock_balances", "stock_locations"].includes(table ?? "")) invalidate();
}
function subscribe(listener: () => void) {
  subscribers.add(listener);
  if (subscribers.size === 1 && typeof window !== "undefined") window.addEventListener(DATA_CHANGED_EVENT, changed);
  return () => {subscribers.delete(listener); if (!subscribers.size && typeof window !== "undefined") window.removeEventListener(DATA_CHANGED_EVENT, changed);};
}

export function useStockInventory() {
  const value = useSyncExternalStore(subscribe, () => isTauriRuntime() ? state : web, () => web);
  useEffect(() => {
    if (!isTauriRuntime()) return;
    void refresh();
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const now = new Date(); const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timeout = setTimeout(() => {invalidate(); schedule();}, Math.max(1, next.getTime() - now.getTime()));
    };
    schedule();
    return () => clearTimeout(timeout);
  }, []);
  return {...value, refresh: () => {invalidate();}};
}
