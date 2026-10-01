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
} from "lucide-react";
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
}: {
  title: string;
  detail: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
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
        {children}
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
  const [period, setPeriod] = useState<14 | 30 | 84>(30);
  const [measure, setMeasure] = useState<"value" | "revenue">("value");
  const [dayOffset, setDayOffset] = useState(0);
  const [alertPage, setAlertPage] = useState(0);
  const activityFillId = `activity-fill-${useId().replace(/:/g, "")}`;
  const date = addDays(metrics.referenceDate, dayOffset);
  const schedule = buildTodaySchedule({
    appointments,
    patients,
    owners: props.owners,
    referenceDate: date,
  });
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
  const waitingPayments = transactions.filter(
    (t) => t.type === "income" && t.status === "pending"
  );
  const waitingAmount = waitingPayments.reduce((sum, t) => sum + t.amount, 0);
  const completedToday = today.filter(
    (row) => row.appointment.status === "completed"
  ).length;
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
  const colors = [1, 2, 3, 4, 5].map(
    (index) => `var(--studio-species-${index})`
  );
  const totalAlertPages = Math.max(1, Math.ceil(alerts.length / 4));
  const page = Math.min(alertPage, totalAlertPages - 1);
  const selectedDate = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
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
  if (props.isLoading)
    return (
      <div className="studio-loading" role="status">
        Préparation de votre tableau de bord…
      </div>
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
                title: "Consultations",
                icon: CalendarDays,
                value: String(today.length),
                context: "aujourd’hui",
                detail: toFollow[0]
                  ? `${formatTime(toFollow[0].start)} · ${toFollow[0].patientName}`
                  : "Aucune visite à suivre",
                status: today.length
                  ? `${completedToday}/${today.length} terminées`
                  : "Agenda libre",
                tone: toFollow.length ? "watch" : "quiet",
                action: "Voir l’agenda",
                view: "agenda" as const,
              },
              {
                title: "Encaissements",
                icon: Wallet,
                value: formatCentimes(paidToday),
                context: "aujourd’hui",
                detail: `Hier : ${formatCentimes(paidYesterday)}`,
                status:
                  paidYesterday > 0
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
                title: "Patients suivis",
                icon: PawPrint,
                value: String(patients.length),
                context: "au cabinet",
                detail:
                  speciesEntries
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
                title: "À encaisser",
                icon: Wallet,
                value: formatCentimes(waitingAmount),
                context: "toutes dates",
                detail: `${waitingPayments.length} écriture${waitingPayments.length > 1 ? "s" : ""} en attente`,
                status: waitingPayments.length ? "À suivre" : "À jour",
                tone: waitingPayments.length ? "watch" : "positive",
                action: "Suivre les règlements",
                view: "finances" as const,
              },
            ].map(
              ({
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
                <button
                  type="button"
                  key={title}
                  className="studio-kpi"
                  onClick={() => onNavigate?.(view)}
                >
                  <span className="studio-kpi-heading">
                    <span>{title}</span>
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="studio-kpi-body">
                    <FittedAmount className="studio-kpi-value" value={value} />
                    <span className="studio-kpi-context">{context}</span>
                    <span className="studio-kpi-detail">{detail}</span>
                    <span
                      className={`studio-kpi-status studio-kpi-status-${tone}`}
                    >
                      {status}
                    </span>
                    <span className="studio-kpi-action">
                      <span>{action}</span>
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </span>
                  </span>
                </button>
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
          <FinancialRiskDonutWidget
            transactions={transactions}
            onOpenFinances={() => onNavigate?.("finances")}
          />
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
        />
      ),
    },
    {
      id: "studio-main",
      label: "Activité et rendez-vous",
      description: "Une courbe lisible et un agenda navigable",
      content: (
        <div className="studio-main-grid">
          <Panel
            title="Activité du cabinet"
            detail="Consultations et encaissements par jour."
            className="studio-activity"
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
          <Panel
            title="Planning du jour"
            detail={selectedDate}
            className="studio-agenda"
            action={
              <div className="studio-date-controls">
                <button
                  type="button"
                  aria-label="Jour précédent"
                  onClick={() => setDayOffset(dayOffset - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Jour suivant"
                  onClick={() => setDayOffset(dayOffset + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            }
          >
            <div className="studio-agenda-strip">
              <span>{schedule.length} rendez-vous</span>
              <button
                type="button"
                onClick={() => setDayOffset(0)}
                disabled={dayOffset === 0}
              >
                Aujourd’hui
              </button>
            </div>
            <div className="studio-agenda-list">
              {schedule.length ? (
                schedule.map((row) => (
                  <button
                    type="button"
                    className="studio-appointment"
                    key={row.appointment.id}
                    onClick={() =>
                      onNavigateToPatient?.(row.appointment.patientId)
                    }
                  >
                    <time dateTime={row.start.toISOString()}>
                      {formatTime(row.start)}
                    </time>
                    <span className="studio-appointment-copy">
                      <strong>{row.patientName}</strong>
                      <small>
                        {row.appointment.type} · {row.ownerName}
                      </small>
                    </span>
                    <span className="studio-appointment-state">
                      {["cancelled", "no_show"].includes(
                        row.appointment.status
                      ) ? (
                        <span className="studio-visit-status">
                          {row.appointment.status === "cancelled"
                            ? "Annulé"
                            : "Absent"}
                        </span>
                      ) : row.appointment.status === "completed" ? (
                        <Check size={16} aria-label="Terminé" />
                      ) : (
                        <ArrowUpRight size={15} aria-hidden="true" />
                      )}
                    </span>
                  </button>
                ))
              ) : (
                <div className="studio-empty">
                  <CalendarDays size={28} strokeWidth={1.3} />
                  <strong>Une journée à organiser</strong>
                  <p>Aucun rendez-vous à cette date.</p>
                  {action("Planifier une visite", () => onNavigate?.("agenda"))}
                </div>
              )}
            </div>
            <footer>
              {action("Ouvrir l’agenda", () => onNavigate?.("agenda"))}
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
            action={action("Dossiers", () => onNavigate?.("patients"))}
          >
            <div className="studio-population-chart">
              {patients.length > 0 ? (
                <>
                  <ChartContainer
                    config={{ count: { label: "Patients" } }}
                    className="studio-species-donut"
                    initialDimension={{ width: 280, height: 166 }}
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
                        cy={142}
                        innerRadius={100}
                        outerRadius={122}
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
  return (
    <div className="studio-dashboard">
      <DashboardLayoutManager
        blocks={blocks}
        isEditing={props.isCustomizing}
        onEditingChange={props.onCustomizingChange}
        storageKeyPrefix="dashboard_studio_v1"
      />
    </div>
  );
}
