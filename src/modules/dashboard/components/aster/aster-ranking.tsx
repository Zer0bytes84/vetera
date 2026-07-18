"use client";

import { useMemo, useState } from "react";
import { BarChart3, Stethoscope, Scissors, Syringe, AlertCircle, Pill, Activity, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import type { DashboardMetrics } from "@/lib/metrics";
import { cn } from "@/lib/utils";

// Specialty to icon mapping
const getSpecialtyIcon = (name: string) => {
  const normalized = name.toLowerCase();
  if (normalized.includes("consult")) return Stethoscope;
  if (normalized.includes("chirurg") || normalized.includes("operat")) return Scissors;
  if (normalized.includes("vaccin") || normalized.includes("injec")) return Syringe;
  if (normalized.includes("urgenc")) return AlertCircle;
  if (normalized.includes("pharm")) return Pill;
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
  if (scaleMax === 0) scaleMax = 5;

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
        "flex flex-col rounded-[20px] border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 pt-3 px-1.5 pb-1.5 shadow-xs",
        className
      )}
    >
      {/* Outer Card Header */}
      <div className="mb-2 flex items-center justify-between px-1 select-none">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-zinc-200/60 dark:bg-zinc-800">
            <Trophy className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
          </div>
          <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200 tracking-tight">
            Spécialités
          </span>
        </div>
        <button className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 font-medium transition-colors cursor-pointer">
          Voir plus
        </button>
      </div>

      {/* Inner White Box */}
      <div className="flex-1 rounded-[12px] border border-zinc-200/60 dark:border-zinc-800 bg-white p-5 shadow-xs dark:bg-zinc-950/80 flex flex-col justify-between">
        <div className="flex flex-1 items-stretch gap-2 min-h-[220px]">
          
          {/* Left Y-axis Label */}
          <div className="w-6 flex items-center justify-center relative select-none">
            <div className="rotate-[-90deg] whitespace-nowrap text-[9px] font-semibold text-zinc-400 uppercase tracking-wider">
              Volume RDV
            </div>
          </div>

          {/* Chart Content Area */}
          <div className="flex flex-1 flex-col justify-between relative pl-1">
            {/* Vertical Grid Lines */}
            <div className="absolute inset-0 flex justify-between pointer-events-none pl-[1px] select-none">
              <div className="absolute left-[20%] top-0 bottom-10 border-l border-zinc-100 dark:border-zinc-800/80" />
              <div className="absolute left-[40%] top-0 bottom-10 border-l border-zinc-100 dark:border-zinc-800/80" />
              <div className="absolute left-[60%] top-0 bottom-10 border-l border-zinc-100 dark:border-zinc-800/80" />
              <div className="absolute left-[80%] top-0 bottom-10 border-l border-zinc-100 dark:border-zinc-800/80" />
              <div className="absolute left-[100%] top-0 bottom-10 border-l border-zinc-100 dark:border-zinc-800/80" />
            </div>

            {/* Bars Area */}
            <div className="flex-1 flex flex-col justify-around py-2 z-10 border-l border-zinc-150/60 dark:border-zinc-800/60">
              {topTypes.map((type, idx) => {
                const percentage = (type.demand / scaleMax) * 100;
                const sharePct = Math.round((type.demand / totalDemand) * 100);
                const IconComponent = getSpecialtyIcon(type.name);
                const isCurrentHovered = hoveredIdx === idx;
                const isAnyHovered = hoveredIdx !== null;

                return (
                  <div
                    key={idx}
                    className="w-full flex items-center gap-2 py-0.5 cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {/* Rank Badge */}
                    <span
                      className={cn(
                        "h-[18px] w-[18px] rounded-full flex items-center justify-center text-[9px] font-bold select-none shrink-0 transition-all duration-300",
                        getRankBadgeClass(idx),
                        isAnyHovered && !isCurrentHovered ? "opacity-40" : ""
                      )}
                    >
                      {idx + 1}
                    </span>

                    {/* Animated Bar Wrapper */}
                    <div className="flex-1">
                      <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: `max(45%, ${percentage}%)` }}
                        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1], delay: idx * 0.05 }}
                        className={cn(
                          "h-7 rounded-[6px] bg-gradient-to-r flex items-center justify-between px-2.5 transition-all duration-300 shadow-xs select-none",
                          gradients[idx % gradients.length],
                          glows[idx % glows.length],
                          isCurrentHovered ? "scale-[1.01] shadow-md brightness-105" : "",
                          isAnyHovered && !isCurrentHovered ? "opacity-30 scale-[0.99]" : "opacity-100"
                        )}
                      >
                        {/* Specialty Details */}
                        <div className="flex items-center gap-1.5 overflow-hidden mr-2">
                          <IconComponent className="h-3.5 w-3.5 text-white/95 shrink-0" />
                          <span className="text-white text-[10px] font-semibold truncate leading-none">
                            {type.name}
                          </span>
                        </div>

                        {/* Vol & Pct Pill */}
                        <div className="bg-white/15 dark:bg-black/20 px-2 py-0.5 rounded-[4px] border border-white/10 dark:border-black/5 flex items-center justify-center shrink-0">
                          <span className="text-white text-[10px] font-bold tracking-tight">
                            {type.demand} <span className="text-white/60 font-medium text-[9px] ml-0.5">{sharePct}%</span>
                          </span>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X Axis ticks & labels */}
            <div className="h-10 mt-1 flex flex-col justify-between">
              {/* Ticks & Labels */}
              <div className="relative w-full h-4">
                <div className="absolute left-[0%] -translate-x-1/2 flex flex-col items-center">
                  <div className="h-1 w-[1px] bg-zinc-300 dark:bg-zinc-700" />
                  <span className="text-[9px] text-zinc-400 mt-1 font-medium">0</span>
                </div>
                <div className="absolute left-[20%] -translate-x-1/2 flex flex-col items-center">
                  <div className="h-1 w-[1px] bg-zinc-300 dark:bg-zinc-700" />
                  <span className="text-[9px] text-zinc-400 mt-1 font-medium">{ticks[0]}</span>
                </div>
                <div className="absolute left-[40%] -translate-x-1/2 flex flex-col items-center">
                  <div className="h-1 w-[1px] bg-zinc-300 dark:bg-zinc-700" />
                  <span className="text-[9px] text-zinc-400 mt-1 font-medium">{ticks[1]}</span>
                </div>
                <div className="absolute left-[60%] -translate-x-1/2 flex flex-col items-center">
                  <div className="h-1 w-[1px] bg-zinc-300 dark:bg-zinc-700" />
                  <span className="text-[9px] text-zinc-400 mt-1 font-medium">{ticks[2]}</span>
                </div>
                <div className="absolute left-[80%] -translate-x-1/2 flex flex-col items-center">
                  <div className="h-1 w-[1px] bg-zinc-300 dark:bg-zinc-700" />
                  <span className="text-[9px] text-zinc-400 mt-1 font-medium">{ticks[3]}</span>
                </div>
                <div className="absolute left-[100%] -translate-x-1/2 flex flex-col items-center">
                  <div className="h-1 w-[1px] bg-zinc-300 dark:bg-zinc-700" />
                  <span className="text-[9px] text-zinc-400 mt-1 font-medium">{ticks[4]}</span>
                </div>
              </div>

              {/* Bottom label centered */}
              <div className="text-[9px] text-zinc-400 uppercase tracking-wider font-semibold text-center select-none">
                Volume
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
