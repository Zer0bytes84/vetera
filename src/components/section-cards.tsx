"use client";

import {
  Coins,
  Calendar,
  Users,
  ClipboardList,
  TrendingDown,
  TrendingUp,
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
  const defaultIcons = [Coins, Calendar, Users, ClipboardList];

  return (
    <div className={cn("grid grid-cols-2 gap-4 lg:grid-cols-4", className)}>
      {items.map((item, idx) => {
        const Icon = item.icon || defaultIcons[idx % defaultIcons.length] || Coins;
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
          <div
            key={idx}
            className="group relative flex flex-col rounded-[20px] border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 p-5 shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md cursor-pointer"
          >
            {/* Protocol-style layered hover background */}
            <div className="pointer-events-none absolute inset-0 z-0">
              {/* Inset ring layer */}
              <div className="absolute inset-0 rounded-[20px] ring-1 ring-zinc-900/5 dark:ring-white/5 transition-all duration-300 group-hover:ring-zinc-900/10 dark:group-hover:ring-white/10" />

              {/* Gradient overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(ellipse_at_center,rgba(215,237,234,0.15),rgba(244,251,223,0.15))] dark:bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.06),rgba(16,185,129,0.04))]" />

              {/* Grid pattern layer */}
              <svg
                className="absolute inset-0 h-full w-full stroke-zinc-900/[0.04] dark:stroke-white/[0.02] skew-y-[-18deg] opacity-0 group-hover:opacity-50 transition-opacity duration-300"
                style={{
                  maskImage: "radial-gradient(80% 80% at 50% 50%, white, transparent)",
                  WebkitMaskImage: "radial-gradient(80% 80% at 50% 50%, white, transparent)",
                }}
                aria-hidden="true"
              >
                <defs>
                  <pattern
                    id={`grid-section-${idx}`}
                    width={16}
                    height={16}
                    patternUnits="userSpaceOnUse"
                    x="-1"
                    y="-1"
                  >
                    <path d="M.5 16V.5H16" fill="none" strokeDasharray="2 2" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" strokeWidth={0} fill={`url(#grid-section-${idx})`} />
              </svg>
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col h-full">
              <div className="mb-3.5 flex items-center justify-between">
                <div className="flex select-none items-center gap-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                  <Icon className={cn("h-4 w-4 drop-shadow-sm transition-transform duration-300 group-hover:scale-110", colorClass)} />
                  {item.title}
                </div>
              </div>

              <div className="mb-2 font-semibold text-3xl text-foreground leading-none tracking-tight select-all">
                {item.value}
              </div>

              <div className="mt-auto flex items-center justify-between text-xs pt-1 select-none">
                <div
                  className={cn(
                    "flex items-center gap-1 font-bold rounded-full px-2 py-0.5 text-[10px]",
                    isUp
                      ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-400"
                      : isDown
                        ? "bg-rose-500/10 text-rose-600 dark:bg-rose-500/25 dark:text-rose-400"
                        : "bg-zinc-200/50 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400"
                  )}
                >
                  {item.footerTitle}
                  {isUp && <TrendingUp className="h-3 w-3 stroke-[3]" />}
                  {isDown && <TrendingDown className="h-3 w-3 stroke-[3]" />}
                </div>
                <div className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider bg-zinc-200/50 dark:bg-zinc-800/60 rounded px-1.5 py-0.5">
                  {item.badge}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
