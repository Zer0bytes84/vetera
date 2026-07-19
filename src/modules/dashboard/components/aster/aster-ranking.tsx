"use client";

import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Pill,
  Scissors,
  Stethoscope,
  Syringe,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import type { DashboardMetrics } from "@/lib/metrics";
import { cn } from "@/lib/utils";

// Specialty to icon mapping
const getSpecialtyIcon = (name: string) => {
  const normalized = name.toLowerCase();
  if (normalized.includes("consult")) {
    return Stethoscope;
  }
  if (normalized.includes("chirurg") || normalized.includes("operat")) {
    return Scissors;
  }
  if (normalized.includes("vaccin") || normalized.includes("injec")) {
    return Syringe;
  }
  if (normalized.includes("urgenc")) {
    return AlertCircle;
  }
  if (normalized.includes("pharm")) {
    return Pill;
  }
  return Activity;
};

// Rank Badge color mapper
const getRankBadgeClass = (index: number) => {
  if (index === 0) {
    return "bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-sm ring-1 ring-yellow-450/20";
  }
  if (index === 1) {
    return "bg-gradient-to-r from-zinc-300 to-zinc-400 text-zinc-800 shadow-sm ring-1 ring-zinc-400/20 dark:from-zinc-400 dark:to-zinc-500 dark:text-zinc-950";
  }
  if (index === 2) {
    return "bg-gradient-to-r from-amber-600 to-orange-700 text-white shadow-sm ring-1 ring-orange-700/20";
  }
  return "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400";
};

export function AsterRanking({
  metrics,
  className,
}: {
  metrics: DashboardMetrics;
  className?: string;
}) {
  const topTypes = metrics.topAppointmentTypes.slice(0, 5);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Gradient pairs for the bars
  const gradients = [
    "from-indigo-500 to-violet-600 dark:from-indigo-600 dark:to-violet-700",
    "from-rose-500 to-red-600 dark:from-rose-600 dark:to-red-700",
    "from-pink-500 to-fuchsia-600 dark:from-pink-600 dark:to-fuchsia-700",
    "from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700",
    "from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700",
  ];

  const glows = [
    "shadow-indigo-500/10",
    "shadow-rose-500/10",
    "shadow-pink-500/10",
    "shadow-emerald-500/10",
    "shadow-amber-500/10",
  ];

  // Calculate dynamic scale bound
  const maxVal = Math.max(...topTypes.map((t) => t.demand), 5);
  let scaleMax = Math.ceil(maxVal / 5) * 5;
  if (scaleMax === 0) {
    scaleMax = 5;
  }

  const ticks = [
    Math.round(scaleMax * 0.2),
    Math.round(scaleMax * 0.4),
    Math.round(scaleMax * 0.6),
    Math.round(scaleMax * 0.8),
    scaleMax,
  ];

  const totalDemand = topTypes.reduce((s, t) => s + t.demand, 0) || 1;

  return (
    <div
      className={cn(
        "flex flex-col rounded-[20px] border border-zinc-200/80 bg-zinc-50/50 px-1.5 pt-3 pb-1.5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/30",
        className
      )}
    >
      {/* Outer Card Header */}
      <div className="mb-2 flex select-none items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-zinc-200/60 dark:bg-zinc-800">
            <Trophy className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
          </div>
          <span className="font-semibold text-sm text-zinc-800 tracking-tight dark:text-zinc-200">
            Spécialités
          </span>
        </div>
        <button className="cursor-pointer font-medium text-[11px] text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300">
          Voir plus
        </button>
      </div>

      {/* Inner White Box */}
      <div className="flex flex-1 flex-col justify-between rounded-[12px] border border-zinc-200/60 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex min-h-[220px] flex-1 items-stretch gap-2">
          {/* Left Y-axis Label */}
          <div className="relative flex w-6 select-none items-center justify-center">
            <div className="rotate-[-90deg] whitespace-nowrap font-semibold text-[9px] text-zinc-400 uppercase tracking-wider">
              Volume RDV
            </div>
          </div>

          {/* Chart Content Area */}
          <div className="relative flex flex-1 flex-col justify-between pl-1">
            {/* Vertical Grid Lines */}
            <div className="pointer-events-none absolute inset-0 flex select-none justify-between pl-[1px]">
              <div className="absolute top-0 bottom-10 left-[20%] border-zinc-100 border-l dark:border-zinc-800/80" />
              <div className="absolute top-0 bottom-10 left-[40%] border-zinc-100 border-l dark:border-zinc-800/80" />
              <div className="absolute top-0 bottom-10 left-[60%] border-zinc-100 border-l dark:border-zinc-800/80" />
              <div className="absolute top-0 bottom-10 left-[80%] border-zinc-100 border-l dark:border-zinc-800/80" />
              <div className="absolute top-0 bottom-10 left-[100%] border-zinc-100 border-l dark:border-zinc-800/80" />
            </div>

            {/* Bars Area */}
            <div className="z-10 flex flex-1 flex-col justify-around border-zinc-150/60 border-l py-2 dark:border-zinc-800/60">
              {topTypes.map((type, idx) => {
                const percentage = (type.demand / scaleMax) * 100;
                const sharePct = Math.round((type.demand / totalDemand) * 100);
                const IconComponent = getSpecialtyIcon(type.name);
                const isCurrentHovered = hoveredIdx === idx;
                const isAnyHovered = hoveredIdx !== null;

                return (
                  <div
                    className="flex w-full cursor-pointer items-center gap-2 py-0.5"
                    key={idx}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {/* Rank Badge */}
                    <span
                      className={cn(
                        "flex h-[18px] w-[18px] shrink-0 select-none items-center justify-center rounded-full font-bold text-[9px] transition-all duration-300",
                        getRankBadgeClass(idx),
                        isAnyHovered && !isCurrentHovered ? "opacity-40" : ""
                      )}
                    >
                      {idx + 1}
                    </span>

                    {/* Animated Bar Wrapper */}
                    <div className="flex-1">
                      <motion.div
                        animate={{ width: `max(45%, ${percentage}%)` }}
                        className={cn(
                          "flex h-7 select-none items-center justify-between rounded-[6px] bg-gradient-to-r px-2.5 shadow-xs transition-all duration-300",
                          gradients[idx % gradients.length],
                          glows[idx % glows.length],
                          isCurrentHovered
                            ? "scale-[1.01] shadow-md brightness-105"
                            : "",
                          isAnyHovered && !isCurrentHovered
                            ? "scale-[0.99] opacity-30"
                            : "opacity-100"
                        )}
                        initial={{ width: "0%" }}
                        transition={{
                          duration: 0.8,
                          ease: [0.23, 1, 0.32, 1],
                          delay: idx * 0.05,
                        }}
                      >
                        {/* Specialty Details */}
                        <div className="mr-2 flex items-center gap-1.5 overflow-hidden">
                          <IconComponent className="h-3.5 w-3.5 shrink-0 text-white/95" />
                          <span className="truncate font-semibold text-[10px] text-white leading-none">
                            {type.name}
                          </span>
                        </div>

                        {/* Vol & Pct Pill */}
                        <div className="flex shrink-0 items-center justify-center rounded-[4px] border border-white/10 bg-white/15 px-2 py-0.5 dark:border-black/5 dark:bg-black/20">
                          <span className="font-bold text-[10px] text-white tracking-tight">
                            {type.demand}{" "}
                            <span className="ml-0.5 font-medium text-[9px] text-white/60">
                              {sharePct}%
                            </span>
                          </span>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X Axis ticks & labels */}
            <div className="mt-1 flex h-10 flex-col justify-between">
              {/* Ticks & Labels */}
              <div className="relative h-4 w-full">
                <div className="absolute left-[0%] flex -translate-x-1/2 flex-col items-center">
                  <div className="h-1 w-[1px] bg-zinc-300 dark:bg-zinc-700" />
                  <span className="mt-1 font-medium text-[9px] text-zinc-400">
                    0
                  </span>
                </div>
                <div className="absolute left-[20%] flex -translate-x-1/2 flex-col items-center">
                  <div className="h-1 w-[1px] bg-zinc-300 dark:bg-zinc-700" />
                  <span className="mt-1 font-medium text-[9px] text-zinc-400">
                    {ticks[0]}
                  </span>
                </div>
                <div className="absolute left-[40%] flex -translate-x-1/2 flex-col items-center">
                  <div className="h-1 w-[1px] bg-zinc-300 dark:bg-zinc-700" />
                  <span className="mt-1 font-medium text-[9px] text-zinc-400">
                    {ticks[1]}
                  </span>
                </div>
                <div className="absolute left-[60%] flex -translate-x-1/2 flex-col items-center">
                  <div className="h-1 w-[1px] bg-zinc-300 dark:bg-zinc-700" />
                  <span className="mt-1 font-medium text-[9px] text-zinc-400">
                    {ticks[2]}
                  </span>
                </div>
                <div className="absolute left-[80%] flex -translate-x-1/2 flex-col items-center">
                  <div className="h-1 w-[1px] bg-zinc-300 dark:bg-zinc-700" />
                  <span className="mt-1 font-medium text-[9px] text-zinc-400">
                    {ticks[3]}
                  </span>
                </div>
                <div className="absolute left-[100%] flex -translate-x-1/2 flex-col items-center">
                  <div className="h-1 w-[1px] bg-zinc-300 dark:bg-zinc-700" />
                  <span className="mt-1 font-medium text-[9px] text-zinc-400">
                    {ticks[4]}
                  </span>
                </div>
              </div>

              {/* Bottom label centered */}
              <div className="select-none text-center font-semibold text-[9px] text-zinc-400 uppercase tracking-wider">
                Volume
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
