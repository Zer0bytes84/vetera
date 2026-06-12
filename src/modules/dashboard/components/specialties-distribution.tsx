"use client";

import { PieChart as PieIcon } from "lucide-react";
import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface CareSpecialty {
  color: string;
  label: string;
  value: number;
}

export interface AppointmentTypeDemand {
  demand: number;
  name: string;
}

interface SpecialtiesDistributionProps {
  appointmentTypes: AppointmentTypeDemand[];
  categories: CareSpecialty[];
}

const SLICE_COLORS = ["#8b5cf6", "#f59e0b", "#10b981", "#0ea5e9", "#f43f5e"];

const SLICE_GRADIENTS: Array<{ from: string; to: string }> = [
  { from: "#a78bfa", to: "#7c3aed" }, // violet
  { from: "#fbbf24", to: "#d97706" }, // amber
  { from: "#34d399", to: "#059669" }, // emerald
  { from: "#38bdf8", to: "#0284c7" }, // sky
  { from: "#fb7185", to: "#e11d48" }, // rose
];

const TYPE_TONES = [
  "from-violet-500/10 to-violet-500/[0.03] border-violet-500/20 text-violet-700 dark:text-violet-300",
  "from-amber-500/10 to-amber-500/[0.03] border-amber-500/20 text-amber-700 dark:text-amber-300",
  "from-emerald-500/10 to-emerald-500/[0.03] border-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  "from-sky-500/10 to-sky-500/[0.03] border-sky-500/20 text-sky-700 dark:text-sky-300",
];

const TYPE_BARS = [
  "bg-violet-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="rounded-xl border border-zinc-200 bg-white/95 px-3 py-2 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/95">
        <p className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
          {data.name}
        </p>
        <p className="mt-1 font-display font-semibold text-foreground text-sm tabular-nums">
          {new Intl.NumberFormat("fr-FR").format(data.value)} DA
        </p>
      </div>
    );
  }
  return null;
};

export function SpecialtiesDistribution({
  categories,
  appointmentTypes,
}: SpecialtiesDistributionProps) {
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);

  const totalCategories = categories.reduce((sum, c) => sum + c.value, 0);
  const totalDemand = appointmentTypes.reduce((sum, t) => sum + t.demand, 0);

  const chartData = categories.slice(0, 5).map((cat, idx) => ({
    name: cat.label,
    value: cat.value,
    fill: SLICE_COLORS[idx % SLICE_COLORS.length],
    gradId: `slice-grad-${idx}`,
  }));

  const featured =
    hoverIdx !== null && chartData[hoverIdx] ? chartData[hoverIdx] : null;

  return (
    <Card className="dashboard-luxe-card group !border-zinc-200 dark:!border-white/10 relative flex h-full flex-col overflow-hidden p-6 shadow-none transition-[transform,shadow] duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-zinc-950/5 dark:hover:shadow-black/20">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/5" />
        <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl dark:bg-fuchsia-500/5" />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 ring-1 ring-violet-500/15 dark:ring-violet-400/15">
                <PieIcon
                  className="h-3.5 w-3.5 text-violet-700 dark:text-violet-300"
                  strokeWidth={2.2}
                />
              </span>
              <span className="bg-gradient-to-r from-violet-500 to-fuchsia-400 bg-clip-text font-extrabold font-sans text-[10px] text-transparent uppercase tracking-widest dark:from-violet-400 dark:to-fuchsia-300">
                Répartition Financière
              </span>
            </div>
            <h3 className="mt-2 truncate font-display font-semibold text-foreground text-xl tracking-tight">
              Distribution par Catégorie
            </h3>
          </div>
        </div>

        {/* ── Donut + legend ──────────────────────────────────── */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr] sm:items-center">
          <div className="relative mx-auto h-[180px] w-[180px]">
            <ResponsiveContainer
              height="100%"
              minHeight={0}
              minWidth={0}
              width="100%"
            >
              <PieChart>
                <defs>
                  {SLICE_GRADIENTS.slice(0, chartData.length).map((g, idx) => (
                    <linearGradient
                      id={`slice-grad-${idx}`}
                      key={`slice-grad-${idx}`}
                      x1="0"
                      x2="1"
                      y1="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={g.from} />
                      <stop offset="100%" stopColor={g.to} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie
                  cx="50%"
                  cy="50%"
                  data={chartData}
                  dataKey="value"
                  innerRadius={58}
                  onMouseEnter={(_, idx) => setHoverIdx(idx)}
                  onMouseLeave={() => setHoverIdx(null)}
                  outerRadius={80}
                  paddingAngle={4}
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      className={cn(
                        "transition-all duration-300",
                        hoverIdx !== null && hoverIdx !== index
                          ? "opacity-30"
                          : "opacity-100"
                      )}
                      fill={`url(#${entry.gradId})`}
                      key={`cell-${index}`}
                      style={{ outline: "none", cursor: "pointer" }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "transparent" }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Centered label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              {featured ? (
                <>
                  <span className="max-w-[110px] truncate font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                    {featured.name}
                  </span>
                  <span className="mt-0.5 font-display font-semibold text-base text-foreground tabular-nums tracking-tight">
                    {new Intl.NumberFormat("fr-FR", {
                      notation: "compact",
                      compactDisplay: "short",
                    }).format(featured.value)}
                  </span>
                  <span className="font-bold text-[9px] text-muted-foreground tabular-nums">
                    {totalCategories > 0
                      ? `${((featured.value / totalCategories) * 100).toFixed(0)}%`
                      : "—"}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                    Total
                  </span>
                  <span className="mt-0.5 font-display font-semibold text-foreground text-xl tabular-nums tracking-tight">
                    {new Intl.NumberFormat("fr-FR", {
                      notation: "compact",
                      compactDisplay: "short",
                    }).format(totalCategories)}
                  </span>
                  <span className="font-bold text-[9px] text-muted-foreground uppercase tracking-wider">
                    DA
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Side legend */}
          <ul className="space-y-2">
            {chartData.map((entry, idx) => {
              const pct =
                totalCategories > 0 ? (entry.value / totalCategories) * 100 : 0;
              return (
                <li
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg p-1.5 transition-all",
                    hoverIdx === idx
                      ? "bg-zinc-950/5 dark:bg-white/5"
                      : "hover:bg-zinc-950/5 dark:hover:bg-white/5"
                  )}
                  key={entry.name}
                  onMouseEnter={() => setHoverIdx(idx)}
                  onMouseLeave={() => setHoverIdx(null)}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-md ring-1 ring-black/5"
                    style={{
                      background: `linear-gradient(135deg, ${SLICE_GRADIENTS[idx].from}, ${SLICE_GRADIENTS[idx].to})`,
                    }}
                  />
                  <span
                    className="min-w-0 flex-1 truncate font-semibold text-foreground text-xs"
                    title={entry.name}
                  >
                    {entry.name}
                  </span>
                  <span className="shrink-0 font-bold text-[10px] text-muted-foreground tabular-nums">
                    {pct.toFixed(0)}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ── Top Demands ─────────────────────────────────────── */}
        <div className="mt-5 space-y-3 border-zinc-950/10 border-t pt-4 dark:border-white/10">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-widest">
              Top Demandes d'Actes
            </h4>
            <span className="font-bold text-[10px] text-muted-foreground tabular-nums">
              {totalDemand} actes
            </span>
          </div>
          <ul className="space-y-2">
            {appointmentTypes.slice(0, 4).map((type, idx) => {
              const pct =
                totalDemand > 0 ? (type.demand / totalDemand) * 100 : 0;
              const tone = TYPE_TONES[idx % TYPE_TONES.length];
              const bar = TYPE_BARS[idx % TYPE_BARS.length];
              return (
                <li
                  className={cn(
                    "rounded-xl border bg-gradient-to-br bg-clip-padding p-2.5 transition-all hover:scale-[1.01] hover:shadow-xs",
                    tone
                  )}
                  key={type.name}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="min-w-0 flex-1 truncate font-bold text-foreground text-xs leading-tight"
                      title={type.name}
                    >
                      {type.name}
                    </p>
                    <div className="flex shrink-0 items-baseline gap-1.5">
                      <span className="font-display font-semibold text-foreground text-sm tabular-nums leading-none">
                        {type.demand}
                      </span>
                      <span className="font-bold text-[10px] tabular-nums opacity-70">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/40 dark:bg-white/5">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        bar
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Card>
  );
}
