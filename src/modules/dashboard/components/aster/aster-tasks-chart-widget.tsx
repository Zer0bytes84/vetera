"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useTasksRepository } from "@/data/repositories";
import { DashboardMetrics } from "@/lib/metrics";
import { motion } from "framer-motion";

const PremiumSegmentedBar = ({ 
  label, 
  percentage, 
  activeColorClass, 
  inactiveColorClass,
  delayOffset = 0
}: { 
  label: string; 
  percentage: number; 
  activeColorClass: string; 
  inactiveColorClass: string;
  delayOffset?: number;
}) => {
  const segments = 32;
  const litCount = Math.round((percentage / 100) * segments);

  return (
    <div className="relative group p-5 rounded-2xl bg-zinc-50/50 dark:bg-[#151515] border border-zinc-200/50 dark:border-white/[0.03] hover:bg-zinc-100/50 dark:hover:bg-[#1a1a1a] transition-colors duration-500 overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none">
        <div className={cn("absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl", activeColorClass)} />
      </div>

      <div className="flex justify-between items-end mb-4 relative z-10">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">{label}</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-light tracking-tight text-foreground">{percentage}</span>
            <span className="text-sm font-medium text-muted-foreground">%</span>
          </div>
        </div>
        
        {/* Small badge/indicator */}
        <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase mb-1.5 opacity-80", activeColorClass, "text-white dark:text-black/80")}>
          {percentage >= 80 ? "Optimal" : percentage >= 50 ? "En cours" : "Critique"}
        </div>
      </div>

      {/* Segments with wave animation */}
      <div className="flex gap-[3px] relative z-10">
        {Array.from({ length: segments }).map((_, i) => {
          const isActive = i < litCount;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scaleY: 0.5 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ 
                delay: delayOffset + (i * 0.015), 
                duration: 0.4, 
                ease: [0.23, 1, 0.32, 1] 
              }}
              className={cn(
                "h-6 flex-1 rounded-[2px] transition-colors duration-500",
                isActive 
                  ? activeColorClass 
                  : cn(inactiveColorClass, "group-hover:opacity-60")
              )}
            />
          );
        })}
      </div>
    </div>
  );
};

export function AsterTasksChartWidget({ className }: { className?: string; metrics?: DashboardMetrics }) {
  const { data: allTasks } = useTasksRepository();

  const stats = useMemo(() => {
    const normalTasks = allTasks.filter(t => !t.isReminder && t.priority !== "high");
    const reminders = allTasks.filter(t => t.isReminder);
    const urgentTasks = allTasks.filter(t => !t.isReminder && t.priority === "high");

    const getRates = (items: typeof allTasks) => {
      const total = items.length;
      if (total === 0) return { total: 0, done: 0, percentage: 0 };
      const done = items.filter(i => i.status === "done").length;
      return { total, done, percentage: Math.round((done / total) * 100) };
    };

    if (allTasks.length === 0) {
      // Fake data for visual testing when DB is empty
      return {
        tasks: { percentage: 75 },
        reminders: { percentage: 42 },
        urgent: { percentage: 15 }
      };
    }

    return {
      tasks: getRates(normalTasks),
      reminders: getRates(reminders),
      urgent: getRates(urgentTasks)
    };
  }, [allTasks]);

  return (
    <div className={cn("bg-card border border-border dark:border-border rounded-[16px] p-2 shadow-sm flex flex-col justify-center", className)}>
      <div className="px-6 pt-5 pb-2">
        <h3 className="text-[14px] text-foreground font-semibold flex items-center gap-2">
          Progression des objectifs
          <span className="relative flex h-2 w-2 ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </h3>
      </div>

      <div className="flex flex-col gap-2 p-2">
        <PremiumSegmentedBar 
          label="Tâches courantes" 
          percentage={stats.tasks.percentage}
          activeColorClass="bg-cyan-400 dark:bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.4)]"
          inactiveColorClass="bg-zinc-200 dark:bg-zinc-800/60"
          delayOffset={0}
        />

        <PremiumSegmentedBar 
          label="Rappels (Vaccins, Relances)" 
          percentage={stats.reminders.percentage}
          activeColorClass="bg-fuchsia-400 dark:bg-fuchsia-500 shadow-[0_0_8px_rgba(232,121,249,0.4)]"
          inactiveColorClass="bg-zinc-200 dark:bg-zinc-800/60"
          delayOffset={0.1}
        />

        <PremiumSegmentedBar 
          label="Urgences & Priorité Haute" 
          percentage={stats.urgent.percentage}
          activeColorClass="bg-rose-400 dark:bg-rose-500 shadow-[0_0_8px_rgba(251,113,133,0.4)]"
          inactiveColorClass="bg-zinc-200 dark:bg-zinc-800/60"
          delayOffset={0.2}
        />
      </div>
    </div>
  );
}
