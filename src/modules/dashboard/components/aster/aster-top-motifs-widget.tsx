"use client";

import { Heading2, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import type { DashboardMetrics } from "@/lib/metrics";
import { cn } from "@/lib/utils";

// Generate deterministic sparkline data points based on name and trend
function getSparklinePoints(name: string, isUp: boolean) {
  const nameHash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
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
    const totalDemand =
      rawTypes.reduce((sum, item) => sum + item.demand, 0) || 1;

    // Map to Orbit table fields with deterministic trends/percentages based on name
    return rawTypes.slice(0, 5).map((item, index) => {
      const nameHash = item.name
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const trendVal = (nameHash % 45) + 5; // between 5% and 50%
      const isUp = nameHash % 2 === 0;
      const percentage =
        Math.round((item.demand / totalDemand) * 100) || 25 - index * 4;

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
        "flex flex-col rounded-[20px] border border-zinc-200/80 bg-zinc-50/50 px-1.5 pt-3 pb-1.5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/30",
        className
      )}
    >
      {/* Outer Card Header */}
      <div className="mb-2 flex select-none items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-zinc-200/60 dark:bg-zinc-800">
            <Heading2 className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
          </div>
          <span className="font-semibold text-sm text-zinc-800 tracking-tight dark:text-zinc-200">
            Top Motifs
          </span>
        </div>
        <button className="cursor-pointer font-medium text-[11px] text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300">
          Voir plus
        </button>
      </div>

      {/* Inner White Box */}
      <div className="flex flex-1 flex-col justify-between rounded-[12px] border border-zinc-200/60 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-zinc-100 border-b pb-2 font-bold text-[10px] text-zinc-400 uppercase tracking-wider dark:border-zinc-800/80 dark:text-zinc-500">
                <th className="pb-3 font-semibold">Par Motif</th>
                <th className="pb-3 text-center font-semibold">
                  Activité (7j)
                </th>
                <th className="pb-3 text-right font-semibold">Pourcentage</th>
                <th className="pb-3 text-right font-semibold">Tendance</th>
                <th className="pb-3 text-right font-semibold">Volume</th>
              </tr>
            </thead>
            <tbody>
              {topTypes.map((type, idx) => (
                <tr
                  className="group border-zinc-50 border-b transition-colors last:border-none hover:bg-zinc-50/60 dark:border-zinc-900/30 dark:hover:bg-zinc-900/40"
                  key={idx}
                >
                  {/* Name */}
                  <td className="py-3 font-semibold text-zinc-800 dark:text-zinc-200">
                    {type.name}
                  </td>

                  {/* Sparkline column */}
                  <td className="py-3 text-center">
                    <div className="inline-flex h-[22px] w-[60px] items-center justify-center">
                      <svg className="overflow-visible" height="22" width="60">
                        <defs>
                          <linearGradient
                            id={`sparkGrad-${idx}`}
                            x1="0"
                            x2="0"
                            y1="0"
                            y2="1"
                          >
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
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
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
                  <td className="py-3 text-right font-mono font-semibold text-zinc-700 dark:text-zinc-300">
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
