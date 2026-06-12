"use client";

import {
  Calendar,
  ClipboardList,
  Coins,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";

export interface SectionCardItem {
  badge: string;
  footerDescription: string;
  footerTitle: string;
  icon?: React.ComponentType<any>;
  sparkData?: number[];
  title: string;
  trend: "up" | "down" | "neutral";
  value: string;
}

export function SectionCards({
  items,
  compact: _compact,
  className,
}: {
  items: SectionCardItem[];
  compact?: boolean;
  className?: string;
}) {
  const icons = [Coins, Calendar, Users, ClipboardList];

  return (
    <div
      className={cn(
        "rounded-[16px] border border-border bg-card p-6 shadow-sm lg:p-8 dark:border-border",
        className
      )}
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
        {items.map((item, idx) => {
          const Icon = item.icon || icons[idx % icons.length] || Coins;
          const isUp = item.trend === "up";
          const isDown = item.trend === "down";

          const iconColors = [
            "text-blue-500 dark:text-blue-400",
            "text-rose-500 dark:text-rose-400",
            "text-emerald-500 dark:text-emerald-400",
            "text-amber-500 dark:text-amber-400",
          ];
          const colorClass = iconColors[idx % iconColors.length];

          return (
            <div className="stat-col relative flex flex-col" key={idx}>
              {/* Divider for desktop (between columns) */}
              {idx !== items.length - 1 && (
                <div className="absolute top-0 -right-3 bottom-0 hidden w-px bg-zinc-200 lg:block dark:bg-border/60" />
              )}

              <div className="mb-3 flex select-none items-center gap-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                <Icon className={cn("h-4 w-4 drop-shadow-sm", colorClass)} />
                {item.title}
              </div>

              <div className="mb-2 font-semibold text-3xl text-foreground leading-none tracking-tight">
                {item.value}
              </div>

              <div className="mt-auto flex items-center justify-between text-xs">
                <div
                  className={cn(
                    "flex items-center gap-1 font-semibold",
                    isUp
                      ? "text-emerald-500"
                      : isDown
                        ? "text-rose-500"
                        : "text-muted-foreground"
                  )}
                >
                  {item.footerTitle}
                  {isUp && <TrendingUp className="h-3.5 w-3.5 stroke-[3]" />}
                  {isDown && (
                    <TrendingDown className="h-3.5 w-3.5 stroke-[3]" />
                  )}
                </div>
                <div className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                  {item.badge}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
