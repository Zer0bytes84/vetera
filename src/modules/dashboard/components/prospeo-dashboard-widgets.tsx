"use client";

import {
  Activity03Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Calendar01Icon,
  ChartUpIcon,
  MoneyBag02Icon,
  StethoscopeIcon,
  Task01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

type MetricTone = "blue" | "orange" | "green" | "red";

type SeriesPoint = {
  name: string;
  value: number;
};

type ConsultationRow = {
  id: string;
  patient: string;
  owner: string;
  type: string;
  time: string;
  status: string;
};

type PipelineRow = {
  label: string;
  value: number;
  ratio: number;
  color: string;
};

const metricToneClass: Record<MetricTone, string> = {
  blue: "text-blue-400 bg-blue-500/12 border-blue-400/18",
  orange: "text-orange-400 bg-orange-500/12 border-orange-400/18",
  green: "text-emerald-400 bg-emerald-500/12 border-emerald-400/18",
  red: "text-rose-400 bg-rose-500/12 border-rose-400/18",
};

const statusClass: Record<string, string> = {
  scheduled: "bg-blue-500/12 text-blue-300 border-blue-400/20",
  in_progress: "bg-orange-500/12 text-orange-300 border-orange-400/20",
  completed: "bg-emerald-500/12 text-emerald-300 border-emerald-400/20",
  cancelled: "bg-rose-500/12 text-rose-300 border-rose-400/20",
  no_show: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-300 border-zinc-400/20",
};

const statusLabel: Record<string, string> = {
  scheduled: "Planifié",
  in_progress: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
  no_show: "Absent",
};

function formatCompact(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${Math.round(value / 1000)}k`;
  }
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

function formatDA(value: number) {
  return `${formatCompact(value)} DA`;
}

function MiniGlyph({ children }: { children: ReactNode }) {
  return <span className="prospeo-glyph">{children}</span>;
}

function SafeResponsiveChart({
  minWidth,
  minHeight,
  children,
}: {
  minWidth: number;
  minHeight: number;
  children: ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const sync = () => {
      const rect = host.getBoundingClientRect();
      const nextWidth = Math.max(Math.floor(rect.width), 0);
      const nextHeight = Math.max(Math.floor(rect.height), 0);
      setSize((prev) =>
        prev.width === nextWidth && prev.height === nextHeight
          ? prev
          : { width: nextWidth, height: nextHeight }
      );
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(host);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="h-full w-full min-w-0" ref={hostRef}>
      {size.width > 0 && size.height > 0 ? (
        <ResponsiveContainer
          height={Math.max(size.height, minHeight)}
          minHeight={minHeight}
          minWidth={minWidth}
          width={Math.max(size.width, minWidth)}
        >
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}

export function ProspeoMetricCard({
  title,
  value,
  delta,
  caption,
  tone,
  icon,
  compact = false,
}: {
  title: string;
  value: string;
  delta: number;
  caption: string;
  tone: MetricTone;
  icon: ReactNode;
  compact?: boolean;
}) {
  const positive = delta >= 0;

  return (
    <article className="prospeo-card prospeo-metric-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="prospeo-label">{title}</p>
          <p
            className={cn(
              "mt-4 whitespace-nowrap font-medium text-[var(--prospeo-text)] tabular-nums leading-none tracking-[-0.05em]",
              compact
                ? "text-[clamp(27px,1.85vw,32px)]"
                : "text-[clamp(28px,2.15vw,34px)]"
            )}
          >
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex shrink-0 items-center justify-center border",
            compact ? "size-11 rounded-[15px]" : "size-12 rounded-2xl",
            metricToneClass[tone]
          )}
        >
          {icon}
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2 text-sm">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-medium text-xs",
            positive
              ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
              : "border-rose-400/20 bg-rose-500/10 text-rose-300"
          )}
        >
          <HugeiconsIcon
            className="size-3"
            icon={positive ? ArrowUp01Icon : ArrowDown01Icon}
            strokeWidth={2}
          />
          {positive ? "+" : ""}
          {delta.toFixed(1)}%
        </span>
        <span className="text-[var(--prospeo-muted)]">{caption}</span>
      </div>
    </article>
  );
}

export type RevenuePeriod = "7d" | "30d" | "90d";

const PERIOD_LABELS: Record<RevenuePeriod, string> = {
  "7d": "7j",
  "30d": "30j",
  "90d": "90j",
};

export function ProspeoRevenueChart({
  data,
  total,
  delta,
  period = "30d",
  onPeriodChange,
}: {
  data: SeriesPoint[];
  total: number;
  delta: number;
  period?: RevenuePeriod;
  onPeriodChange?: (period: RevenuePeriod) => void;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const activeIndex = data.findIndex((item) => item.value === max);

  return (
    <section className="prospeo-card prospeo-chart-card lg:col-span-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="prospeo-label">Revenue</p>
          <p className="mt-2 font-medium text-[34px] text-[var(--prospeo-text)] tabular-nums leading-none tracking-[-0.045em]">
            {formatDA(total)}
          </p>
          <p
            className={cn(
              "mt-4 flex items-center gap-1 text-sm",
              delta >= 0 ? "text-emerald-300" : "text-rose-300"
            )}
          >
            <HugeiconsIcon
              className="size-3.5"
              icon={delta >= 0 ? ArrowUp01Icon : ArrowDown01Icon}
              strokeWidth={2}
            />
            {Math.abs(delta).toFixed(1)}%{" "}
            <span className="ml-1 text-[var(--prospeo-muted)]">
              vs période précédente
            </span>
          </p>
        </div>
        <div className="inline-flex items-center gap-0.5 rounded-xl border border-[var(--prospeo-border)] bg-[var(--prospeo-card-soft)] p-0.5">
          {(Object.keys(PERIOD_LABELS) as RevenuePeriod[]).map((key) => (
            <button
              className={cn(
                "rounded-lg px-2.5 py-1 font-medium text-xs transition",
                period === key
                  ? "bg-[var(--prospeo-active)] text-black shadow-[0_6px_18px_-12px_var(--prospeo-active)]"
                  : "text-[var(--prospeo-muted)] hover:text-[var(--prospeo-text)]"
              )}
              key={key}
              onClick={() => onPeriodChange?.(key)}
              type="button"
            >
              {PERIOD_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 h-[330px] w-full min-w-0">
        <SafeResponsiveChart minHeight={200} minWidth={200}>
          <BarChart
            data={data}
            margin={{ top: 24, right: 12, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id="veteraRevenueActive"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="0%" stopColor="var(--prospeo-active)" />
                <stop offset="100%" stopColor="var(--prospeo-active-2)" />
              </linearGradient>
              <linearGradient
                id="veteraRevenueMuted"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--prospeo-faint)"
                  stopOpacity={0.58}
                />
                <stop
                  offset="100%"
                  stopColor="var(--prospeo-card-soft)"
                  stopOpacity={0.92}
                />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--prospeo-grid)" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="name"
              dy={10}
              tick={{ fill: "var(--prospeo-muted)", fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              tick={{ fill: "var(--prospeo-muted)", fontSize: 12 }}
              tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
              tickLine={false}
              width={42}
            />
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="prospeo-tooltip">
                    {formatDA(Number(payload[0].value))}
                  </div>
                ) : null
              }
              cursor={false}
            />
            <Bar dataKey="value" maxBarSize={52} radius={[10, 10, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  fill={
                    index === activeIndex
                      ? "url(#veteraRevenueActive)"
                      : "url(#veteraRevenueMuted)"
                  }
                  key={entry.name}
                />
              ))}
            </Bar>
          </BarChart>
        </SafeResponsiveChart>
      </div>
    </section>
  );
}

export function ProspeoPipeline({ rows }: { rows: PipelineRow[] }) {
  return (
    <section className="prospeo-card">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="prospeo-label">Pipeline clinique</p>
          <p className="mt-2 font-medium text-[30px] text-[var(--prospeo-text)] leading-none tracking-[-0.04em]">
            {rows.reduce((sum, row) => sum + row.value, 0)}{" "}
            <span className="text-[var(--prospeo-muted)] text-base">
              en suivi
            </span>
          </p>
        </div>
        <MiniGlyph>
          <HugeiconsIcon
            className="size-4"
            icon={UserGroupIcon}
            strokeWidth={2}
          />
        </MiniGlyph>
      </div>
      <div className="space-y-4">
        {rows.map((row, index) => (
          <div
            className="grid grid-cols-[1fr_44px] items-center gap-3"
            key={row.label}
          >
            <div className="relative h-8 overflow-hidden rounded-full bg-[var(--prospeo-card-soft)] ring-1 ring-[var(--prospeo-border)]">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full",
                  index === 0 && "bg-blue-500",
                  index === 1 && "bg-orange-500",
                  index === 2 && "bg-yellow-500",
                  index > 2 && "bg-cyan-500"
                )}
                style={{
                  width: `${Math.max(row.ratio * 100, row.value ? 8 : 0)}%`,
                }}
              />
              <span className="absolute inset-y-0 left-4 flex items-center font-medium text-[var(--prospeo-text)] text-sm mix-blend-difference dark:text-white/90 dark:mix-blend-normal">
                {row.label}
              </span>
            </div>
            <span className="text-right font-mono text-[var(--prospeo-text)] text-sm tabular-nums">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProspeoConsultationsTable({
  rows,
  onOpen,
  onSelect,
}: {
  rows: ConsultationRow[];
  onOpen: () => void;
  onSelect?: (row: ConsultationRow) => void;
}) {
  const isEmpty = rows.length === 0;
  const visibleRows = (
    isEmpty
      ? [
          {
            id: "empty",
            patient: "Aucune consultation aujourd'hui",
            owner: "Profitez d'une journée calme",
            type: "",
            time: "—",
            status: "scheduled",
          },
        ]
      : rows
  ).slice(0, 5);

  return (
    <section className="prospeo-card flex flex-col">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <MiniGlyph>
            <HugeiconsIcon
              className="size-4"
              icon={Calendar01Icon}
              strokeWidth={2}
            />
          </MiniGlyph>
          <div className="min-w-0">
            <h3 className="font-medium text-[var(--prospeo-text)] text-base leading-tight">
              Consultations
            </h3>
            <p className="text-[var(--prospeo-muted)] text-sm">
              {isEmpty
                ? "Rien de prévu aujourd'hui"
                : `${rows.length} RDV programmés`}
            </p>
          </div>
        </div>
        <button
          className="prospeo-select shrink-0"
          onClick={onOpen}
          type="button"
        >
          Voir tout
        </button>
      </div>
      <div className="space-y-3">
        {visibleRows.map((row) => {
          const Tag = !isEmpty && onSelect ? "button" : "div";
          return (
            <Tag
              key={row.id}
              {...(!isEmpty && onSelect
                ? {
                    type: "button" as const,
                    onClick: () => onSelect(row),
                  }
                : {})}
              className={cn(
                "block w-full rounded-2xl border border-[var(--prospeo-border)] bg-[var(--prospeo-card-soft)] px-4 py-3 text-left transition",
                !isEmpty &&
                  onSelect &&
                  "hover:border-[var(--prospeo-active)]/40 hover:bg-[var(--prospeo-card-soft)]/80 active:scale-[0.99]"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--prospeo-text)]">
                    {row.patient}
                  </p>
                  <p className="mt-1 truncate text-[var(--prospeo-muted)] text-sm">
                    {row.owner}
                  </p>
                </div>
                <span className="font-mono text-[var(--prospeo-text)] text-sm">
                  {row.time}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="truncate text-[var(--prospeo-muted)] text-xs uppercase tracking-[0.08em]">
                  {row.type || "Consultation"}
                </span>
                <span
                  className={cn(
                    "inline-flex shrink-0 rounded-lg border px-2 py-1 text-xs",
                    statusClass[row.status] ?? statusClass.scheduled
                  )}
                >
                  {statusLabel[row.status] ?? row.status}
                </span>
              </div>
            </Tag>
          );
        })}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Top procédures — barres horizontales triées par fréquence
// ─────────────────────────────────────────────────────────────────────────────
export function ProspeoTopProcedures({
  rows,
}: {
  rows: { name: string; demand: number }[];
}) {
  const total = rows.reduce((sum, row) => sum + row.demand, 0);
  const max = Math.max(...rows.map((row) => row.demand), 1);

  return (
    <section className="prospeo-card">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MiniGlyph>
            <HugeiconsIcon
              className="size-4"
              icon={StethoscopeIcon}
              strokeWidth={2}
            />
          </MiniGlyph>
          <div>
            <p className="prospeo-label">Top procédures</p>
            <p className="mt-1 font-medium text-[22px] text-[var(--prospeo-text)] tabular-nums leading-none tracking-[-0.04em]">
              {total}{" "}
              <span className="font-normal text-[var(--prospeo-muted)] text-sm">
                RDV
              </span>
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-[var(--prospeo-muted)] text-sm">
            Aucune procédure pour le moment
          </p>
        ) : (
          rows.slice(0, 5).map((row, index) => {
            const ratio = row.demand / max;
            return (
              <div
                className="grid grid-cols-[1fr_44px] items-center gap-3"
                key={`${row.name}-${index}`}
              >
                <div className="relative h-8 overflow-hidden rounded-full bg-[var(--prospeo-card-soft)] ring-1 ring-[var(--prospeo-border)]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--prospeo-active-2)] to-[var(--prospeo-active)] opacity-90"
                    style={{
                      width: `${Math.max(ratio * 100, row.demand ? 8 : 0)}%`,
                    }}
                  />
                  <span className="absolute inset-y-0 left-4 flex items-center truncate font-medium text-[var(--prospeo-text)] text-sm mix-blend-difference dark:text-white/90 dark:mix-blend-normal">
                    {row.name}
                  </span>
                </div>
                <span className="text-right font-mono text-[var(--prospeo-text)] text-sm tabular-nums">
                  {row.demand}
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Heatmap d'activité clinique — style GitHub, 53 semaines
// ─────────────────────────────────────────────────────────────────────────────
const MONTHS_FR = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Jun",
  "Jui",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];
const WEEKDAYS_FR = ["L", "M", "M", "J", "V", "S", "D"];

function intensityStyle(level: 0 | 1 | 2 | 3 | 4): React.CSSProperties {
  switch (level) {
    case 0:
      return {
        background: "var(--prospeo-card-soft)",
        boxShadow: "inset 0 0 0 1px var(--prospeo-border)",
      };
    case 1:
      return {
        background:
          "color-mix(in oklch, var(--prospeo-active) 22%, transparent)",
        boxShadow:
          "inset 0 0 0 1px color-mix(in oklch, var(--prospeo-active) 18%, transparent)",
      };
    case 2:
      return {
        background:
          "color-mix(in oklch, var(--prospeo-active) 45%, transparent)",
        boxShadow:
          "inset 0 0 0 1px color-mix(in oklch, var(--prospeo-active) 35%, transparent)",
      };
    case 3:
      return {
        background:
          "color-mix(in oklch, var(--prospeo-active) 72%, transparent)",
        boxShadow:
          "inset 0 0 0 1px color-mix(in oklch, var(--prospeo-active) 55%, transparent)",
      };
    case 4:
      return {
        background: "var(--prospeo-active)",
        boxShadow:
          "inset 0 0 0 1px color-mix(in oklch, var(--prospeo-active) 80%, transparent)",
      };
  }
}

export function ProspeoActivityHeatmap({
  days,
  onSelectDay,
}: {
  days: { date: Date; value: number }[];
  onSelectDay?: (date: Date) => void;
}) {
  const [hovered, setHovered] = useState<{ date: Date; value: number } | null>(
    null
  );

  const {
    weeks,
    monthLabels,
    total,
    max,
    activeDays,
    longestStreak,
    busiestDay,
    averagePerActiveDay,
    weekdayDistribution,
    last30Total,
    last30Previous,
  } = useMemo(() => {
    const empty = {
      weeks: [] as ({ date: Date; value: number } | null)[][],
      monthLabels: [] as { weekIndex: number; label: string }[],
      total: 0,
      max: 0,
      activeDays: 0,
      longestStreak: 0,
      busiestDay: null as { date: Date; value: number } | null,
      averagePerActiveDay: 0,
      weekdayDistribution: Array(7).fill(0) as number[],
      last30Total: 0,
      last30Previous: 0,
    };
    if (!days.length) {
      return empty;
    }

    // Pad start so the first column begins on Monday (0=Mon)
    const first = days[0].date;
    const firstDow = (first.getDay() + 6) % 7;
    const padded: ({ date: Date; value: number } | null)[] =
      Array(firstDow).fill(null);
    days.forEach((d) => padded.push(d));
    while (padded.length % 7 !== 0) {
      padded.push(null);
    }

    const weekColumns: ({ date: Date; value: number } | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      weekColumns.push(padded.slice(i, i + 7));
    }

    const labels: { weekIndex: number; label: string }[] = [];
    let lastMonth = -1;
    weekColumns.forEach((week, wi) => {
      const firstReal = week.find((cell) => cell !== null);
      if (!firstReal) {
        return;
      }
      const m = firstReal.date.getMonth();
      if (m !== lastMonth) {
        labels.push({ weekIndex: wi, label: MONTHS_FR[m] });
        lastMonth = m;
      }
    });

    const totalSum = days.reduce((sum, d) => sum + d.value, 0);
    const maxValue = Math.max(...days.map((d) => d.value), 0);
    const activeList = days.filter((d) => d.value > 0);
    const busiest = activeList.reduce<{ date: Date; value: number } | null>(
      (best, d) => (!best || d.value > best.value ? d : best),
      null
    );

    let streak = 0;
    let bestStreak = 0;
    days.forEach((d) => {
      if (d.value > 0) {
        streak += 1;
        bestStreak = Math.max(bestStreak, streak);
      } else {
        streak = 0;
      }
    });

    const distribution = Array(7).fill(0) as number[];
    days.forEach((d) => {
      const dow = (d.date.getDay() + 6) % 7;
      distribution[dow] += d.value;
    });

    const last30 = days.slice(-30).reduce((sum, d) => sum + d.value, 0);
    const previous30 = days
      .slice(-60, -30)
      .reduce((sum, d) => sum + d.value, 0);

    return {
      weeks: weekColumns,
      monthLabels: labels,
      total: totalSum,
      max: maxValue,
      activeDays: activeList.length,
      longestStreak: bestStreak,
      busiestDay: busiest,
      averagePerActiveDay: activeList.length ? totalSum / activeList.length : 0,
      weekdayDistribution: distribution,
      last30Total: last30,
      last30Previous: previous30,
    };
  }, [days]);

  const getLevel = (value: number): 0 | 1 | 2 | 3 | 4 => {
    if (value === 0 || max === 0) {
      return 0;
    }
    const pct = value / max;
    if (pct < 0.25) {
      return 1;
    }
    if (pct < 0.5) {
      return 2;
    }
    if (pct < 0.75) {
      return 3;
    }
    return 4;
  };

  const trendDelta =
    last30Previous === 0
      ? last30Total > 0
        ? 100
        : 0
      : ((last30Total - last30Previous) / last30Previous) * 100;
  const trendPositive = trendDelta >= 0;
  const maxWeekday = Math.max(...weekdayDistribution, 1);

  return (
    <section
      className="relative w-full rounded-[20px] border border-[var(--prospeo-border)] bg-[var(--prospeo-card)] p-5"
      style={{ boxShadow: "var(--prospeo-shadow)", overflow: "visible" }}
    >
      {/* Header line */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="prospeo-glyph">
            <HugeiconsIcon
              className="size-4"
              icon={Activity03Icon}
              strokeWidth={2}
            />
          </span>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-[var(--prospeo-text)] text-base">
                Activité clinique · 365 jours
              </h3>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium text-[11px]",
                  trendPositive
                    ? "text-emerald-500 dark:text-emerald-300"
                    : "text-rose-500 dark:text-rose-300"
                )}
              >
                <HugeiconsIcon
                  className="size-3"
                  icon={trendPositive ? ArrowUp01Icon : ArrowDown01Icon}
                  strokeWidth={2}
                />
                {Math.abs(trendDelta).toFixed(0)}%
              </span>
            </div>
            <p className="mt-0.5 text-[var(--prospeo-muted)] text-xs">
              {total.toLocaleString("fr-FR")} consultations · {activeDays} jours
              actifs · série max {longestStreak} j · pic{" "}
              {busiestDay
                ? `${busiestDay.value} le ${busiestDay.date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`
                : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--prospeo-faint)] uppercase tracking-[0.08em]">
          <span>Moins</span>
          {([0, 1, 2, 3, 4] as const).map((lvl) => (
            <span
              className="inline-block size-[11px] rounded-[3px]"
              key={lvl}
              style={intensityStyle(lvl)}
            />
          ))}
          <span>Plus</span>
        </div>
      </div>

      {/* Heatmap grid + weekday distribution side-by-side */}
      <div className="mt-5 flex flex-wrap items-start gap-6">
        <div className="min-w-0 flex-1 overflow-x-auto pb-1">
          <div className="inline-flex flex-col gap-1.5">
            {/* Month labels */}
            <div className="flex pl-7">
              {weeks.map((_, wi) => {
                const label = monthLabels.find((m) => m.weekIndex === wi);
                return (
                  <div
                    className="w-[15px] shrink-0 font-medium text-[10px] text-[var(--prospeo-faint)] uppercase tracking-[0.05em]"
                    key={`m-${wi}`}
                  >
                    {label ? label.label : ""}
                  </div>
                );
              })}
            </div>
            {/* Grid */}
            <div className="flex gap-1.5">
              <div className="flex w-5 shrink-0 flex-col gap-[3px]">
                {WEEKDAYS_FR.map((d, i) => (
                  <span
                    className="flex h-[12px] items-center text-[10px] text-[var(--prospeo-faint)] leading-none"
                    key={`d-${i}`}
                  >
                    {i % 2 === 1 ? d : ""}
                  </span>
                ))}
              </div>
              <div className="flex gap-[3px]">
                {weeks.map((week, wi) => (
                  <div className="flex flex-col gap-[3px]" key={`w-${wi}`}>
                    {week.map((cell, di) => (
                      <button
                        aria-label={
                          cell
                            ? `${cell.date.toLocaleDateString("fr-FR")} : ${cell.value} RDV`
                            : undefined
                        }
                        className={cn(
                          "size-[12px] rounded-[3px] transition-transform duration-150",
                          cell && "cursor-pointer hover:scale-[1.5]"
                        )}
                        disabled={!cell}
                        key={`c-${wi}-${di}`}
                        onClick={() => cell && onSelectDay?.(cell.date)}
                        onMouseEnter={() => cell && setHovered(cell)}
                        onMouseLeave={() => setHovered(null)}
                        style={
                          cell
                            ? intensityStyle(getLevel(cell.value))
                            : { background: "transparent" }
                        }
                        type="button"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Weekday distribution mini-chart */}
        <div className="shrink-0">
          <p className="mb-2 font-medium text-[10px] text-[var(--prospeo-faint)] uppercase tracking-[0.08em]">
            Par jour
          </p>
          <div className="flex items-end gap-1.5">
            {WEEKDAYS_FR.map((d, i) => {
              const value = weekdayDistribution[i];
              const ratio = value / maxWeekday;
              return (
                <div
                  className="flex flex-col items-center gap-1"
                  key={`wd-${i}`}
                >
                  <div
                    className="w-[18px] rounded-sm bg-gradient-to-t from-[var(--prospeo-active-2)] to-[var(--prospeo-active)]"
                    style={{
                      height: `${Math.max(ratio * 44, 4)}px`,
                      opacity: value === 0 ? 0.18 : 0.92,
                    }}
                    title={`${d}: ${value} RDV`}
                  />
                  <span className="font-medium text-[9px] text-[var(--prospeo-faint)] uppercase">
                    {d}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hover footer */}
      <div className="mt-4 flex min-h-[28px] items-center">
        {hovered ? (
          <div className="flex items-center gap-3 rounded-lg border border-[var(--prospeo-active)]/30 bg-[var(--prospeo-card-soft)] px-3 py-1.5 text-xs">
            <span
              className="inline-block size-2.5 rounded-sm"
              style={intensityStyle(getLevel(hovered.value))}
            />
            <span className="font-mono text-[var(--prospeo-muted)]">
              {hovered.date.toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span className="font-medium text-[var(--prospeo-text)]">
              {hovered.value === 0
                ? "Aucune consultation"
                : `${hovered.value} ${hovered.value <= 1 ? "consultation" : "consultations"}`}
            </span>
          </div>
        ) : (
          <p className="text-[var(--prospeo-faint)] text-xs">
            Survolez un jour pour voir le détail · Moyenne{" "}
            {averagePerActiveDay.toFixed(1)} RDV par jour actif · {last30Total}{" "}
            les 30 derniers jours
          </p>
        )}
      </div>
    </section>
  );
}

export function ProspeoSparkCard({
  title,
  value,
  data,
  tone = "orange",
}: {
  title: string;
  value: string;
  data: SeriesPoint[];
  tone?: "orange" | "blue";
}) {
  const stroke =
    tone === "orange" ? "var(--prospeo-active)" : "oklch(0.68 0.14 220)";

  return (
    <section className="prospeo-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="prospeo-label">{title}</p>
          <p className="mt-2 font-medium text-[30px] text-[var(--prospeo-text)] leading-none tracking-[-0.04em]">
            {value}
          </p>
        </div>
        <MiniGlyph>
          <HugeiconsIcon
            className="size-4"
            icon={tone === "orange" ? ChartUpIcon : Task01Icon}
            strokeWidth={2}
          />
        </MiniGlyph>
      </div>
      <div className="h-[180px] w-full min-w-0">
        <SafeResponsiveChart minHeight={120} minWidth={120}>
          <AreaChart
            data={data}
            margin={{ top: 8, right: 6, left: 6, bottom: 0 }}
          >
            <defs>
              <linearGradient id={`spark-${tone}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.34} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="prospeo-tooltip">
                    {Number(payload[0].value).toLocaleString("fr-FR")}
                  </div>
                ) : null
              }
              cursor={false}
            />
            <Area
              dataKey="value"
              dot={false}
              fill={`url(#spark-${tone})`}
              stroke={stroke}
              strokeWidth={2.4}
              type="monotone"
            />
          </AreaChart>
        </SafeResponsiveChart>
      </div>
    </section>
  );
}

export const ProspeoIcons = {
  revenue: (
    <HugeiconsIcon className="size-5" icon={MoneyBag02Icon} strokeWidth={2} />
  ),
  appointment: (
    <HugeiconsIcon className="size-5" icon={Calendar01Icon} strokeWidth={2} />
  ),
  patient: (
    <HugeiconsIcon className="size-5" icon={UserGroupIcon} strokeWidth={2} />
  ),
  task: <HugeiconsIcon className="size-5" icon={Task01Icon} strokeWidth={2} />,
};

// ─────────────────────────────────────────────────────────────────────────────
// Card Header partagé (titre + delta + bouton View Details)
// ─────────────────────────────────────────────────────────────────────────────
function ReportCardHeader({
  title,
  bigValue,
  delta,
  onDetails,
}: {
  title: string;
  bigValue: string;
  delta: number;
  onDetails?: () => void;
}) {
  const positive = delta >= 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-[var(--prospeo-text)] text-base">
          {title}
        </h3>
        {onDetails && (
          <button
            className="rounded-lg border border-[var(--prospeo-border)] bg-[var(--prospeo-card-soft)] px-2.5 py-1 font-medium text-[var(--prospeo-muted)] text-xs transition hover:text-[var(--prospeo-text)]"
            onClick={onDetails}
            type="button"
          >
            Détails
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-baseline gap-3">
        <p className="font-semibold text-[34px] text-[var(--prospeo-text)] tabular-nums leading-none tracking-[-0.045em]">
          {bigValue}
        </p>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold text-[11px]",
            positive
              ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300"
              : "bg-rose-500/12 text-rose-600 dark:text-rose-300"
          )}
        >
          <HugeiconsIcon
            className="size-3"
            icon={positive ? ArrowUp01Icon : ArrowDown01Icon}
            strokeWidth={2}
          />
          {Math.abs(delta).toFixed(0).padStart(2, "0")}%
        </span>
        <span className="text-[var(--prospeo-muted)] text-xs">
          vs période précédente
        </span>
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: number;
}) {
  const positive = delta >= 0;
  return (
    <div className="flex items-center justify-between border-[var(--prospeo-border)] border-b py-2.5 last:border-b-0">
      <span className="text-[var(--prospeo-text)] text-sm">{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[var(--prospeo-text)] text-sm tabular-nums">
          {value}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 font-medium text-xs",
            positive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          )}
        >
          <HugeiconsIcon
            className="size-3"
            icon={positive ? ArrowUp01Icon : ArrowDown01Icon}
            strokeWidth={2}
          />
          {Math.abs(delta).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rapport revenus par catégorie — style Sales Report
// ─────────────────────────────────────────────────────────────────────────────
export type RevenueReportRow = { label: string; amount: number; delta: number };

export function ProspeoRevenueReport({
  total,
  delta,
  rows,
  monthlyData,
  onDetails,
}: {
  total: number;
  delta: number;
  rows: RevenueReportRow[];
  monthlyData: { month: string; value: number; isCurrent?: boolean }[];
  onDetails?: () => void;
}) {
  const activeIndex = monthlyData.findIndex((m) => m.isCurrent);
  const activeMonth = activeIndex >= 0 ? monthlyData[activeIndex] : null;

  return (
    <section className="prospeo-card flex flex-col gap-5">
      <ReportCardHeader
        bigValue={`${formatDA(total)}`}
        delta={delta}
        onDetails={onDetails}
        title="Rapport revenus"
      />
      <div className="flex flex-col">
        {rows.length === 0 ? (
          <p className="py-3 text-[var(--prospeo-muted)] text-sm">
            Aucune catégorie
          </p>
        ) : (
          rows
            .slice(0, 3)
            .map((row) => (
              <BreakdownRow
                delta={row.delta}
                key={row.label}
                label={row.label}
                value={formatDA(row.amount)}
              />
            ))
        )}
      </div>
      <div className="mt-1 h-[150px] w-full min-w-0">
        <SafeResponsiveChart minHeight={100} minWidth={100}>
          <BarChart
            data={monthlyData}
            margin={{ top: 24, right: 4, left: -28, bottom: 0 }}
          >
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="prospeo-tooltip">
                    {formatDA(Number(payload[0].value))}
                  </div>
                ) : null
              }
              cursor={false}
            />
            <XAxis
              axisLine={false}
              dataKey="month"
              interval={0}
              tick={{ fill: "var(--prospeo-muted)", fontSize: 10 }}
              tickLine={false}
            />
            <YAxis hide />
            <Bar dataKey="value" maxBarSize={36} radius={[8, 8, 0, 0]}>
              {monthlyData.map((entry, idx) => (
                <Cell
                  fill={
                    idx === activeIndex
                      ? "var(--prospeo-active)"
                      : "var(--prospeo-card-soft)"
                  }
                  key={entry.month}
                />
              ))}
            </Bar>
          </BarChart>
        </SafeResponsiveChart>
        {activeMonth && (
          <p className="mt-1 text-center text-[10px] text-[var(--prospeo-muted)]">
            Mois en cours :{" "}
            <span className="font-semibold text-[var(--prospeo-text)]">
              {formatDA(activeMonth.value)}
            </span>{" "}
            · {activeMonth.month}
          </p>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Taux de fidélisation patients — style Repeat Customer Rate
// ─────────────────────────────────────────────────────────────────────────────
export type RetentionTrendPoint = {
  name: string;
  nouveaux: number;
  retour: number;
};

export function ProspeoRetentionReport({
  rate,
  delta,
  rows,
  trend,
  onDetails,
}: {
  rate: number;
  delta: number;
  rows: RevenueReportRow[];
  trend: RetentionTrendPoint[];
  onDetails?: () => void;
}) {
  return (
    <section className="prospeo-card flex flex-col gap-5">
      <ReportCardHeader
        bigValue={`${rate.toFixed(2)}%`}
        delta={delta}
        onDetails={onDetails}
        title="Fidélisation patients"
      />
      <div className="flex flex-col">
        {rows.length === 0 ? (
          <p className="py-3 text-[var(--prospeo-muted)] text-sm">
            Aucune espèce enregistrée
          </p>
        ) : (
          rows
            .slice(0, 3)
            .map((row) => (
              <BreakdownRow
                delta={row.delta}
                key={row.label}
                label={row.label}
                value={`${Math.round(row.amount)}`}
              />
            ))
        )}
      </div>
      <div className="mt-1">
        <div className="mb-2 flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5 text-[var(--prospeo-muted)]">
            <span className="inline-block size-2 rounded-full bg-[oklch(0.65_0.18_240)]" />
            Nouveaux
          </span>
          <span className="inline-flex items-center gap-1.5 text-[var(--prospeo-muted)]">
            <span className="inline-block size-2 rounded-full bg-[var(--prospeo-faint)]" />
            Retour
          </span>
        </div>
        <div className="h-[140px] w-full min-w-0">
          <SafeResponsiveChart minHeight={100} minWidth={100}>
            <LineChart
              data={trend}
              margin={{ top: 6, right: 6, left: -28, bottom: 0 }}
            >
              <CartesianGrid
                stroke="var(--prospeo-border)"
                strokeDasharray="2 4"
                vertical={false}
              />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="prospeo-tooltip space-y-1 text-xs">
                      <p className="font-mono text-[var(--prospeo-muted)]">
                        {label}
                      </p>
                      {payload.map((entry, idx) => (
                        <p
                          className="flex items-center gap-1.5"
                          key={`${String(entry.dataKey)}-${idx}`}
                        >
                          <span
                            className="inline-block size-2 rounded-full"
                            style={{ background: String(entry.color) }}
                          />
                          <span className="text-[var(--prospeo-muted)] capitalize">
                            {String(entry.dataKey)}
                          </span>
                          <span className="font-medium text-[var(--prospeo-text)]">
                            {entry.value}
                          </span>
                        </p>
                      ))}
                    </div>
                  ) : null
                }
                cursor={{
                  stroke: "var(--prospeo-border-strong)",
                  strokeWidth: 1,
                }}
              />
              <XAxis
                axisLine={false}
                dataKey="name"
                tick={{ fill: "var(--prospeo-muted)", fontSize: 10 }}
                tickLine={false}
              />
              <YAxis hide />
              <Line
                activeDot={{ r: 5 }}
                dataKey="nouveaux"
                dot={{ r: 3, fill: "oklch(0.65 0.18 240)" }}
                stroke="oklch(0.65 0.18 240)"
                strokeWidth={2.4}
                type="monotone"
              />
              <Line
                activeDot={{ r: 5 }}
                dataKey="retour"
                dot={{ r: 3, fill: "var(--prospeo-faint)" }}
                stroke="var(--prospeo-faint)"
                strokeWidth={2.4}
                type="monotone"
              />
            </LineChart>
          </SafeResponsiveChart>
        </div>
      </div>
    </section>
  );
}
