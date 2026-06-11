"use client";

import React from "react";
import { TrendingDown, TrendingUp, Coins, Calendar, Users, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionCardItem {
  badge: string;
  footerDescription: string;
  footerTitle: string;
  title: string;
  trend: "up" | "down" | "neutral";
  value: string;
  icon?: React.ComponentType<any>;
  sparkData?: number[];
}

export function SectionCards({ items, compact: _compact, className }: { items: SectionCardItem[]; compact?: boolean; className?: string }) {
  const icons = [Coins, Calendar, Users, ClipboardList];

  return (
    <div className={cn("bg-card border border-border dark:border-border rounded-[16px] p-6 lg:p-8 shadow-sm", className)}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-6">
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
            <div key={idx} className="relative flex flex-col stat-col">
              {/* Divider for desktop (between columns) */}
              {idx !== items.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-0 bottom-0 w-px bg-zinc-200 dark:bg-border/60" />
              )}
              
              <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 select-none">
                <Icon className={cn("w-4 h-4 drop-shadow-sm", colorClass)} />
                {item.title}
              </div>
              
              <div className="text-3xl font-semibold mb-2 tracking-tight text-foreground leading-none">
                {item.value}
              </div>
              
              <div className="flex justify-between items-center text-xs mt-auto">
                <div className={cn("flex items-center gap-1 font-semibold", isUp ? "text-emerald-500" : isDown ? "text-rose-500" : "text-muted-foreground")}>
                  {item.footerTitle}
                  {isUp && <TrendingUp className="w-3.5 h-3.5 stroke-[3]" />}
                  {isDown && <TrendingDown className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
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
