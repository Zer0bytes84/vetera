import { useDashboardFinancials } from "../hooks/use-dashboard-financials";
import { buildFinancialOverview } from "./financial-model";
import { KpiPeriodFilter, kpiRange, kpiWithin, type KpiPeriod } from "./kpi-period";
import { FittedAmount } from "@/shared/ui/fitted-amount";
import { useId, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Package,
  PawPrint,
  Syringe,
  Wallet,
  ReceiptText,
} from "@/lib/icons";
import {
  Area,
  Bar,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { DashboardLayoutManager } from "../components/dashboard-layout-manager";
import { FinancialRiskDonutWidget } from "../components/financial-risk-donut-widget";
import {
  addDays,
  buildClinicalAlerts,
  buildTodaySchedule,
  formatCurrency,
  formatCentimes,
  formatTime,
  startOfDay,
  parseDashboardDate,
} from "./model";
import type { DashboardV2Props } from "./types";
import "./studio-dashboard.css";
import { DashboardInsights } from "./dashboard-insights";
import "./dashboard-polish.css";
import { ClassicWidgetState } from "../components/classic-widget-state";
import { SkeletonBlock } from "@/design-system/primitives";
import type { WidgetState } from "../components/clinical/shared";

const ALERT_ICONS = {
  task: ListTodo,
  stock: Package,
  vaccine: Syringe,
  appointment: CalendarDays,
};

function Panel({
  title,
  detail,
  action,
  children,
  className = "",
  state,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  state?: WidgetState;
}) {
  return (
    <section
      className={`studio-panel studio-finish ${className}`}
      aria-label={title}
    >
      <div className="studio-widget-surface">
        <header>
          <div>
            <h2>{title}</h2>
            <p>{detail}</p>
          </div>
          {action}
        </header>
        <ClassicWidgetState state={state} label={title}>
          {children}
        </ClassicWidgetState>
      </div>
    </section>
  );
}

export function StudioDashboard(props: DashboardV2Props) {
  const {
    metrics,
    patients,
    appointments,
    transactions,
    onNavigate,
    onNavigateToPatient,
  } = props;
  const financials = useDashboardFinancials();
  const [kpiPeriods, setKpiPeriods] = useState<Record<string, KpiPeriod>>({ consultations: "day", income: "month", patients: "all", receivables: "all" });
  const [period, setPeriod] = useState<14 | 30 | 84>(30);
  const [measure, setMeasure] = useState<"value" | "revenue">("value");
  const [alertPage, setAlertPage] = useState(0);
  const activityFillId = `activity-fill-${useId().replace(/:/g, "")}`;
  const alerts = buildClinicalAlerts({
    appointments,
    patients,
    products: props.products,
    tasks: props.tasks,
    vaccinations: props.vaccinations,
    referenceDate: metrics.referenceDate,
  });
  const days = metrics.activityDays.slice(-period);
  const visits = days.reduce((sum, day) => sum + day.value, 0);
  const income = days.reduce((sum, day) => sum + day.revenue, 0);
  const activeDays = days.filter((day) => day.value > 0).length;
  const today = buildTodaySchedule({
    appointments,
    patients,
    owners: props.owners,
    referenceDate: metrics.referenceDate,
  }).filter((row) => row.appointment.status !== "cancelled");
  const collectedOn = (day: Date) =>
    transactions
      .filter((transaction) => {
        const paidDate = parseDashboardDate(transaction.date);
        return (
          transaction.type === "income" &&
          transaction.status === "paid" &&
          paidDate &&
          startOfDay(paidDate).getTime() === startOfDay(day).getTime()
        );
      })
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  const paidToday = collectedOn(metrics.referenceDate);
  const paidYesterday = collectedOn(addDays(metrics.referenceDate, -1));
  const consultationRange = kpiRange(kpiPeriods.consultations, metrics.referenceDate);
  const periodAppointments = appointments.filter(a => !["cancelled", "no_show"].includes(a.status) && kpiWithin(a.startTime, consultationRange));
  const periodCompleted = periodAppointments.filter(a => a.status === "completed").length;
  const incomeRange = kpiRange(kpiPeriods.income, metrics.referenceDate);
  const periodPaid = transactions.filter(t => t.type === "income" && t.status === "paid" && kpiWithin(t.date, incomeRange)).reduce((sum, t) => sum + t.amount, 0);
  const receivablesOverview = buildFinancialOverview(financials.invoices, transactions, kpiRange(kpiPeriods.receivables, metrics.referenceDate), "all");
  const waitingAmount = Math.round(receivablesOverview.categories.reduce((sum, c) => sum + c.riskValue, 0) * 100);
  const waitingCount = receivablesOverview.receivables.length;
  const periodPatients = patients.filter(p => kpiPeriods.patients === "all" || kpiWithin(p.createdAt, kpiRange(kpiPeriods.patients, metrics.referenceDate)));
  const periodContext = (period: KpiPeriod) => ({ day: "aujourd’hui", week: "cette semaine", month: "ce mois", year: "cette année", all: "toutes dates" })[period];
  const toFollow = today.filter(
    (row) => !["completed", "no_show"].includes(row.appointment.status)
  );
  const chart = days.map((day) => ({
    ...day,
    label: day.date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    }),
  }));
  const species = patients.reduce<Record<string, number>>((result, patient) => {
    const key = patient.species || "Non renseigné";
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
  const speciesEntries = Object.entries(species).sort((a, b) => b[1] - a[1]);
  const kpiSpeciesEntries = Object.entries(periodPatients.reduce<Record<string, number>>((result, patient) => { const key = patient.species || "Non renseigné"; result[key] = (result[key] || 0) + 1; return result; }, {})).sort((a, b) => b[1] - a[1]);
  const colors = [1, 2, 3, 4, 5].map(
    (index) => `var(--studio-species-${index})`
  );
  const totalAlertPages = Math.max(1, Math.ceil(alerts.length / 4));
  const page = Math.min(alertPage, totalAlertPages - 1);
  const avgDayMetric =
    measure === "value"
      ? visits > 0 && visits / (days.length || 1) < 0.1
        ? "< 0,1"
        : (visits / (days.length || 1)).toLocaleString("fr-FR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })
      : formatCurrency(Math.round(income / (days.length || 1)));

  const action = (label: string, click: () => void) => (
    <button type="button" className="studio-link" onClick={click}>
      {label}
      <ArrowUpRight size={15} aria-hidden="true" />
    </button>
  );
  const blocks = [
    {
      id: "studio-overview",
      label: "Les repères du jour",
      description: "Rendez-vous, patients et encaissements",
      content: (
        <section
          className="studio-garden"
          aria-label="Les essentiels du cabinet"
        >
          <div className="studio-garden-widgets">
            {[
              {
                id: "consultations",
                title: "Consultations",
                icon: CalendarDays,
                value: String(periodAppointments.length),
                context: periodContext(kpiPeriods.consultations),
                detail: toFollow[0]
                  ? `${formatTime(toFollow[0].start)} · ${toFollow[0].patientName}`
                  : "Aucune visite à suivre",
                status: periodAppointments.length
                  ? `${periodCompleted}/${periodAppointments.length} terminées`
                  : "Agenda libre",
                tone: toFollow.length ? "watch" : "quiet",
                action: "Voir l’agenda",
                view: "agenda" as const,
              },
              {
                id: "income",
                title: "Encaissements",
                icon: Wallet,
                value: formatCentimes(periodPaid),
                context: periodContext(kpiPeriods.income),
                detail: `Hier : ${formatCentimes(paidYesterday)}`,
                status:
                  kpiPeriods.income === "day" && paidYesterday > 0
                    ? `${paidToday >= paidYesterday ? "+" : ""}${Math.round(((paidToday - paidYesterday) / paidYesterday) * 100)}% vs hier`
                    : "Règlements reçus",
                tone:
                  paidYesterday > 0 && paidToday >= paidYesterday
                    ? "positive"
                    : "quiet",
                action: "Voir les finances",
                view: "finances" as const,
              },
              {
                id: "patients",
                icon: PawPrint,
                title: kpiPeriods.patients === "all" ? "Patients suivis" : "Nouveaux patients",
                value: String(periodPatients.length),
                context: kpiPeriods.patients === "all" ? "au cabinet" : periodContext(kpiPeriods.patients),
                detail:
                  kpiSpeciesEntries
                    .slice(0, 2)
                    .map(
                      ([name, count]) =>
                        `${count} ${name.toLocaleLowerCase("fr-FR")}${count > 1 ? "s" : ""}`
                    )
                    .join(" · ") || "Aucun dossier enregistré",
                status: "Dossiers patients",
                tone: "quiet",
                action: "Ouvrir les dossiers",
                view: "patients" as const,
              },
              {
                id: "receivables",
                title: "À encaisser",
                icon: ReceiptText,
                value: formatCentimes(waitingAmount),
                context: periodContext(kpiPeriods.receivables),
                detail: `${waitingCount} solde${waitingCount > 1 ? "s" : ""} à recouvrer`,
                status: waitingCount ? "À suivre" : "À jour",
                tone: waitingCount ? "watch" : "positive",
                action: "Suivre les règlements",
                view: "finances" as const,
              },
            ].map(
              ({
                id,
                title,
                icon: Icon,
                value,
                context,
                detail,
                status,
                tone,
                action,
                view,
              }) => (
                <ClassicWidgetState
                  key={id}
                  label={title}
                  state={
                    id === "receivables" ? { loading: financials.loading || Boolean(props.widgetStates?.payments?.loading), skeleton: financials.loading || Boolean(props.widgetStates?.payments?.skeleton), error: financials.error || props.widgetStates?.payments?.error, retry: () => { void financials.refresh(); props.widgetStates?.payments?.retry(); } } : view === "patients"
                      ? props.widgetStates?.patients
                      : view === "agenda"
                        ? props.widgetStates?.schedule
                        : props.widgetStates?.payments
                  }
                  placeholderClassName="studio-kpi"
                  skeleton={
                    <>
                      <span className="studio-kpi-heading">{title}</span>
                      <span className="studio-kpi-body">
                        <SkeletonBlock className="h-8 w-2/3" />
                        <SkeletonBlock className="h-4 w-1/3" />
                        <SkeletonBlock className="h-4 w-3/4" />
                        <SkeletonBlock className="h-5 w-1/2" />
                        <SkeletonBlock className="h-4 w-full" />
                      </span>
                    </>
                  }
                >
                  <div className="studio-kpi">

                    <span className="studio-kpi-heading">
                      <span className="studio-kpi-title" title={title}><Icon size={14} strokeWidth={1.5} aria-hidden="true" /><span>{title}</span></span>
                      <KpiPeriodFilter label={title} value={kpiPeriods[id]} onChange={value => setKpiPeriods(current => ({ ...current, [id]: value }))} />
                    </span>
                    <div className="studio-kpi-body">
                      <div className="studio-kpi-measure">
                        <FittedAmount className="studio-kpi-value" value={value} maxFontSize={29} />
                        <span className="studio-kpi-context">{context}</span>
                      </div>
                      <div className="studio-kpi-meta">
                        <span className="studio-kpi-detail" title={detail}>{detail}</span>
                        <span className={`studio-kpi-status studio-kpi-status-${tone}`} title={status}>{status}</span>
                      </div>
                      <button type="button" className="studio-kpi-action" onClick={() => onNavigate?.(view)}>
                        <span>{action}</span>
                        <ArrowUpRight size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </ClassicWidgetState>
              )
            )}
          </div>
        </section>
      ),
    },
    {
      id: "studio-financial-risk",
      label: "Performance & Risques Financiers",
      description: "Recettes, règlements et soldes à recouvrer",
      content: (
        <div className="studio-financial-section">
          <ClassicWidgetState
            state={props.widgetStates?.payments}
            label="Recettes et règlements"
          >
            <FinancialRiskDonutWidget
              transactions={transactions}
              onOpenFinances={() => onNavigate?.("finances")}
            />
          </ClassicWidgetState>
        </div>
      ),
    },
    {
      id: "studio-insights",
      label: "Tendances et cartes de chaleur",
      description: "Cadence, créneaux et flux financiers",
      content: (
        <DashboardInsights
          metrics={metrics}
          appointments={appointments}
          transactions={transactions}
          widgetStates={props.widgetStates}
        />
      ),
    },
    {
      id: "studio-main",
      label: "Activité du cabinet",
      description: "Consultations et encaissements par jour",
      content: (
        <div className="studio-main-grid studio-main-analytics">
          <Panel
            title="Activité du cabinet"
            detail="Consultations et encaissements par jour."
            className="studio-activity"
            state={props.widgetStates?.activity}
            action={
              <div className="studio-segment" aria-label="Période du graphique">
                {([14, 30, 84] as const).map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={period === value}
                    onClick={() => setPeriod(value)}
                  >
                    {value === 84 ? "12 sem." : `${value} j`}
                  </button>
                ))}
              </div>
            }
          >
            <div className="studio-chart-heading">
              <div>
                <FittedAmount
                  className="studio-activity-total"
                  maxFontSize={36}
                  value={
                    measure === "value"
                      ? visits.toLocaleString("fr-FR")
                      : formatCurrency(income)
                  }
                />
                <span>
                  {measure === "value"
                    ? `${visits === 1 ? "consultation" : "consultations"} au total`
                    : "encaissés sur la période"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="studio-measures">
                  {(["value", "revenue"] as const).map((value) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={measure === value}
                      onClick={() => setMeasure(value)}
                    >
                      {value === "value" ? "Consultations" : "Encaissements"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="studio-activity-plot">
              {(measure === "value" ? visits : income) > 0 ? (
                <ChartContainer
                  className="studio-chart"
                  config={{
                    value: { label: "Consultations", color: "#2563eb" },
                    revenue: { label: "Encaissements", color: "#059669" },
                  }}
                  initialDimension={{ width: 640, height: 220 }}
                >
                  <ComposedChart
                    accessibilityLayer
                    data={chart}
                    margin={{ left: 0, right: 16, top: 12, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id={activityFillId}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={
                            measure === "value" ? "#2563eb" : "#059669"
                          }
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="100%"
                          stopColor={
                            measure === "value" ? "#2563eb" : "#059669"
                          }
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 5"
                      opacity={0.35}
                    />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      minTickGap={45}
                      tickMargin={10}
                      height={28}
                    />
                    <YAxis
                      width={42}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      tickCount={4}
                      domain={[0, "dataMax"]}
                      tickFormatter={(value) =>
                        value >= 1000 ? `${value / 1000}k` : String(value)
                      }
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) =>
                            measure === "revenue"
                              ? formatCurrency(Number(value))
                              : `${value} consultation(s)`
                          }
                        />
                      }
                    />
                    <Bar
                      dataKey={measure}
                      barSize={2}
                      fill={measure === "value" ? "#2563eb" : "#059669"}
                      fillOpacity={0.22}
                      tooltipType="none"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey={measure}
                      stroke={measure === "value" ? "#2563eb" : "#059669"}
                      fill={`url(#${activityFillId})`}
                      fillOpacity={1}
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ChartContainer>
              ) : (
                <div className="studio-activity-empty">
                  <CalendarDays
                    size={24}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <strong>
                    {measure === "value"
                      ? "Aucune consultation sur cette période"
                      : "Aucun encaissement sur cette période"}
                  </strong>
                  <span>
                    Choisissez une autre période pour consulter l’historique.
                  </span>
                </div>
              )}
            </div>
            <footer>
              <div className="studio-activity-summary">
                <span>
                  <strong>{avgDayMetric}</strong> / jour en moyenne
                </span>
                <span>
                  <strong>{activeDays}</strong>{" "}
                  {activeDays === 1 ? "jour" : "jours"} avec consultation
                </span>
              </div>
              {action("Explorer", () => onNavigate?.("finances_analytics"))}
            </footer>
          </Panel>
        </div>
      ),
    },
    {
      id: "studio-followup",
      label: "Suivi du cabinet",
      description: "Priorités et répartition de la patientèle",
      content: (
        <div className="studio-bottom-grid">
          <Panel
            title="Priorités du cabinet"
            detail="Suivis cliniques, rappels et stock à vérifier."
            className="studio-priorities"
            state={props.widgetStates?.priorities}
            action={<span className="studio-count">{alerts.length}</span>}
          >
            <div className="studio-alert-list">
              {alerts.length ? (
                alerts.slice(page * 4, page * 4 + 4).map((alert) => {
                  const AlertIcon = ALERT_ICONS[alert.source];
                  return (
                    <button
                      type="button"
                      className="studio-alert"
                      key={alert.id}
                      onClick={() =>
                        alert.patientId && alert.source !== "task"
                          ? onNavigateToPatient?.(alert.patientId)
                          : onNavigate?.(
                              alert.source === "stock"
                                ? "stock"
                                : alert.source === "task"
                                  ? "taches"
                                  : alert.source === "appointment"
                                    ? "agenda"
                                    : "patients"
                            )
                      }
                    >
                      <span className={`studio-alert-symbol ${alert.tone}`}>
                        <AlertIcon
                          size={17}
                          strokeWidth={1.7}
                          aria-hidden="true"
                        />
                      </span>
                      <span className="studio-alert-copy">
                        <strong>{alert.title}</strong>
                        <small>{alert.detail}</small>
                      </span>
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </button>
                  );
                })
              ) : (
                <div className="studio-empty">
                  <Check size={26} />
                  <strong>Tout est à jour</strong>
                  <p>Aucune alerte à traiter pour le moment.</p>
                </div>
              )}
            </div>
            <footer>
              <span>
                {alerts.length
                  ? `${page * 4 + 1}–${Math.min(page * 4 + 4, alerts.length)} sur ${alerts.length} priorités`
                  : "Aucune priorité en attente"}
              </span>
              {totalAlertPages > 1 && (
                <div className="studio-date-controls">
                  <button
                    type="button"
                    aria-label="Priorités précédentes"
                    disabled={page === 0}
                    onClick={() => setAlertPage(page - 1)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Priorités suivantes"
                    disabled={page === totalAlertPages - 1}
                    onClick={() => setAlertPage(page + 1)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </footer>
          </Panel>
          <Panel
            title="Répartition des patients"
            detail="Dossiers enregistrés par espèce."
            className="studio-patients"
            state={props.widgetStates?.patients}
            action={action("Dossiers", () => onNavigate?.("patients"))}
          >
            <div className="studio-population-chart">
              {patients.length > 0 ? (
                <>
                  <ChartContainer
                    config={{ count: { label: "Patients" } }}
                    className="studio-species-donut"
                    initialDimension={{ width: 280, height: 142 }}
                  >
                    <PieChart accessibilityLayer>
                      <Pie
                        data={speciesEntries.map(([name, count]) => ({
                          name,
                          count,
                        }))}
                        nameKey="name"
                        dataKey="count"
                        cx="50%"
                        cy={120}
                        innerRadius={80}
                        outerRadius={100}
                        startAngle={180}
                        endAngle={0}
                        cornerRadius={5}
                        paddingAngle={speciesEntries.length > 1 ? 3 : 0}
                        stroke="none"
                        isAnimationActive={false}
                      >
                        {speciesEntries.map(([name], index) => (
                          <Cell
                            key={name}
                            fill={colors[index % colors.length]}
                          />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => `${value} patients`}
                          />
                        }
                      />
                    </PieChart>
                  </ChartContainer>
                  <div className="studio-population-total">
                    <strong>{patients.length.toLocaleString("fr-FR")}</strong>
                    <span>
                      {patients.length === 1
                        ? "patient suivi"
                        : "patients suivis"}
                    </span>
                  </div>
                </>
              ) : (
                <div className="studio-empty">
                  <PawPrint size={26} strokeWidth={1.5} />
                  <strong>Aucun dossier pour le moment</strong>
                  <p>Les premiers dossiers apparaîtront ici.</p>
                </div>
              )}
            </div>
            <div className="studio-species">
              {speciesEntries.map(([name, count], index) => (
                <div key={name}>
                  <span>
                    <i style={{ background: colors[index % colors.length] }} />
                    {name}
                  </span>
                  <strong>
                    {count}
                    <small>
                      {patients.length
                        ? Math.round((count / patients.length) * 100)
                        : 0}{" "}
                      %
                    </small>
                  </strong>
                </div>
              ))}
            </div>
            <footer>
              <span>
                <PawPrint size={14} aria-hidden="true" />
                {speciesEntries.length}{" "}
                {speciesEntries.length > 1
                  ? "espèces représentées"
                  : "espèce représentée"}
              </span>
            </footer>
          </Panel>
        </div>
      ),
    },
  ];
  const rowOrder = ["studio-overview", "studio-financial-risk", "studio-insights", "studio-main"];
  const orderedBlocks = [...blocks].sort((a, b) => {
    const rank = (id: string) => { const index = rowOrder.indexOf(id); return index === -1 ? rowOrder.length : index; };
    return rank(a.id) - rank(b.id);
  });
  return (
    <div className="studio-dashboard">
      <DashboardLayoutManager
        blocks={orderedBlocks}
        isEditing={props.isCustomizing}
        onEditingChange={props.onCustomizingChange}
        storageKeyPrefix="dashboard_studio_v2"
      />
    </div>
  );
}
