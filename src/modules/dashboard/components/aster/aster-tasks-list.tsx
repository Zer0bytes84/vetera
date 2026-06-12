"use client";

import { Plus } from "lucide-react";
import type { DashboardMetrics } from "@/lib/metrics";
import { cn } from "@/lib/utils";

export function AsterTasksList({
  metrics,
  className,
}: {
  metrics: DashboardMetrics;
  className?: string;
}) {
  // We'll just put some placeholder tasks here that mimic the Aster configuration widget look
  const tasks = [
    { title: "Rappels vaccins", desc: "12 rappels en attente", active: true },
    { title: "Stock critique", desc: "3 produits à commander", active: true },
    { title: "Nettoyage salle", desc: "Planifié pour 18:00", active: false },
    { title: "Factures impayées", desc: "4 factures en retard", active: true },
  ];

  return (
    <div
      className={cn(
        "flex flex-col rounded-[16px] border border-border bg-card p-6 shadow-sm dark:border-border",
        className
      )}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
          Tâches & Alertes
        </div>
        <button className="flex items-center gap-1 font-medium text-blue-500 text-xs transition-colors hover:text-blue-600">
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {tasks.map((task, idx) => (
          <div
            className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-800/20"
            key={idx}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white dark:border-zinc-700 dark:bg-zinc-800">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    task.active
                      ? "bg-emerald-500"
                      : "bg-zinc-300 dark:bg-zinc-600"
                  )}
                />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground text-sm">
                  {task.title}
                </span>
                <span className="font-medium text-[11px] text-muted-foreground">
                  {task.desc}
                </span>
              </div>
            </div>

            <button
              className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-zinc-200 dark:data-[state=unchecked]:bg-zinc-700"
              data-state={task.active ? "checked" : "unchecked"}
            >
              <span
                className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
                data-state={task.active ? "checked" : "unchecked"}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
