import { useCallback, useEffect, useRef, useState } from "react";
import { careDisplayStatus, type CareTask } from "./domain";
import { careTasksService } from "./service";
export const CARE_TASKS_CHANGED = "baitari:care-tasks-changed";
export function announceCareTasksChanged() {
  window.dispatchEvent(new Event(CARE_TASKS_CHANGED));
}
export function useCareTasks(date?: Date, rangeEnd?: Date) {
  const dateKey = date
    ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    : "today";
  const endKey = rangeEnd
    ? `${rangeEnd.getFullYear()}-${rangeEnd.getMonth()}-${rangeEnd.getDate()}`
    : "day";
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const requestSequence = useRef(0);
  const refresh = useCallback(async () => {
    const sequence = ++requestSequence.current;
    const current = new Date();
    const start =
      dateKey === "today"
        ? new Date(current)
        : new Date(
            Number(dateKey.split("-")[0]),
            Number(dateKey.split("-")[1]),
            Number(dateKey.split("-")[2])
          );
    start.setHours(0, 0, 0, 0);
    const end =
      endKey === "day"
        ? new Date(start)
        : new Date(
            Number(endKey.split("-")[0]),
            Number(endKey.split("-")[1]),
            Number(endKey.split("-")[2])
          );
    if (endKey === "day") end.setDate(end.getDate() + 1);
    try {
      const rows = await careTasksService.list(start, end);
      if (sequence !== requestSequence.current) return;
      setTasks(rows);
      setNow(current);
      setError(null);
    } catch {
      if (sequence !== requestSequence.current) return;
      setError("Les soins du jour n’ont pas pu être chargés. Réessayez.");
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [dateKey, endKey]);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 60_000);
    const onChange = () => {
      void refresh();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(CARE_TASKS_CHANGED, onChange);
    window.addEventListener("focus", onChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
      window.removeEventListener(CARE_TASKS_CHANGED, onChange);
      window.removeEventListener("focus", onChange);
    };
  }, [refresh]);
  return {
    tasks,
    now,
    loading,
    error,
    refresh,
    overdueCount: tasks.filter(
      (task) => careDisplayStatus(task, now) === "en_retard"
    ).length,
  };
}
