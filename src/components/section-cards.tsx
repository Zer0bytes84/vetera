"use client";

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

function MiniViz({ data, isUp }: { data: number[]; isUp: boolean }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d - min) / range) * 100;
    return `${x},${y}`;
  }).join(" ");
  
  return (
    <div className="absolute right-4 bottom-4 w-16 h-8 opacity-40 transition-opacity duration-300 group-hover:opacity-100">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke={isUp ? "#10b981" : "#f43f5e"}
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function SectionCard({ item, idx, compact }: { item: SectionCardItem; idx: number; compact?: boolean }) {
  const isUp = item.trend === "up";
  const isDown = item.trend === "down";
  const TrendIcon = isUp
    ? TrendingUp
    : isDown
      ? TrendingDown
      : TrendingUp;

  const icons = [Coins, Calendar, Users, ClipboardList];
  const IconComponent = item.icon || icons[idx] || Coins;
  
  const iconColors = [
    "bg-blue-500/10 text-blue-500",
    "bg-rose-500/10 text-rose-500",
    "bg-emerald-500/10 text-emerald-500",
    "bg-amber-500/10 text-amber-500",
  ];
  const colorClass = iconColors[idx % iconColors.length];

  return (
    <div
      className={cn(
        "dashboard-kpi-card group relative flex flex-col overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-md active:scale-[0.995]",
        "bg-zinc-100 dark:bg-zinc-900/60 border border-transparent shadow-xs rounded-[24px] p-1.5 cursor-pointer",
        compact ? "h-full" : "h-[160px]"
      )}
    >
      <div className="relative z-10 bg-white dark:bg-zinc-950 shadow-none rounded-[16px] flex flex-col flex-1 overflow-hidden p-5">
        
        {/* Header: Icon & Badge */}
        <div className="flex items-start justify-between">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", colorClass)}>
            <IconComponent className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {item.badge}
          </div>
        </div>

        {/* Middle: Title & Value */}
        <div className="mt-auto mb-1 space-y-1">
          <p className="font-sans font-bold tracking-wider text-[10px] uppercase text-muted-foreground/80 leading-none">
            {item.title}
          </p>
          <h3 className="font-display font-semibold text-2xl tracking-tight text-foreground leading-none">
            {item.value}
          </h3>
        </div>

        {/* Footer: Description & Trend */}
        {!compact && (
          <div className="flex items-center justify-between mt-auto">
            <p className="text-[11px] font-medium text-muted-foreground/80 truncate">
              {item.footerTitle}
            </p>
            {item.trend !== "neutral" && (
              <TrendIcon className={cn("size-3.5 shrink-0", isUp ? "text-emerald-500" : "text-rose-500")} />
            )}
            {item.trend === "neutral" && (
              <TrendIcon className="size-3.5 shrink-0 text-zinc-400" />
            )}
          </div>
        )}

        {/* Spark Chart (MiniViz) */}
        {compact && item.sparkData && (
          <MiniViz data={item.sparkData} isUp={isUp} />
        )}
      </div>
    </div>
  );
}

export function SectionCards({ items, compact, className }: { items: SectionCardItem[]; compact?: boolean; className?: string }) {
  return (
    <div className={cn("dashboard-kpi-grid grid gap-4 sm:grid-cols-2", compact ? "h-full" : "xl:grid-cols-4", className)}>
      {items.map((item, idx) => (
        <SectionCard key={idx} item={item} idx={idx} compact={compact} />
      ))}
    </div>
  );
}
