"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { DashboardMetrics } from "@/lib/metrics";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Stethoscope, 
  Syringe, 
  Scissors, 
  Pill, 
  Activity, 
  Microscope,
  HeartPulse,
  Bone
} from "lucide-react";

// Helper to pick an icon based on specialty/appointment name
function getIconForSpecialty(name: string) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("vaccin")) return Syringe;
  if (lowerName.includes("chirurg") || lowerName.includes("opéra") || lowerName.includes("castration") || lowerName.includes("stérilisation")) return Scissors;
  if (lowerName.includes("radio") || lowerName.includes("écho") || lowerName.includes("echo") || lowerName.includes("imagerie")) return Bone;
  if (lowerName.includes("analyse") || lowerName.includes("lab") || lowerName.includes("sang")) return Microscope;
  if (lowerName.includes("cardio")) return HeartPulse;
  if (lowerName.includes("traitement") || lowerName.includes("médic") || lowerName.includes("soin")) return Pill;
  if (lowerName.includes("urgence")) return Activity;
  return Stethoscope; // Default icon
}

export function AsterRanking({ metrics, className }: { metrics: DashboardMetrics; className?: string }) {
  const topTypes = metrics.topAppointmentTypes.slice(0, 5);
  const totalContext = Math.max(1, metrics.summary.todayAppointments + metrics.summary.yesterdayAppointments);
  
  const colors = [
    "#0ea5e9", // Blue
    "#ec4899", // Pink
    "#eab308", // Yellow
    "#8b5cf6", // Purple
    "#10b981", // Green
  ];

  const totalDemand = topTypes.reduce((sum, t) => sum + t.demand, 0) || 1;

  return (
    <div className={cn("bg-card border border-border dark:border-border rounded-[16px] p-6 flex flex-col shadow-sm", className)}>
      <div className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Top Spécialités</div>
      
      <div className="text-3xl font-semibold tracking-tight text-foreground mb-6">
        #1
      </div>
      
      {/* Segmented Progress Bar */}
      <TooltipProvider delay={100}>
        <div className="flex w-full h-2 mb-4 gap-1">
          {topTypes.map((type, idx) => {
            const widthPercent = (type.demand / totalDemand) * 100;
            return (
              <Tooltip key={idx}>
                <TooltipTrigger
                  className="h-full rounded-full cursor-pointer hover:opacity-80 transition-opacity focus:outline-none appearance-none border-none p-0" 
                  style={{ 
                    width: `${widthPercent}%`,
                    backgroundColor: colors[idx % colors.length]
                  }} 
                />
                <TooltipContent 
                  side="top" 
                  className="bg-zinc-900 text-white border-zinc-800 text-xs px-2.5 py-1.5"
                >
                  <span className="font-semibold">{type.name}</span>
                  <span className="ml-2 text-zinc-400">{widthPercent.toFixed(1)}%</span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
      
      {/* Legend */}
      <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mb-6">
        {topTypes.map((type, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
            {type.name}
          </div>
        ))}
      </div>
      
      {/* Table Header */}
      <div className="grid grid-cols-[1fr_60px_40px] text-[10px] font-medium text-muted-foreground mb-3 px-1 uppercase tracking-wider">
        <div>Spécialité</div>
        <div className="text-right">Part</div>
        <div className="text-right">Total</div>
      </div>
      
      {/* Table Body */}
      <div className="flex flex-col gap-3 mt-auto">
        {topTypes.map((type, idx) => {
          const percentage = ((type.demand / totalDemand) * 100).toFixed(1);
          const Icon = getIconForSpecialty(type.name);
          
          return (
            <div key={idx} className="grid grid-cols-[1fr_60px_40px] items-center text-sm px-1">
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-6 h-6 rounded-md flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: colors[idx % colors.length] }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium text-foreground text-xs truncate max-w-[120px]">{type.name}</span>
              </div>
              <div className="text-muted-foreground font-medium text-[11px] text-right">
                {percentage}%
              </div>
              <div className="text-foreground font-medium text-[11px] text-right">
                {type.demand}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
