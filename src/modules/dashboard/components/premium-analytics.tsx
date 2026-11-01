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
import React, { useMemo, useState } from "react";
import { firstNameOf, formatNumber } from "@/utils/display-format";
import { formatCentimes, formatTime, parseDashboardDate, type ScheduleEntry } from "../v2/model";
import { settlementRate } from "../v2/financial-model";
import { splitUnit } from "./chart-path";
import {
  ANALYTICS_PERIODS,
  analyticsRanges,
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
import { buildDayUnits, buildMonthForecast, type VisitKindRow } from "../model/dashboard-widgets";
import { DayUnits, ForecastBar, WidgetFooter } from "./widget-units";
import { FocusTrendChart, type FocusPoint } from "./focus-trend-chart";
import { ActivityHeatmap } from "./activity-heatmap";
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

/**
 * The period's visits by kind: the leading kind named, then every kind as one
 * segment of a single bar, in the same tones as the species split.
 */
function MiniKinds({ rows }: { rows: VisitKindRow[] }) {
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
function MiniArea({ values, label }: { values: number[]; label: string }) {
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

/** The chart's own periods: a single day draws no curve. */
const CHART_PERIODS = ANALYTICS_PERIODS.filter((option) => option.value !== "today");
type ChartPeriod = (typeof CHART_PERIODS)[number]["value"];

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
  states,
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

  // The chart's own period, set from its card; it follows the page's period
  // when that one changes (a single day has no curve: a week instead).
  const pagePeriod: ChartPeriod = period === "today" ? "7d" : period;
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>(pagePeriod);
  const [followedPeriod, setFollowedPeriod] = useState(pagePeriod);
  if (followedPeriod !== pagePeriod) {
    setFollowedPeriod(pagePeriod);
    setChartPeriod(pagePeriod);
  }
  const chartRanges = useMemo(() => analyticsRanges(chartPeriod, now ?? new Date()), [chartPeriod, now]);

  // Compute trend points for the chart's period
  const chartPoints = useMemo<TrendPoint[]>(() => {
    const transactions = presentation?.transactions || [];
    const appointments = presentation?.appointments || [];
    const ranges = chartRanges;
    const { from, to } = ranges.current;
    // Each bucket's twin in the previous period, the same length earlier.
    const shift = from.getTime() - ranges.previous.from.getTime();
    const isVisit = (a: { startTime?: string; status: string }) =>
      Boolean(a.startTime) && !["cancelled", "no_show"].includes(a.status);

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
        if (!a.startTime || ["cancelled", "no_show"].includes(a.status)) return false;
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
  }, [chartRanges, presentation?.transactions, presentation?.appointments]);

  // The month's receipts and where their pace leads (Recettes card).
  const forecast = useMemo(
    () => buildMonthForecast(presentation?.transactions ?? [], now ?? new Date()),
    [presentation?.transactions, now]
  );
  // The day's appointments as units (Cette semaine card).
  const dayUnits = useMemo(() => buildDayUnits(today ?? []), [today]);

  // Compute "Cette semaine" stats
  // Premier rendez-vous du jour encore à venir ou en cours : simple repère visuel.
  const nextUpId = useMemo(() => {
    const nowMs = now?.getTime();
    return today?.find((row) => {
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

    // Settled share of the invoiced amount, on every issued invoice. Payment is
    // the settlement status, never the document status (draft, issued, void).
    const rate = settlementRate(invoices);

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

            {/* The view switch, icons only, closes the action row in both views. */}
            {dashboardViewControl}
          </div>

          <button type="button" className="host" onClick={() => onNavigate?.("agenda")}>
            <span>Voir le planning du jour</span>
            <ArrowUpRight size={14} strokeWidth={1} aria-hidden="true" />
          </button>
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
            <MiniArea values={trend.income} label="Cumul des recettes encaissées sur la période" />
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
            {/* Its own information: the visits by kind, which no other card shows. */}
            <MiniKinds rows={patients.kinds} />
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
            {/* Distinct patients do not add up across days, and their daily
                bars drew the visits' shape again: the figure alone. */}
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

      {/* 4. Recettes & activité, full width. */}
      <section aria-label="Recettes & activité" className="card frame recettesCard">
        <FocusTrendChart
          periodControl={
            <div aria-label="Période du graphique" className="focusTabs" data-tabs-style="segmented" role="group">
              {CHART_PERIODS.map((option) => (
                <button
                  aria-pressed={chartPeriod === option.value}
                  data-active={chartPeriod === option.value}
                  key={option.value}
                  onClick={() => setChartPeriod(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          }
          points={chartPoints}
        />
        {/* No forecast from a journal still loading. */}
        {states.cash.loading ? null : <ForecastBar forecast={forecast} />}
        <WidgetFooter action="Finances" onAction={onFinances}>
          Encaissements payés, {chartPeriod === "12m" ? "par semaine" : "par jour"} · consultations hors annulations et absences
        </WidgetFooter>
      </section>

      {/* 5. Under the chart, half and half: the clinic's activity, then Cette semaine. */}
      <div className="pairRow">
        <ActivityHeatmap appointments={presentation?.appointments ?? []} now={updatedAt} onAgenda={() => onNavigate?.("agenda")} />

        <div className="card frame weekCard">
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

          </div>
          <div className="cardFlush">
            <dl className="facts">
              {/* The KPI cards above already carry this figure with its comparison. */}
              <div data-clean-hidden="">
                <dt>Recettes encaissées</dt>
                <FactValue text={formatCentimes(weekStats.income)} />
                <dd className="factNote">
                  Semaine dernière : {formatCentimes(weekStats.previousIncome)}
                </dd>
              </div>
              {/* The KPI cards above already carry this figure with its comparison. */}
              <div data-clean-hidden="">
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
                  // The figure alone: Consultations already draws a horizontal bar.
                  <FactValue text={`${formatNumber(weekStats.rate, { maximumFractionDigits: 1 })} %`} />
                )}
                <dd className="factNote">Sur toutes les factures émises</dd>
              </div>
              <div data-attention={weekStats.pending > 0 || undefined}>
                <dt>Reste à recouvrer</dt>
                <FactValue text={formatCentimes(weekStats.pending)} />
                <dd className="factNote">Toutes périodes confondues</dd>
              </div>
            </dl>

            {/* Rendez-vous du jour: units that count at a glance, then the next visits. */}
            <div className="weekDay">
              <h3 className="daySectionTitle">Rendez-vous du jour</h3>
              {dayUnits.total ? (
                <>
                  <DayUnits day={dayUnits} />
                  <ul className="dayList">
                    {today!
                      .filter((row) => !["completed", "cancelled", "no_show"].includes(row.appointment.status))
                      .slice(0, 3)
                      .map((row) => {
                        const isNext = row.appointment.id === nextUpId;
                        const timeStr = row.appointment.startTime
                          ? new Date(row.appointment.startTime).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Aujourd'hui";
                        const type = row.appointment.type || "Consultation";
                        return (
                          <li key={row.appointment.id}>
                            {/* The row follows the visit in Flux, where visits move on. */}
                            <button
                              type="button"
                              className="dayRow"
                              data-next={isNext || undefined}
                              aria-label={`Suivre ${row.patientName || "la visite"} dans Flux`}
                              onClick={() => onStartConsultation?.(row.appointment.id)}
                            >
                              <span className="dayRowTime">{timeStr}</span>
                              <span className="dayRowText">
                                <strong>{row.patientName || "Patient"}</strong>
                                <span>
                                  {[
                                    ["arrived", "waiting", "in_progress"].includes(row.appointment.status)
                                      ? "En cours"
                                      : isNext
                                        ? "Prochain"
                                        : null,
                                    row.ownerName ? `avec ${row.ownerName}` : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ") || "Rendez-vous à venir"}
                                </span>
                              </span>
                              <Badge
                                className={cn("border-transparent", getAppointmentTypeMeta(row.appointment.type).badgeClassName)}
                                variant="outline"
                              >
                                {type}
                              </Badge>
                            </button>
                          </li>
                        );
                      })}
                  </ul>
                  {dayUnits.done === dayUnits.total ? (
                    <p className="dayEmpty">Tous les rendez-vous du jour sont terminés.</p>
                  ) : null}
                </>
              ) : (
                <p className="dayEmpty">Aucun rendez-vous aujourd’hui.</p>
              )}
            </div>
            {/* What comes next, then the card's single action. */}
            <WidgetFooter action="Agenda" onAction={() => onNavigate?.("agenda")}>
              {(() => {
                const next = today?.find((row) => row.appointment.id === nextUpId);
                if (next) {
                  return `Prochain : ${next.start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · ${next.patientName || "Patient"}`;
                }
                return dayUnits.total ? "Plus de rendez-vous à venir aujourd’hui" : "Journée libre dans l’agenda";
              })()}
            </WidgetFooter>
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
