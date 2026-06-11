"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { DashboardMetrics } from "@/lib/metrics";
import { Plus } from "lucide-react";

export function AsterTasksList({ metrics, className }: { metrics: DashboardMetrics; className?: string }) {
  // We'll just put some placeholder tasks here that mimic the Aster configuration widget look
  const tasks = [
    { title: "Rappels vaccins", desc: "12 rappels en attente", active: true },
    { title: "Stock critique", desc: "3 produits à commander", active: true },
    { title: "Nettoyage salle", desc: "Planifié pour 18:00", active: false },
    { title: "Factures impayées", desc: "4 factures en retard", active: true },
  ];

  return (
    <div className={cn("bg-card border border-border dark:border-border rounded-[16px] p-6 shadow-sm flex flex-col", className)}>
      <div className="flex justify-between items-center mb-6">
        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Tâches & Alertes</div>
        <button className="flex items-center gap-1 text-blue-500 font-medium text-xs hover:text-blue-600 transition-colors">
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {tasks.map((task, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 flex items-center justify-center">
                <div className={cn("w-2 h-2 rounded-full", task.active ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600")} />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-foreground">{task.title}</span>
                <span className="text-[11px] text-muted-foreground font-medium">{task.desc}</span>
              </div>
            </div>
            
            <button className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-zinc-200 dark:data-[state=unchecked]:bg-zinc-700" data-state={task.active ? "checked" : "unchecked"}>
              <span className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" data-state={task.active ? "checked" : "unchecked"} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
