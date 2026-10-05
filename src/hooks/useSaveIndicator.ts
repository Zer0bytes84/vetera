import { useEffect, useState, useSyncExternalStore } from "react";
import { getSQLiteWriteStatus, subscribeSQLiteWrites } from "./useSQLite";
export function useSaveIndicator() {
  const status = useSyncExternalStore(subscribeSQLiteWrites, getSQLiteWriteStatus, getSQLiteWriteStatus);
  const [expiredSavedAt, setExpiredSavedAt] = useState<number | null>(null);
  useEffect(() => {
    if (!status.savedAt) return;
    const savedAt = status.savedAt;
    const timer = setTimeout(
      () => setExpiredSavedAt(savedAt),
      Math.max(0, 3000 - (Date.now() - savedAt))
    );
    return () => clearTimeout(timer);
  }, [status.savedAt]);
  const showSaved = status.savedAt !== null && status.savedAt !== expiredSavedAt;
  return status.pending > 0 ? "saving" : status.error ? "error" : showSaved ? "saved" : "idle";
}
