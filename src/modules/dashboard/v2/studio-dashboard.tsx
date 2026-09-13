import { useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  PawPrint,
  Flower2,
  Wallet,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { DashboardLayoutManager } from "../components/dashboard-layout-manager";
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
import {
  floralBackgrounds,
  useFloralBackground,
  type FloralBackground,
} from "@/lib/floral-background";
import "./studio-dashboard.css";

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
    <section className={`studio-panel ${className}`}>
      <header>
        <div>
          <h2>{title}</h2>
          <p>{detail}</p>
        </div>
        {action}
      </header>
      {children}
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
  const [floralBackground, setFloralBackground] = useFloralBackground();
  const stepBackground = (direction: number) => {
    const choices = Object.keys(floralBackgrounds) as FloralBackground[];
    setFloralBackground(
      choices[
        (choices.indexOf(floralBackground) + direction + choices.length) %
          choices.length
      ]
    );
  };
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
  const paidToday = transactions
    .filter((t) => {
      const paidDate = parseDashboardDate(t.date);
      return (
        t.type === "income" &&
        t.status === "paid" &&
        paidDate &&
        startOfDay(paidDate).getTime() ===
          startOfDay(metrics.referenceDate).getTime()
      );
    })
    .reduce((sum, t) => sum + t.amount, 0);
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
  const nextVisit =
    toFollow.find((row) => row.appointment.status === "in_progress") ??
    toFollow.find((row) =>
      ["arrived", "waiting"].includes(row.appointment.status)
    ) ??
    toFollow[0];
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
  const colors = ["#8271d6", "#e8ab66", "#64b9a4", "#729fce", "#d48ca5"];
  const totalAlertPages = Math.max(1, Math.ceil(alerts.length / 4));
  const page = Math.min(alertPage, totalAlertPages - 1);
  const selectedDate = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
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
          data-garden={floralBackground}
        >
          <img
            className="studio-garden-art"
            src={`/art/cabinet-floral-${floralBackground}.png`}
            alt=""
            aria-hidden="true"
          />
          <div className="studio-garden-toolbar">
            <span>
              <Flower2 size={16} aria-hidden="true" />
              Les essentiels du jour
            </span>
            <div className="studio-garden-choices" aria-label="Décor floral">
              <button
                type="button"
                aria-label="Décor précédent"
                title="Décor précédent"
                onClick={() => stepBackground(-1)}
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                aria-label="Décor suivant"
                title="Décor suivant"
                onClick={() => stepBackground(1)}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
          <div className="studio-garden-widgets">
            <button
              type="button"
              className="studio-glass-widget"
              onClick={() =>
                nextVisit
                  ? onNavigateToPatient?.(nextVisit.appointment.patientId)
                  : onNavigate?.("agenda")
              }
            >
              <span className="studio-glass-heading">
                <span className="studio-glass-icon">
                  <CalendarDays size={18} aria-hidden="true" />
                </span>
                <span>
                  Consultations à suivre<small>Aujourd’hui</small>
                </span>
                <ArrowUpRight size={17} aria-hidden="true" />
              </span>
              <span className="studio-glass-value">
                {toFollow.length}
                <small>sur {today.length} rendez-vous</small>
              </span>
              <span className="studio-glass-detail">
                {nextVisit ? (
                  <>
                    <strong>{nextVisit.patientName}</strong>
                    <span>
                      {nextVisit.appointment.status === "in_progress"
                        ? "En consultation"
                        : formatTime(nextVisit.start)}{" "}
                      · {nextVisit.appointment.type}
                    </span>
                  </>
                ) : (
                  <>
                    <strong>
                      {today.length
                        ? "Aucune consultation à suivre"
                        : "Votre agenda est libre"}
                    </strong>
                  </>
                )}
              </span>
              <span className="studio-glass-footer">
                <span>
                  {completedToday} terminé{completedToday > 1 ? "s" : ""}
                </span>
                <span>
                  {nextVisit ? "Ouvrir le dossier" : "Voir l’agenda"}
                  <ArrowUpRight size={13} aria-hidden="true" />
                </span>
              </span>
            </button>
            <button
              type="button"
              className="studio-glass-widget studio-glass-finance"
              onClick={() => onNavigate?.("finances")}
            >
              <span className="studio-glass-heading">
                <span className="studio-glass-icon">
                  <Wallet size={18} aria-hidden="true" />
                </span>
                <span>
                  Les encaissements<small>Suivi des règlements</small>
                </span>
                <ArrowUpRight size={17} aria-hidden="true" />
              </span>
              <span className="studio-glass-value">
                {formatCentimes(paidToday)}
                <small>reçus aujourd’hui</small>
              </span>
              <span className="studio-glass-detail">
                <strong>{formatCentimes(waitingAmount)} en attente</strong>
                <span>
                  {waitingPayments.length
                    ? `${waitingPayments.length} paiement${waitingPayments.length > 1 ? "s" : ""} à suivre · toutes dates`
                    : "Aucun paiement en attente"}
                </span>
              </span>
              <span className="studio-glass-footer">
                <span>
                  {waitingPayments.length ? "À rapprocher" : "À jour"}
                </span>
                <span>
                  Voir les finances
                  <ArrowUpRight size={13} aria-hidden="true" />
                </span>
              </span>
            </button>
          </div>
        </section>
      ),
    },
    {
      id: "studio-main",
      label: "Activité et rendez-vous",
      description: "Une courbe lisible et un agenda navigable",
      content: (
        <div className="studio-main-grid">
          <Panel
            title="Le rythme du cabinet"
            detail="Chaque journée compte."
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
                <strong>
                  {measure === "value"
                    ? visits.toLocaleString("fr-FR")
                    : formatCurrency(income)}
                </strong>
                <span>
                  {measure === "value" ? "consultations" : "encaissés"} sur la
                  période
                </span>
              </div>
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
            <ChartContainer
              className="studio-chart"
              config={{
                value: { label: "Consultations", color: "#8271d6" },
                revenue: { label: "Encaissements", color: "#4ca68e" },
              }}
              initialDimension={{ width: 640, height: 220 }}
            >
              <AreaChart
                accessibilityLayer
                data={chart}
                margin={{ left: 0, right: 16, top: 12, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 5" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  minTickGap={45}
                  tickMargin={10}
                />
                <YAxis
                  width={42}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
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
                <Area
                  type="linear"
                  dataKey={measure}
                  stroke={measure === "value" ? "#8271d6" : "#4ca68e"}
                  fill={measure === "value" ? "#8271d6" : "#4ca68e"}
                  fillOpacity={0.12}
                  strokeWidth={2.5}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ChartContainer>
            <footer>
              <span>
                <span className="studio-dot" />
                {activeDays} jours avec consultation sur {days.length}
              </span>
              {action("Explorer", () => onNavigate?.("finances_analytics"))}
            </footer>
          </Panel>
          <Panel
            title="Au fil de la journée"
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
                    <time>{formatTime(row.start)}</time>
                    <span className="studio-avatar">
                      {row.patientName.slice(0, 2).toUpperCase()}
                    </span>
                    <span>
                      <strong>{row.patientName}</strong>
                      <small>
                        {row.appointment.type} · {row.ownerName}
                      </small>
                    </span>
                    {row.appointment.status === "completed" ? (
                      <Check size={16} aria-label="Terminé" />
                    ) : (
                      <ArrowUpRight size={15} aria-hidden="true" />
                    )}
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
            title="À garder à l’œil"
            detail="Les points qui demandent votre attention."
            action={<span className="studio-count">{alerts.length}</span>}
          >
            <div className="studio-alert-list">
              {alerts.length ? (
                alerts.slice(page * 4, page * 4 + 4).map((alert) => (
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
                    <span className={`studio-alert-dot ${alert.tone}`} />
                    <span>
                      <strong>{alert.title}</strong>
                      <small>{alert.detail}</small>
                    </span>
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </button>
                ))
              ) : (
                <div className="studio-empty">
                  <Check size={26} />
                  <strong>Tout est à jour</strong>
                  <p>Aucune alerte à traiter pour le moment.</p>
                </div>
              )}
            </div>
            {totalAlertPages > 1 && (
              <footer>
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setAlertPage(page - 1)}
                >
                  Précédent
                </button>
                <span>
                  {page + 1} / {totalAlertPages}
                </span>
                <button
                  type="button"
                  disabled={page === totalAlertPages - 1}
                  onClick={() => setAlertPage(page + 1)}
                >
                  Suivant
                </button>
              </footer>
            )}
          </Panel>
          <Panel
            title="La vie du cabinet"
            detail="Une patientèle, plusieurs univers."
            className="studio-patients"
            action={action("Dossiers", () => onNavigate?.("patients"))}
          >
            <div className="studio-population-total">
              <strong>{patients.length}</strong>
              <span>patients suivis</span>
              <PawPrint size={52} strokeWidth={1} aria-hidden="true" />
            </div>
            <div className="studio-population-bar" aria-hidden="true">
              {speciesEntries.map(([name, count], i) => (
                <span
                  key={name}
                  style={{ flex: count, background: colors[i % colors.length] }}
                />
              ))}
            </div>
            <div className="studio-species">
              {speciesEntries.map(([name, count]) => (
                <div key={name}>
                  <span>{name}</span>
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
              {!patients.length && (
                <p>Les premiers dossiers apparaîtront ici.</p>
              )}
            </div>
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
