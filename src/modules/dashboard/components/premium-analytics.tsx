"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ClipboardCheck,
  LayoutGrid,
  Plus,
  Receipt,
  Stethoscope,
  Wallet,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { firstNameOf, formatNumber } from "@/utils/display-format";
import { formatTime, parseDashboardDate, type ScheduleEntry } from "../v2/model";
import { receivablesSummary, settlementRate } from "../v2/financial-model";
import { StatGrid, type Stat } from "@/components/ui/stat-grid";
import { buildKeyFigures, type KeyFigureId } from "../model/key-figures";
import { splitUnit } from "./chart-path";
import {
  ANALYTICS_PERIODS,
  analyticsRanges,
  type AnalyticsPeriod,
  type buildPremiumAnalytics,
  type CustomRange,
  type DashboardPeriod,
} from "../model/premium-analytics";
import { prepareAppointment } from "@/modules/shell/model/clinical-actions";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Calendar as DateRangeCalendar } from "@/components/ui/calendar";
import { COMPACT_CALENDAR_CLASS, DatePicker, formatDateValue } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ShortcutTooltip } from "@/design-system/patterns/shortcut-tooltip";
import type { WidgetState } from "./clinical/shared";
import { buildWeekFacts } from "../model/week-radial";
import { buildMonthForecast, buildVisitKinds, type VisitKindRow } from "../model/dashboard-widgets";
import { ForecastBar, WidgetFooter } from "./widget-units";
import { type FocusPoint } from "./focus-trend-chart";
import { RevenueChartWidget } from "./revenue-chart-widget";
import { ActivityHexWidget } from "./activity-hex-widget";
import { WeekRadialWidget } from "./week-radial-widget";
import type { View } from "@/types";
import "./premium-analytics.css";

interface PremiumAnalyticsProps {
  model: ReturnType<typeof buildPremiumAnalytics>;
  period: DashboardPeriod;
  /** A preset period: the quick choices. */
  onPeriod: (period: AnalyticsPeriod) => void;
  /** The two days picked, when `period` is « custom ». */
  customRange?: CustomRange | null;
  /** Two days picked: the page switches to « custom » with them. */
  onCustomRange?: (range: CustomRange) => void;
  states: { cash: WidgetState; patients: WidgetState; actions: WidgetState };
  onFinances: () => void;
  onPatients: () => void;
  onActions: () => void;
  onNavigate?: (view: View) => void;
  dashboardViewControl?: React.ReactNode;
  presentation?: {
    patients: any[];
    owners: any[];
    appointments: any[];
    tasks: any[];
    products: any[];
    transactions: any[];
    vaccinations: any[];
    invoices: any[];
  };
  today?: ScheduleEntry[];
  /** Kept for callers: the receivables are now read from the records, in `receivablesSummary`. */
  financials?: {
    income: number;
    pending: number;
    receivables?: any;
  };
  /** Shows the visit in Flux, where visits move on. */
  onStartConsultation?: (appointmentId: string) => void;
  clinicalView?: React.ReactNode;
  /** Rangée « À surveiller » (rappels, stock, hospitalisés): plus affichée sur le tableau de bord, qui s'arrête après « Cette semaine ». */
  watch?: React.ReactNode;
  /** Heure courante (horloge de la page), pour repérer le prochain rendez-vous. */
  now?: Date;
}

export function DeltaBadge({
  value,
  previous,
  current = 0,
  inverse = false,
  previousLabel,
}: {
  value: number | null;
  previous: number;
  current?: number;
  inverse?: boolean;
  /** The previous value as shown, so the change names its baseline. */
  previousLabel?: string;
}) {
  // Nothing on either side: no change to report, and 0 % would suggest one.
  if (previous === 0 && current === 0) {
    return (
      <span className="delta" data-sense="neutral">
        <span className="delta-label">Rien à comparer : 0 sur les deux périodes</span>
      </span>
    );
  }
  // A percentage of a zero base says nothing: show the label only.
  if (value === null && previous === 0) {
    return (
      <span className="delta" data-sense="neutral">
        <span className="delta-label">Pas de période précédente comparable</span>
      </span>
    );
  }
  const computed =
    value ?? Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;

  const positive = computed !== 0 && (inverse ? computed < 0 : computed > 0);
  const negative = computed !== 0 && !positive;
  const Icon = computed < 0 ? ArrowDownRight : ArrowUpRight;
  const formattedPercent = `${computed > 0 ? "+" : ""}${formatNumber(computed, { maximumFractionDigits: 1 })} %`;

  return (
    <span
      className="delta"
      data-sense={positive ? "good" : negative ? "bad" : "neutral"}
    >
      {computed !== 0 && <Icon size={13} strokeWidth={1.5} aria-hidden="true" />}
      <span>{formattedPercent}</span>
      <span className="delta-label">
        {previousLabel
          ? `contre ${previousLabel} la période précédente`
          : inverse
            ? "vs échéances précédentes"
            : "vs période précédente"}
      </span>
      {!previousLabel && (
        <span className="sr-only">Valeur précédente : {formatNumber(previous)}</span>
      )}
    </span>
  );
}

/**
 * The period's visits by kind: the leading kind named, then every kind as one
 * segment of a single bar, in the same tones as the species split.
 */
export function MiniKinds({ rows }: { rows: VisitKindRow[] }) {
  if (!rows.length) return null;
  const detail = rows.map((row) => `${row.name} ${formatNumber(row.count)} (${row.share} %)`).join(" · ");
  return (
    <span aria-label={`Consultations par motif : ${detail}`} className="kpiKinds" role="img" title={detail}>
      <span className="kpiKindsLead">
        {rows[0].name} · {rows[0].share} %
        {rows.length > 1 ? <span className="kpiKindsMore"> · {rows.length - 1} autre{rows.length > 2 ? "s" : ""}</span> : null}
      </span>
      <span aria-hidden="true" className="kpiKindsBar">
        {rows.map((row, index) => (
          <i data-tone={Math.min(index, 4)} key={row.key} style={{ flexGrow: row.count }} />
        ))}
      </span>
    </span>
  );
}

/**
 * A KPI's running total across the period, as a quiet area: its last point is
 * the figure the card shows. Trésorerie only: one chart, one card.
 */
export function MiniArea({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;
  const width = 84;
  const height = 28;
  const running = values.reduce<number[]>((sums, value) => [...sums, (sums.at(-1) ?? 0) + value], []);
  const max = Math.max(...running, 0);
  const x = (i: number) => (i * width) / (running.length - 1);
  const y = (value: number) => (max ? height - 1 - (value / max) * (height - 2) : height - 1);
  const line = running.map((value, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  return (
    <svg
      aria-label={label}
      className="kpiArea"
      height={height}
      role="img"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <path className="kpiAreaFill" d={`${line} L${width},${height} L0,${height} Z`} />
      <path className="kpiAreaLine" d={line} />
    </svg>
  );
}

type TrendPoint = FocusPoint;

/** The chart's own periods: a single day draws no curve, so « today » is left to the page's. */
const KEY_FIGURE_ICONS = { cash: Wallet, appointments: CalendarDays, receivables: Receipt, actions: ClipboardCheck } as const;

type ChartPeriod = Exclude<AnalyticsPeriod, "today"> | "custom";

/** Chiffre principal avec son unité en retrait (« 13 900 » + « DA »). */
export function FactValue({ text }: { text: string }) {
  const [value, unit] = splitUnit(text);
  return (
    <dd>
      <span className="factValue">{value}</span>
      {unit ? (
        <>
          {" "}
          <span className="factUnit">{unit}</span>
        </>
      ) : null}
    </dd>
  );
}

export function PremiumAnalytics({
  model,
  period,
  onPeriod,
  customRange,
  onCustomRange,
  states,
  onFinances,
  onActions,
  onNavigate,
  dashboardViewControl,
  presentation,
  clinicalView,
  now,
}: PremiumAnalyticsProps) {
  const { currentUser } = useAuth();
  const userName = firstNameOf(currentUser?.displayName, "Docteur");
  const { ranges } = model;
  const updatedAt = now ?? new Date();

  const dateOptions = { day: "numeric", month: "short" } as const;
  const sameDay = ranges.current.from.toDateString() === ranges.current.to.toDateString();
  const rangeLabel =
    sameDay
      ? ranges.current.from.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : `Du ${ranges.current.from.toLocaleDateString("fr-FR", dateOptions)} au ${ranges.current.to.toLocaleDateString("fr-FR", { ...dateOptions, year: "numeric" })}`;

  // The days the two pickers show: the picked ones, else those of the preset in force.
  const pickedFrom = period === "custom" && customRange ? customRange.from : formatDateValue(ranges.current.from);
  const pickedTo = period === "custom" && customRange ? customRange.to : formatDateValue(ranges.current.to);

  const handleNewAppointment = () => {
    prepareAppointment();
    onNavigate?.("agenda");
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("vetera:new-appointment"));
    }, 150);
  };

  const handleNewPatient = () => {
    onNavigate?.("patients");
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("vetera:new-patient"));
    }, 150);
  };

  // The chart's own period, set from its card; it follows the page's period
  // when that one changes (a single day has no curve: a week instead).
  const pagePeriod: ChartPeriod = period === "today" ? "7d" : period;
  // Picking other days moves the chart too, even when the page stays on « custom ».
  const pageKey = `${pagePeriod}|${period === "custom" ? `${customRange?.from}|${customRange?.to}` : ""}`;
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>(pagePeriod);
  // The days picked on the chart itself; they follow the page's when the page picks days.
  const [chartCustom, setChartCustom] = useState<CustomRange | null>(period === "custom" ? (customRange ?? null) : null);
  const [chartPickerOpen, setChartPickerOpen] = useState(false);
  // The key figures' two views: the cards alone, or with their sparklines (the row's current look).
  const [keyView, setKeyView] = useState<"kpi" | "sparklines">("sparklines");
  // The first day of a range being picked, until the second one ends it.
  const [chartAnchor, setChartAnchor] = useState<Date | null>(null);
  const [followedPeriod, setFollowedPeriod] = useState(pageKey);
  if (followedPeriod !== pageKey) {
    setFollowedPeriod(pageKey);
    setChartPeriod(pagePeriod);
    setChartCustom(period === "custom" ? (customRange ?? null) : null);
  }
  const chartRanges = useMemo(
    () => analyticsRanges(chartPeriod, now ?? new Date(), chartCustom),
    [chartPeriod, now, chartCustom]
  );
  const chartRangeLabel = (() => {
    const day = { day: "numeric", month: "short", year: "numeric" } as const;
    const { from, to } = chartRanges.current;
    return from.toDateString() === to.toDateString()
      ? from.toLocaleDateString("fr-FR", day)
      : `Du ${from.toLocaleDateString("fr-FR", day)} au ${to.toLocaleDateString("fr-FR", day)}`;
  })();
  const chartIsWeekly =
    chartPeriod === "12m" ||
    (chartPeriod === "custom" && chartRanges.current.to.getTime() - chartRanges.current.from.getTime() > 92 * 86_400_000);

  // Compute trend points for the chart's period
  const chartPoints = useMemo<TrendPoint[]>(() => {
    const transactions = presentation?.transactions || [];
    const appointments = presentation?.appointments || [];
    const ranges = chartRanges;
    const { from, to } = ranges.current;
    // Each bucket's twin in the previous period, the same length earlier.
    const shift = from.getTime() - ranges.previous.from.getTime();
    // The same visits as the Consultations figure: a visit whose patient no longer exists is not counted
    // there, so it is not counted here either (the two figures sit side by side and must agree).
    const knownPatients = new Set((presentation?.patients ?? []).map((patient) => patient.id));
    const isVisit = (a: { startTime?: string; status: string; patientId?: string }) =>
      Boolean(a.startTime) && !["cancelled", "no_show"].includes(a.status) && knownPatients.has(a.patientId ?? "");

    const daysCount = Math.max(
      1,
      Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
    );

    // One point a day up to a quarter, as the reference draws; a week beyond.
    const step = daysCount <= 92 ? 1 : 7;
    const points: TrendPoint[] = [];

    const cursor = new Date(from);
    while (cursor <= to) {
      const bucketEnd = new Date(
        Math.min(cursor.getTime() + step * 24 * 60 * 60 * 1000 - 1, to.getTime())
      );

      const receiptsSum = transactions
        .filter((t) => {
          if (t.type !== "income" || t.status !== "paid" || !t.date) return false;
          // Read as the Trésorerie card reads it: a SQLite timestamp is UTC.
          const d = parseDashboardDate(t.date);
          return Boolean(d && d >= cursor && d <= bucketEnd);
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const visitsCount = appointments.filter((a) => {
        if (!isVisit(a)) return false;
        const d = new Date(a.startTime);
        return d >= cursor && d <= bucketEnd;
      }).length;

      const label =
        daysCount <= 1
          ? cursor.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
          : cursor.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

      // A bucket of several days is named by its span, not by its first day.
      const spanEnd = new Date(bucketEnd.getFullYear(), bucketEnd.getMonth(), bucketEnd.getDate());
      const long =
        daysCount <= 1
          ? cursor.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
          : step > 1 && spanEnd.getTime() !== new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()).getTime()
            ? `Du ${cursor.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} au ${spanEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`
            : cursor.toLocaleDateString("fr-FR", {
                weekday: "short",
                day: "numeric",
                month: "long",
                year: "numeric",
              });

      const previousFrom = cursor.getTime() - shift;
      const previousTo = bucketEnd.getTime() - shift;
      const previousVisits = appointments.filter((a) => {
        if (!isVisit(a)) return false;
        const time = new Date(a.startTime).getTime();
        return time >= previousFrom && time <= previousTo;
      }).length;
      const previousReceipts = transactions
        .filter((t) => {
          if (t.type !== "income" || t.status !== "paid" || !t.date) return false;
          const time = parseDashboardDate(t.date)?.getTime() ?? Number.NaN;
          return time >= previousFrom && time <= previousTo;
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      points.push({
        label,
        long,
        receipts: receiptsSum / 100, // into standard DA
        visits: visitsCount,
        previousVisits,
        previousReceipts: previousReceipts / 100,
      });

      cursor.setDate(cursor.getDate() + step);
    }

    // Fallback if empty to avoid broken visual curves
    if (points.length === 0) {
      return [
        { label: "Début", long: "Début de période", receipts: 0, visits: 0 },
        { label: "Fin", long: "Fin de période", receipts: 0, visits: 0 },
      ];
    }

    return points;
  }, [chartRanges, presentation?.transactions, presentation?.appointments, presentation?.patients]);

  // The visits the chart counts, split by type of act, for its « Répartition » view.
  const chartKinds = useMemo(() => {
    const known = new Set((presentation?.patients ?? []).map((patient) => patient.id));
    const { from, to } = chartRanges.current;
    return buildVisitKinds(
      (presentation?.appointments ?? []).filter((a) => {
        if (!a.startTime || ["cancelled", "no_show"].includes(a.status) || !known.has(a.patientId ?? "")) return false;
        const d = new Date(a.startTime);
        return d >= from && d <= to;
      })
    );
  }, [chartRanges, presentation?.appointments, presentation?.patients]);

  // The month's receipts and where their pace leads (Recettes card).
  const forecast = useMemo(
    () => buildMonthForecast(presentation?.transactions ?? [], now ?? new Date()),
    [presentation?.transactions, now]
  );
  const weekStats = useMemo(
    () =>
      buildWeekFacts({
        transactions: presentation?.transactions || [],
        appointments: presentation?.appointments || [],
        invoices: presentation?.invoices || [],
        now: updatedAt,
      }),
    // `updatedAt` is a fresh date on each render when the dashboard gets none; the data is what moves the figures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [presentation?.transactions, presentation?.appointments, presentation?.invoices, now],
  );

  // One small calendar icon: the chart's period is a choice made now and then, not a row of buttons.
  const chartPeriodControl = (
      // One small calendar icon: the chart's period is a choice made now and then, not a row of buttons.
      <Popover
        onOpenChange={(open) => {
          setChartPickerOpen(open);
          if (!open) setChartAnchor(null);
        }}
        open={chartPickerOpen}
      >
        <PopoverTrigger
          aria-label={`Choisir les dates du graphique : ${chartRangeLabel}`}
          render={<Button className="size-8" size="icon-sm" title={chartRangeLabel} type="button" variant="ghost" />}
        >
          <CalendarDays aria-hidden="true" size={16} strokeWidth={1.5} />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-2">
          {/* Two clicks: the first day, then the last. A second range replaces the first. */}
          <DateRangeCalendar
            className={COMPACT_CALENDAR_CLASS}
            defaultMonth={chartRanges.current.to}
            mode="range"
            onDayClick={(day) => {
              // First click starts a new range, second one ends it: never an edit of the old range.
              if (!chartAnchor) {
                setChartAnchor(day);
                return;
              }
              const [first, last] = day < chartAnchor ? [day, chartAnchor] : [chartAnchor, day];
              setChartCustom({ from: formatDateValue(first), to: formatDateValue(last) });
              setChartPeriod("custom");
              setChartAnchor(null);
              setChartPickerOpen(false);
            }}
            selected={chartAnchor ? { from: chartAnchor, to: chartAnchor } : { from: chartRanges.current.from, to: chartRanges.current.to }}
          />
          <p className="px-2 pt-1 pb-1 text-muted-foreground text-xs">
            {chartAnchor ? "Choisissez le dernier jour de la période" : chartRangeLabel}
          </p>
        </PopoverContent>
      </Popover>
  );

  // The key figures: the same data, the same comparisons, the same details as the row has always shown.
  const receivables = useMemo(
    () => receivablesSummary(presentation?.invoices ?? [], presentation?.transactions ?? []),
    [presentation?.invoices, presentation?.transactions]
  );
  // Share of the invoiced amount already settled: the Créances card's goal.
  const settlement = useMemo(() => settlementRate(presentation?.invoices ?? []), [presentation?.invoices]);
  const keyStats = useMemo<Stat[]>(
    () =>
      buildKeyFigures(model, receivables, settlement).map(({ line, ...figure }) => ({
        ...figure,
        hint: line,
        icon: KEY_FIGURE_ICONS[figure.id],
      })),
    [model, receivables, settlement]
  );

  return (
    <div className="premium-overview-shell flex flex-col gap-6 w-full">
      {/* 1. Welcome: the greeting alone, at the very top so the figures show on opening; no title, no date.
          The quick actions and the view switch stay one click away, beside it. */}
      <section aria-label="Accueil" className="dashboardWelcome">
          <h1 className="heroTitle">Bonjour <span className="heroName">{userName}</span>, ravi de vous retrouver <span className="dashboard-greeting-wave" aria-hidden="true">👋</span></h1>

          <div className="heroActions">
            <ShortcutTooltip label="Nouvelle consultation" shortcut="N">
              <button
                type="button"
                className="btn btnPrimary"
                data-primary-action="true"
                aria-keyshortcuts="N"
                onClick={handleNewAppointment}
              >
                <Stethoscope size={16} strokeWidth={1.5} aria-hidden="true" />
                <span>Nouvelle consultation</span>
              </button>
            </ShortcutTooltip>

            <button
              type="button"
              className="btn btnSecondary"
              onClick={handleNewPatient}
            >
              <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>Nouveau patient</span>
            </button>

            {dashboardViewControl}
          </div>
      </section>

      {clinicalView ? <div className="premium-clinical-overview">{clinicalView}</div> : <>
      {/* 2. Contiguous Period Filters Ribbon (Reference .filters) */}
      <div className="filters">
        <div aria-label="Période du tableau de bord" className="filter-segments" data-tabs-style="segmented" role="group">
        {ANALYTICS_PERIODS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className="filter"
            data-active={period === opt.value}
            aria-pressed={period === opt.value}
            onClick={() => onPeriod(opt.value)}
          >
            {opt.label}
          </button>
        ))}
        </div>
        {/* Any two days: the figures and the chart below follow them. */}
        <div aria-label="Période personnalisée" className="filterDates" data-active={period === "custom" || undefined} role="group">
          <DatePicker
            aria-label="Début de la période"
            className="filterDate"
            max={pickedTo}
            onChange={(value) => value && onCustomRange?.({ from: value, to: pickedTo })}
            value={pickedFrom}
          />
          <span aria-hidden="true" className="filterDatesTo">au</span>
          <DatePicker
            aria-label="Fin de la période"
            className="filterDate"
            min={pickedFrom}
            onChange={(value) => value && onCustomRange?.({ from: pickedFrom, to: value })}
            value={pickedTo}
          />
        </div>
        <div className="filterGap" />
        <div className="filterRange">
          <CalendarDays size={14} strokeWidth={1} aria-hidden="true" />
          <span>{rangeLabel}</span>
          <span aria-hidden="true">·</span>
          <span>Mis à jour à {formatTime(updatedAt)}</span>
        </div>
      </div>

      {/* 3. The key figures, on one single row: Trésorerie, Rendez-vous, Créances, Actions à suivre. */}
      <div aria-atomic="true" aria-live="polite">
        <StatGrid
          className="max-w-none"
          data={keyStats}
          icon={LayoutGrid}
          layout="row"
          goals={keyView === "kpi"}
          sparklines={keyView === "sparklines"}
          subtitle={rangeLabel}
          title="Chiffres clés"
          // The widget's two views, as TuffUI has them, named in French: « Indicateurs » (the cards with their goal bar)
          // and « Mini-graphiques » (the cards with their sparkline).
          toolbar={
            <div aria-label="Affichage des chiffres clés" className="filter-segments" data-tabs-style="segmented" role="group">
              {(["kpi", "sparklines"] as const).map((view) => (
                <button
                  aria-pressed={keyView === view}
                  className="filter"
                  data-active={keyView === view}
                  key={view}
                  onClick={() => setKeyView(view)}
                  type="button"
                >
                  {view === "kpi" ? "Indicateurs" : "Mini-graphiques"}
                </button>
              ))}
            </div>
          }
          onSelect={(stat) =>
            ({
              cash: onFinances,
              appointments: () => onNavigate?.("agenda"),
              receivables: onFinances,
              actions: onActions,
            })[stat.id as KeyFigureId]()
          }
        />
      </div>

      {/* 4. Recettes & activité, full width. */}
      <RevenueChartWidget
        footer={
          <>
            {/* The month's forecast: no figure from a journal still loading. */}
            {states.cash.loading ? null : <ForecastBar forecast={forecast} />}
            <WidgetFooter action="Finances" onAction={onFinances}>
              Encaissements payés, {chartIsWeekly ? "par semaine" : "par jour"} · consultations hors annulations et absences
            </WidgetFooter>
          </>
        }
        kinds={chartKinds}
        periodControl={chartPeriodControl}
        points={chartPoints}
        rangeLabel={chartRangeLabel}
      />

      {/* 5. Under the chart, half and half: the clinic's activity, then Cette semaine. */}
      <div className="pairRow">
        <ActivityHexWidget appointments={presentation?.appointments ?? []} now={updatedAt} />

        <WeekRadialWidget appointments={presentation?.appointments ?? []} facts={weekStats} now={updatedAt} />
      </div>
      </>}
    </div>
  );
}
