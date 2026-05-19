import {
  Alert01Icon,
  ArrowLeft01Icon,
  Calendar01Icon,
  ChartUpIcon,
  CheckmarkCircle01Icon,
  FlashIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  Layer,
  Tooltip as RechartsTooltip,
  Rectangle,
  ResponsiveContainer,
  Sankey,
} from "recharts";
import { EvilComposedChart } from "@/components/evilcharts/charts/composed-chart";
import { EvilLineChart } from "@/components/evilcharts/charts/line-chart";
import type { ChartConfig as EvilChartConfig } from "@/components/evilcharts/ui/chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useTasksRepository,
  useTransactionsRepository,
} from "@/data/repositories";
import { APP_NAME } from "@/lib/brand";
import {
  buildDashboardMetrics,
  type DashboardMetrics,
  formatCompactInteger,
  formatPercent,
  getCurrentLocale,
  percentageDelta,
} from "@/lib/metrics";
import { cn } from "@/lib/utils";
import type { View } from "@/types";
import type { Task } from "@/types/db";
import { formatDZD } from "@/utils/currency";

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      height="8"
      viewBox="0 0 8 8"
      width="8"
    >
      <path
        d="M4 1V7M4 7L1 4M4 7L7 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(getCurrentLocale()).format(value);
}

const revenueGradient = ["#312e81", "#4338ca", "#6366f1", "#818cf8", "#a5b4fc"];
const revenueGradientDark = [
  "#a5b4fc",
  "#818cf8",
  "#6366f1",
  "#4338ca",
  "#312e81",
];

function MiniSparkline({
  data,
  color = "#8b5cf6",
  positive = true,
}: {
  data: number[];
  color?: string;
  positive?: boolean;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 40;
  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
  const gradientColor = positive ? color : "#ef4444";
  return (
    <svg className="overflow-visible" height={height} width={width}>
      <defs>
        <linearGradient
          id={`sparkline-${positive}`}
          x1="0"
          x2="0"
          y1="0"
          y2="1"
        >
          <stop offset="0%" stopColor={gradientColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={gradientColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M0,${height} L${points} L${width},${height} Z`}
        fill={`url(#sparkline-${positive})`}
      />
      <polyline
        fill="none"
        points={points}
        stroke={gradientColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function MetricCard({
  title,
  value,
  delta,
  deltaLabel,
  positive,
  data,
  color,
}: {
  title: string;
  value: string;
  delta: string;
  deltaLabel: string;
  positive: boolean;
  data: number[];
  color: string;
}) {
  return (
    <Card className="card-vibrant overflow-hidden rounded-[20px] border border-border/60 bg-card/80 p-5 transition-all duration-200 ease-out hover:shadow-[0_4px_20px_-8px_rgba(0,0,0,0.1)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <p className="font-medium text-[13px] text-muted-foreground">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-[28px] text-foreground tracking-[-0.02em]">
              {value}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex items-center font-medium text-[12px]",
                positive ? "text-emerald-500" : "text-red-500"
              )}
            >
              {positive ? "↑" : "↓"} {delta}
            </span>
            <span className="text-[12px] text-muted-foreground">
              {deltaLabel}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0 pt-1">
          <MiniSparkline color={color} data={data} positive={positive} />
        </div>
      </div>
    </Card>
  );
}

function metricDeltaTone(negative?: boolean) {
  return negative ? "text-chart-red" : "text-emerald-600";
}

function formatDeltaText(current: number, previous: number) {
  return formatPercent(Math.abs(percentageDelta(current, previous)));
}

function MetricDelta({
  value,
  note,
  negative,
}: {
  value: string;
  note: string;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      {negative && <ArrowDownIcon className="text-chart-red" />}
      <span className={cn("font-mono", metricDeltaTone(negative))}>
        {value}
      </span>
      {note ? (
        <span className="font-mono text-muted-foreground uppercase tracking-[0.04em]">
          {note}
        </span>
      ) : null}
    </div>
  );
}

function GrowthChip({
  label,
  value,
  negative,
  active,
  icon,
  iconColor,
}: {
  label: string;
  value: string;
  negative?: boolean;
  active?: boolean;
  icon?: IconSvgElement;
  iconColor?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-[112px] rounded-[16px] border border-border/50 bg-card/78 px-3 py-2 shadow-soft backdrop-blur-sm transition-all",
        active && "bg-muted ring-1 ring-foreground/6"
      )}
    >
      <div className="flex items-center gap-1.5">
        {icon && iconColor ? (
          <span
            className="flex size-4 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: `color-mix(in oklab, ${iconColor} 14%, transparent)`,
              color: iconColor,
            }}
          >
            <HugeiconsIcon className="size-2.5" icon={icon} strokeWidth={2} />
          </span>
        ) : null}
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.05em]">
          {label}
        </p>
      </div>
      <div className="mt-2">
        <MetricDelta negative={negative} note="" value={value} />
      </div>
    </div>
  );
}

function WidgetHoverPreview({
  label,
  value,
  meta,
  color,
}: {
  label: string;
  value: string;
  meta?: string;
  color?: string;
}) {
  return (
    <div className="rounded-[12px] border border-border/45 bg-[color-mix(in_oklab,var(--color-surface-soft)_86%,white_14%)] px-2.5 py-2 shadow-soft backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {color ? (
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: color }}
            />
          ) : null}
          <span className="font-medium text-[11px] text-foreground">
            {label}
          </span>
        </div>
        {meta ? (
          <span className="font-mono text-[10px] text-muted-foreground">
            {meta}
          </span>
        ) : null}
      </div>
      <div className="mt-1 font-mono text-[11px] text-foreground">{value}</div>
    </div>
  );
}

function MetricMicroCard({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[14px] border border-border/45 bg-[color-mix(in_oklab,var(--color-surface-soft)_86%,white_14%)] px-2.5 py-2 shadow-soft backdrop-blur-sm">
      <div className="flex items-center gap-1.5">
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="truncate font-mono text-[9px] text-muted-foreground uppercase tracking-[0.06em]">
          {label}
        </span>
      </div>
      <p className="mt-1 truncate font-mono text-[10px] text-foreground">
        {value}
      </p>
    </div>
  );
}

function CampaignDataChart({
  data,
}: {
  data: Array<{ name: string; value: number }>;
}) {
  const { t } = useTranslation();
  const chartData = data.map((entry, index, rows) => {
    const previous = rows[Math.max(0, index - 1)]?.value ?? entry.value;
    return {
      name: entry.name,
      value: Number(entry.value.toFixed(1)),
      reference: Number(previous.toFixed(1)),
    };
  });
  const config = {
    value: {
      label: t("dashboardV2.chartLabels.netFlow"),
      colors: { light: revenueGradient, dark: revenueGradientDark },
    },
    reference: {
      label: t("dashboardV2.chartLabels.reference"),
      colors: { light: ["#d6d3d1"], dark: ["#78716c"] },
    },
  } satisfies EvilChartConfig;
  return (
    <EvilLineChart
      activeDotVariant="colored-border"
      chartConfig={config}
      className="!aspect-auto h-full w-full"
      curveType="bump"
      data={chartData}
      dotVariant="border"
      enableBufferLine
      glowingLines={["value"]}
      hideLegend
      isClickable
      strokeVariant="solid"
      tooltipVariant="default"
      xAxisProps={{
        tickFormatter: (value) => String(value).slice(0, 3),
        tickMargin: 10,
        interval: 0,
        padding: { left: 10, right: 10 },
      }}
      xDataKey="name"
    />
  );
}

export type InsightCardData = {
  chart?: React.ReactNode;
  description?: string;
  eyebrow: string;
  value: string;
  detailLead: string;
  detailText: string;
  detailInline?: boolean;
  isNegative?: boolean;
  title: string;
};

type InsightCardProps = InsightCardData & {
  active?: boolean;
};

export function InsightCard({
  eyebrow,
  value,
  detailLead,
  detailText,
  detailInline,
  isNegative,
  title,
  description,
  chart,
  active,
}: InsightCardProps) {
  return (
    <Card
      className={cn(
        "group card-vibrant card-hover-lift min-w-0 overflow-hidden rounded-[24px] border border-border bg-card shadow-soft",
        "transition-all duration-300 ease-out",
        active && "border-foreground/10 shadow-soft ring-1 ring-foreground/6"
      )}
    >
      <CardContent className="flex min-h-[358px] flex-col overflow-hidden p-4">
        <div
          className={cn(
            "panel-inset relative min-h-[186px] overflow-hidden rounded-[18px] border border-border px-4 py-4",
            active && "bg-muted"
          )}
        >
          <div className="mb-3 space-y-0.5">
            <p className="font-normal text-[10px] text-muted-foreground uppercase tracking-[0.02em]">
              {eyebrow}
            </p>
            <div className="flex items-end gap-1.5">
              <p className="font-normal text-[17px] text-foreground leading-none tracking-[-0.02em]">
                {value}
              </p>
              {detailText && detailInline ? (
                <span className="pb-0.5 font-mono text-[9px] text-muted-foreground">
                  {detailText}
                </span>
              ) : null}
            </div>
            <p className="flex flex-wrap items-center gap-1 text-[10px]">
              {isNegative && <ArrowDownIcon className="text-chart-red" />}
              <span
                className={cn(
                  "font-mono",
                  isNegative ? "text-chart-red" : "text-foreground/60"
                )}
              >
                {detailLead}
              </span>
              {detailText && !detailInline ? (
                <span className="text-muted-foreground">{detailText}</span>
              ) : null}
            </p>
          </div>
          <div
            className="h-[126px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {chart}
          </div>
        </div>
        <div className="mt-auto space-y-1 px-1.5 pt-5">
          <h3 className="line-clamp-2 font-normal text-[14px] text-foreground leading-[1.1] tracking-[-0.02em]">
            {title}
          </h3>
          <p className="line-clamp-3 min-h-[52px] max-w-[28ch] text-[12px] text-muted-foreground leading-[1.45]">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardSection({
  title,
  subtitle,
  cards,
}: {
  title: string;
  subtitle: string;
  cards: InsightCardData[];
}) {
  return (
    <section className="space-y-4.5">
      <div className="space-y-1">
        <h2 className="font-normal text-[20px] text-foreground leading-none tracking-[-0.02em]">
          {title}
        </h2>
        <p className="font-mono text-[10px] text-muted-foreground tracking-[0.02em]">
          {subtitle}
        </p>
      </div>
      <div className="grid min-w-0 gap-3.5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <InsightCard key={card.title} {...card} />
        ))}
      </div>
    </section>
  );
}

export function LeadMetricStrip({ metrics }: { metrics: DashboardMetrics }) {
  const { t } = useTranslation();
  const generateSparklineData = (
    baseValue: number,
    trend: "up" | "down" | "neutral"
  ) => {
    const points = 7;
    return Array.from({ length: points }, (_, i) => {
      const variance = Math.random() * 0.3 + 0.85;
      const trendFactor =
        trend === "up" ? 1 + i * 0.05 : trend === "down" ? 1 - i * 0.03 : 1;
      return Math.round(baseValue * variance * trendFactor);
    });
  };
  const incomeDelta = percentageDelta(
    metrics.summary.income30,
    metrics.summary.previousIncome30
  );
  const appointmentsDelta = percentageDelta(
    metrics.summary.todayAppointments,
    metrics.summary.yesterdayAppointments
  );
  const basketDelta = percentageDelta(
    metrics.summary.averageBasket,
    metrics.summary.previousIncome30
      ? metrics.summary.previousIncome30 /
          Math.max(1, metrics.summary.currentQualified)
      : 0
  );
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MetricCard
        color="#8b5cf6"
        data={generateSparklineData(
          metrics.summary.income30 / 30,
          incomeDelta >= 0 ? "up" : "down"
        )}
        delta={formatDeltaText(
          metrics.summary.income30,
          metrics.summary.previousIncome30
        )}
        deltaLabel="vs période précédente"
        positive={incomeDelta >= 0}
        title={t("dashboardV2.metricStrip.income30", "Revenus 30j")}
        value={formatDZD(metrics.summary.income30)}
      />
      <MetricCard
        color="#06b6d4"
        data={generateSparklineData(
          metrics.summary.todayAppointments,
          appointmentsDelta >= 0 ? "up" : "down"
        )}
        delta={formatDeltaText(
          metrics.summary.todayAppointments,
          metrics.summary.yesterdayAppointments
        )}
        deltaLabel="vs hier"
        positive={appointmentsDelta >= 0}
        title={t(
          "dashboardV2.metricStrip.todayAppointments",
          "Rendez-vous du jour"
        )}
        value={formatCompactInteger(metrics.summary.todayAppointments)}
      />
      <MetricCard
        color="#f59e0b"
        data={generateSparklineData(
          metrics.summary.averageBasket,
          basketDelta >= 0 ? "up" : "neutral"
        )}
        delta={formatDeltaText(
          metrics.summary.averageBasket,
          metrics.summary.previousIncome30
            ? metrics.summary.previousIncome30 /
                Math.max(1, metrics.summary.currentQualified)
            : 0
        )}
        deltaLabel="vs période précédente"
        positive={basketDelta >= 0}
        title={t("dashboardV2.metricStrip.averageBasket", "Panier moyen")}
        value={formatDZD(metrics.summary.averageBasket)}
      />
    </div>
  );
}

export function LeadRevenuePanel({ metrics }: { metrics: DashboardMetrics }) {
  const { t } = useTranslation();
  const currentMonthIndex = new Date().getMonth();
  const revenueData = metrics.monthlyRevenue.map((entry, index, rows) => {
    const window = rows.slice(Math.max(0, index - 2), index + 1);
    const baseline =
      window.reduce((sum, item) => sum + item.value, 0) /
      Math.max(window.length, 1);
    return {
      month: entry.month,
      revenue: Number(entry.value.toFixed(1)),
      baseline: Number(baseline.toFixed(1)),
    };
  });
  const total = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const activeEntry = revenueData[currentMonthIndex] ?? revenueData.at(-1);
  const prevEntry = revenueData[currentMonthIndex - 1];
  const delta = percentageDelta(
    activeEntry?.revenue ?? 0,
    prevEntry?.revenue ?? 0
  );
  const isPositive = delta >= 0;
  const chartConfig = {
    revenue: {
      label: t("dashboardV2.chartLabels.revenue"),
      colors: { light: revenueGradient, dark: revenueGradientDark },
    },
    baseline: {
      label: t("dashboardV2.chartLabels.reference"),
      colors: { light: ["#cbd5e1"], dark: ["#64748b"] },
    },
  } satisfies EvilChartConfig;
  return (
    <Card className="group card-vibrant relative h-full overflow-hidden rounded-[24px] border border-border bg-card shadow-soft transition-all duration-300 ease-out hover:border-foreground/10">
      <CardContent className="flex h-full flex-col p-5">
        <div className="mb-4">
          <p className="text-[11px] text-muted-foreground">
            {t("dashboardV2.revenuePanel.title", {
              defaultValue: "Encaissements",
            })}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="font-semibold text-[20px] text-foreground tabular-nums tracking-[-0.03em]">
              {formatDZD(total * 100)}
            </p>
            <span
              className={cn(
                "font-semibold text-[13px]",
                isPositive ? "text-emerald-500" : "text-rose-500"
              )}
            >
              {isPositive ? "+" : "-"}
              {formatPercent(Math.abs(delta))}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/50">
            {t("dashboardV2.revenuePanel.compare", {
              current: activeEntry?.month ?? "",
              previous: prevEntry?.month ?? "",
            })}
          </p>
        </div>
        <div className="min-h-[180px] flex-1">
          <EvilLineChart
            activeDotVariant="colored-border"
            chartConfig={chartConfig}
            chartProps={{
              margin: { top: 12, right: 12, left: 12, bottom: 16 },
            }}
            className="!aspect-auto h-full w-full"
            curveType="bump"
            data={revenueData}
            dotVariant="border"
            enableBufferLine
            glowingLines={["revenue"]}
            hideLegend
            isClickable
            strokeVariant="solid"
            tooltipVariant="default"
            xAxisProps={{
              tickFormatter: (value) => String(value).slice(0, 3),
              tickMargin: 10,
              interval: 0,
              padding: { left: 10, right: 10 },
            }}
            xDataKey="month"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function AppointmentsPanel({ metrics }: { metrics: DashboardMetrics }) {
  const { t } = useTranslation();
  const currentMonthIndex = new Date().getMonth();
  const [hoveredMonth, setHoveredMonth] = React.useState<number | null>(null);
  const [previewMonth, setPreviewMonth] = React.useState<number | null>(null);
  const monthNames = [
    "JAN",
    "FÉV",
    "MAR",
    "AVR",
    "MAI",
    "JUN",
    "JUL",
    "AOÛ",
    "SEP",
    "OCT",
    "NOV",
    "DÉC",
  ];
  const demoValues = [25, 42, 18, 35, 28, 45, 22, 38, 31, 26, 40, 33];
  const monthlyAppointments = Array.from({ length: 12 }, (_, i) => ({
    month: monthNames[i],
    value: demoValues[i] || Math.round(15 + Math.random() * 35),
    hasData: true,
  }));
  const maxVal = Math.max(...monthlyAppointments.map((d) => d.value), 1);
  const total = monthlyAppointments.reduce((sum, d) => sum + d.value, 0);
  const todayCount = metrics.summary.todayAppointments;
  const delta = percentageDelta(
    metrics.summary.todayAppointments,
    metrics.summary.yesterdayAppointments
  );
  return (
    <Card className="group card-vibrant relative h-full overflow-hidden rounded-[24px] border border-border bg-card shadow-soft transition-all duration-300 ease-out hover:border-foreground/10">
      <CardContent className="flex h-full flex-col p-5">
        <div className="mb-4">
          <p className="text-[11px] text-muted-foreground">
            {t("dashboardV2.appointments.title", {
              defaultValue: "Rendez-vous",
            })}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="font-medium text-[20px] text-foreground tabular-nums tracking-[-0.03em]">
              {todayCount}
            </p>
            <span
              className={cn(
                "font-semibold text-[13px]",
                delta >= 0 ? "text-emerald-500" : "text-rose-500"
              )}
            >
              {delta >= 0 ? "+" : ""}
              {formatPercent(Math.abs(delta))}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/50">Aujourd'hui</p>
        </div>
        <div className="mb-4 flex flex-1 items-end gap-[6px]">
          {monthlyAppointments.map((entry, i) => {
            const ratio = maxVal > 0 ? entry.value / maxVal : 0;
            const barHeight = Math.max(ratio * 100, 8);
            const isCurrent = i === currentMonthIndex;
            const isHovered = hoveredMonth === i;
            const isActive = isHovered || (hoveredMonth === null && isCurrent);
            const hasData = entry.value > 0;
            return (
              <div
                className="group flex flex-1 cursor-pointer flex-col items-center gap-1.5"
                key={i}
                onClick={() => setPreviewMonth(i)}
                onMouseEnter={() => setHoveredMonth(i)}
                onMouseLeave={() => setHoveredMonth(null)}
              >
                <div
                  className={cn(
                    "flex min-h-[8px] w-full items-end justify-center rounded-full transition-all duration-300",
                    isActive && hasData
                      ? "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                      : hasData
                        ? "bg-foreground/10 group-hover:bg-foreground/20"
                        : "bg-muted/30"
                  )}
                  style={{ height: `${barHeight}%` }}
                >
                  {hasData && barHeight > 15 && (
                    <span className="font-bold text-[8px] text-foreground/70 tabular-nums">
                      {entry.value}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[8px] uppercase tracking-wide transition-colors",
                    isActive
                      ? "font-bold text-blue-500"
                      : "font-medium text-muted-foreground/40"
                  )}
                >
                  {entry.month.slice(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-3 border-border/30 border-t pt-3">
          <div className="space-y-0.5">
            <p className="font-medium text-[9px] text-muted-foreground/50">
              Aujourd'hui
            </p>
            <p className="font-semibold text-[13px] text-foreground tabular-nums">
              {metrics.summary.todayAppointments}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="font-medium text-[9px] text-muted-foreground/50">
              Cette semaine
            </p>
            <p className="font-semibold text-[13px] text-foreground tabular-nums">
              {Math.round(metrics.summary.todayAppointments * 5.2)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="font-medium text-[9px] text-muted-foreground/50">
              Ce mois
            </p>
            <p className="font-semibold text-[13px] text-foreground tabular-nums">
              {monthlyAppointments[currentMonthIndex]?.value || 0}
            </p>
          </div>
        </div>
        {previewMonth !== null && (
          <div className="fade-in-0 zoom-in-95 absolute inset-0 flex animate-in flex-col rounded-[24px] bg-background/95 p-5 backdrop-blur-sm duration-200">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">
                  {monthlyAppointments[previewMonth]?.month} 2026
                </h3>
                <p className="text-muted-foreground text-sm">
                  Détails des rendez-vous
                </p>
              </div>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors hover:bg-muted"
                onClick={() => setPreviewMonth(null)}
              >
                <svg
                  fill="none"
                  height="16"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="16"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                <span className="text-muted-foreground text-sm">Total RDV</span>
                <span className="font-semibold text-lg">
                  {monthlyAppointments[previewMonth]?.value || 0}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                <span className="text-muted-foreground text-sm">Complétés</span>
                <span className="font-semibold text-emerald-500 text-lg">
                  {Math.round(
                    (monthlyAppointments[previewMonth]?.value || 0) * 0.85
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                <span className="text-muted-foreground text-sm">Annulés</span>
                <span className="font-semibold text-lg text-rose-500">
                  {Math.round(
                    (monthlyAppointments[previewMonth]?.value || 0) * 0.15
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PortfolioPanel({ metrics }: { metrics: DashboardMetrics }) {
  const { t } = useTranslation();
  const portfolioValue = metrics.summary.income30;
  const previousValue =
    metrics.summary.previousIncome30 || portfolioValue * 0.88;
  const portfolioDelta = percentageDelta(portfolioValue, previousValue);
  const chartData = metrics.monthlyRevenue.slice(-6);
  const hasRevenueTrend = chartData.some((item) => item.value > 0);
  const fallbackTrendBase = Math.max(
    portfolioValue / 600,
    metrics.summary.incomeToday / 140,
    1
  );
  const composedChartData = chartData.map((entry, index, rows) => {
    const value = hasRevenueTrend
      ? entry.value
      : fallbackTrendBase * ([0.72, 0.92, 0.78, 1.08, 0.96, 1.16][index] ?? 1);
    const window = rows.slice(Math.max(0, index - 2), index + 1);
    const momentum = hasRevenueTrend
      ? window.reduce((sum, item) => sum + item.value, 0) /
        Math.max(window.length, 1)
      : fallbackTrendBase * ([0.82, 0.9, 0.86, 0.98, 1.02, 1.12][index] ?? 1);
    return {
      month: entry.month || `M${index + 1}`,
      collected: Number(value.toFixed(1)),
      momentum: Number(momentum.toFixed(1)),
    };
  });
  const composedBarConfig = {
    collected: {
      label: t("dashboardV2.chartLabels.revenue", { defaultValue: "Revenus" }),
      colors: {
        light: ["#f97316", "#f59e0b", "#2563eb"],
        dark: ["#fb923c", "#facc15", "#60a5fa"],
      },
    },
  } satisfies EvilChartConfig;
  const composedLineConfig = {
    momentum: {
      label: t("dashboardV2.chartLabels.reference"),
      colors: { light: revenueGradient, dark: revenueGradientDark },
    },
  } satisfies EvilChartConfig;
  return (
    <Card className="group card-vibrant relative h-full overflow-hidden rounded-[24px] border border-border bg-card shadow-soft transition-all duration-300 ease-out hover:border-foreground/10">
      <CardContent className="flex h-full flex-col p-5">
        <div className="mb-3">
          <p className="text-[11px] text-muted-foreground">
            {t("dashboardV2.portfolio.title", {
              defaultValue: "Chiffre d'affaires",
            })}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="font-semibold text-[24px] text-foreground tabular-nums tracking-[-0.03em]">
              {formatCurrency(portfolioValue)}
            </p>
            <span
              className={cn(
                "font-semibold text-[13px]",
                portfolioDelta >= 0 ? "text-emerald-500" : "text-rose-500"
              )}
            >
              {portfolioDelta >= 0 ? "+" : ""}
              {formatPercent(Math.abs(portfolioDelta))}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/50">
            {t("dashboardV2.portfolio.subtitle", {
              defaultValue: "30 derniers jours",
            })}
          </p>
        </div>
        <div className="relative min-h-[220px] flex-1">
          <EvilComposedChart
            activeDotVariant="colored-border"
            barCategoryGap={18}
            barConfig={composedBarConfig}
            barRadius={8}
            barVariant="default"
            chartProps={{
              margin: { top: 12, right: 12, left: 12, bottom: 16 },
            }}
            className="!aspect-auto h-full w-full"
            curveType="bump"
            data={composedChartData}
            dotVariant="border"
            enableHoverHighlight
            glowingBars={["collected"]}
            glowingLines={["momentum"]}
            hideCartesianGrid
            hideLegend
            isClickable
            lineConfig={composedLineConfig}
            strokeVariant="solid"
            tooltipVariant="default"
            xAxisProps={{
              tickFormatter: (value) => String(value).slice(0, 3),
              hide: true,
            }}
            xDataKey="month"
          />
        </div>
      </CardContent>
    </Card>
  );
}

const TASKS_SANKEY_PALETTE: Record<string, string> = {
  Haute: "#ef4444",
  Moyenne: "#f59e0b",
  Basse: "#64748b",
  Tâches: "#a855f7",
  Terminée: "#10b981",
  "En cours": "#3b82f6",
  "À faire": "#94a3b8",
};

interface TasksSankeyNodeProps {
  containerWidth?: number;
  height?: number;
  payload?: { name: string; value: number; depth?: number };
  width?: number;
  x?: number;
  y?: number;
}

function TasksSankeyNode({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  payload,
  containerWidth = 0,
}: TasksSankeyNodeProps) {
  if (!payload) {
    return null;
  }
  const fill = TASKS_SANKEY_PALETTE[payload.name] ?? "#94a3b8";
  const isLeft = (payload.depth ?? 0) === 0;
  const isRight = x + width + 6 > containerWidth - 1;
  const labelX = isLeft ? x - 8 : x + width + 8;
  const anchor: "start" | "end" = isLeft ? "end" : "start";
  return (
    <Layer>
      <Rectangle
        fill={fill}
        fillOpacity={0.95}
        height={Math.max(2, height)}
        radius={[4, 4, 4, 4]}
        width={width}
        x={x}
        y={y}
      />
      {(isLeft || isRight) && height > 10 && (
        <text
          className="fill-foreground"
          dominantBaseline="middle"
          style={{ fontSize: 11, fontWeight: 600 }}
          textAnchor={anchor}
          x={labelX}
          y={y + height / 2}
        >
          {payload.name}
          <tspan
            className="fill-muted-foreground"
            dx={4}
            style={{ fontWeight: 400 }}
          >
            {payload.value}
          </tspan>
        </text>
      )}
    </Layer>
  );
}

interface TasksSankeyLinkProps {
  linkWidth?: number;
  payload?: {
    source: { name: string };
    target: { name: string };
    value: number;
  };
  sourceControlX?: number;
  sourceX?: number;
  sourceY?: number;
  targetControlX?: number;
  targetX?: number;
  targetY?: number;
}

function TasksSankeyLink(props: TasksSankeyLinkProps) {
  const {
    sourceX = 0,
    targetX = 0,
    sourceY = 0,
    targetY = 0,
    sourceControlX = 0,
    targetControlX = 0,
    linkWidth = 0,
    payload,
  } = props;
  const id = `tasks-sankey-link-${payload?.source.name}-${payload?.target.name}`;
  const colorFrom =
    TASKS_SANKEY_PALETTE[payload?.source.name ?? ""] ?? "#94a3b8";
  const colorTo = TASKS_SANKEY_PALETTE[payload?.target.name ?? ""] ?? "#94a3b8";
  return (
    <Layer>
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={colorFrom} stopOpacity={0.55} />
          <stop offset="100%" stopColor={colorTo} stopOpacity={0.55} />
        </linearGradient>
      </defs>
      <path
        d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
        fill="none"
        stroke={`url(#${id})`}
        strokeOpacity={0.9}
        strokeWidth={Math.max(1, linkWidth)}
      />
    </Layer>
  );
}

export function TasksPanel({
  metrics,
  tasks,
}: {
  metrics: DashboardMetrics;
  tasks: Task[];
}) {
  const { t } = useTranslation();
  const stats = React.useMemo(() => {
    const priorityLabel = (
      p: Task["priority"]
    ): "Haute" | "Moyenne" | "Basse" => {
      if (p === "high") {
        return "Haute";
      }
      if (p === "medium") {
        return "Moyenne";
      }
      return "Basse";
    };
    const statusLabel = (
      s: Task["status"]
    ): "Terminée" | "En cours" | "À faire" => {
      if (s === "done") {
        return "Terminée";
      }
      if (s === "in_progress") {
        return "En cours";
      }
      return "À faire";
    };
    const matrix = new Map<string, Map<string, number>>();
    for (const task of tasks) {
      const p = priorityLabel(task.priority);
      const s = statusLabel(task.status);
      if (!matrix.has(p)) {
        matrix.set(p, new Map());
      }
      const m = matrix.get(p)!;
      m.set(s, (m.get(s) ?? 0) + 1);
    }
    const priorityOrder = ["Haute", "Moyenne", "Basse"] as const;
    const statusOrder = ["Terminée", "En cours", "À faire"] as const;
    const priorities = priorityOrder.filter((p) => matrix.has(p));
    const statuses = statusOrder.filter((s) =>
      Array.from(matrix.values()).some((m) => (m.get(s) ?? 0) > 0)
    );
    const nodes = [
      ...priorities.map((n) => ({ name: n })),
      { name: "Tâches" },
      ...statuses.map((n) => ({ name: n })),
    ];
    const indexOf = (name: string) => nodes.findIndex((n) => n.name === name);
    const links: Array<{ source: number; target: number; value: number }> = [];
    for (const p of priorities) {
      const total = Array.from(matrix.get(p)!.values()).reduce(
        (a, b) => a + b,
        0
      );
      if (total > 0) {
        links.push({
          source: indexOf(p),
          target: indexOf("Tâches"),
          value: total,
        });
      }
    }
    for (const s of statuses) {
      const total = Array.from(matrix.values()).reduce(
        (a, m) => a + (m.get(s) ?? 0),
        0
      );
      if (total > 0) {
        links.push({
          source: indexOf("Tâches"),
          target: indexOf(s),
          value: total,
        });
      }
    }
    const total = tasks.length;
    const completed = tasks.filter((tk) => tk.status === "done").length;
    const inProgress = tasks.filter((tk) => tk.status === "in_progress").length;
    const high = tasks.filter(
      (tk) => tk.priority === "high" && tk.status !== "done"
    ).length;
    return {
      sankeyData: { nodes, links },
      total,
      completed,
      inProgress,
      high,
      hasFlow: links.length > 0,
    };
  }, [tasks]);
  const completionPct =
    stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
  const cadenceRate = metrics.summary.taskCadenceRate ?? 0;
  const cadenceDelta = cadenceRate - completionPct;
  const isPositive = cadenceDelta >= 0;
  return (
    <Card className="group card-vibrant relative h-full min-h-[276px] overflow-hidden rounded-[24px] border border-border bg-card shadow-soft transition-all duration-300 ease-out hover:border-foreground/10">
      <CardContent className="flex h-full flex-col p-4">
        <div className="mb-4">
          <p className="text-[11px] text-muted-foreground">
            {t("dashboardV2.tasks.title", { defaultValue: "Tâches" })}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="font-semibold text-[20px] text-foreground tabular-nums tracking-[-0.03em]">
              {stats.total}
            </p>
            <span
              className={cn(
                "font-semibold text-[13px]",
                isPositive ? "text-emerald-500" : "text-rose-500"
              )}
            >
              {isPositive ? "+" : "-"}
              {formatPercent(Math.abs(cadenceDelta) / 100)}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/50">
            {formatPercent(completionPct / 100)} complétées · {stats.high}{" "}
            urgent{stats.high > 1 ? "es" : "e"}
          </p>
        </div>
        <div className="min-h-[110px] flex-1">
          {stats.hasFlow ? (
            <ResponsiveContainer height="100%" width="100%">
              <Sankey
                data={stats.sankeyData}
                iterations={28}
                link={<TasksSankeyLink />}
                margin={{ top: 4, right: 56, bottom: 4, left: 56 }}
                node={<TasksSankeyNode />}
                nodePadding={10}
                nodeWidth={8}
              >
                <RechartsTooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  cursor={{ fill: "transparent" }}
                  formatter={(value: number) => [
                    `${value} tâche${value > 1 ? "s" : ""}`,
                    "Flux",
                  ]}
                />
              </Sankey>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
              Aucune tâche disponible
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function OperationsPulsePanel({
  metrics,
}: {
  metrics: DashboardMetrics;
}) {
  const { t } = useTranslation();
  const pipelineRows = metrics.pipelineRows;
  const totalPipeline = pipelineRows.reduce((sum, row) => sum + row.value, 0);
  const completed =
    pipelineRows.find((row) => row.label.toLowerCase().includes("termin"))
      ?.value ?? 0;
  const completionPct =
    totalPipeline > 0 ? (completed / totalPipeline) * 100 : 0;
  const trendData = metrics.monthlyAppointments
    .slice(-6)
    .map((item, index) => ({
      month: item.month,
      appointments:
        item.value > 0 ? item.value : ([12, 15, 14, 18, 19, 22][index] ?? 10),
      baseline: [10, 11, 12, 13, 14, 15][index] ?? 10,
    }));
  const trendDelta = percentageDelta(
    trendData[trendData.length - 1]?.appointments ?? 0,
    trendData[trendData.length - 2]?.appointments ?? 0
  );
  const chartConfig = {
    appointments: {
      label: t("dashboardV2.metricStrip.todayAppointments", {
        defaultValue: "Rendez-vous",
      }),
      colors: {
        light: ["#6366f1", "#8b5cf6", "#ec4899"],
        dark: ["#818cf8", "#a78bfa", "#f472b6"],
      },
    },
    baseline: {
      label: t("dashboardV2.chartLabels.reference", {
        defaultValue: "Référence",
      }),
      colors: { light: ["#22c55e"], dark: ["#4ade80"] },
    },
  } satisfies EvilChartConfig;
  const pipelineColors = ["#22c55e", "#f59e0b", "#3b82f6", "#a855f7"];
  return (
    <Card className="group card-vibrant relative h-full min-h-[276px] overflow-hidden rounded-[24px] border border-border bg-card shadow-soft transition-all duration-300 ease-out hover:border-foreground/10">
      <CardContent className="flex h-full flex-col p-4">
        <div className="mb-3">
          <p className="text-[11px] text-muted-foreground">
            {t("dashboardV2.appointments.title", {
              defaultValue: "Pipeline rendez-vous",
            })}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="font-semibold text-[20px] text-foreground tabular-nums tracking-[-0.03em]">
              {formatCompactInteger(totalPipeline)}
            </p>
            <span
              className={cn(
                "font-semibold text-[13px]",
                trendDelta >= 0 ? "text-emerald-500" : "text-rose-500"
              )}
            >
              {trendDelta >= 0 ? "+" : "-"}
              {formatPercent(Math.abs(trendDelta))}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/50">
            {t("dashboardV2.cashflowPanel.note", {
              defaultValue: "État actuel + tendance 6 mois",
            })}
          </p>
        </div>
        <div className="relative mb-3 min-h-[96px] flex-1">
          <EvilLineChart
            activeDotVariant="colored-border"
            chartConfig={chartConfig}
            className="!aspect-auto h-full w-full"
            curveType="bump"
            data={trendData}
            dotVariant="colored-border"
            glowingLines={["appointments"]}
            hideCartesianGrid
            hideLegend
            isClickable
            strokeVariant="solid"
            tooltipVariant="default"
            xAxisProps={{
              tickFormatter: (value) => String(value).slice(0, 3),
              hide: true,
            }}
            xDataKey="month"
          />
        </div>
        <div className="space-y-2.5 border-border/30 border-t pt-3">
          {pipelineRows.map((row, index) => {
            const share =
              totalPipeline > 0 ? (row.value / totalPipeline) * 100 : 0;
            return (
              <div className="space-y-1" key={row.label}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="truncate text-muted-foreground">
                    {row.label}
                  </span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {row.value}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(share, row.value > 0 ? 8 : 0)}%`,
                      backgroundColor:
                        pipelineColors[index % pipelineColors.length],
                    }}
                  />
                </div>
              </div>
            );
          })}
          <div className="grid grid-cols-3 gap-2 pt-0.5">
            <MetricMicroCard
              color="#22c55e"
              label={t("dashboardV2.pipeline.completed", {
                defaultValue: "Complété",
              })}
              value={formatPercent(completionPct)}
            />
            <MetricMicroCard
              color="#3b82f6"
              label={t("dashboardV2.metricStrip.todayAppointments", {
                defaultValue: "Aujourd'hui",
              })}
              value={formatCompactInteger(metrics.summary.todayAppointments)}
            />
            <MetricMicroCard
              color="#f59e0b"
              label={t("dashboardV2.tasks.title", {
                defaultValue: "Tâches dues",
              })}
              value={formatCompactInteger(metrics.summary.dueTasks)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function LeadSegmentationPanel({
  metrics,
}: {
  metrics: DashboardMetrics;
}) {
  const { t } = useTranslation();
  const rows = metrics.topCategories.length
    ? metrics.topCategories
    : [
        {
          label: t("dashboardV2.fallbacks.noData"),
          value: 0,
          color: "#eef0f3",
        },
      ];
  const total = rows.reduce((sum, item) => sum + item.value, 0);
  const [selectedLabel, setSelectedLabel] = React.useState<string>(
    rows[0]?.label ?? ""
  );
  const [hoveredLabel, setHoveredLabel] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!rows.some((row) => row.label === selectedLabel)) {
      setSelectedLabel(rows[0]?.label ?? "");
    }
  }, [rows, selectedLabel]);
  const displayLabel = hoveredLabel ?? selectedLabel;
  const selectedRow = rows.find((row) => row.label === displayLabel) ?? rows[0];
  const isPreviewing = hoveredLabel !== null && hoveredLabel !== selectedLabel;
  return (
    <Card className="group card-vibrant h-full rounded-[24px] border border-border bg-card shadow-soft transition-all duration-300 ease-out hover:border-foreground/10">
      <CardContent className="flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">
              {t("dashboardV2.segmentationPanel.title")}
            </p>
            <div className="flex items-end gap-2">
              <p className="font-medium text-[20px] text-foreground tracking-[-0.03em]">
                {formatCompactInteger(
                  selectedRow ? selectedRow.value / 100 : total / 100
                )}
              </p>
              <span className="inline-block max-w-[120px] truncate pb-0.5 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.05em]">
                {selectedRow
                  ? selectedRow.label
                  : t("dashboardV2.segmentationPanel.distributed")}
              </span>
            </div>
          </div>
          {selectedRow ? (
            <div
              className={cn(
                "min-w-[140px] max-w-[160px] overflow-hidden rounded-[16px] border px-3 py-2 transition-all",
                isPreviewing
                  ? "border-foreground/10 bg-muted shadow-soft"
                  : "border-border bg-muted"
              )}
            >
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.06em]">
                {isPreviewing
                  ? t("dashboardV2.segmentationPanel.preview")
                  : t("dashboardV2.segmentationPanel.activeSegment")}
              </p>
              <div className="mt-2 flex items-center gap-2 overflow-hidden">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: selectedRow.color }}
                />
                <span className="truncate font-medium text-[12px] text-foreground">
                  {selectedRow.label}
                </span>
              </div>
              <div className="mt-2 flex items-end gap-2">
                <span className="font-medium text-[18px] text-foreground tracking-[-0.03em]">
                  {formatCompactInteger(selectedRow.value / 100)}
                </span>
                <span className="shrink-0 pb-0.5 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.04em]">
                  {total
                    ? formatPercent((selectedRow.value / total) * 100)
                    : "0%"}
                </span>
              </div>
            </div>
          ) : null}
        </div>
        <div className="mt-4 flex h-3 gap-1.5">
          {rows.map((item) => (
            <button
              aria-label={t("dashboardV2.segmentationPanel.showSegment", {
                label: item.label,
              })}
              className={cn(
                "rounded-full transition-all",
                item.label === selectedLabel && "ring-2 ring-foreground/10",
                item.label === hoveredLabel &&
                  item.label !== selectedLabel &&
                  "opacity-100 ring-1 ring-foreground/8",
                item.label !== displayLabel && "opacity-80 hover:opacity-100"
              )}
              key={item.label}
              onClick={() => setSelectedLabel(item.label)}
              onMouseEnter={() => setHoveredLabel(item.label)}
              onMouseLeave={() => setHoveredLabel(null)}
              style={{ backgroundColor: item.color, flex: item.value || 1 }}
              type="button"
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          {rows.map((item) => (
            <button
              className={cn(
                "inline-flex min-w-0 items-center gap-2 rounded-xl border px-3 py-1.5 transition-colors",
                item.label === selectedLabel
                  ? "border-border bg-muted text-foreground shadow-soft"
                  : item.label === hoveredLabel
                    ? "border-foreground/10 bg-muted text-foreground"
                    : "border-border bg-transparent text-muted-foreground hover:bg-muted"
              )}
              key={item.label}
              onClick={() => setSelectedLabel(item.label)}
              onMouseEnter={() => setHoveredLabel(item.label)}
              onMouseLeave={() => setHoveredLabel(null)}
              type="button"
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="max-w-[100px] truncate">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-6 space-y-3">
          <div className="grid grid-cols-[1.4fr_80px_70px] items-center font-mono text-[10px] text-muted-foreground uppercase tracking-[0.05em]">
            <span>{t("dashboardV2.segmentationPanel.columns.channel")}</span>
            <span>{t("dashboardV2.segmentationPanel.columns.amount")}</span>
            <span>{t("dashboardV2.segmentationPanel.columns.share")}</span>
          </div>
          {rows.map((item) => (
            <button
              className={cn(
                "grid w-full grid-cols-[1.4fr_80px_70px] items-center rounded-[16px] px-2 py-2 text-left text-[12px] transition-colors",
                item.label === selectedLabel
                  ? "bg-muted"
                  : item.label === hoveredLabel
                    ? "bg-muted"
                    : "hover:bg-muted/60"
              )}
              key={item.label}
              onClick={() => setSelectedLabel(item.label)}
              onMouseEnter={() => setHoveredLabel(item.label)}
              onMouseLeave={() => setHoveredLabel(null)}
              type="button"
            >
              <div className="flex min-w-0 items-center gap-2 text-foreground">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate">{item.label}</span>
              </div>
              <span className="font-mono text-foreground">
                {formatCompactInteger(item.value / 100)}
              </span>
              <span className="font-mono text-emerald-600">
                {total ? formatPercent((item.value / total) * 100) : "0%"}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function LeadStatusPanel({ metrics }: { metrics: DashboardMetrics }) {
  const { t } = useTranslation();
  const total = metrics.pipelineRows.reduce((sum, row) => sum + row.value, 0);
  const [selectedLabel, setSelectedLabel] = React.useState<string>(
    metrics.pipelineRows[0]?.label ?? ""
  );
  const [hoveredLabel, setHoveredLabel] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!metrics.pipelineRows.some((row) => row.label === selectedLabel)) {
      setSelectedLabel(metrics.pipelineRows[0]?.label ?? "");
    }
  }, [metrics.pipelineRows, selectedLabel]);
  const displayLabel = hoveredLabel ?? selectedLabel;
  const displayRow =
    metrics.pipelineRows.find((row) => row.label === displayLabel) ??
    metrics.pipelineRows[0];
  const pipelineIcons: IconSvgElement[] = [
    Calendar01Icon,
    Loading03Icon,
    CheckmarkCircle01Icon,
    Alert01Icon,
  ];
  return (
    <Card className="group card-vibrant rounded-[24px] border border-border bg-card shadow-soft transition-all duration-300 ease-out hover:border-foreground/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">
              {t("dashboardV2.statusPanel.title")}
            </p>
            <div className="flex items-end gap-2">
              <p className="font-medium text-[20px] text-foreground tracking-[-0.03em]">
                {formatCompactInteger(total)}
              </p>
              <span className="pb-0.5 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.05em]">
                {t("dashboardV2.statusPanel.inPlanning")}
              </span>
            </div>
          </div>
          {displayRow ? (
            <div className="min-w-[140px]">
              <WidgetHoverPreview
                color={displayRow.color}
                label={displayRow.label}
                meta={
                  total ? formatPercent((displayRow.value / total) * 100) : "0%"
                }
                value={t("dashboardV2.statusPanel.appointmentsCount", {
                  count: formatCompactInteger(displayRow.value),
                })}
              />
            </div>
          ) : null}
        </div>
        <div className="mt-8 space-y-4">
          {metrics.pipelineRows.map((row, index) => {
            const Icon = pipelineIcons[index] ?? Calendar01Icon;
            return (
              <button
                className={cn(
                  "w-full rounded-[14px] px-3 py-3 text-left transition-all duration-200",
                  row.label === displayLabel ? "bg-muted" : "hover:bg-muted/50"
                )}
                key={row.label}
                onClick={() => setSelectedLabel(row.label)}
                onMouseEnter={() => setHoveredLabel(row.label)}
                onMouseLeave={() => setHoveredLabel(null)}
                type="button"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: `color-mix(in oklab, ${row.color} 14%, transparent)`,
                        color: row.color,
                      }}
                    >
                      <HugeiconsIcon
                        className="size-3.5"
                        icon={Icon}
                        strokeWidth={2}
                      />
                    </span>
                    <span className="truncate font-mono text-[11px] text-foreground/75 uppercase tracking-[0.05em]">
                      {row.label}
                    </span>
                  </div>
                  <span className="font-mono text-[12px] text-foreground">
                    {formatCompactInteger(row.value)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted-foreground/10">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(row.ratio * 100, 5)}%`,
                      backgroundColor: row.color,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function WebVisitsPanel({ metrics }: { metrics: DashboardMetrics }) {
  const { t } = useTranslation();
  const [selectedRange, setSelectedRange] = React.useState<
    "7d" | "14d" | "today"
  >("14d");
  const netTotal = metrics.cashflowSeries.reduce(
    (sum, item) => sum + item.value,
    0
  );
  const previousNet = metrics.cashflowSeries
    .slice(0, -7)
    .reduce((sum, item) => sum + item.value, 0);
  const currentNet = metrics.cashflowSeries
    .slice(-7)
    .reduce((sum, item) => sum + item.value, 0);
  const todayNet = metrics.cashflowSeries.at(-1)?.value ?? 0;
  const yesterdayNet = metrics.cashflowSeries.at(-2)?.value ?? 0;
  const trendPills = [
    {
      id: "7d" as const,
      label: t("dashboardV2.cashflowPanel.pills.sevenDays"),
      value: formatDZD(currentNet * 100),
      negative: currentNet < 0,
      icon: Calendar01Icon,
      iconColor: "#21aceb",
    },
    {
      id: "14d" as const,
      label: t("dashboardV2.cashflowPanel.pills.fourteenDays"),
      value: formatDZD(netTotal * 100),
      negative: netTotal < 0,
      icon: ChartUpIcon,
      iconColor: "#a855f7",
    },
    {
      id: "today" as const,
      label: t("dashboardV2.cashflowPanel.pills.today"),
      value: formatDZD(todayNet * 100),
      negative: todayNet < 0,
      icon: FlashIcon,
      iconColor: "#f59e0b",
    },
  ];
  const chartSeries =
    selectedRange === "14d"
      ? metrics.cashflowSeries
      : metrics.cashflowSeries.slice(-7);
  return (
    <Card className="group card-vibrant rounded-[24px] border border-border bg-card shadow-soft transition-all duration-300 ease-out hover:border-foreground/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">
              {t("dashboardV2.cashflowPanel.title")}
            </p>
            <p className="font-medium text-[20px] text-foreground tracking-[-0.03em]">
              {formatDZD(netTotal * 100)}
            </p>
            <MetricDelta
              negative={percentageDelta(currentNet, previousNet) < 0}
              note={t("dashboardV2.cashflowPanel.note")}
              value={formatDeltaText(currentNet, previousNet)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {trendPills.map((item) => (
              <button
                className="text-left"
                key={item.id}
                onClick={() => setSelectedRange(item.id)}
                type="button"
              >
                <GrowthChip
                  active={selectedRange === item.id}
                  icon={item.icon}
                  iconColor={item.iconColor}
                  label={item.label}
                  negative={item.negative}
                  value={item.value}
                />
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 h-[264px]">
          <CampaignDataChart data={chartSeries} />
        </div>
      </CardContent>
    </Card>
  );
}

export function FinancialAnalyticsV2Page({
  onNavigate,
}: {
  onNavigate: (view: View) => void;
}) {
  const { t, i18n } = useTranslation();
  const { data: appointments } = useAppointmentsRepository();
  const { data: owners } = useOwnersRepository();
  const { data: patients } = usePatientsRepository();
  const { data: tasks } = useTasksRepository();
  const { data: transactions } = useTransactionsRepository();
  const locale = getCurrentLocale(i18n.language);

  const metrics = React.useMemo(
    () =>
      buildDashboardMetrics({
        appointments,
        owners,
        patients,
        tasks,
        transactions,
        locale,
      }),
    [appointments, owners, patients, tasks, transactions, locale]
  );

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div className="ms-0 me-auto flex w-full min-w-0 max-w-[1160px] flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
              {t("dashboardV2.analytics.eyebrow")}
            </p>
            <h2 className="font-normal text-[28px] text-foreground tracking-[-0.04em]">
              {t("dashboardV2.analytics.title")}
            </h2>
            <p className="max-w-[62ch] text-muted-foreground text-sm">
              {t("dashboardV2.analytics.subtitle", { appName: APP_NAME })}
            </p>
          </div>
          <Button
            className="h-9 rounded-xl px-4"
            onClick={() => onNavigate("finances")}
            variant="outline"
          >
            <HugeiconsIcon
              className="size-4"
              icon={ArrowLeft01Icon}
              strokeWidth={2}
            />
            {t("dashboardV2.analytics.back")}
          </Button>
        </div>

        <LeadMetricStrip metrics={metrics} />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,2.15fr)_minmax(360px,1fr)]">
          <LeadRevenuePanel metrics={metrics} />
          <LeadSegmentationPanel metrics={metrics} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2.1fr)]">
          <LeadStatusPanel metrics={metrics} />
          <WebVisitsPanel metrics={metrics} />
        </div>
      </div>
    </div>
  );
}

export default FinancialAnalyticsV2Page;
