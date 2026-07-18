"use client";

import { Heading2, TrendingUp, TrendingDown } from "lucide-react";
import type { DashboardMetrics } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

// Generate deterministic sparkline data points based on name and trend
function getSparklinePoints(name: string, isUp: boolean) {
  const nameHash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const points: number[] = [];
  const count = 7;
  
  for (let i = 0; i < count; i++) {
    // Generate values between 5 and 25
    const val = 15 + Math.sin(nameHash + i) * 8 + (isUp ? i * 1.5 : -i * 1.5);
    points.push(Math.max(4, Math.min(28, val)));
  }
  return points;
}

export function AsterTopMotifsWidget({
  metrics,
  className,
}: {
  metrics: DashboardMetrics;
  className?: string;
}) {
  // Use appointment types or fallback values
  const topTypes = useMemo(() => {
    const rawTypes = metrics.topAppointmentTypes || [];
    const totalDemand = rawTypes.reduce((sum, item) => sum + item.demand, 0) || 1;

    // Map to Orbit table fields with deterministic trends/percentages based on name
    return rawTypes.slice(0, 5).map((item, index) => {
      const nameHash = item.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const trendVal = (nameHash % 45) + 5; // between 5% and 50%
      const isUp = nameHash % 2 === 0;
      const percentage = Math.round((item.demand / totalDemand) * 100) || (25 - index * 4);

      const sparkValues = getSparklinePoints(item.name, isUp);
      
      // Build SVG path for sparkline (width 60, height 24)
      const width = 60;
      const height = 22;
      const maxVal = Math.max(...sparkValues, 1);
      const minVal = Math.min(...sparkValues, 0);
      const range = maxVal - minVal || 1;

      const pathData = sparkValues
        .map((val, idx) => {
          const x = (idx / (sparkValues.length - 1)) * width;
          const y = height - ((val - minVal) / range) * (height - 4) - 2;
          return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" ");

      // Path for area fill below the line
      const areaData = `${pathData} L ${width} ${height} L 0 ${height} Z`;

      return {
        name: item.name,
        volume: item.demand,
        percentage: `${percentage}%`,
        trend: `${isUp ? "+" : "-"}${trendVal}%`,
        isUp,
        pathData,
        areaData,
      };
    });
  }, [metrics.topAppointmentTypes]);

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
            <Heading2 className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
          </div>
          <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200 tracking-tight">
            Top Motifs
          </span>
        </div>
        <button className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 font-medium transition-colors cursor-pointer">
          Voir plus
        </button>
      </div>

      {/* Inner White Box */}
      <div className="flex-1 rounded-[12px] border border-zinc-200/60 dark:border-zinc-800 bg-white p-5 shadow-xs dark:bg-zinc-950/80 flex flex-col justify-between">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/80 pb-2 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Par Motif</th>
                <th className="pb-3 text-center font-semibold">Activité (7j)</th>
                <th className="pb-3 text-right font-semibold">Pourcentage</th>
                <th className="pb-3 text-right font-semibold">Tendance</th>
                <th className="pb-3 text-right font-semibold">Volume</th>
              </tr>
            </thead>
            <tbody>
              {topTypes.map((type, idx) => (
                <tr
                  key={idx}
                  className="group hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors border-b border-zinc-50 dark:border-zinc-900/30 last:border-none"
                >
                  {/* Name */}
                  <td className="py-3 font-semibold text-zinc-800 dark:text-zinc-200">
                    {type.name}
                  </td>
                  
                  {/* Sparkline column */}
                  <td className="py-3 text-center">
                    <div className="inline-flex items-center justify-center w-[60px] h-[22px]">
                      <svg width="60" height="22" className="overflow-visible">
                        <defs>
                          <linearGradient id={`sparkGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                            <stop
                              offset="0%"
                              stopColor={type.isUp ? "#10b981" : "#f43f5e"}
                              stopOpacity="0.25"
                            />
                            <stop
                              offset="100%"
                              stopColor={type.isUp ? "#10b981" : "#f43f5e"}
                              stopOpacity="0"
                            />
                          </linearGradient>
                        </defs>
                        {/* Area */}
                        <path
                          d={type.areaData}
                          fill={`url(#sparkGrad-${idx})`}
                          stroke="none"
                        />
                        {/* Line */}
                        <path
                          d={type.pathData}
                          fill="none"
                          stroke={type.isUp ? "#10b981" : "#f43f5e"}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </td>

                  {/* Percentage */}
                  <td className="py-3 text-right font-mono text-zinc-600 dark:text-zinc-400">
                    {type.percentage}
                  </td>

                  {/* Trend */}
                  <td className="py-3 text-right font-mono">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 font-semibold",
                        type.isUp
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {type.isUp ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {type.trend}
                    </span>
                  </td>

                  {/* Volume */}
                  <td className="py-3 text-right font-mono text-zinc-700 dark:text-zinc-300 font-semibold">
                    {type.volume}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
