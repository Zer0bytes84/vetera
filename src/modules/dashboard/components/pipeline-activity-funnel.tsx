"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

export interface PipelineRow {
  label: string;
  value: number;
  ratio: number;
  color: string;
}

export interface ActivityDay {
  date: Date;
  value: number;
}

interface PipelineActivityFunnelProps {
  pipelineRows: PipelineRow[];
  activityDays: ActivityDay[];
}

const pipelineGradients = [
  "from-cyan-400 to-blue-500 shadow-[0_4px_12px_rgba(56,189,248,0.2)]",
  "from-amber-400 to-rose-500 shadow-[0_4px_12px_rgba(245,158,11,0.2)]",
  "from-emerald-400 to-teal-500 shadow-[0_4px_12px_rgba(16,185,129,0.2)]",
  "from-fuchsia-400 to-purple-600 shadow-[0_4px_12px_rgba(167,139,250,0.2)]",
];

export function PipelineActivityFunnel({
  pipelineRows,
  activityDays,
}: PipelineActivityFunnelProps) {
  // Format pipeline rows nicely
  const totalActes = pipelineRows.reduce((sum, row) => sum + row.value, 0);

  // Formatting sparkline data for Recharts (last 14 days)
  const sparklineData = activityDays.slice(-14).map((day) => ({
    name: day.date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    val: day.value,
  }));

  const maxSparklineVal = Math.max(...sparklineData.map((d) => d.val), 1);

  return (
    <Card className="dashboard-luxe-card group relative overflow-hidden p-6 shadow-none transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-md hover:shadow-zinc-950/5 dark:hover:shadow-black/20 active:scale-[0.995]">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-0 z-[-1] opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-teal-500/10 blur-3xl dark:bg-teal-500/5" />
      </div>

      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-400 dark:from-teal-400 dark:to-emerald-300">
            Flux de Patients & Cadence
          </span>
          <h3 className="text-xl font-bold tracking-tight text-foreground mt-1">
            Pipeline & Activité
          </h3>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <span className="text-xl font-extrabold text-foreground tabular-nums leading-none">{totalActes}</span>
          <span className="text-[9px] text-muted-foreground uppercase font-bold mt-1 tracking-wider">Actes Totaux</span>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {/* Pipeline Funnel Bars */}
        <div className="space-y-3">
          {pipelineRows.slice(0, 4).map((row, idx) => {
            const gradient = pipelineGradients[idx % pipelineGradients.length];

            return (
              <div className="flex items-center gap-4" key={row.label}>
                {/* Funnel Progress Bar with custom background & shadow */}
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "flex h-7 items-center rounded-xl px-3 font-bold text-white text-[11px] tracking-wide transition-all duration-300 hover:scale-[1.01] bg-gradient-to-r cursor-default"
                    )}
                    style={{
                      width: `${Math.max(row.ratio * 100, row.value ? 16 : 0)}%`,
                    }}
                  >
                    <span className={cn("truncate rounded-xl bg-gradient-to-r", gradient)}>{row.label}</span>
                  </div>
                </div>
                {/* Counter value */}
                <span className="w-8 shrink-0 text-right text-xs font-bold text-foreground tabular-nums">
                  {row.value}
                </span>
              </div>
            );
          })}
        </div>

        {/* Clinical Cadence Sparkline */}
        <div className="border-t border-zinc-950/10 pt-4 dark:border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Tendance d'Activité (14j)
            </h4>
            <span className="text-[10px] font-semibold text-muted-foreground">
              Volume max : <span className="font-bold">{maxSparklineVal}</span>
            </span>
          </div>

          {/* Sparkline Canvas Area */}
          <div className="h-14 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.64 0.17 190)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="oklch(0.64 0.17 190)" stopOpacity={0} />
                  </linearGradient>
                  {/* Glow filter for neon glowing line effects */}
                  <filter id="sparkGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-xl border border-zinc-950/10 bg-white/95 px-2.5 py-1 shadow-md dark:border-white/10 dark:bg-zinc-950/95">
                        <p className="text-[10px] font-bold text-foreground tabular-nums">
                          {payload[0].payload.name} : {payload[0].value} rdv
                        </p>
                      </div>
                    );
                  }}
                />
                <Area
                  dataKey="val"
                  stroke="oklch(0.64 0.17 190)"
                  strokeWidth={2}
                  fill="url(#sparklineGrad)"
                  type="monotone"
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0, fill: "oklch(0.64 0.17 190)" }}
                  filter="url(#sparkGlow)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Card>
  );
}
