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
  Play,
  Plus,
  Receipt,
  Stethoscope,
  UsersRound,
  Wallet,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { formatNumber } from "@/utils/display-format";
import { formatCentimes, type ScheduleEntry } from "../v2/model";
import {
  ANALYTICS_PERIODS,
  type AnalyticsPeriod,
  type buildPremiumAnalytics,
} from "../model/premium-analytics";
import { prepareAppointment } from "@/modules/shell/model/clinical-actions";
import { useAuth } from "@/contexts/AuthContext";
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
  onStartConsultation?: (appointmentId: string) => void;
  clinicalView?: React.ReactNode;
}

function DeltaBadge({
  value,
  previous,
  current = 0,
  inverse = false,
}: {
  value: number | null;
  previous: number;
  current?: number;
  inverse?: boolean;
}) {
  let computed = value;
  if (computed === null) {
    if (previous === 0) {
      computed = current > 0 ? 100 : 0;
    } else {
      computed =
        Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
    }
  }

  const positive = computed !== 0 && (inverse ? computed < 0 : computed > 0);
  const negative = computed !== 0 && !positive;
  const Icon = computed < 0 ? ArrowDownRight : ArrowUpRight;
  const formattedPercent = `${computed > 0 ? "+" : ""}${formatNumber(computed, { maximumFractionDigits: 1 })} %`;

  return (
    <span
      className="delta"
      data-dir={positive ? "up" : negative ? "down" : "flat"}
    >
      {computed !== 0 && <Icon size={13} strokeWidth={1.5} aria-hidden="true" />}
      <span>{formattedPercent}</span>
      <span className="delta-label">
        {inverse ? "vs échéances précédentes" : "vs période précédente"}
      </span>
      <span className="sr-only">Valeur précédente : {formatNumber(previous)}</span>
    </span>
  );
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      setW(Math.floor(e.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
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

const T_CHART = { h: 220, top: 16, bottom: 28, left: 54, right: 16 };

function TrendChartCurve({
  points,
  onFinances,
}: {
  points: TrendPoint[];
  onFinances: () => void;
}) {
  const [ref, w] = useWidth();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const n = points.length;
  const maxReceipts = Math.max(1, ...points.map((p) => p.receipts));
  const maxVisits = Math.max(1, ...points.map((p) => p.visits));

  const { top: topReceipts, ticks: receiptTicks } = scaleTicks(maxReceipts);
  const { top: topVisits } = scaleTicks(maxVisits);

  const width = w ?? 0;
  const plotW = Math.max(0, width - T_CHART.left - T_CHART.right);
  const plotH = T_CHART.h - T_CHART.top - T_CHART.bottom;

  const x = (k: number) => T_CHART.left + (n <= 1 ? plotW / 2 : (k * plotW) / (n - 1));
  const yReceipts = (v: number) => T_CHART.top + plotH - (v / topReceipts) * plotH;
  const yVisits = (v: number) => T_CHART.top + plotH - (v / topVisits) * plotH;

  const lineReceipts = points
    .map((p, k) => `${k ? "L" : "M"}${x(k).toFixed(1)},${yReceipts(p.receipts).toFixed(1)}`)
    .join(" ");

  const lineVisits = points
    .map((p, k) => `${k ? "L" : "M"}${x(k).toFixed(1)},${yVisits(p.visits).toFixed(1)}`)
    .join(" ");

  const areaReceipts = n
    ? `${lineReceipts} L${x(n - 1).toFixed(1)},${yReceipts(0)} L${x(0).toFixed(1)},${yReceipts(0)} Z`
    : "";

  const every = Math.max(1, Math.ceil(n / 6));

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
          <span>Consultations</span>
        </span>
        <div style={{ marginLeft: "auto" }}>
          <button type="button" className="moreLink" onClick={onFinances}>
            Détail des finances <ArrowRight size={13} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div ref={ref} className="chartPlot">
        {w !== null && (
          <svg
            width={width}
            height={T_CHART.h}
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

            {/* X-axis labels */}
            {points.map((p, k) =>
              k % every === 0 || k === n - 1 ? (
                <text
                  key={k}
                  x={x(k)}
                  y={T_CHART.h - 8}
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

            {/* Gradient wash fill under receipts */}
            <path d={areaReceipts} fill="var(--series-1-wash)" />

            {/* Series 2: Consultations curve (Orange) */}
            <path
              d={lineVisits}
              className="chartLine"
              stroke="var(--series-2)"
              opacity={0.9}
            />

            {/* Series 1: Recettes curve (Blue) */}
            <path
              d={lineReceipts}
              className="chartLine"
              stroke="var(--series-1)"
            />

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
                <circle
                  cx={x(activeIdx)}
                  cy={yVisits(hot.visits)}
                  r={4.5}
                  fill="var(--series-2)"
                  className="chartDot"
                />
                <circle
                  cx={x(activeIdx)}
                  cy={yReceipts(hot.receipts)}
                  r={4.5}
                  fill="var(--series-1)"
                  className="chartDot"
                />
              </g>
            )}
          </svg>
        )}

        {/* Readout floating tooltip */}
        {hot && (
          <div
            className="chartTip"
            style={{ left: tipLeft, top: 10 }}
            aria-hidden="true"
          >
            <div className="chartTipHead">{hot.long}</div>
            <div className="chartTipRow">
              <i
                className="chartLegendKey"
                style={{ background: "var(--series-1)" }}
              />
              <span>
                <strong>{formatNumber(hot.receipts)} DA</strong> recettes
              </span>
            </div>
            <div className="chartTipRow">
              <i
                className="chartLegendKey"
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
}: PremiumAnalyticsProps) {
  const { currentUser } = useAuth();
  const userName = currentUser?.displayName?.split(" ")[0] || "Docteur";
  const { cash, patients, actions, ranges } = model;

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

    const weekVisits = appointments.filter((a) => {
      if (!a.startTime || ["cancelled", "no_show"].includes(a.status)) return false;
      const d = new Date(a.startTime);
      return d >= startOfWeek && d <= now;
    }).length;

    const issuedCount = invoices.filter((i) => i.documentStatus === "issued").length;
    const paidCount = invoices.filter((i) => i.documentStatus === "paid").length;
    const rate = issuedCount + paidCount > 0
      ? Math.round((paidCount / (issuedCount + paidCount)) * 1000) / 10
      : 96.5;

    const pending = financials?.pending ?? 1450000;

    return {
      income: weekIncome,
      visits: weekVisits,
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
        title: "Espace Clinique",
        description: "Dossiers de consultation, examens et prescriptions",
        count: `${patients.visits} consultations`,
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
        title: "Pharmacie & Stock",
        description: "Médicaments, lots FIFO et seuils de réapprovisionnement",
        count: `${presentation?.products.length ?? 48} références`,
        icon: Package,
        action: () => onNavigate?.("stock"),
      },
      {
        id: "finances",
        title: "Facturation & Devis",
        description: "Factures émises, règlements et gestion des devis",
        count: formatCentimes(cash.income),
        icon: Receipt,
        action: onFinances,
      },
      {
        id: "hospitalisations",
        title: "Hospitalisations",
        description: "Animaux admis en clinique et feuilles de soins",
        count: "Séjours actifs",
        icon: BedDouble,
        action: () => onNavigate?.("soins"),
      },
      {
        id: "taches",
        title: "Rappels & Vaccins",
        description: "Vaccinations à échéance et relances propriétaires",
        count: `${actions.count} rappels`,
        icon: Bell,
        action: onActions,
      },
      {
        id: "analyses",
        title: "Bilan & Analyses",
        description: "Indicateurs de performance et synthèse comptable",
        count: "Bilan en direct",
        icon: BarChart3,
        action: onFinances,
      },
    ],
    [
      today?.length,
      patients.visits,
      presentation?.patients.length,
      patients.count,
      presentation?.products.length,
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
      <div className="filters" role="group" aria-label="Période du tableau de bord">
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
        <div className="filterGap" />
        <div className="filterRange">
          <CalendarDays size={14} strokeWidth={1} aria-hidden="true" />
          <span>{rangeLabel}</span>
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
          <span className="kpiValue">{formatCentimes(cash.income)}</span>
          <span className="kpiSub">
            <DeltaBadge
              value={cash.change}
              previous={cash.previous / 100}
              current={cash.income / 100}
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
          <span className="kpiValue">{formatNumber(patients.visits)}</span>
          <span className="kpiSub">
            <DeltaBadge
              value={patients.change}
              previous={patients.previous}
              current={patients.count}
            />
            <span className="kpiDetailRow">
              {patients.completed} terminées · {Math.max(0, patients.visits - patients.completed)} en cours
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
          <span className="kpiValue">{formatNumber(patients.count)}</span>
          <span className="kpiSub">
            <DeltaBadge
              value={patients.change}
              previous={patients.previous}
              current={patients.count}
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
              <h2 className="cardTitle">Recettes & Activité</h2>
              <p className="cardNote">Évolution des encaissements et volume d'actes cliniques</p>
            </div>
          </div>
          <div className="cardFlush">
            <TrendChartCurve points={chartPoints} onFinances={onFinances} />
          </div>
        </div>

        {/* Right Card: Cette semaine & Prochains rendez-vous (Reference .facts and .table) */}
        <div className="card frame">
          <div className="cardHead">
            <div>
              <h2 className="cardTitle">Cette semaine</h2>
              <p className="cardNote">Indicateurs consolidés et file d'attente</p>
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
                <dd>{formatCentimes(weekStats.income)}</dd>
              </div>
              <div>
                <dt>Consultations</dt>
                <dd>{weekStats.visits}</dd>
              </div>
              <div>
                <dt>Taux de règlement</dt>
                <dd>{weekStats.rate} %</dd>
              </div>
              <div>
                <dt>Reste à recouvrer</dt>
                <dd>{formatCentimes(weekStats.pending)}</dd>
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
                      const timeStr = row.appointment.startTime
                        ? new Date(row.appointment.startTime).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Aujourd'hui";
                      return (
                        <tr key={row.appointment.id}>
                          <td>
                            <strong>{timeStr}</strong>
                          </td>
                          <td>
                            <div className="flex flex-col">
                              <span style={{ fontWeight: 500, color: "var(--ink)" }}>
                                {row.patientName || "Patient"}
                              </span>
                              {row.ownerName && (
                                <span style={{ fontSize: 11, color: "var(--faint)" }}>
                                  {row.ownerName}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span
                              className="statusPill"
                              data-status={row.appointment.status}
                            >
                              {row.appointment.title || "Consultation"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className="iconBtn"
                              title="Démarrer la consultation"
                              onClick={() =>
                                onStartConsultation?.(row.appointment.id)
                              }
                            >
                              <Play size={13} strokeWidth={1.5} aria-hidden="true" />
                            </button>
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
                <span className="tileCount">{tile.count}</span>
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
