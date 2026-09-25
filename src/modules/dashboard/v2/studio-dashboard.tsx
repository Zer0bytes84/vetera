import { FloralArtwork } from "@/components/FloralArtwork";
import { useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flower2,
  PawPrint,
  Shuffle,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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
import {
  floralBackgroundList,
  floralBackgrounds,
  randomizeFloralBackground,
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
  const currentFloralMeta =
    floralBackgroundList.find((b) => b.id === floralBackground) ||
    floralBackgroundList[0];
  const completionRate = today.length
    ? Math.round((completedToday / today.length) * 100)
    : 100;
  const totalBilledToday = paidToday + waitingAmount;
  const paymentRecoveryRate =
    totalBilledToday > 0
      ? Math.round((paidToday / totalBilledToday) * 100)
      : 100;
  const avgDayMetric =
    measure === "value"
      ? (visits / (days.length || 1)).toFixed(1)
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
          className="studio-garden group"
          aria-label="Les essentiels du cabinet"
          data-garden={floralBackground}
        >
          <FloralArtwork className="studio-garden-art" scene={floralBackground} />
          <div className="studio-garden-toolbar">
            <div className="studio-garden-badge">
              <Sparkles size={14} className="text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
              <span>Les essentiels du jour</span>
            </div>
            <div className="studio-garden-controls" aria-label="Ambiance et décor floral">
              <button
                type="button"
                className="studio-theme-nav"
                aria-label="Décor précédent"
                title="Décor précédent"
                onClick={() => stepBackground(-1)}
              >
                <ChevronLeft size={14} />
              </button>

              <Popover>
                <PopoverTrigger
                  type="button"
                  className="studio-theme-trigger"
                  title="Changer le fond illustré"
                >
                  <span className="studio-theme-emoji">{currentFloralMeta.emoji}</span>
                  <span className="studio-theme-name">{currentFloralMeta.label}</span>
                  <ChevronDown size={12} className="opacity-60 shrink-0" />
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-72 p-2 rounded-2xl bg-card/95 backdrop-blur-2xl border border-border/80 shadow-2xl z-50"
                >
                  <div className="px-2 py-1.5 border-b border-border/60 mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Flower2 size={13} className="text-primary" /> Ambiances du cabinet
                    </span>
                    <button
                      type="button"
                      onClick={randomizeFloralBackground}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded-md hover:bg-muted"
                    >
                      <Shuffle size={11} /> Aléatoire
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-1 max-h-64 overflow-y-auto pr-0.5">
                    {floralBackgroundList.map((item) => {
                      const isActive = floralBackground === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setFloralBackground(item.id)}
                          className={cn(
                            "flex items-center gap-2.5 w-full px-2.5 py-2 text-left rounded-xl text-xs transition-all",
                            isActive
                              ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/20"
                              : "hover:bg-muted/70 text-foreground"
                          )}
                        >
                          <span className="text-base shrink-0 select-none">{item.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <p className="leading-tight truncate">{item.label}</p>
                            <p className="text-[10px] text-muted-foreground font-normal leading-tight truncate mt-0.5">
                              {item.subtitle}
                            </p>
                          </div>
                          {isActive && <Check size={14} className="text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              <button
                type="button"
                className="studio-theme-nav"
                aria-label="Décor suivant"
                title="Décor suivant"
                onClick={() => stepBackground(1)}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="studio-garden-widgets">
            {/* Widget 1: Consultations du jour */}
            <div
              role="button"
              tabIndex={0}
              className="studio-glass-widget group/card cursor-pointer text-left"
              onClick={() =>
                nextVisit
                  ? onNavigateToPatient?.(nextVisit.appointment.patientId)
                  : onNavigate?.("agenda")
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  nextVisit
                    ? onNavigateToPatient?.(nextVisit.appointment.patientId)
                    : onNavigate?.("agenda");
                }
              }}
            >
              {/* Liquid Glass Specular Reflection (No Checkers) */}
              <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[20px]">
                <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-transparent dark:from-white/10" />
                <div
                  className="absolute -inset-full bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.45)_0%,transparent_60%)] opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 dark:bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.12)_0%,transparent_60%)]"
                />
                <div className="absolute inset-0 rounded-[20px] ring-1 ring-inset ring-white/60 transition-all duration-300 group-hover/card:ring-white/90 dark:ring-white/10 dark:group-hover/card:ring-white/25" />
              </div>

              <div className="relative z-10 flex h-full flex-col">
                <div className="studio-glass-heading">
                  <span className="studio-glass-icon">
                    <CalendarDays size={17} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-foreground">Consultations</span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                        <span className="size-1 rounded-full bg-primary animate-pulse" />
                        Aujourd'hui
                      </span>
                    </div>
                    <small>Flux clinique & planning</small>
                  </div>
                  <span className="studio-arrow-icon" aria-hidden="true">
                    <ArrowUpRight size={16} />
                  </span>
                </div>

                <div className="studio-glass-value-row">
                  <div className="studio-glass-value">
                    <span>{toFollow.length}</span>
                    <small>à suivre · {today.length} au planning</small>
                  </div>
                  <span className="studio-pill-stat">
                    {completionRate}% terminé
                  </span>
                </div>

                {/* Progress bar track */}
                <div className="studio-progress-track" aria-hidden="true">
                  <div
                    className="studio-progress-fill"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>

                <div className="studio-glass-detail">
                  {nextVisit ? (
                    <div className="studio-patient-chip">
                      <span className="studio-patient-chip-badge">
                        {nextVisit.appointment.status === "in_progress"
                          ? "🔴 En salle"
                          : `⏱️ ${formatTime(nextVisit.start)}`}
                      </span>
                      <div className="min-w-0 flex-1">
                        <strong>{nextVisit.patientName}</strong>
                        <span>{nextVisit.appointment.type} · {nextVisit.ownerName}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="studio-patient-empty">
                      <strong>
                        {today.length
                          ? "Toutes les visites du jour sont terminées"
                          : "Aucune consultation programmée aujourd'hui"}
                      </strong>
                    </div>
                  )}
                </div>

                <div className="studio-glass-footer">
                  <span>
                    <strong>{completedToday}</strong> visite{completedToday > 1 ? "s" : ""} effectuée{completedToday > 1 ? "s" : ""}
                  </span>
                  <span className="studio-link-action">
                    {nextVisit ? "Dossier patient" : "Consulter l’agenda"}
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </span>
                </div>
              </div>
            </div>

            {/* Widget 2: Trésorerie & Règlements */}
            <div
              role="button"
              tabIndex={0}
              className="studio-glass-widget studio-glass-finance group/card cursor-pointer text-left"
              onClick={() => onNavigate?.("finances")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onNavigate?.("finances");
                }
              }}
            >
              {/* Liquid Glass Specular Reflection (No Checkers) */}
              <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[20px]">
                <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-transparent dark:from-white/10" />
                <div
                  className="absolute -inset-full bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.45)_0%,transparent_60%)] opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 dark:bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.12)_0%,transparent_60%)]"
                />
                <div className="absolute inset-0 rounded-[20px] ring-1 ring-inset ring-white/60 transition-all duration-300 group-hover/card:ring-white/90 dark:ring-white/10 dark:group-hover/card:ring-white/25" />
              </div>

              <div className="relative z-10 flex h-full flex-col">
                <div className="studio-glass-heading">
                  <span className="studio-glass-icon">
                    <Wallet size={17} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-foreground">Encaissements</span>
                      <span className={cn(
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                        waitingPayments.length === 0
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      )}>
                        {waitingPayments.length === 0 ? "✓ À jour" : `⚠️ ${waitingPayments.length} en attente`}
                      </span>
                    </div>
                    <small>Suivi des règlements du jour</small>
                  </div>
                  <span className="studio-arrow-icon" aria-hidden="true">
                    <ArrowUpRight size={16} />
                  </span>
                </div>

                <div className="studio-glass-value-row">
                  <div className="studio-glass-value">
                    <span>{formatCentimes(paidToday)}</span>
                    <small>reçus aujourd'hui</small>
                  </div>
                  <span className="studio-pill-stat studio-pill-emerald">
                    {paymentRecoveryRate}% recouvré
                  </span>
                </div>

                {/* Progress bar track for finances */}
                <div className="studio-progress-track studio-progress-finance" aria-hidden="true">
                  <div
                    className="studio-progress-fill studio-fill-emerald"
                    style={{ width: `${paymentRecoveryRate}%` }}
                  />
                </div>

                <div className="studio-glass-detail">
                  <div className="studio-patient-chip studio-finance-chip">
                    <div className="min-w-0 flex-1">
                      <strong>{formatCentimes(waitingAmount)} en attente</strong>
                      <span>
                        {waitingPayments.length
                          ? `${waitingPayments.length} facture${waitingPayments.length > 1 ? "s" : ""} à rapprocher (toutes dates)`
                          : "Tous les dossiers du jour sont soldés"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="studio-glass-footer">
                  <span>
                    {waitingPayments.length ? "Rapprochement requis" : "Comptabilité fluide"}
                  </span>
                  <span className="studio-link-action">
                    Gestion financière
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      ),
    },
    {
      id: "studio-financial-risk",
      label: "Performance & Risques Financiers",
      description: "Donut bi-matière hachuré, créances et répartition décisionnelle (Style Outcrowd)",
      content: <FinancialRiskDonutWidget transactions={transactions} onOpenFinances={() => onNavigate?.("finances")} />,
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
                  {measure === "value" ? "consultations au total" : "encaissés sur la période"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground border border-border/60 bg-muted/40 px-2.5 py-1 rounded-lg">
                  <span>Moy. : <strong className="text-foreground">{avgDayMetric}</strong> / j</span>
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
                <defs>
                  <linearGradient id="studioGradientValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8271d6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#8271d6" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="studioGradientRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ca68e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#4ca68e" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 5" opacity={0.35} />
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
                  type="monotone"
                  dataKey={measure}
                  stroke={measure === "value" ? "#8271d6" : "#4ca68e"}
                  fill={measure === "value" ? "url(#studioGradientValue)" : "url(#studioGradientRevenue)"}
                  fillOpacity={1}
                  strokeWidth={2.5}
                  isAnimationActive={true}
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
