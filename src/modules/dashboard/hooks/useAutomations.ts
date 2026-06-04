import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  getGlobalAutomations,
  updateGlobalAutomation,
  getAutomationMetrics,
  getAutomationDrilldown,
  type AutomationMetrics,
  type AutomationDrilldownRow,
} from "@/services/sqlite/automations";

export type AutomationItem = {
  id: string;
  title: string;
  description: string;
  iconName: string;
  iconColor: string;
  active: boolean;
  schedule: string;
  time: string;
  lastRunDate: string | null;
  lastRunStatus: "Completed" | "Scheduled" | "Stopped";
  nextRunDate: string | null;
  nextRunISO: string | null;
  nextRunRelative: string | null;
  metricLabel: string;
  metricIconName: string;
  metricValue: string;
  metricTrend: string;
  metricTrendUp: boolean;
  chartType: "discrete" | "area";
  chartColor: string;
  chartData: any[];
};

export type AutomationItemLive = AutomationItem & {
  liveMetrics: AutomationMetrics | null;
  drilldown: AutomationDrilldownRow[];
  loadingDrilldown: boolean;
};

const REFRESH_INTERVAL_MS = 60_000;

export function useAutomations() {
  const [automations, setAutomations] = useState<AutomationItemLive[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const rows = await getGlobalAutomations();
      // Hydrate chaque automation avec ses métriques live
      const enriched = await Promise.all(
        rows.map(async (row) => {
          const liveMetrics = await getAutomationMetrics(row.id).catch(() => null);
          return {
            ...row,
            liveMetrics,
            drilldown: [],
            loadingDrilldown: false,
          } satisfies AutomationItemLive;
        })
      );
      setAutomations(enriched);
    } catch (error) {
      console.error("Failed to fetch automations from DB", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const updateAutomation = async (id: string, data: Partial<AutomationItem>) => {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...data } : a))
    );
    await updateGlobalAutomation(id, data);
  };

  const toggleAutomation = async (id: string, active: boolean) => {
    const nextRunStatus = active ? "Scheduled" : "Stopped";
    setAutomations((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          return { ...a, active, lastRunStatus: nextRunStatus as "Scheduled" | "Stopped" };
        }
        return a;
      })
    );
    await updateGlobalAutomation(id, {
      active,
      lastRunStatus: nextRunStatus as "Scheduled" | "Stopped",
    });
  };

  const runNow = async (id: string) => {
    const target = automations.find((a) => a.id === id);
    if (!target) return;
    const now = format(new Date(), "dd MMM yyyy, HH:mm", { locale: fr });
    setAutomations((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        return {
          ...a,
          lastRunStatus: "Completed" as const,
          lastRunDate: now,
          liveMetrics: a.liveMetrics
            ? {
                ...a.liveMetrics,
                count: a.liveMetrics.count,
              }
            : a.liveMetrics,
        };
      })
    );
    await updateGlobalAutomation(id, {
      lastRunStatus: "Completed",
      lastRunDate: now,
    });
    // Re-fetch metrics fraîches (cohérence avec l'état métier)
    const fresh = await getAutomationMetrics(id).catch(() => null);
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, liveMetrics: fresh } : a))
    );
    toast.success(`Automatisation "${target.title}" exécutée`, {
      description: "Métriques mises à jour depuis la base.",
    });
  };

  const loadDrilldown = useCallback(async (id: string) => {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, loadingDrilldown: true } : a))
    );
    const rows = await getAutomationDrilldown(id).catch(() => []);
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, drilldown: rows, loadingDrilldown: false } : a
      )
    );
  }, []);

  return {
    automations,
    isLoading,
    updateAutomation,
    toggleAutomation,
    runNow,
    loadDrilldown,
    refreshAutomations: refresh,
  };
}
