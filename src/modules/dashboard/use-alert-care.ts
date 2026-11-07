import { useCallback, useEffect, useRef, useState } from "react";
import type { CareTask } from "@/modules/care-tasks/domain";
import { careTasksService } from "@/modules/care-tasks/service";
import { CARE_TASKS_CHANGED } from "@/modules/care-tasks/use-care-tasks";
import { ALERT_DAYS_AHEAD, alertWindow } from "./model/alert-bars";

/**
 * The care of the alerts' window (six days back to seven days ahead), and every earlier care still not done, which stays late
 * until it is. Read again when care changes and every minute, as the Soins view does.
 */
export function useAlertCare(now: Date) {
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const sequence = useRef(0);
  const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    const { from } = alertWindow(new Date());
    const end = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 6 + ALERT_DAYS_AHEAD + 2);
    try {
      const [rows, older] = await Promise.all([careTasksService.list(from, end), careTasksService.overdueBefore(from)]);
      if (request !== sequence.current) return;
      setTasks([...older, ...rows]);
      setError(null);
    } catch {
      if (request === sequence.current) setError("Les soins n’ont pas pu être chargés.");
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const again = () => void refresh();
    const timer = window.setInterval(again, 60_000);
    window.addEventListener(CARE_TASKS_CHANGED, again);
    return () => {
      sequence.current += 1;
      window.clearInterval(timer);
      window.removeEventListener(CARE_TASKS_CHANGED, again);
    };
  }, [refresh, dayKey]);

  return { tasks, error, loading };
}
