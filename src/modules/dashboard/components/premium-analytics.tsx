"use client";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BedDouble,
  Bell,
  Calendar,
  CalendarDays,
  ClipboardCheck,
  Package,
  Plus,
  Receipt,
  Stethoscope,
  UsersRound,
  Wallet,
} from "lucide-react";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { firstNameOf, formatNumber } from "@/utils/display-format";
import { formatCentimes, formatTime, type ScheduleEntry } from "../v2/model";
import { monotonePath, splitUnit } from "./chart-path";
import {
  ANALYTICS_PERIODS,
  type AnalyticsPeriod,
  type buildPremiumAnalytics,
} from "../model/premium-analytics";
import { prepareAppointment } from "@/modules/shell/model/clinical-actions";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { getAppointmentTypeMeta } from "@/config/status-meta";
import { cn } from "@/lib/utils";
import { PageDate } from "@/components/PageDate";
import { ShortcutTooltip } from "@/design-system/patterns/shortcut-tooltip";
import type { WidgetState } from "./clinical/shared";
import type { View } from "@/types";
import "./premium-analytics.css";

interface PremiumAnalyticsProps {
  model: ReturnType<typeof buildPremiumAnalytics>;
  period: AnalyticsPeriod;
  onPeriod: (period: AnalyticsPeriod) => void;
  states: { cash: WidgetState; patients: WidgetState; actions: WidgetState };
  onFinances: () => void;
  onPatients: () => void;
  onActions: () => void;
  onNavigate?: (view: View) => void;
  dashboardViewControl?: React.ReactNode;
  nextAppointment?: ScheduleEntry;
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
  financials?: {
    income: number;
    pending: number;
    receivables?: any;
  };
  /** Shows the visit in Flux, where visits move on. */
  onStartConsultation?: (appointmentId: string) => void;
  clinicalView?: React.ReactNode;
  /** Rangée « À surveiller » (rappels, stock, hospitalisés), insérée avant « Gestion du cabinet ». */
  watch?: React.ReactNode;
  /** Heure courante (horloge de la page), pour repérer le prochain rendez-vous. */
  now?: Date;
}

function DeltaBadge({
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

/** A KPI's micro-histogram: grey bars, the latest bucket in the series colour. */
function MiniBars({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 0);
  const width = 84;
  const height = 28;
  const gap = values.length > 20 ? 1 : 2;
  const bar = (width - gap * (values.length - 1)) / values.length;
  return (
    <svg
      className="kpiBars"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
    >
      {values.map((value, i) => {
        const h = max ? Math.max(2, (value / max) * height) : 2;
        return (
          <rect
            // Bars are positional and never reorder.
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed buckets
            key={i}
            data-current={i === values.length - 1 ? "" : undefined}
            x={i * (bar + gap)}
            y={height - h}
            width={bar}
            height={h}
            rx={Math.min(1.5, bar / 2)}
          />
        );
      })}
    </svg>
  );
}

/** Size of the plot box: the chart is drawn at the height its card gives it. */
function usePlotSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ h: number; w: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      setSize({ h: Math.floor(e.contentRect.height), w: Math.floor(e.contentRect.width) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

function scaleTicks(max: number) {
  const raw = Math.max(max, 4) / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  const top = step * 4;
  return { top, ticks: [0, 1, 2, 3, 4].map((i) => Math.round(step * i * 100) / 100) };
}

interface TrendPoint {
  label: string;
  long: string;
  receipts: number;
  visits: number;
}

const T_CHART = { h: 220, top: 16, bottom: 28, left: 54, right: 34 };

function TrendChartCurve({ points }: { points: TrendPoint[] }) {
  const [ref, size] = usePlotSize();
  const w = size?.w ?? null;
  // Never shorter than the drawn minimum; taller when the row stretches the card.
  const chartH = Math.max(T_CHART.h, size?.h ?? 0);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const n = points.length;
  const maxReceipts = Math.max(1, ...points.map((p) => p.receipts));
  const maxVisits = Math.max(1, ...points.map((p) => p.visits));

  const { top: topReceipts, ticks: receiptTicks } = scaleTicks(maxReceipts);
  // Consultations have their own scale, read on the right-hand axis.
  const { top: topVisits, ticks: visitTicks } = scaleTicks(maxVisits);

  const width = w ?? 0;
  const plotW = Math.max(0, width - T_CHART.left - T_CHART.right);
  const plotH = chartH - T_CHART.top - T_CHART.bottom;

  const x = (k: number) => T_CHART.left + (n <= 1 ? plotW / 2 : (k * plotW) / (n - 1));
  const yReceipts = (v: number) => T_CHART.top + plotH - (v / topReceipts) * plotH;
  const yVisits = (v: number) => T_CHART.top + plotH - (v / topVisits) * plotH;

  const gradientId = useId().replace(/:/g, "");
  const lineReceipts = monotonePath(points.map((p, k) => [x(k), yReceipts(p.receipts)]));
  const lineVisits = monotonePath(points.map((p, k) => [x(k), yVisits(p.visits)]));
  const closeArea = (line: string) =>
    n ? `${line} L${x(n - 1).toFixed(1)},${yReceipts(0)} L${x(0).toFixed(1)},${yReceipts(0)} Z` : "";
  const areaReceipts = closeArea(lineReceipts);
  const areaVisits = closeArea(lineVisits);

  // Points de données : discrets, seulement quand la période reste lisible.
  const showPoints = n > 1 && n <= 45;
  const peakIdx = points.reduce(
    (best, p, k) => (p.receipts > (points[best]?.receipts ?? 0) ? k : best),
    0
  );
  const peak = points[peakIdx];
  const hasPeak = Boolean(peak && peak.receipts > 0);
  const peakAnchor = x(peakIdx) > width - 90 ? "end" : x(peakIdx) < T_CHART.left + 60 ? "start" : "middle";
  const columnW = n > 1 ? plotW / (n - 1) : plotW;

  // Labels keep at least 76 px between them (a label is ~45 px wide, the first one is start-aligned): thin them
  // at a fixed interval, and let the last one replace a neighbour that is too close.
  const minGap = 76;
  const step = n > 1 ? plotW / (n - 1) : plotW;
  const every = Math.max(1, Math.ceil(minGap / Math.max(step, 1)));
  const shownLabels = new Set<number>();
  for (let k = 0; k < n; k += every) shownLabels.add(k);
  if (n > 1 && !shownLabels.has(n - 1)) {
    const lastShown = Math.max(...shownLabels);
    if (lastShown > 0 && (n - 1 - lastShown) * step < minGap) shownLabels.delete(lastShown);
    shownLabels.add(n - 1);
  }

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (plotW <= 0 || n <= 1) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const k = Math.round(((px - T_CHART.left) / plotW) * (n - 1));
    setActiveIdx(Math.min(n - 1, Math.max(0, k)));
  };

  const hot = activeIdx !== null ? points[activeIdx] : null;
  const tipLeft =
    activeIdx !== null
      ? Math.min(Math.max(x(activeIdx) + 12, 10), Math.max(10, width - 210))
      : 0;

  return (
    <div className="chartWrap">
      <div className="chartLegend">
        <span className="chartLegendItem">
          <i className="chartLegendKey" style={{ background: "var(--series-1)" }} />
          <span>Recettes (DA)</span>
        </span>
        <span className="chartLegendItem">
          <i className="chartLegendKey" style={{ background: "var(--series-2)" }} />
          <span>Consultations (échelle de droite)</span>
        </span>
      </div>

      <div ref={ref} className="chartPlot">
        {w !== null && (
          <svg
            width={width}
            height={chartH}
            role="img"
            aria-label="Évolution des recettes et du volume de consultations"
            tabIndex={0}
            onPointerMove={handlePointer}
            onPointerLeave={() => setActiveIdx(null)}
            onFocus={() => setActiveIdx(n - 1)}
            onBlur={() => setActiveIdx(null)}
          >
            {/* Horizontal Gridlines */}
            {receiptTicks.map((t) => (
              <g key={t}>
                <line
                  x1={T_CHART.left}
                  x2={width - T_CHART.right}
                  y1={yReceipts(t)}
                  y2={yReceipts(t)}
                  className={t ? "chartGridLine" : "chartBaseline"}
                />
                <text x={T_CHART.left - 8} y={yReceipts(t)} className="chartTickY">
                  {formatNumber(t)}
                </text>
              </g>
            ))}
            {visitTicks.map((t) => (
              <text
                key={`v${t}`}
                x={width - T_CHART.right + 8}
                y={yVisits(t)}
                className="chartTickY chartTickVisits"
              >
                {formatNumber(t)}
              </text>
            ))}

            {/* X-axis labels */}
            {points.map((p, k) =>
              shownLabels.has(k) ? (
                <text
                  key={k}
                  x={x(k)}
                  y={chartH - 8}
                  className="chartTickX"
                  textAnchor={
                    n > 1 && k === n - 1
                      ? "end"
                      : n > 1 && k === 0
                      ? "start"
                      : "middle"
                  }
                >
                  {p.label}
                </text>
              ) : null
            )}

            <defs>
              <linearGradient id={`${gradientId}-receipts`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" style={{ stopColor: "var(--series-1)", stopOpacity: 0.26 }} />
                <stop offset="65%" style={{ stopColor: "var(--series-1)", stopOpacity: 0.06 }} />
                <stop offset="100%" style={{ stopColor: "var(--series-1)", stopOpacity: 0 }} />
              </linearGradient>
              <linearGradient id={`${gradientId}-visits`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" style={{ stopColor: "var(--series-2)", stopOpacity: 0.14 }} />
                <stop offset="100%" style={{ stopColor: "var(--series-2)", stopOpacity: 0 }} />
              </linearGradient>
            </defs>

            {/* Colonne survolée */}
            {activeIdx !== null && n > 1 ? (
              <rect
                className="chartColumn"
                height={plotH}
                width={Math.max(6, columnW)}
                x={x(activeIdx) - Math.max(6, columnW) / 2}
                y={T_CHART.top}
              />
            ) : null}

            {/* Aires en dégradé, recettes au premier plan */}
            <path className="chartArea chartAreaVisits" d={areaVisits} fill={`url(#${gradientId}-visits)`} />
            <path className="chartArea" d={areaReceipts} fill={`url(#${gradientId}-receipts)`} />

            {/* Halo doux sous les courbes, pour la profondeur */}
            <path className="chartGlow" d={lineVisits} stroke="var(--series-2)" />
            <path className="chartGlow" d={lineReceipts} stroke="var(--series-1)" />

            {/* Series 2: Consultations curve (Orange) */}
            <path
              d={lineVisits}
              className="chartLine chartLineDraw"
              pathLength={1}
              stroke="var(--series-2)"
              opacity={0.9}
            />

            {/* Series 1: Recettes curve (Blue) */}
            <path
              d={lineReceipts}
              className="chartLine chartLineDraw"
              pathLength={1}
              stroke="var(--series-1)"
            />

            {/* Points de données */}
            {showPoints
              ? points.map((p, k) =>
                  p.receipts > 0 ? (
                    <circle
                      className="chartPoint"
                      cx={x(k)}
                      cy={yReceipts(p.receipts)}
                      data-active={activeIdx === k || undefined}
                      fill="var(--series-1)"
                      key={`r${k}`}
                      r={2.5}
                    />
                  ) : null
                )
              : null}

            {/* Pic de la période */}
            {hasPeak && activeIdx === null ? (
              <g className="chartPeak">
                <circle cx={x(peakIdx)} cy={yReceipts(peak.receipts)} r={8} className="chartPeakHalo" />
                <circle cx={x(peakIdx)} cy={yReceipts(peak.receipts)} r={3.5} fill="var(--series-1)" className="chartDot" />
                <text
                  className="chartPeakLabel"
                  textAnchor={peakAnchor}
                  x={x(peakIdx)}
                  y={Math.max(12, yReceipts(peak.receipts) - 14)}
                >
                  {formatNumber(peak.receipts)} DA
                </text>
              </g>
            ) : null}

            {/* Interactive hover crosshair and dots */}
            {activeIdx !== null && hot && (
              <g>
                <line
                  x1={x(activeIdx)}
                  x2={x(activeIdx)}
                  y1={T_CHART.top}
                  y2={yReceipts(0)}
                  className="chartCrosshair"
                />
                {/* The hovered day is named on the axis, over the regular labels. */}
                <text
                  x={x(activeIdx)}
                  y={chartH - 8}
                  className="chartTickX chartTickXActive"
                  textAnchor={
                    activeIdx === n - 1 ? "end" : activeIdx === 0 ? "start" : "middle"
                  }
                >
                  {hot.label}
                </text>
                <g className="chartHot" style={{ transform: `translate(${x(activeIdx)}px, ${yVisits(hot.visits)}px)` }}>
                  <circle r={10} fill="var(--series-2)" className="chartHalo" />
                  <circle r={4.5} fill="var(--series-2)" className="chartDot" />
                </g>
                <g className="chartHot" style={{ transform: `translate(${x(activeIdx)}px, ${yReceipts(hot.receipts)}px)` }}>
                  <circle r={10} fill="var(--series-1)" className="chartHalo" />
                  <circle r={4.5} fill="var(--series-1)" className="chartDot" />
                </g>
              </g>
            )}
          </svg>
        )}

        {/* Readout floating tooltip */}
        {hot && (
          <div
            className="chartTip"
            style={{ left: 0, top: 10, transform: `translateX(${tipLeft}px)` }}
            aria-hidden="true"
          >
            <div className="chartTipHead">{hot.long}</div>
            <div className="chartTipRow">
              <i
                className="chartTipKey"
                style={{ background: "var(--series-1)" }}
              />
              <span>
                <strong>{formatNumber(hot.receipts)} DA</strong> recettes
              </span>
            </div>
            <div className="chartTipRow">
              <i
                className="chartTipKey"
                style={{ background: "var(--series-2)" }}
              />
              <span>
                <strong>{hot.visits}</strong> consultations
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Chiffre principal avec son unité en retrait (« 13 900 » + « DA »). */
function FactValue({ text }: { text: string }) {
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
  onFinances,
  onPatients,
  onActions,
  onNavigate,
  dashboardViewControl,
  nextAppointment,
  presentation,
  today,
  financials,
  onStartConsultation,
  clinicalView,
  watch,
  now,
}: PremiumAnalyticsProps) {
  const { currentUser } = useAuth();
  const userName = firstNameOf(currentUser?.displayName, "Docteur");
  const { cash, patients, actions, ranges, trend } = model;
  const updatedAt = now ?? new Date();

  const dateOptions = { day: "numeric", month: "short" } as const;
  const rangeLabel =
    period === "today"
      ? ranges.current.from.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : `Du ${ranges.current.from.toLocaleDateString("fr-FR", dateOptions)} au ${ranges.current.to.toLocaleDateString("fr-FR", { ...dateOptions, year: "numeric" })}`;

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

  const nextTimeFormatted = useMemo(() => {
    if (!nextAppointment) return null;
    try {
      const d = new Date(nextAppointment.appointment.startTime);
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return null;
    }
  }, [nextAppointment]);

  // Compute trend points for the selected period
  const chartPoints = useMemo<TrendPoint[]>(() => {
    const transactions = presentation?.transactions || [];
    const appointments = presentation?.appointments || [];
    const { from, to } = ranges.current;

    const daysCount = Math.max(
      1,
      Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
    );

    const step = daysCount <= 1 ? 1 : daysCount <= 7 ? 1 : daysCount <= 31 ? 3 : 7;
    const points: TrendPoint[] = [];

    const cursor = new Date(from);
    while (cursor <= to) {
      const bucketEnd = new Date(
        Math.min(cursor.getTime() + step * 24 * 60 * 60 * 1000 - 1, to.getTime())
      );

      const receiptsSum = transactions
        .filter((t) => {
          if (t.type !== "income" || t.status !== "paid" || !t.date) return false;
          const d = new Date(t.date);
          return d >= cursor && d <= bucketEnd;
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const visitsCount = appointments.filter((a) => {
        if (!a.startTime || ["cancelled", "no_show"].includes(a.status)) return false;
        const d = new Date(a.startTime);
        return d >= cursor && d <= bucketEnd;
      }).length;

      const label =
        daysCount <= 1
          ? cursor.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
          : cursor.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

      const long =
        daysCount <= 1
          ? cursor.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
          : cursor.toLocaleDateString("fr-FR", {
              weekday: "short",
              day: "numeric",
              month: "long",
              year: "numeric",
            });

      points.push({
        label,
        long,
        receipts: receiptsSum / 100, // into standard DA
        visits: visitsCount,
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
  }, [ranges, presentation?.transactions, presentation?.appointments]);

  // Compute "Cette semaine" stats
  // Premier rendez-vous du jour encore à venir ou en cours : simple repère visuel.
  const nextUpId = useMemo(() => {
    const nowMs = now?.getTime();
    return today?.slice(0, 3).find((row) => {
      if (["completed", "cancelled", "no_show"].includes(row.appointment.status)) return false;
      if (nowMs === undefined) return true;
      const end = new Date(row.appointment.endTime ?? row.appointment.startTime).getTime();
      return Number.isNaN(end) || end >= nowMs;
    })?.appointment.id;
  }, [today, now]);

  const weekStats = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const transactions = presentation?.transactions || [];
    const appointments = presentation?.appointments || [];
    const invoices = presentation?.invoices || [];

    const weekTransactions = transactions.filter((t) => {
      if (t.type !== "income" || t.status !== "paid" || !t.date) return false;
      const d = new Date(t.date);
      return d >= startOfWeek && d <= now;
    });

    const weekIncome = weekTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);

    const visitsBetween = (from: Date, to: Date) =>
      appointments.filter((a) => {
        if (!a.startTime || ["cancelled", "no_show"].includes(a.status)) return false;
        const d = new Date(a.startTime);
        return d >= from && d <= to;
      }).length;
    // Same scope as the 30-day KPI: every visit of the week up to tonight,
    // finished, under way or still planned today.
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const weekVisits = visitsBetween(startOfWeek, endOfToday);
    // Last week up to the same day and hour, so the two figures cover the same span.
    const weekAgo = (d: Date) => new Date(d.getTime() - 7 * 86_400_000);
    const previousIncome = transactions
      .filter((t) => {
        if (t.type !== "income" || t.status !== "paid" || !t.date) return false;
        const d = new Date(t.date);
        return d >= weekAgo(startOfWeek) && d <= weekAgo(now);
      })
      .reduce((acc, t) => acc + (t.amount || 0), 0);
    const previousVisits = visitsBetween(weekAgo(startOfWeek), weekAgo(endOfToday));

    const issuedCount = invoices.filter((i) => i.documentStatus === "issued").length;
    const paidCount = invoices.filter((i) => i.documentStatus === "paid").length;
    const rate = issuedCount + paidCount > 0
      ? Math.round((paidCount / (issuedCount + paidCount)) * 1000) / 10
      : null; // Sans facture émise ou réglée, il n'y a pas de taux à afficher.

    const pending = financials?.pending ?? 0;

    return {
      since: startOfWeek,
      income: weekIncome,
      previousIncome,
      visits: weekVisits,
      previousVisits,
      rate,
      pending,
    };
  }, [presentation?.transactions, presentation?.appointments, presentation?.invoices, financials?.pending]);

  // Quick Access Modules definition
  const cabinetTiles = useMemo(
    () => [
      {
        id: "agenda",
        title: "Agenda & Rendez-vous",
        description: "Planning des rendez-vous et disponibilités en direct",
        count: `${today?.length ?? 0} RDV aujourd'hui`,
        icon: Calendar,
        action: () => onNavigate?.("agenda"),
      },
      {
        id: "clinique",
        title: "Soins & hospitalisation",
        description: "Soins du jour, hospitalisations et rappels médicaux",
        icon: Stethoscope,
        action: () => onNavigate?.("clinique"),
      },
      {
        id: "patients",
        title: "Dossiers Patients",
        description: "Fiches animales, antécédents médicaux et maîtres",
        count: `${presentation?.patients.length ?? patients.count} patients`,
        icon: UsersRound,
        action: onPatients,
      },
      {
        id: "stock",
        title: "Produits",
        description: "Médicaments, lots FIFO et seuils de réapprovisionnement",
        // No figure rather than a made-up one while the catalogue loads.
        count: presentation ? `${presentation.products.length} références` : undefined,
        icon: Package,
        action: () => onNavigate?.("stock"),
      },
      {
        id: "finances",
        title: "Facturation & Devis",
        description: "Factures émises, règlements et gestion des devis",
        count: `${formatCentimes(cash.income)} sur la période`,
        icon: Receipt,
        action: onFinances,
      },
      {
        id: "hospitalisations",
        title: "Hospitalisations",
        description: "Animaux admis en clinique et feuilles de soins",
        icon: BedDouble,
        action: () => onNavigate?.("soins"),
      },
      {
        id: "taches",
        title: "Rappels & Vaccins",
        description: "Vaccinations à échéance et relances propriétaires",
        count: `${actions.count} action${actions.count > 1 ? "s" : ""} à suivre`,
        icon: Bell,
        action: onActions,
      },
      {
        id: "analyses",
        title: "Bilan & Analyses",
        description: "Indicateurs de performance et synthèse comptable",
        icon: BarChart3,
        action: onFinances,
      },
    ],
    [
      today?.length,
      patients.count,
      presentation,
      cash.income,
      actions.count,
      onNavigate,
      onPatients,
      onFinances,
      onActions,
    ]
  );

  return (
    <div className="premium-overview-shell flex flex-col gap-6 w-full">
      {/* 1. Hero Overview Frame (Reference .hero.frame) */}
      <section className="hero frame">
        <div className="heroMain">
          <div>
            <p className="kicker">
              Tableau de bord
              <i aria-hidden="true" />
              <PageDate />
            </p>
            <h1 className="heroTitle">Bonjour {userName}, ravi de vous retrouver <span className="dashboard-greeting-wave" aria-hidden="true">👋</span></h1>
            <p className="heroNote">
              Votre journée au cabinet, les patients à suivre et les priorités, en un coup d’œil.
            </p>
          </div>

          <div className="next">
            <span className="nextLabel">Prochain rendez-vous</span>
            {nextAppointment ? (
              <>
                <span className="nextWhen">
                  {nextTimeFormatted ? `Aujourd'hui à ${nextTimeFormatted}` : "Aujourd'hui"}
                </span>
                <span className="nextWho">
                  avec{" "}
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate?.("agenda");
                    }}
                    className="nextWhoLink"
                  >
                    {nextAppointment.patientName || "Patient"}
                    {nextAppointment.ownerName
                      ? ` (${nextAppointment.ownerName})`
                      : ""}
                  </button>
                </span>
              </>
            ) : (
              <>
                <span className="nextWhen">Aucun rendez-vous</span>
                <span className="nextWho">
                  Les nouveaux rendez-vous apparaîtront dès réservation.
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Band with the signature cross-hatch background pattern */}
        <div className="heroBand">
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
          </div>

          <button type="button" className="host" onClick={() => onNavigate?.("agenda")}>
            <span>Voir le planning du jour</span>
            <ArrowUpRight size={14} strokeWidth={1} aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* The view switch changes the view, it is not an action: it heads the
          row under the welcome band, in the same place in both views. */}
      {clinicalView ? <>
      {dashboardViewControl ? <div className="filters dashboard-view-row">{dashboardViewControl}</div> : null}
      <div className="premium-clinical-overview">{clinicalView}</div>
      </> : <>
      {/* 2. Contiguous Period Filters Ribbon (Reference .filters) */}
      <div className="filters dashboard-view-row">
        {dashboardViewControl}
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
        <div className="filterGap" />
        <div className="filterRange">
          <CalendarDays size={14} strokeWidth={1} aria-hidden="true" />
          <span>{rangeLabel}</span>
          <span aria-hidden="true">·</span>
          <span>Mis à jour à {formatTime(updatedAt)}</span>
        </div>
      </div>

      {/* 3. 4-Column Ruled Lattice KPIs (Reference .kpis.frame) */}
      <div className="kpis frame" aria-live="polite" aria-atomic="true">
        {/* Cell 1: Trésorerie */}
        <button
          type="button"
          className="kpi"
          onClick={onFinances}
          aria-label="Voir la trésorerie"
        >
          <span className="kpiHead">
            <span>
              <Wallet size={16} strokeWidth={1} aria-hidden="true" />
              Trésorerie
            </span>
            <ArrowRight size={15} strokeWidth={1} className="kpiGo" aria-hidden="true" />
          </span>
          <span className="kpiValueRow">
            <span className="kpiValue">{formatCentimes(cash.income)}</span>
            <MiniBars values={trend.income} label="Recettes encaissées sur la période" />
          </span>
          <span className="kpiSub">
            <DeltaBadge
              value={cash.change}
              previous={cash.previous / 100}
              current={cash.income / 100}
              previousLabel={formatCentimes(cash.previous)}
            />
            <span className="kpiDetailRow">
              Solde net : {formatCentimes(cash.net)} · Dépenses : {formatCentimes(cash.expense)}
            </span>
          </span>
        </button>

        {/* Cell 2: Consultations */}
        <button
          type="button"
          className="kpi"
          onClick={onPatients}
          aria-label="Voir les consultations"
        >
          <span className="kpiHead">
            <span>
              <Stethoscope size={16} strokeWidth={1} aria-hidden="true" />
              Consultations
            </span>
            <ArrowRight size={15} strokeWidth={1} className="kpiGo" aria-hidden="true" />
          </span>
          <span className="kpiValueRow">
            <span className="kpiValue">{formatNumber(patients.visits)}</span>
            <MiniBars values={trend.visits} label="Consultations sur la période" />
          </span>
          <span className="kpiSub">
            <DeltaBadge
              value={patients.visitsChange}
              previous={patients.previousVisits}
              current={patients.visits}
              previousLabel={formatNumber(patients.previousVisits)}
            />
            <span className="kpiDetailRow">
              {patients.completed} terminée{patients.completed > 1 ? "s" : ""} · {patients.underway} en cours
              {patients.planned ? ` · ${patients.planned} prévue${patients.planned > 1 ? "s" : ""}` : ""}
            </span>
          </span>
        </button>

        {/* Cell 3: Suivi patients */}
        <button
          type="button"
          className="kpi"
          onClick={onPatients}
          aria-label="Voir les dossiers patients"
        >
          <span className="kpiHead">
            <span>
              <UsersRound size={16} strokeWidth={1} aria-hidden="true" />
              Patients suivis
            </span>
            <ArrowRight size={15} strokeWidth={1} className="kpiGo" aria-hidden="true" />
          </span>
          <span className="kpiValueRow">
            <span className="kpiValue">{formatNumber(patients.count)}</span>
            <MiniBars values={trend.patients} label="Patients vus sur la période" />
          </span>
          <span className="kpiSub">
            <DeltaBadge
              value={patients.change}
              previous={patients.previous}
              current={patients.count}
              previousLabel={formatNumber(patients.previous)}
            />
            <span className="kpiDetailRow">
              {patients.newRecords} nouveaux dossiers dans la période
            </span>
          </span>
        </button>

        {/* Cell 4: Actions à suivre */}
        <button
          type="button"
          className="kpi"
          onClick={onActions}
          aria-label="Voir les actions et rappels"
        >
          <span className="kpiHead">
            <span>
              <ClipboardCheck size={16} strokeWidth={1} aria-hidden="true" />
              Actions à suivre
            </span>
            <ArrowRight size={15} strokeWidth={1} className="kpiGo" aria-hidden="true" />
          </span>
          <span className="kpiValue">{formatNumber(actions.count)}</span>
          <span className="kpiSub">
            <DeltaBadge
              value={actions.change}
              previous={actions.previous}
              current={actions.count}
              inverse
              previousLabel={formatNumber(actions.previous)}
            />
            <span className="kpiDetailRow">
              {actions.urgent} prioritaires · {actions.reminders} vaccins · {actions.tasks} tâches
            </span>
          </span>
        </button>
      </div>

      {/* 4. Split Section: Left Curve Chart (Recettes) & Right Facts / Upcoming (Reference .split) */}
      <div className="split">
        {/* Left Card: Recettes & Volume Chart (Reference TrendChart) */}
        <div className="card frame">
          <div className="cardHead">
            <div>
              <h2 className="cardTitle">Recettes & activité</h2>
              <p className="cardNote">Encaissements en DA et consultations, par jour</p>
            </div>
            <button type="button" className="moreLink" onClick={onFinances}>
              Finances <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>
          <div className="cardFlush">
            <TrendChartCurve points={chartPoints} />
          </div>
        </div>

        {/* Right Card: Cette semaine & Prochains rendez-vous (Reference .facts and .table) */}
        <div className="card frame">
          <div className="cardHead">
            <div>
              <h2 className="cardTitle">Cette semaine</h2>
              <p className="cardNote">
                Depuis{" "}
                {weekStats.since.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
            <button
              type="button"
              className="moreLink"
              onClick={() => onNavigate?.("agenda")}
            >
              Agenda <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>
          <div className="cardFlush">
            <dl className="facts">
              <div>
                <dt>Recettes encaissées</dt>
                <FactValue text={formatCentimes(weekStats.income)} />
                <dd className="factNote">
                  Semaine dernière : {formatCentimes(weekStats.previousIncome)}
                </dd>
              </div>
              <div>
                <dt>Consultations</dt>
                <FactValue text={String(weekStats.visits)} />
                <dd className="factNote">
                  Semaine dernière : {formatNumber(weekStats.previousVisits)}
                </dd>
              </div>
              <div>
                <dt>Taux de règlement</dt>
                {weekStats.rate === null ? (
                  <dd className="factEmpty">Aucune facture</dd>
                ) : (
                  <>
                    <FactValue text={`${formatNumber(weekStats.rate, { maximumFractionDigits: 1 })} %`} />
                    <span aria-hidden="true" className="factMeter">
                      <i style={{ width: `${Math.min(100, Math.max(0, weekStats.rate))}%` }} />
                    </span>
                  </>
                )}
                <dd className="factNote">Sur toutes les factures émises</dd>
              </div>
              <div data-attention={weekStats.pending > 0 || undefined}>
                <dt>Reste à recouvrer</dt>
                <FactValue text={formatCentimes(weekStats.pending)} />
                <dd className="factNote">Toutes périodes confondues</dd>
              </div>
            </dl>

            {/* Upcoming Appointments Table */}
            {today && today.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Quand</th>
                      <th>Patient</th>
                      <th>Motif</th>
                      <th style={{ width: 44, textAlign: "right" }} aria-label="Action" />
                    </tr>
                  </thead>
                  <tbody>
                    {today.slice(0, 3).map((row) => {
                      const isNext = row.appointment.id === nextUpId;
                      const timeStr = row.appointment.startTime
                        ? new Date(row.appointment.startTime).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Aujourd'hui";
                      return (
                        <tr data-next={isNext || undefined} key={row.appointment.id}>
                          <td>
                            <strong className="whenTime">{timeStr}</strong>
                            {isNext ? <span className="whenNext">À suivre</span> : null}
                          </td>
                          <td>
                            <div className="flex flex-col">
                              <span style={{ fontWeight: 500, color: "var(--ink)" }}>
                                {row.patientName || "Patient"}
                              </span>
                              {row.ownerName && (
                                <span style={{ fontSize: 12, color: "var(--faint)" }}>
                                  {row.ownerName}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <Badge
                              className={cn(
                                "border-transparent",
                                getAppointmentTypeMeta(row.appointment.type).badgeClassName
                              )}
                              variant="outline"
                            >
                              {row.appointment.type || "Consultation"}
                            </Badge>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <ShortcutTooltip label="Suivre dans Flux">
                              <button
                                type="button"
                                className="iconBtn"
                                aria-label={`Suivre ${row.patientName || "la visite"} dans Flux`}
                                onClick={() =>
                                  onStartConsultation?.(row.appointment.id)
                                }
                              >
                                <ArrowRight size={13} strokeWidth={1.5} aria-hidden="true" />
                              </button>
                            </ShortcutTooltip>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p
                style={{
                  margin: 0,
                  padding: "24px 20px",
                  background: "var(--band)",
                  fontSize: 13,
                  textAlign: "center",
                  color: "var(--faint)",
                }}
              >
                Aucun rendez-vous restant aujourd'hui.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 4b. À surveiller : rappels, stock, hospitalisés */}
      {watch}

      {/* 5. Ruled Lattice Quick Modules: Gestion du cabinet (Reference .tiles.frame) */}
      <div className="card frame">
        <div className="cardHead">
          <div>
            <h2 className="cardTitle">Gestion du cabinet</h2>
            <p className="cardNote">Accès direct et suivi opérationnel des modules cliniques</p>
          </div>
        </div>
        <div className="tiles">
          {cabinetTiles.map((tile) => (
            <button
              key={tile.id}
              type="button"
              className="tile"
              onClick={tile.action}
            >
              <div className="tileTop">
                <tile.icon size={18} strokeWidth={1} aria-hidden="true" />
                {"count" in tile && tile.count ? <span className="tileCount">{tile.count}</span> : null}
                <ArrowRight
                  size={14}
                  strokeWidth={1}
                  className="kpiGo"
                  aria-hidden="true"
                />
              </div>
              <div className="tileText">
                <strong>{tile.title}</strong>
                <span>{tile.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      </>}
    </div>
  );
}
