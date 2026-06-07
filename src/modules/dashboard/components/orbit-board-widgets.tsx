"use client";

import {
  Activity02Icon,
  ChartUpIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SeriesPoint = {
  name: string;
  value: number;
};

type PipelineRow = {
  label: string;
  value: number;
  ratio: number;
  color: string;
};

function formatCompactDA(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M DA`;
  }
  if (value >= 1000) {
    return `${Math.round(value / 1000)}k DA`;
  }
  return `${Math.round(value)} DA`;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

export function OrbitRevenueBars({
  data,
  total,
  delta,
}: {
  data: SeriesPoint[];
  total: number;
  delta: number;
}) {
  const visible = data.slice(-7);
  const maxValue = Math.max(...visible.map((item) => item.value), 1);
  const highlightedIndex = visible.findIndex((item) => item.value === maxValue);

  return (
    <Card className="dashboard-luxe-card h-full rounded-[26px] bg-card p-5 shadow-none">
      <div className="relative mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-300">
              <HugeiconsIcon
                className="size-4"
                icon={ChartUpIcon}
                strokeWidth={2}
              />
            </span>
            <p className="font-medium text-muted-foreground text-sm">
              Revenus visibles
            </p>
          </div>
          <p className="font-semibold text-[34px] text-foreground tabular-nums leading-none tracking-[-0.055em]">
            {formatCompactDA(total)}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 font-semibold text-xs tabular-nums",
            delta >= 0
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
          )}
        >
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(1)}%
        </span>
      </div>

      <div className="relative h-[190px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart
            data={visible}
            margin={{ top: 20, right: 4, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="orbitRevenueHot" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="oklch(0.70 0.16 58)"
                  stopOpacity={0.86}
                />
                <stop
                  offset="100%"
                  stopColor="oklch(0.58 0.15 32)"
                  stopOpacity={0.66}
                />
              </linearGradient>
              <linearGradient
                id="orbitRevenueMuted"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--muted-foreground)"
                  stopOpacity={0.22}
                />
                <stop
                  offset="100%"
                  stopColor="var(--muted-foreground)"
                  stopOpacity={0.08}
                />
              </linearGradient>
            </defs>
            <XAxis
              axisLine={false}
              dataKey="name"
              dy={10}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
            />
            <YAxis domain={[0, Math.max(maxValue * 1.22, 1)]} hide />
            <Tooltip
              cursor={false}
              formatter={(value) => formatCompactDA(Number(value))}
            />
            <ReferenceLine
              stroke="var(--muted-foreground)"
              strokeDasharray="5 7"
              strokeOpacity={0.35}
              y={maxValue}
            />
            <Bar dataKey="value" maxBarSize={42} radius={[12, 12, 4, 4]}>
              {visible.map((entry, index) => (
                <Cell
                  fill={
                    index === highlightedIndex
                      ? "url(#orbitRevenueHot)"
                      : "url(#orbitRevenueMuted)"
                  }
                  key={entry.name}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function OrbitPipelineStatus({ rows }: { rows: PipelineRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const visible = rows.slice(0, 5);

  return (
    <Card className="dashboard-luxe-card h-full rounded-[26px] bg-card p-5 shadow-none">
      <div className="relative mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
              <HugeiconsIcon
                className="size-4"
                icon={UserGroupIcon}
                strokeWidth={2}
              />
            </span>
            <p className="font-medium text-muted-foreground text-sm">
              Pipeline clinique
            </p>
          </div>
          <p className="font-semibold text-[34px] text-foreground tabular-nums leading-none tracking-[-0.055em]">
            {formatInteger(total)}
          </p>
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-muted-foreground text-xs">
          actes
        </span>
      </div>

      <div className="relative space-y-3">
        {visible.map((row) => (
          <div className="group flex items-center gap-3" key={row.label}>
            <div className="min-w-0 flex-1">
              <div
                className="flex h-8 items-center rounded-full px-3 font-semibold text-white text-xs transition-transform group-hover:scale-[1.01]"
                style={{
                  width: `${Math.max(row.ratio * 100, row.value ? 14 : 0)}%`,
                  backgroundColor: row.color,
                }}
              >
                <span className="truncate">{row.label}</span>
              </div>
            </div>
            <span className="w-8 text-right font-semibold text-foreground text-sm tabular-nums">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function OrbitCadenceSpark({
  data,
  label,
  value,
}: {
  data: SeriesPoint[];
  label: string;
  value: string;
}) {
  return (
    <Card className="dashboard-luxe-card h-full rounded-[26px] bg-card p-5 shadow-none">
      <div className="relative mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
              <HugeiconsIcon
                className="size-4"
                icon={Activity02Icon}
                strokeWidth={2}
              />
            </span>
            <p className="font-medium text-muted-foreground text-sm">{label}</p>
          </div>
          <p className="font-semibold text-[34px] text-foreground tabular-nums leading-none tracking-[-0.055em]">
            {value}
          </p>
        </div>
      </div>

      <div className="relative h-[148px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart
            data={data.slice(-18)}
            margin={{ top: 8, right: 2, left: 2, bottom: 0 }}
          >
            <defs>
              <linearGradient id="orbitSpark" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="oklch(0.66 0.18 306)"
                  stopOpacity={0.48}
                />
                <stop
                  offset="100%"
                  stopColor="oklch(0.66 0.18 306)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <Tooltip
              cursor={false}
              formatter={(item) => formatInteger(Number(item))}
            />
            <Area
              activeDot={{ r: 5 }}
              dataKey="value"
              dot={false}
              fill="url(#orbitSpark)"
              stroke="oklch(0.66 0.18 306)"
              strokeWidth={2.6}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
