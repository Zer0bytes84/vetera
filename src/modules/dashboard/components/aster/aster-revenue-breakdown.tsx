"use client";

import { Stethoscope, Syringe } from "lucide-react";
import type { DashboardMetrics } from "@/lib/metrics";
import { cn } from "@/lib/utils";

export function AsterRevenueBreakdown({
  metrics,
  className,
}: {
  metrics: DashboardMetrics;
  className?: string;
}) {
  // Mock data for breakdown, ideally we'd get this from metrics.topCategories
  const consultations =
    metrics.topCategories.find((c) =>
      c.label.toLowerCase().includes("consultation")
    )?.value || 84_500;
  const interventions =
    metrics.topCategories.find(
      (c) =>
        c.label.toLowerCase().includes("chirurgie") ||
        c.label.toLowerCase().includes("intervention")
    )?.value || 59_000;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("fr-FR").format(val) + " DA";

  return (
    <div
      className={cn(
        "rounded-[16px] border border-border bg-card p-6 shadow-sm dark:border-border",
        className
      )}
    >
      <div className="relative grid h-full grid-cols-1 gap-6 md:grid-cols-2">
        {/* Column 1: Consultations */}
        <div className="flex flex-col">
          <div className="mb-4 flex items-center gap-2 font-semibold text-[14px] text-foreground">
            <Stethoscope className="h-4 w-4 text-emerald-500" />
            Consultations
          </div>
          <div className="mb-6 font-semibold text-3xl text-foreground tracking-tight">
            {formatCurrency(consultations)}
          </div>
          <div className="mt-auto flex items-center justify-between border-zinc-100 border-t pt-4 text-xs dark:border-zinc-800">
            <div className="flex flex-col">
              <span className="mb-1 font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                Part
              </span>
              <span className="font-semibold text-foreground">
                {Math.round(
                  (consultations / (consultations + interventions || 1)) * 100
                )}
                %
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="mb-1 font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                Croissance
              </span>
              <span className="font-semibold text-emerald-500">+12%</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="absolute top-0 bottom-0 left-1/2 hidden w-px -translate-x-1/2 bg-zinc-200 md:block dark:bg-[#333333]" />

        {/* Column 2: Interventions */}
        <div className="flex flex-col">
          <div className="mb-4 flex items-center gap-2 font-semibold text-[14px] text-foreground">
            <Syringe className="h-4 w-4 text-blue-500" />
            Interventions
          </div>
          <div className="mb-6 font-semibold text-3xl text-foreground tracking-tight">
            {formatCurrency(interventions)}
          </div>
          <div className="mt-auto flex items-center justify-between border-zinc-100 border-t pt-4 text-xs dark:border-zinc-800">
            <div className="flex flex-col">
              <span className="mb-1 font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                Part
              </span>
              <span className="font-semibold text-foreground">
                {Math.round(
                  (interventions / (consultations + interventions || 1)) * 100
                )}
                %
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="mb-1 font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                Croissance
              </span>
              <span className="font-semibold text-blue-500">+8%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
