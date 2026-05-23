"use client";

import {
  Activity03Icon,
  AlertCircleIcon,
  AlertIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Calendar01Icon,
  ChartUpIcon,
  Clock01Icon,
  DangerIcon,
  Hospital01Icon,
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
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartConfig } from "@/components/evilcharts/ui/chart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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

function formatDA(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(value))} DA`;
}

function MiniGlyph({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-foreground">
      {children}
    </span>
  );
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

const SPARKLINE_COLORS: Record<MetricTone, string> = {
  orange: "#fb923c",
  blue: "#60a5fa",
  green: "#34d399",
  red: "#f43f5e",
};

export function ProspeoMetricCard({
  title,
  value,
  delta,
  caption,
  tone,
  icon,
  compact = false,
  sparklineData,
}: {
  title: string;
  value: string;
  delta: number;
  caption: string;
  tone: MetricTone;
  icon: ReactNode;
  compact?: boolean;
  sparklineData?: { value: number }[];
}) {
  const positive = delta >= 0;
  const toneColor = SPARKLINE_COLORS[tone];

  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        compact ? "min-h-[132px]" : "min-h-[156px]"
      )}
      size={compact ? "sm" : "default"}
    >
      <div className={cn("flex flex-col gap-4", compact ? "px-4" : "px-5")}>
        <div className="flex items-start justify-between gap-4 pt-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-muted-foreground text-xs uppercase tracking-[0.08em]">
              {title}
            </p>
            <p
              className={cn(
                "mt-3 whitespace-nowrap font-medium text-foreground tabular-nums leading-none tracking-[-0.05em]",
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
        <div className="flex items-center gap-2 text-sm">
          <Badge
            className={cn(
              "gap-1 rounded-md border px-2 py-0.5 font-medium text-xs",
              positive
                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                : "border-rose-400/20 bg-rose-500/10 text-rose-600 dark:text-rose-300"
            )}
            variant="outline"
          >
            <HugeiconsIcon
              className="size-3"
              icon={positive ? ArrowUp01Icon : ArrowDown01Icon}
              strokeWidth={2}
            />
            {positive ? "+" : ""}
            {delta.toFixed(1)}%
          </Badge>
          <span className="text-muted-foreground">{caption}</span>
        </div>
      </div>
      {sparklineData && sparklineData.length > 1 && (
        <div className="mt-1 h-[44px] w-full px-1">
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart
              data={sparklineData}
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient
                  id={`sparkline-${tone}`}
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={toneColor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={toneColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                dataKey="value"
                dot={false}
                fill={`url(#sparkline-${tone})`}
                isAnimationActive={false}
                stroke={toneColor}
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export type RevenuePeriod = "7d" | "30d" | "90d";

const PERIOD_LABELS: Record<RevenuePeriod, string> = {
  "7d": "7j",
  "30d": "30j",
  "90d": "90j",
};

const revenueChartConfig = {
  value: {
    label: "Revenu",
    colors: { light: ["#f97316"], dark: ["#fb923c"] },
  },
} satisfies ChartConfig;

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
  return (
    <Card className="min-h-[478px] lg:col-span-2">
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div>
          <p className="font-mono text-muted-foreground text-xs uppercase tracking-[0.08em]">
            Revenue
          </p>
          <p className="mt-2 font-medium text-[34px] text-foreground tabular-nums leading-none tracking-[-0.045em]">
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
            <span className="ml-1 text-muted-foreground">
              vs période précédente
            </span>
          </p>
        </div>
        <div className="inline-flex items-center gap-0.5 rounded-xl border border-border bg-muted p-0.5">
          {(Object.keys(PERIOD_LABELS) as RevenuePeriod[]).map((key) => (
            <Button
              className="rounded-lg px-2.5 font-medium text-xs"
              key={key}
              onClick={() => onPeriodChange?.(key)}
              size="sm"
              variant={period === key ? "secondary" : "ghost"}
            >
              {PERIOD_LABELS[key]}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-5 h-[330px] w-full min-w-0 px-5 pb-5">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            data={data}
            margin={{ top: 12, right: 8, left: 0, bottom: 8 }}
          >
            <defs>
              <linearGradient id="revenueBarFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#fb923c" stopOpacity={1} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0.85} />
              </linearGradient>
            </defs>
            <CartesianGrid
              horizontal
              stroke="var(--border)"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
              vertical={false}
            />
            <XAxis
              axisLine={{ stroke: "var(--border)", strokeOpacity: 0.8 }}
              dataKey="name"
              interval={
                period === "7d"
                  ? 0
                  : period === "30d"
                    ? Math.max(1, Math.floor(data.length / 8))
                    : Math.max(0, Math.floor(data.length / 7))
              }
              minTickGap={4}
              tick={{
                fill: "var(--muted-foreground)",
                fontSize: 11,
                fontWeight: 500,
              }}
              tickLine={{ stroke: "var(--border)", strokeOpacity: 0.6 }}
              tickMargin={8}
            />
            <YAxis
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={(value: number) =>
                value >= 1000
                  ? `${Math.round(value / 1000)}k`
                  : String(Math.round(value))
              }
              tickLine={false}
              width={48}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!(active && payload && payload.length)) {
                  return null;
                }
                const value = Number(payload[0]?.value ?? 0);
                return (
                  <div className="rounded-xl border border-border bg-card/95 px-3 py-2 shadow-md backdrop-blur-sm">
                    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                      {label}
                    </p>
                    <p className="mt-0.5 font-semibold text-foreground text-sm tabular-nums">
                      {formatDA(value)}
                    </p>
                  </div>
                );
              }}
              cursor={{ fill: "var(--muted)", opacity: 0.35 }}
            />
            <Bar
              dataKey="value"
              fill="url(#revenueBarFill)"
              maxBarSize={36}
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

const PIPELINE_COLORS = [
  "bg-gradient-to-r from-blue-500 to-blue-400",
  "bg-gradient-to-r from-orange-500 to-orange-400",
  "bg-gradient-to-r from-amber-500 to-amber-400",
  "bg-gradient-to-r from-cyan-500 to-cyan-400",
  "bg-gradient-to-r from-violet-500 to-violet-400",
];

export function ProspeoPipeline({ rows }: { rows: PipelineRow[] }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-muted-foreground text-xs uppercase tracking-[0.08em]">
            Pipeline clinique
          </p>
          <p className="mt-2 font-medium text-[30px] text-foreground leading-none tracking-[-0.04em]">
            {rows.reduce((sum, row) => sum + row.value, 0)}{" "}
            <span className="text-base text-muted-foreground">en suivi</span>
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
      <div className="space-y-3 px-5 pb-5">
        {rows.map((row, index) => (
          <div className="flex items-center gap-3" key={row.label}>
            <div className="flex-1">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-medium text-foreground text-sm">
                  {row.label}
                </span>
                <span className="font-mono text-muted-foreground text-xs tabular-nums">
                  {row.value}
                </span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                    PIPELINE_COLORS[index % PIPELINE_COLORS.length]
                  )}
                  style={{
                    width: `${Math.max(row.ratio * 100, row.value ? 2 : 0)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
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
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-start gap-3">
          <MiniGlyph>
            <HugeiconsIcon
              className="size-4"
              icon={Calendar01Icon}
              strokeWidth={2}
            />
          </MiniGlyph>
          <div className="min-w-0">
            <h3 className="font-medium text-base text-foreground leading-tight">
              Consultations
            </h3>
            <p className="text-muted-foreground text-sm">
              {isEmpty
                ? "Rien de prévu aujourd'hui"
                : `${rows.length} RDV programmés`}
            </p>
          </div>
        </div>
        <Button onClick={onOpen} size="sm" variant="outline">
          Voir tout
        </Button>
      </div>
      <div className="flex flex-col px-5 pb-5">
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
                "group flex items-center gap-4 border-border border-b px-0 py-3.5 text-left transition last:border-b-0",
                !isEmpty &&
                  onSelect &&
                  "-mx-1.5 rounded-lg border-b-transparent px-1.5 hover:border-border hover:bg-muted/50 active:scale-[0.99]"
              )}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 font-semibold text-white text-xs">
                {row.patient
                  .split(" ")
                  .map((w: string) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium text-foreground text-sm">
                    {row.patient}
                  </p>
                  <span className="shrink-0 font-mono text-muted-foreground text-xs tabular-nums">
                    {row.time}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="truncate text-muted-foreground text-xs">
                    {row.owner}
                  </span>
                  <span className="hidden text-muted-foreground/40 sm:inline">
                    ·
                  </span>
                  <span className="hidden truncate text-muted-foreground/60 text-xs sm:inline">
                    {row.type || "Consultation"}
                  </span>
                </div>
              </div>
              <Badge
                className={cn(
                  "shrink-0 rounded-md px-2 py-0.5 text-[11px]",
                  statusClass[row.status] ?? statusClass.scheduled
                )}
                variant="outline"
              >
                {statusLabel[row.status] ?? row.status}
              </Badge>
            </Tag>
          );
        })}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Top procédures — barres horizontales triées par fréquence
// ─────────────────────────────────────────────────────────────────────────────
const PROCEDURE_COLORS = [
  "from-orange-500 to-orange-400",
  "from-blue-500 to-blue-400",
  "from-emerald-500 to-emerald-400",
  "from-violet-500 to-violet-400",
  "from-rose-500 to-rose-400",
];

export function ProspeoTopProcedures({
  rows,
}: {
  rows: { name: string; demand: number }[];
}) {
  const total = rows.reduce((sum, row) => sum + row.demand, 0);
  const max = Math.max(...rows.map((row) => row.demand), 1);

  return (
    <Card>
      <div className="flex items-center gap-3 px-5 pt-5">
        <MiniGlyph>
          <HugeiconsIcon
            className="size-4"
            icon={StethoscopeIcon}
            strokeWidth={2}
          />
        </MiniGlyph>
        <div>
          <p className="font-mono text-muted-foreground text-xs uppercase tracking-[0.08em]">
            Top procédures
          </p>
          <p className="mt-1 font-medium text-[22px] text-foreground tabular-nums leading-none tracking-[-0.04em]">
            {total}{" "}
            <span className="font-normal text-muted-foreground text-sm">
              RDV
            </span>
          </p>
        </div>
      </div>
      <div className="space-y-2 px-5 pb-5">
        {rows.length === 0 ? (
          <p className="py-3 text-muted-foreground text-sm">
            Aucune procédure pour le moment
          </p>
        ) : (
          rows.slice(0, 5).map((row, index) => {
            const ratio = row.demand / max;
            return (
              <div
                className="flex items-center gap-3"
                key={`${row.name}-${index}`}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-[11px] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="truncate font-medium text-foreground text-sm">
                      {row.name}
                    </span>
                    <span className="font-mono text-muted-foreground text-xs tabular-nums">
                      {row.demand}
                    </span>
                  </div>
                  <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r opacity-80 transition-all duration-500",
                        PROCEDURE_COLORS[index % PROCEDURE_COLORS.length]
                      )}
                      style={{
                        width: `${Math.max(ratio * 100, row.demand ? 2 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
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

const HEATMAP_ORANGE = "#fb923c";

function intensityStyle(level: 0 | 1 | 2 | 3 | 4): React.CSSProperties {
  switch (level) {
    case 0:
      return {
        background: "var(--muted)",
        boxShadow: "inset 0 0 0 1px var(--border)",
      };
    case 1:
      return {
        background: `color-mix(in oklch, ${HEATMAP_ORANGE} 22%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${HEATMAP_ORANGE} 18%, transparent)`,
      };
    case 2:
      return {
        background: `color-mix(in oklch, ${HEATMAP_ORANGE} 45%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${HEATMAP_ORANGE} 35%, transparent)`,
      };
    case 3:
      return {
        background: `color-mix(in oklch, ${HEATMAP_ORANGE} 72%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${HEATMAP_ORANGE} 55%, transparent)`,
      };
    case 4:
      return {
        background: HEATMAP_ORANGE,
        boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${HEATMAP_ORANGE} 80%, transparent)`,
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
      className="relative w-full rounded-[20px] border border-border bg-card p-5"
      style={{
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.035)",
        overflow: "visible",
      }}
    >
      {/* Header line */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MiniGlyph>
            <HugeiconsIcon
              className="size-4"
              icon={Activity03Icon}
              strokeWidth={2}
            />
          </MiniGlyph>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-base text-foreground">
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
            <p className="mt-0.5 text-muted-foreground text-xs">
              {total.toLocaleString("fr-FR")} consultations · {activeDays} jours
              actifs · série max {longestStreak} j · pic{" "}
              {busiestDay
                ? `${busiestDay.value} le ${busiestDay.date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`
                : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 uppercase tracking-[0.08em]">
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
                    className="w-[15px] shrink-0 font-medium text-[10px] text-muted-foreground/60 uppercase tracking-[0.05em]"
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
                    className="flex h-[12px] items-center text-[10px] text-muted-foreground/60 leading-none"
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
          <p className="mb-2 font-medium text-[10px] text-muted-foreground/60 uppercase tracking-[0.08em]">
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
                    className="w-[18px] rounded-sm bg-gradient-to-t from-orange-500 to-orange-400"
                    style={{
                      height: `${Math.max(ratio * 44, 4)}px`,
                      opacity: value === 0 ? 0.18 : 0.92,
                    }}
                    title={`${d}: ${value} RDV`}
                  />
                  <span className="font-medium text-[9px] text-muted-foreground/60 uppercase">
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
          <div className="flex items-center gap-3 rounded-lg border border-orange-400/30 bg-muted px-3 py-1.5 text-xs">
            <span
              className="inline-block size-2.5 rounded-sm"
              style={intensityStyle(getLevel(hovered.value))}
            />
            <span className="font-mono text-muted-foreground">
              {hovered.date.toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span className="font-medium text-foreground">
              {hovered.value === 0
                ? "Aucune consultation"
                : `${hovered.value} ${hovered.value <= 1 ? "consultation" : "consultations"}`}
            </span>
          </div>
        ) : (
          <p className="text-muted-foreground/60 text-xs">
            Survolez un jour pour voir le détail · Moyenne{" "}
            {averagePerActiveDay.toFixed(1)} RDV par jour actif · {last30Total}{" "}
            les 30 derniers jours
          </p>
        )}
      </div>
    </section>
  );
}

const SPARK_ORANGE = "#fb923c";

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
  const stroke = tone === "orange" ? SPARK_ORANGE : "oklch(0.68 0.14 220)";

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-muted-foreground text-xs uppercase tracking-[0.08em]">
            {title}
          </p>
          <p className="mt-2 font-medium text-[30px] text-foreground leading-none tracking-[-0.04em]">
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
      <div className="h-[180px] w-full min-w-0 px-5 pb-5">
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
                  <div className="rounded-xl border border-border bg-card px-2.5 py-2 text-foreground text-xs shadow-soft">
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
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Patient Queue Panel — file d'attente avec priorité, temps d'attente, avatar
// ─────────────────────────────────────────────────────────────────────────────
type QueuePatient = {
  id: string;
  name: string;
  species: string;
  ownerName: string;
  type: string;
  priority: "urgent" | "normal" | "followup";
  waitMinutes: number;
  avatarInitials: string;
};

const PRIORITY_CONFIG = {
  urgent: {
    label: "Urgent",
    badgeClass: "bg-rose-500/12 text-rose-400 border-rose-400/20",
    dotClass: "bg-rose-500",
    borderClass: "border-l-rose-500",
  },
  normal: {
    label: "Normal",
    badgeClass: "bg-blue-500/12 text-blue-400 border-blue-400/20",
    dotClass: "bg-blue-500",
    borderClass: "border-l-blue-500",
  },
  followup: {
    label: "Suivi",
    badgeClass: "bg-emerald-500/12 text-emerald-400 border-emerald-400/20",
    dotClass: "bg-emerald-500",
    borderClass: "border-l-emerald-500",
  },
};

const AVATAR_GRADIENTS = [
  "from-orange-400 to-orange-600",
  "from-blue-400 to-blue-600",
  "from-emerald-400 to-emerald-600",
  "from-violet-400 to-violet-600",
  "from-rose-400 to-rose-600",
  "from-cyan-400 to-cyan-600",
];

export function ProspeoPatientQueue({
  rows,
  onOpen,
}: {
  rows: QueuePatient[];
  onOpen?: () => void;
}) {
  const totalInQueue = rows.length;
  const urgentCount = rows.filter((r) => r.priority === "urgent").length;
  const avgWait = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.waitMinutes, 0) / rows.length)
    : 0;

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-start gap-3">
          <MiniGlyph>
            <HugeiconsIcon
              className="size-4"
              icon={Hospital01Icon}
              strokeWidth={2}
            />
          </MiniGlyph>
          <div className="min-w-0">
            <h3 className="font-medium text-base text-foreground leading-tight">
              File d'attente
            </h3>
            <p className="text-muted-foreground text-sm">
              {totalInQueue === 0
                ? "Aucun patient en attente"
                : `${totalInQueue} patient${totalInQueue > 1 ? "s" : ""} · ${urgentCount} urgent${urgentCount === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        {onOpen && (
          <Button onClick={onOpen} size="sm" variant="outline">
            Ouvrir
          </Button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-4 px-5">
        <div className="flex flex-1 items-center gap-2">
          <span className="font-mono text-muted-foreground text-xs">
            Attente moy.
          </span>
          <span className="font-medium font-mono text-foreground text-sm tabular-nums">
            {avgWait} min
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-rose-500" />
          <span className="text-muted-foreground text-xs">Urgent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-blue-500" />
          <span className="text-muted-foreground text-xs">Normal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground text-xs">Suivi</span>
        </div>
      </div>

      <Separator className="mt-3" />

      <ScrollArea className="max-h-[280px]">
        <div className="flex flex-col px-5 py-3">
          {rows.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground text-sm">
              Aucun patient dans la file
            </p>
          ) : (
            rows.map((row, idx) => {
              const prio = PRIORITY_CONFIG[row.priority];
              return (
                <div
                  className={cn(
                    "group -ml-3 flex items-center gap-3 rounded-l-lg border-l-2 py-3 pr-1 pl-3 transition-colors hover:bg-muted/40",
                    prio.borderClass
                  )}
                  key={row.id}
                >
                  <Avatar size="sm">
                    <AvatarFallback
                      className={cn(
                        "bg-gradient-to-br font-semibold text-[10px] text-white",
                        AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]
                      )}
                    >
                      {row.avatarInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-foreground text-sm">
                        {row.name}
                      </p>
                      <span className="shrink-0 text-muted-foreground/50 text-xs">
                        {row.species}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="truncate text-muted-foreground text-xs">
                        {row.ownerName}
                      </span>
                      <span className="text-muted-foreground/40 text-xs">
                        ·
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {row.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      className={cn(
                        "rounded-md px-1.5 py-0 text-[10px]",
                        prio.badgeClass
                      )}
                      variant="outline"
                    >
                      {prio.label}
                    </Badge>
                    <span className="flex items-center gap-1 font-mono text-muted-foreground text-xs tabular-nums">
                      <HugeiconsIcon
                        className="size-3"
                        icon={Clock01Icon}
                        strokeWidth={2}
                      />
                      {row.waitMinutes}m
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Staff Performance — ranking vétérinaires avec barres de progression
// ─────────────────────────────────────────────────────────────────────────────
type StaffMember = {
  id: string;
  name: string;
  role: string;
  consultations: number;
  target: number;
  revenue: number;
  avatarInitials: string;
};

const STAFF_COLORS = [
  "from-orange-500 to-amber-500",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-violet-500 to-purple-500",
  "from-rose-500 to-pink-500",
];

export function ProspeoStaffPerformance({
  members,
}: {
  members: StaffMember[];
}) {
  const totalConsultations = members.reduce((s, m) => s + m.consultations, 0);
  const totalRevenue = members.reduce((s, m) => s + m.revenue, 0);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-start gap-3">
          <MiniGlyph>
            <HugeiconsIcon
              className="size-4"
              icon={UserGroupIcon}
              strokeWidth={2}
            />
          </MiniGlyph>
          <div className="min-w-0">
            <h3 className="font-medium text-base text-foreground leading-tight">
              Performance équipe
            </h3>
            <p className="text-muted-foreground text-sm">
              {totalConsultations} consultations · {formatDA(totalRevenue)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-col px-5 pb-5">
        {members.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground text-sm">
            Aucun membre dans l'équipe
          </p>
        ) : (
          members.map((member, idx) => {
            const pct = member.target
              ? Math.min((member.consultations / member.target) * 100, 100)
              : 0;
            const achieved = member.consultations >= member.target;
            return (
              <div
                className={cn(
                  "flex items-center gap-3 py-3",
                  idx < members.length - 1 && "border-border border-b"
                )}
                key={member.id}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-[11px] text-muted-foreground">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <Avatar size="sm">
                  <AvatarFallback
                    className={cn(
                      "bg-gradient-to-br font-semibold text-[10px] text-white",
                      STAFF_COLORS[idx % STAFF_COLORS.length]
                    )}
                  >
                    {member.avatarInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground text-sm">
                        {member.name}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {member.role}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-mono text-foreground text-sm tabular-nums">
                        {member.consultations}
                      </span>
                      <Badge
                        className={cn(
                          "rounded-md px-1.5 py-0 text-[10px]",
                          achieved
                            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-400"
                            : "border-amber-400/20 bg-amber-500/10 text-amber-400"
                        )}
                        variant="outline"
                      >
                        {pct.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-500",
                        STAFF_COLORS[idx % STAFF_COLORS.length]
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity Timeline — fil d'activité récent avec avatars et timestamps
// ─────────────────────────────────────────────────────────────────────────────
export type TimelineEvent = {
  id: string;
  type: "consultation" | "vaccination" | "surgery" | "emergency" | "followup";
  title: string;
  subtitle: string;
  time: string;
  timeAgo: string;
  avatarInitials: string;
  amount?: number;
};

const EVENT_ICON_MAP: Record<TimelineEvent["type"], typeof StethoscopeIcon> = {
  consultation: StethoscopeIcon,
  vaccination: Task01Icon,
  surgery: Hospital01Icon,
  emergency: DangerIcon,
  followup: Calendar01Icon,
};

const EVENT_COLOR_MAP: Record<TimelineEvent["type"], string> = {
  consultation: "text-orange-400 bg-orange-500/12 border-orange-400/20",
  vaccination: "text-blue-400 bg-blue-500/12 border-blue-400/20",
  surgery: "text-violet-400 bg-violet-500/12 border-violet-400/20",
  emergency: "text-rose-400 bg-rose-500/12 border-rose-400/20",
  followup: "text-emerald-400 bg-emerald-500/12 border-emerald-400/20",
};

export function ProspeoActivityTimeline({
  events,
}: {
  events: TimelineEvent[];
}) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-start gap-3">
          <MiniGlyph>
            <HugeiconsIcon
              className="size-4"
              icon={Activity03Icon}
              strokeWidth={2}
            />
          </MiniGlyph>
          <div className="min-w-0">
            <h3 className="font-medium text-base text-foreground leading-tight">
              Activité récente
            </h3>
            <p className="text-muted-foreground text-sm">
              {events.length} événement{events.length === 1 ? "" : "s"}{" "}
              aujourd'hui
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="max-h-[320px]">
        <div className="flex flex-col px-5 pt-3 pb-5">
          {events.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground text-sm">
              Aucune activité récente
            </p>
          ) : (
            events.map((event, idx) => {
              const icon = EVENT_ICON_MAP[event.type];
              const colorClass = EVENT_COLOR_MAP[event.type];
              return (
                <div
                  className={cn(
                    "flex items-start gap-3 py-3",
                    idx < events.length - 1 && "border-border border-b"
                  )}
                  key={event.id}
                >
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                      colorClass
                    )}
                  >
                    <HugeiconsIcon
                      className="size-3.5"
                      icon={icon}
                      strokeWidth={2}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium text-foreground text-sm">
                        {event.title}
                      </p>
                      {event.amount !== undefined && (
                        <span className="shrink-0 font-mono text-foreground text-xs tabular-nums">
                          {formatDA(event.amount)}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-muted-foreground text-xs">
                      {event.subtitle}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground/70 tabular-nums">
                        {event.time}
                      </span>
                      <span className="text-[10px] text-muted-foreground/40">
                        ·
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">
                        il y a {event.timeAgo}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily Alerts — cartes d'alerte avec bordure colorée gauche
// ─────────────────────────────────────────────────────────────────────────────
export type DailyAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
};

const ALERT_CONFIG = {
  critical: {
    icon: DangerIcon,
    iconClass: "text-rose-400",
    borderClass: "border-l-rose-500",
    bgClass: "bg-rose-500/5",
  },
  warning: {
    icon: AlertCircleIcon,
    iconClass: "text-amber-400",
    borderClass: "border-l-amber-500",
    bgClass: "bg-amber-500/5",
  },
  info: {
    icon: AlertIcon,
    iconClass: "text-blue-400",
    borderClass: "border-l-blue-500",
    bgClass: "bg-blue-500/5",
  },
};

export function ProspeoDailyAlerts({
  alerts,
  onDismiss,
}: {
  alerts: DailyAlert[];
  onDismiss?: (id: string) => void;
}) {
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-start gap-3">
          <MiniGlyph>
            <HugeiconsIcon
              className="size-4"
              icon={AlertIcon}
              strokeWidth={2}
            />
          </MiniGlyph>
          <div className="min-w-0">
            <h3 className="font-medium text-base text-foreground leading-tight">
              Alertes du jour
            </h3>
            <p className="text-muted-foreground text-sm">
              {alerts.length === 0
                ? "Tout est en ordre"
                : `${criticalCount} critique${criticalCount === 1 ? "" : "s"} · ${warningCount} avertissement${warningCount === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-5 pt-3 pb-5">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-500/12">
              <HugeiconsIcon
                className="size-6 text-emerald-400"
                icon={Task01Icon}
                strokeWidth={2}
              />
            </div>
            <p className="font-medium text-foreground text-sm">Aucune alerte</p>
            <p className="text-muted-foreground text-xs">
              Tout fonctionne normalement
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const config = ALERT_CONFIG[alert.severity];
            return (
              <Alert
                className={cn(
                  "rounded-xl border-l border-l-4 py-2.5",
                  config.borderClass,
                  config.bgClass
                )}
                key={alert.id}
              >
                <HugeiconsIcon
                  className={cn("size-4", config.iconClass)}
                  icon={config.icon}
                  strokeWidth={2}
                />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <AlertTitle className="text-sm">{alert.title}</AlertTitle>
                    <AlertDescription className="text-xs">
                      {alert.description}
                    </AlertDescription>
                  </div>
                  {alert.action && alert.onAction && (
                    <Button
                      className="h-7 shrink-0 px-2 text-[10px]"
                      onClick={alert.onAction}
                      size="sm"
                      variant="outline"
                    >
                      {alert.action}
                    </Button>
                  )}
                </div>
              </Alert>
            );
          })
        )}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekly Comparison — mini bar charts comparant cette semaine vs semaine dernière
// ─────────────────────────────────────────────────────────────────────────────
type WeeklyMetric = {
  label: string;
  thisWeek: number;
  lastWeek: number;
  unit: string;
  format?: (value: number) => string;
};

const COMPARISON_COLORS = [
  {
    thisWeek: "from-orange-500 to-orange-400",
    lastWeek: "from-zinc-500 to-zinc-400",
  },
  {
    thisWeek: "from-blue-500 to-blue-400",
    lastWeek: "from-zinc-500 to-zinc-400",
  },
  {
    thisWeek: "from-emerald-500 to-emerald-400",
    lastWeek: "from-zinc-500 to-zinc-400",
  },
  {
    thisWeek: "from-violet-500 to-violet-400",
    lastWeek: "from-zinc-500 to-zinc-400",
  },
  {
    thisWeek: "from-rose-500 to-rose-400",
    lastWeek: "from-zinc-500 to-zinc-400",
  },
];

export function ProspeoWeeklyComparison({
  metrics,
}: {
  metrics: WeeklyMetric[];
}) {
  const maxVal = Math.max(
    ...metrics.flatMap((m) => [m.thisWeek, m.lastWeek]),
    1
  );

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-start gap-3">
          <MiniGlyph>
            <HugeiconsIcon
              className="size-4"
              icon={ChartUpIcon}
              strokeWidth={2}
            />
          </MiniGlyph>
          <div className="min-w-0">
            <h3 className="font-medium text-base text-foreground leading-tight">
              Comparaison hebdo
            </h3>
            <p className="text-muted-foreground text-sm">
              Cette semaine vs semaine dernière
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-400" />
            <span className="text-muted-foreground">Cette sem.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-gradient-to-r from-zinc-500 to-zinc-400" />
            <span className="text-muted-foreground">Sem. dernière</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-5 pt-3 pb-5">
        {metrics.map((metric, idx) => {
          const thisPct = (metric.thisWeek / maxVal) * 100;
          const lastPct = (metric.lastWeek / maxVal) * 100;
          const delta =
            metric.lastWeek === 0
              ? metric.thisWeek > 0
                ? 100
                : 0
              : ((metric.thisWeek - metric.lastWeek) / metric.lastWeek) * 100;
          const positive = delta >= 0;
          const colors = COMPARISON_COLORS[idx % COMPARISON_COLORS.length];
          const formatter = metric.format || ((v) => v.toLocaleString("fr-FR"));

          return (
            <div className="flex flex-col gap-2" key={metric.label}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground text-sm">
                  {metric.label}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-foreground text-sm tabular-nums">
                    {formatter(metric.thisWeek)} {metric.unit}
                  </span>
                  <Badge
                    className={cn(
                      "rounded-md px-1.5 py-0 text-[10px]",
                      positive
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-400"
                        : "border-rose-400/20 bg-rose-500/10 text-rose-400"
                    )}
                    variant="outline"
                  >
                    <HugeiconsIcon
                      className="size-2.5"
                      icon={positive ? ArrowUp01Icon : ArrowDown01Icon}
                      strokeWidth={2}
                    />
                    {Math.abs(delta).toFixed(0)}%
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
                    <span>Cette sem.</span>
                    <span className="tabular-nums">
                      {formatter(metric.thisWeek)}
                    </span>
                  </div>
                  <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-500",
                        colors.thisWeek
                      )}
                      style={{ width: `${thisPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
                    <span>Sem. dernière</span>
                    <span className="tabular-nums">
                      {formatter(metric.lastWeek)}
                    </span>
                  </div>
                  <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-500",
                        colors.lastWeek
                      )}
                      style={{ width: `${lastPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
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
        <h3 className="font-semibold text-base text-foreground">{title}</h3>
        {onDetails && (
          <Button onClick={onDetails} size="sm" variant="outline">
            Détails
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-baseline gap-3">
        <p className="font-semibold text-[34px] text-foreground tabular-nums leading-none tracking-[-0.045em]">
          {bigValue}
        </p>
        <Badge
          className={cn(
            "gap-1 rounded-md px-2 py-0.5 font-semibold text-[11px]",
            positive
              ? "border-emerald-400/20 bg-emerald-500/12 text-emerald-600 dark:text-emerald-300"
              : "border-rose-400/20 bg-rose-500/12 text-rose-600 dark:text-rose-300"
          )}
          variant="outline"
        >
          <HugeiconsIcon
            className="size-3"
            icon={positive ? ArrowUp01Icon : ArrowDown01Icon}
            strokeWidth={2}
          />
          {Math.abs(delta).toFixed(0).padStart(2, "0")}%
        </Badge>
        <span className="text-muted-foreground text-xs">
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
    <div className="flex items-center justify-between border-border border-b py-2.5 last:border-b-0">
      <span className="text-foreground text-sm">{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-foreground text-sm tabular-nums">
          {value}
        </span>
        <Badge
          className={cn(
            "gap-0.5 font-medium text-xs",
            positive
              ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-rose-400/20 bg-rose-500/10 text-rose-600 dark:text-rose-400"
          )}
          variant="outline"
        >
          <HugeiconsIcon
            className="size-3"
            icon={positive ? ArrowUp01Icon : ArrowDown01Icon}
            strokeWidth={2}
          />
          {Math.abs(delta).toFixed(1)}%
        </Badge>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rapport revenus par catégorie — style Sales Report
// ─────────────────────────────────────────────────────────────────────────────
export type RevenueReportRow = { label: string; amount: number; delta: number };

const revenueReportChartConfig = {
  value: {
    label: "Revenu",
    colors: { light: ["#f97316"], dark: ["#fb923c"] },
  },
} satisfies ChartConfig;

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
    <Card className="flex flex-col gap-5">
      <div className="px-5 pt-5">
        <ReportCardHeader
          bigValue={`${formatDA(total)}`}
          delta={delta}
          onDetails={onDetails}
          title="Rapport revenus"
        />
      </div>
      <div className="flex min-h-[88px] flex-col px-5">
        {rows.length === 0 ? (
          <p className="py-3 text-muted-foreground text-sm">Aucune catégorie</p>
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
      <div className="px-5 pb-5">
        <div className="h-[140px] w-full min-w-0">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              data={monthlyData}
              margin={{ top: 8, right: 8, left: 8, bottom: 24 }}
            >
              <defs>
                <linearGradient
                  id="revenueReportBarGradient"
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#fb923c" stopOpacity={1} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid
                horizontal
                stroke="var(--border)"
                strokeDasharray="3 3"
                strokeOpacity={0.3}
                vertical={false}
              />
              <XAxis
                angle={0}
                axisLine={{ stroke: "var(--border)", strokeOpacity: 0.8 }}
                dataKey="month"
                height={50}
                interval={0}
                tick={{
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                  fontWeight: 500,
                }}
                tickLine={{ stroke: "var(--border)", strokeOpacity: 0.6 }}
                tickMargin={10}
              />
              <YAxis hide />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!(active && payload && payload.length)) {
                    return null;
                  }
                  const value = Number(payload[0]?.value ?? 0);
                  return (
                    <div className="rounded-xl border border-border bg-card/95 px-3 py-2 shadow-md backdrop-blur-sm">
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                        {label}
                      </p>
                      <p className="mt-0.5 font-semibold text-foreground text-sm tabular-nums">
                        {formatDA(value)}
                      </p>
                    </div>
                  );
                }}
                cursor={{ fill: "var(--muted)", opacity: 0.35 }}
              />
              <Bar
                dataKey="value"
                fill="url(#revenueReportBarGradient)"
                maxBarSize={32}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {activeMonth && (
          <p className="mt-1 text-center text-[10px] text-muted-foreground">
            Mois en cours :{" "}
            <span className="font-semibold text-foreground">
              {formatDA(activeMonth.value)}
            </span>{" "}
            · {activeMonth.month}
          </p>
        )}
      </div>
    </Card>
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

const retentionChartConfig = {
  nouveaux: {
    label: "Nouveaux",
    colors: { light: ["#3b82f6"], dark: ["#60a5fa"] },
  },
  retour: {
    label: "Retour",
    colors: { light: ["#6b7280"], dark: ["#9ca3af"] },
  },
} satisfies ChartConfig;

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
    <Card className="flex flex-col gap-5">
      <div className="px-5 pt-5">
        <ReportCardHeader
          bigValue={`${rate.toFixed(2)}%`}
          delta={delta}
          onDetails={onDetails}
          title="Fidélisation patients"
        />
      </div>
      <div className="flex min-h-[80px] flex-col px-5">
        {rows.length === 0 ? (
          <p className="py-3 text-muted-foreground text-sm">
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
      <div className="px-5 pb-5">
        <div className="h-[170px] w-full min-w-0">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart
              data={trend}
              margin={{ top: 10, right: 10, left: 10, bottom: 30 }}
            >
              <defs>
                <linearGradient
                  id="retentionNouveauxGradient"
                  x1="0"
                  x2="1"
                  y1="0"
                  y2="0"
                >
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity={1} />
                </linearGradient>
                <linearGradient
                  id="retentionRetourGradient"
                  x1="0"
                  x2="1"
                  y1="0"
                  y2="0"
                >
                  <stop offset="0%" stopColor="#6b7280" stopOpacity={1} />
                  <stop offset="100%" stopColor="#9ca3af" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid
                horizontal
                stroke="var(--border)"
                strokeDasharray="3 3"
                strokeOpacity={0.3}
                vertical={false}
              />
              <XAxis
                angle={0}
                axisLine={{ stroke: "var(--border)", strokeOpacity: 0.8 }}
                dataKey="name"
                height={50}
                interval={0}
                tick={{
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                  fontWeight: 500,
                }}
                tickLine={{ stroke: "var(--border)", strokeOpacity: 0.6 }}
                tickMargin={10}
              />
              <YAxis hide />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!(active && payload && payload.length)) {
                    return null;
                  }
                  return (
                    <div className="rounded-xl border border-border bg-card/95 px-3 py-2 shadow-md backdrop-blur-sm">
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                        {label}
                      </p>
                      <div className="mt-1 space-y-1">
                        {payload.map((entry, index) => (
                          <div className="flex items-center gap-2" key={index}>
                            <div
                              className="size-2 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-muted-foreground text-xs">
                              {entry.name === "nouveaux"
                                ? "Nouveaux"
                                : "Retour"}
                              :
                            </span>
                            <span className="font-semibold text-foreground text-xs tabular-nums">
                              {entry.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }}
                cursor={{
                  stroke: "var(--border)",
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                }}
              />
              <Line
                activeDot={{ r: 5 }}
                dataKey="nouveaux"
                dot={{ fill: "#3b82f6", r: 3 }}
                stroke="url(#retentionNouveauxGradient)"
                strokeWidth={2}
                type="monotone"
              />
              <Line
                activeDot={{ r: 5 }}
                dataKey="retour"
                dot={{ fill: "#6b7280", r: 3 }}
                stroke="url(#retentionRetourGradient)"
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
