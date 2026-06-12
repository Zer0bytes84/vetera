"use client";

import {
  Activity,
  Bone,
  HeartPulse,
  Microscope,
  Pill,
  Scissors,
  Stethoscope,
  Syringe,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DashboardMetrics } from "@/lib/metrics";
import { cn } from "@/lib/utils";

// Helper to pick an icon based on specialty/appointment name
function getIconForSpecialty(name: string) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("vaccin")) {
    return Syringe;
  }
  if (
    lowerName.includes("chirurg") ||
    lowerName.includes("opéra") ||
    lowerName.includes("castration") ||
    lowerName.includes("stérilisation")
  ) {
    return Scissors;
  }
  if (
    lowerName.includes("radio") ||
    lowerName.includes("écho") ||
    lowerName.includes("echo") ||
    lowerName.includes("imagerie")
  ) {
    return Bone;
  }
  if (
    lowerName.includes("analyse") ||
    lowerName.includes("lab") ||
    lowerName.includes("sang")
  ) {
    return Microscope;
  }
  if (lowerName.includes("cardio")) {
    return HeartPulse;
  }
  if (
    lowerName.includes("traitement") ||
    lowerName.includes("médic") ||
    lowerName.includes("soin")
  ) {
    return Pill;
  }
  if (lowerName.includes("urgence")) {
    return Activity;
  }
  return Stethoscope; // Default icon
}

export function AsterRanking({
  metrics,
  className,
}: {
  metrics: DashboardMetrics;
  className?: string;
}) {
  const topTypes = metrics.topAppointmentTypes.slice(0, 5);
  const totalContext = Math.max(
    1,
    metrics.summary.todayAppointments + metrics.summary.yesterdayAppointments
  );

  const colors = [
    "#0ea5e9", // Blue
    "#ec4899", // Pink
    "#eab308", // Yellow
    "#8b5cf6", // Purple
    "#10b981", // Green
  ];

  const totalDemand = topTypes.reduce((sum, t) => sum + t.demand, 0) || 1;

  return (
    <div
      className={cn(
        "flex flex-col rounded-[16px] border border-border bg-card p-6 shadow-sm dark:border-border",
        className
      )}
    >
      <div className="mb-2 font-medium text-[12px] text-muted-foreground uppercase tracking-wider">
        Top Spécialités
      </div>

      <div className="mb-6 font-semibold text-3xl text-foreground tracking-tight">
        #1
      </div>

      {/* Segmented Progress Bar */}
      <TooltipProvider delay={100}>
        <div className="mb-4 flex h-2 w-full gap-1">
          {topTypes.map((type, idx) => {
            const widthPercent = (type.demand / totalDemand) * 100;
            return (
              <Tooltip key={idx}>
                <TooltipTrigger
                  className="h-full cursor-pointer appearance-none rounded-full border-none p-0 transition-opacity hover:opacity-80 focus:outline-none"
                  style={{
                    width: `${widthPercent}%`,
                    backgroundColor: colors[idx % colors.length],
                  }}
                />
                <TooltipContent
                  className="border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-white text-xs"
                  side="top"
                >
                  <span className="font-semibold">{type.name}</span>
                  <span className="ml-2 text-zinc-400">
                    {widthPercent.toFixed(1)}%
                  </span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Legend */}
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        {topTypes.map((type, idx) => (
          <div
            className="flex items-center gap-1.5 font-medium text-[10px] text-zinc-600 dark:text-zinc-300"
            key={idx}
          >
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: colors[idx % colors.length] }}
            />
            {type.name}
          </div>
        ))}
      </div>

      {/* Table Header */}
      <div className="mb-3 grid grid-cols-[1fr_60px_40px] px-1 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
        <div>Spécialité</div>
        <div className="text-right">Part</div>
        <div className="text-right">Total</div>
      </div>

      {/* Table Body */}
      <div className="mt-auto flex flex-col gap-3">
        {topTypes.map((type, idx) => {
          const percentage = ((type.demand / totalDemand) * 100).toFixed(1);
          const Icon = getIconForSpecialty(type.name);

          return (
            <div
              className="grid grid-cols-[1fr_60px_40px] items-center px-1 text-sm"
              key={idx}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-md text-white shadow-sm"
                  style={{ backgroundColor: colors[idx % colors.length] }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="max-w-[120px] truncate font-medium text-foreground text-xs">
                  {type.name}
                </span>
              </div>
              <div className="text-right font-medium text-[11px] text-muted-foreground">
                {percentage}%
              </div>
              <div className="text-right font-medium text-[11px] text-foreground">
                {type.demand}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
