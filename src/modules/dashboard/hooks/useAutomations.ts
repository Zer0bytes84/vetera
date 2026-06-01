import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { format, isPast, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { getGlobalAutomations, updateGlobalAutomation } from "@/services/sqlite/automations";

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

export function useAutomations() {
  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAutomations = useCallback(async () => {
    try {
      const data = await getGlobalAutomations();
      setAutomations(data);
    } catch (error) {
      console.error("Failed to fetch automations from DB", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

  useEffect(() => {
    if (automations.length === 0) return;

    // Check every 10 seconds if an automation should run
    const interval = setInterval(() => {
      setAutomations((prev) => {
        let hasChanges = false;
        const now = new Date();
        const updated = prev.map((auto) => {
          if (auto.active && auto.nextRunISO && isPast(parseISO(auto.nextRunISO))) {
            hasChanges = true;
            // Trigger the automation
            toast.success(`Automatisation exécutée : ${auto.title}`, {
              description: "Le processus programmé s'est terminé avec succès en arrière-plan.",
              duration: 8000,
            });

            const newMetricValue = auto.chartType === "discrete" 
              ? `${parseInt(auto.metricValue) + Math.floor(Math.random() * 5)}%` 
              : `${parseInt(auto.metricValue) + 1}`;
              
            const newChartData = auto.chartType === "discrete"
              ? [...auto.chartData.slice(1), 1]
              : [...auto.chartData.slice(1), { value: parseInt(auto.metricValue) + 2 }];

            const newLastRunDate = format(now, "dd MMM yyyy, HH:mm", { locale: fr });

            // Persist the triggered state to DB asynchronously
            updateGlobalAutomation(auto.id, {
              lastRunStatus: "Completed",
              lastRunDate: newLastRunDate,
              nextRunISO: null, // Null to stop running until rescheduled
              nextRunRelative: "À replanifier",
              metricValue: newMetricValue,
              chartData: newChartData
            }).catch(console.error);

            // Update UI state immediately
            return {
              ...auto,
              lastRunDate: newLastRunDate,
              lastRunStatus: "Completed" as const,
              nextRunISO: null,
              nextRunRelative: "À replanifier",
              metricValue: newMetricValue,
              chartData: newChartData
            };
          }
          return auto;
        });
        return hasChanges ? updated : prev;
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [automations.length]); // Re-bind interval if automations are initially loaded

  const updateAutomation = async (id: string, data: Partial<AutomationItem>) => {
    // Optimistic UI update
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...data } : a))
    );
    // Persist to DB
    await updateGlobalAutomation(id, data);
  };

  const toggleAutomation = async (id: string, active: boolean) => {
    const nextRunStatus = active ? "Scheduled" : "Stopped";
    
    // Optimistic UI update
    setAutomations((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          return { ...a, active, lastRunStatus: nextRunStatus as "Scheduled" | "Stopped" };
        }
        return a;
      })
    );
    // Persist to DB
    await updateGlobalAutomation(id, { active, lastRunStatus: nextRunStatus as "Scheduled" | "Stopped" });
  };

  return {
    automations,
    isLoading,
    updateAutomation,
    toggleAutomation,
    refreshAutomations: fetchAutomations
  };
}
