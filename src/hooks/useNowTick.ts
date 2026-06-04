import { useEffect, useState } from "react";

/**
 * Returns a `Date` that updates every `intervalMs` to keep "il y a X min"
 * labels fresh without re-rendering the whole tree every render.
 *
 * React 19 strict: we never call `Date.now()` during render — we set the
 * initial value via `flushSync`-friendly `useState` initializer and tick
 * the value via `setInterval` instead of `setTimeout` recursion.
 */
export function useNowTick(intervalMs = 60_000): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
