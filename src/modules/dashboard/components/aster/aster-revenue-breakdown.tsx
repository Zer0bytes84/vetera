"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { DashboardMetrics } from "@/lib/metrics";
import { Stethoscope, Syringe } from "lucide-react";

export function AsterRevenueBreakdown({ metrics, className }: { metrics: DashboardMetrics; className?: string }) {
  // Mock data for breakdown, ideally we'd get this from metrics.topCategories
  const consultations = metrics.topCategories.find(c => c.label.toLowerCase().includes("consultation"))?.value || 84500;
  const interventions = metrics.topCategories.find(c => c.label.toLowerCase().includes("chirurgie") || c.label.toLowerCase().includes("intervention"))?.value || 59000;

  const formatCurrency = (val: number) => new Intl.NumberFormat("fr-FR").format(val) + " DA";

  return (
    <div className={cn("bg-card border border-border dark:border-border rounded-[16px] p-6 shadow-sm", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full relative">
        
        {/* Column 1: Consultations */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-foreground mb-4">
            <Stethoscope className="w-4 h-4 text-emerald-500" />
            Consultations
          </div>
          <div className="text-3xl font-semibold tracking-tight text-foreground mb-6">
            {formatCurrency(consultations)}
          </div>
          <div className="flex justify-between items-center text-xs mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Part</span>
              <span className="font-semibold text-foreground">{Math.round((consultations / (consultations + interventions || 1)) * 100)}%</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Croissance</span>
              <span className="font-semibold text-emerald-500">+12%</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-zinc-200 dark:bg-[#333333] -translate-x-1/2" />

        {/* Column 2: Interventions */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-foreground mb-4">
            <Syringe className="w-4 h-4 text-blue-500" />
            Interventions
          </div>
          <div className="text-3xl font-semibold tracking-tight text-foreground mb-6">
            {formatCurrency(interventions)}
          </div>
          <div className="flex justify-between items-center text-xs mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Part</span>
              <span className="font-semibold text-foreground">{Math.round((interventions / (consultations + interventions || 1)) * 100)}%</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Croissance</span>
              <span className="font-semibold text-blue-500">+8%</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
