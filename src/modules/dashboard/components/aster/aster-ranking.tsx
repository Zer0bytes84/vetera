"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { DashboardMetrics } from "@/lib/metrics";
import { TrendingUp, TrendingDown } from "lucide-react";

export function AsterRanking({ metrics, className }: { metrics: DashboardMetrics; className?: string }) {
  const trend = -12.5; // Placeholder
  const isUp = trend >= 0;
  
  const colors = ["#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#3b82f6"];

  return (
    <div className={cn("bg-card border border-border dark:border-border rounded-[16px] p-6 shadow-sm flex flex-col", className)}>
      <div className="flex justify-between items-start mb-2">
        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Top Spécialités</div>
        <div className={cn("flex items-center gap-1 text-sm font-semibold", isUp ? "text-blue-500" : "text-rose-500")}>
          {Math.abs(trend)}%
          {isUp ? <TrendingUp className="w-4 h-4 stroke-[3]" /> : <TrendingDown className="w-4 h-4 stroke-[3]" />}
        </div>
      </div>
      
      <div className="text-3xl font-semibold tracking-tight text-foreground mb-6">
        #1 {metrics.topAppointmentTypes[0]?.name || "N/A"}
      </div>
      
      <div className="flex flex-col gap-3 mt-auto">
        {metrics.topAppointmentTypes.slice(0, 5).map((type, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <div 
                className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white" 
                style={{ backgroundColor: colors[idx % colors.length] }}
              >
                {type.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-foreground">{type.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="font-semibold">{type.demand}</div>
              <div className="text-blue-500 font-semibold text-[11px]">
                {Math.round(type.demand / Math.max(1, metrics.summary.todayAppointments + metrics.summary.yesterdayAppointments) * 100)}% ↗
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
