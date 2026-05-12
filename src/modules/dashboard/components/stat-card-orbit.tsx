"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatTone = "orange" | "violet" | "emerald" | "rose" | "cyan";

interface StatCardOrbitProps {
  change?: string;
  changeType?: "positive" | "negative";
  icon: ReactNode;
  period?: string;
  title: string;
  tone: StatTone;
  value: string | number;
}

const toneStyles: Record<StatTone, { bg: string; text: string; ring: string }> =
  {
    orange: {
      bg: "bg-orange-500/10",
      text: "text-orange-600 dark:text-orange-400",
      ring: "ring-orange-500/20",
    },
    violet: {
      bg: "bg-violet-500/10",
      text: "text-violet-600 dark:text-violet-400",
      ring: "ring-violet-500/20",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-600 dark:text-emerald-400",
      ring: "ring-emerald-500/20",
    },
    rose: {
      bg: "bg-rose-500/10",
      text: "text-rose-600 dark:text-rose-400",
      ring: "ring-rose-500/20",
    },
    cyan: {
      bg: "bg-cyan-500/10",
      text: "text-cyan-600 dark:text-cyan-400",
      ring: "ring-cyan-500/20",
    },
  };

export function StatCardOrbit({
  title,
  value,
  change,
  changeType = "positive",
  period,
  icon,
  tone,
}: StatCardOrbitProps) {
  const t = toneStyles[tone];

  return (
    <Card className="dashboard-luxe-card group overflow-hidden rounded-[26px] bg-card shadow-none transition-all duration-200 hover:-translate-y-0.5">
      <CardContent className="flex min-h-[148px] flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <p className="font-medium text-[11px] text-muted-foreground/85 tracking-[0.04em]">
              {title}
            </p>
            <p className="font-semibold text-[29px] text-foreground leading-none tracking-[-0.045em]">
              {value}
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              {change && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold text-[11px] tabular-nums",
                    changeType === "positive"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  )}
                >
                  <svg className="size-3" fill="none" viewBox="0 0 12 12">
                    {changeType === "positive" ? (
                      <path
                        d="M6 2.5v7M2.5 6l3.5-3.5L9.5 6"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.3"
                      />
                    ) : (
                      <path
                        d="M6 9.5v-7M2.5 6l3.5 3.5L9.5 6"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.3"
                      />
                    )}
                  </svg>
                  {changeType === "positive" ? "+" : ""}
                  {change}%
                </span>
              )}
              {period && (
                <span className="text-[11px] text-muted-foreground">
                  {period}
                </span>
              )}
            </div>
          </div>
          <div
            className={cn(
              "dashboard-soft-panel flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform duration-200 group-hover:scale-105",
              t.bg,
              t.ring
            )}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
