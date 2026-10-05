import { useCallback, useEffect, useRef } from "react";
import { prefetchSQLiteTables } from "./useSQLite";
export function usePatientIntentPrefetch() {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancel = useCallback(() => { clearTimeout(timer.current); }, []);
  const warm = useCallback(() => {
    cancel();
    timer.current = setTimeout(() => { void prefetchSQLiteTables(["appointments", "consultation_soaps", "vaccinations", "weight_entries"]); }, 120);
  }, [cancel]);
  useEffect(() => cancel, [cancel]);
  return { onPointerEnter: warm, onPointerLeave: cancel, onFocus: warm, onBlur: cancel };
}
