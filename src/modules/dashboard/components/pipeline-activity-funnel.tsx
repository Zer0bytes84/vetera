"use client";

import { Activity, Flame, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface PipelineRow {
  color: string;
  label: string;
  ratio: number;
  value: number;
}

export interface ActivityDay {
  date: Date;
  value: number;
}

interface PipelineActivityFunnelProps {
  activityDays: ActivityDay[];
  pipelineRows: PipelineRow[];
}

const ROW_TONES = [
  { from: "#22d3ee", to: "#0ea5e9", glow: "rgba(56,189,248,0.35)" }, // cyan
  { from: "#fbbf24", to: "#f43f5e", glow: "rgba(244,63,94,0.35)" }, // amber→rose
  { from: "#34d399", to: "#10b981", glow: "rgba(16,185,129,0.35)" }, // emerald
  { from: "#c084fc", to: "#9333ea", glow: "rgba(167,139,250,0.35)" }, // purple
];

const DAY_LETTER = ["D", "L", "M", "M", "J", "V", "S"];

export function PipelineActivityFunnel({
  pipelineRows,
  activityDays,
}: PipelineActivityFunnelProps) {
  const totalActes = pipelineRows.reduce((sum, row) => sum + row.value, 0);

  const last14 = activityDays.slice(-14);
  const sparklineData = last14.map((day) => ({
    date: day.date,
    label: day.date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    }),
    dayLetter: DAY_LETTER[day.date.getDay()],
    val: day.value,
  }));

  const maxSparklineVal = Math.max(...sparklineData.map((d) => d.val), 1);
  const totalSpark = sparklineData.reduce((s, d) => s + d.val, 0);
  const avgSpark =
    sparklineData.length > 0 ? totalSpark / sparklineData.length : 0;

  // Trend: compare last 7 vs prev 7
  const last7Sum = sparklineData.slice(-7).reduce((s, d) => s + d.val, 0);
  const prev7Sum = sparklineData.slice(0, 7).reduce((s, d) => s + d.val, 0);
  const trendPct =
    prev7Sum > 0
      ? ((last7Sum - prev7Sum) / prev7Sum) * 100
      : last7Sum > 0
        ? 100
        : 0;
  const trendUp = trendPct >= 0;

  return (
    <Card className="dashboard-luxe-card group !border-zinc-200 dark:!border-white/10 relative flex h-full flex-col overflow-hidden p-6 shadow-none transition-[transform,shadow] duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-zinc-950/5 dark:hover:shadow-black/20">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-teal-500/10 blur-3xl dark:bg-teal-500/5" />
        <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/5" />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500/15 to-emerald-500/10 ring-1 ring-teal-500/15 dark:ring-teal-400/15">
                <Activity
                  className="h-3.5 w-3.5 text-teal-700 dark:text-teal-300"
                  strokeWidth={2.2}
                />
              </span>
              <span className="bg-gradient-to-r from-teal-500 to-emerald-400 bg-clip-text font-extrabold font-sans text-[10px] text-transparent uppercase tracking-widest dark:from-teal-400 dark:to-emerald-300">
                Flux &amp; Cadence
              </span>
            </div>
            <h3 className="mt-2 truncate font-display font-semibold text-foreground text-xl tracking-tight">
              Pipeline &amp; Activité
            </h3>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <span className="font-display font-semibold text-2xl text-foreground tabular-nums leading-none">
              {totalActes}
            </span>
            <span className="mt-0.5 font-bold text-[9px] text-muted-foreground uppercase tracking-wider">
              Actes Totaux
            </span>
          </div>
        </div>

        {/* ── Pipeline bars ────────────────────────────────── */}
        <ul className="mt-5 space-y-2.5">
          {pipelineRows.slice(0, 4).map((row, idx) => {
            const tone = ROW_TONES[idx % ROW_TONES.length];
            const widthPct = Math.max(row.ratio * 100, row.value ? 14 : 0);

            return (
              <li className="group/row" key={row.label}>
                <div className="mb-1 flex items-center justify-between font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                  <span className="truncate text-foreground" title={row.label}>
                    {row.label}
                  </span>
                  <span className="tabular-nums">
                    {row.value} · {(row.ratio * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-zinc-950/[0.04] dark:bg-white/[0.04]">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${widthPct}%`,
                      background: `linear-gradient(90deg, ${tone.from}, ${tone.to})`,
                      boxShadow: `0 0 10px ${tone.glow}`,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        {/* ── Activity Heatmap ─────────────────────────────── */}
        <div className="mt-5 space-y-3 border-zinc-950/10 border-t pt-4 dark:border-white/10">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 font-extrabold text-[10px] text-muted-foreground uppercase tracking-widest">
              <Flame className="h-3 w-3" />
              Intensité 14 j
            </h4>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex items-center gap-0.5 rounded-full px-1.5 py-0 font-bold text-[10px] tabular-nums",
                  trendUp
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                )}
              >
                <TrendingUp
                  className={cn("h-2.5 w-2.5", !trendUp && "rotate-180")}
                />
                {trendUp ? "+" : ""}
                {trendPct.toFixed(0)}%
              </span>
              <span className="font-bold text-[10px] text-muted-foreground tabular-nums">
                Moy.{" "}
                <span className="text-foreground">{avgSpark.toFixed(1)}</span>
              </span>
            </div>
          </div>

          {/* Heat row */}
          <div className="grid grid-cols-14 gap-1">
            {sparklineData.map((day, idx) => {
              const intensity =
                day.val === 0 ? 0 : Math.max(0.15, day.val / maxSparklineVal);
              const isMax = day.val === maxSparklineVal && day.val > 0;
              return (
                <div className="group/heat relative" key={idx}>
                  {/* Heat cell */}
                  <div
                    className={cn(
                      "relative h-12 cursor-pointer overflow-hidden rounded-md transition-all duration-300 hover:scale-105",
                      day.val === 0
                        ? "bg-zinc-950/[0.04] dark:bg-white/[0.04]"
                        : "bg-zinc-950/[0.04] dark:bg-white/[0.04]"
                    )}
                  >
                    {/* Fill rising from bottom */}
                    {day.val > 0 && (
                      <div
                        className="absolute inset-x-0 bottom-0 rounded-md transition-all duration-700"
                        style={{
                          height: `${intensity * 100}%`,
                          background: isMax
                            ? "linear-gradient(180deg, #14b8a6, #0d9488)"
                            : intensity > 0.6
                              ? "linear-gradient(180deg, #2dd4bf, #14b8a6)"
                              : "linear-gradient(180deg, #5eead4, #2dd4bf)",
                          boxShadow: isMax
                            ? "0 0 10px rgba(20,184,166,0.5)"
                            : "none",
                        }}
                      />
                    )}
                  </div>
                  <p className="mt-1 text-center font-bold text-[9px] text-muted-foreground/70 uppercase tabular-nums">
                    {day.dayLetter}
                  </p>
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max -translate-x-1/2 opacity-0 transition-opacity duration-200 group-hover/heat:opacity-100">
                    <div className="rounded-md bg-zinc-900 px-2 py-1 font-medium text-[10px] text-white shadow-xl dark:bg-white dark:text-zinc-900">
                      {day.label} : <span className="font-bold">{day.val}</span>{" "}
                      rdv
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
