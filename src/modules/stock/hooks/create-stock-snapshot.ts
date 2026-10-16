import { useEffect, useSyncExternalStore } from "react";
import { isTauriRuntime } from "@/services/browser-store";

/** One cache per feature, refreshed only after committed SQLite events. */
export function createStockSnapshotHook<T>(initial: T, load: () => Promise<T>, tables: readonly string[], failureMessage: string, refreshAtMidnight = false) {
  const empty = {data: initial, ready: false, error: null as string | null};
  const web = {...empty, ready: true};
  let state = empty;
  let generation = 0;
  let pending: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  async function refresh() {
    if (!isTauriRuntime() || pending) return pending;
    const request = generation;
    pending = (async () => {
      try {
        const data = await load();
        if (request === generation) {state = {data, ready: true, error: null}; notify();}
      } catch {
        if (request === generation) {state = {...state, ready: false, error: failureMessage}; notify();}
      } finally {
        pending = null;
        if (request !== generation && listeners.size) void refresh();
      }
    })();
    return pending;
  }
  const invalidate = () => {generation++; state = {...state, ready: false}; notify(); queueMicrotask(() => {void refresh();});};
  function changed(event: Event) {
    if (tables.includes((event as CustomEvent<{tableName: string}>).detail?.tableName)) invalidate();
  }
  function subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1 && typeof window !== "undefined") window.addEventListener("sqlite-data-changed", changed);
    return () => {listeners.delete(listener); if (!listeners.size && typeof window !== "undefined") window.removeEventListener("sqlite-data-changed", changed);};
  }
  return function useStockSnapshot() {
    const value = useSyncExternalStore(subscribe, () => isTauriRuntime() ? state : web, () => web);
    useEffect(() => {
      void refresh();
      if (!refreshAtMidnight || !isTauriRuntime()) return;
      let timeout: ReturnType<typeof setTimeout>;
      const schedule = () => {
        const now = new Date(); const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        timeout = setTimeout(() => {invalidate(); schedule();}, Math.max(1, next.getTime() - now.getTime()));
      };
      schedule(); return () => clearTimeout(timeout);
    }, []);
    return {...value, refresh: invalidate};
  };
}
