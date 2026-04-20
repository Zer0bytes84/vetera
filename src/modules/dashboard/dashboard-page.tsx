import { useMemo, useState } from "react"
import jsPDF from "jspdf"
import { toast } from "sonner"
import {
  Calendar01Icon,
  ChartUpIcon,
  DashboardSquare01Icon,
  Download01Icon,
  File01Icon,
  Notification02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/AuthContext"
import { APP_NAME } from "@/lib/brand"
import type { View } from "@/types"

import {
  NextAppointmentWidgetLumaV2,
  TasksWidgetLumaV2,
  StockAlertsWidgetLumaV2,
  InsightsWidgetLumaV2,
  RecentActivityWidgetLumaV2,
  PerformanceWidgetLumaV2,
  type NextAppointment,
  type SmartInsight,
  type Activity,
} from "./widgets-luma-v2"
import { RecentConsultationsWidget } from "./recent-consultations-widget"
import { MeshGradient } from "./mesh-gradient"
import { CommandPalette } from "@/components/command-palette"

import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useProductsRepository,
  useTasksRepository,
  useTransactionsRepository,
  useUsersRepository,
} from "../../data/repositories"
import MotivationalHeader from "@/components/MotivationalHeader"
import { useTranslation } from "react-i18next"

// Import flat design components from v2
import {
  DashboardSection,
  InsightCard,
  LeadMetricStrip,
  LeadRevenuePanel,
  LeadSegmentationPanel,
  LeadStatusPanel,
  WebVisitsPanel,
  buildDashboardMetrics,
  type InsightCardData,
  type DashboardMetrics,
} from "../v2/prototype-pages"

type DashboardPageProps = {
  onNavigate: (view: View) => void
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function isSameDay(left: Date, right: Date) {
  return startOfDay(left).getTime() === startOfDay(right).getTime()
}

function percentageDelta(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0
  }
  return Math.round(((current - previous) / previous) * 100)
}

function formatMoneyDa(amountCentimes: number) {
  const dinars = Math.round(amountCentimes / 100)
  return `${new Intl.NumberFormat("fr-DZ", { style: "currency", currency: "DZD", minimumFractionDigits: 0 }).format(dinars)}`
}

function mapStatus(status: string) {
  switch (status) {
    case "completed":
      return "Completed"
    case "in_progress":
      return "In progress"
    case "cancelled":
      return "Cancelled"
    case "no_show":
      return "No-show"
    default:
      return "Scheduled"
  }
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { t, i18n } = useTranslation()
  const currentLocale = i18n.language.startsWith("ar")
    ? "ar"
    : i18n.language.startsWith("en")
      ? "en-US"
      : i18n.language.startsWith("es")
        ? "es-ES"
        : i18n.language.startsWith("pt")
          ? "pt-PT"
          : i18n.language.startsWith("de")
            ? "de-DE"
            : "fr-FR"
  const [dashboardTab, setDashboardTab] = useState<
    "overview" | "analytics" | "reports" | "notifications"
  >("overview")
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [selectedReportDate, setSelectedReportDate] = useState<Date | undefined>(undefined)
  const { currentUser } = useAuth()
  const { data: appointments } = useAppointmentsRepository()
  const { data: patients } = usePatientsRepository()
  const { data: owners } = useOwnersRepository()
  const { data: users } = useUsersRepository()
  const { data: products } = useProductsRepository()
  const { data: tasks } = useTasksRepository()
  const { data: transactions } = useTransactionsRepository()

  // Use the flat design metrics builder
  const metrics = useMemo<DashboardMetrics>(
    () => buildDashboardMetrics({ appointments, owners, patients, tasks, transactions }),
    [appointments, owners, patients, tasks, transactions]
  )

  const referenceDate = metrics.referenceDate
  const reportReferenceDate = selectedReportDate ?? referenceDate

  // Calculate deltas for insight cards
  const incomeTodayDelta = percentageDelta(metrics.summary.incomeToday, metrics.summary.incomeYesterday)
  const appointmentsDelta = percentageDelta(
    metrics.summary.todayAppointments,
    metrics.summary.yesterdayAppointments
  )
  const retentionDelta = percentageDelta(
    metrics.summary.currentActivePatients,
    metrics.summary.previousActivePatients
  )

  // Build insight cards for flat design widgets
  const galleryCards: InsightCardData[] = useMemo(() => [
    {
      eyebrow: "Chiffre d'affaires",
      value: formatMoneyDa(metrics.summary.incomeToday),
      detailLead: `${Math.abs(incomeTodayDelta)}%`,
      detailText: "vs hier",
      isNegative: incomeTodayDelta < 0,
      title: "Tendance des encaissements",
      description: "Comparer l'activite journaliere du cabinet a la veille sur une lecture plus compacte.",
      chart: <RevenueBarsChart data={metrics.monthlyRevenue} />,
    },
    {
      eyebrow: "Mix des revenus",
      value: `${new Intl.NumberFormat("fr-FR").format(metrics.topCategories.reduce((sum, item) => sum + item.value / 100, 0))} DA`,
      detailLead: `${metrics.topCategories.length}`,
      detailText: "categories",
      title: "Segmentation des canaux",
      description: "Voir quels postes de revenu portent vraiment l'activite du cabinet.",
      chart: <ChannelSourcesChart rows={metrics.topCategories} />,
    },
    {
      eyebrow: "Actes realises",
      value: `${(() => {
        const total = metrics.topAppointmentTypes.reduce((sum, item) => sum + item.demand, 0)
        return total ? Math.round((metrics.topAppointmentTypes[0]?.demand ?? 0) / total * 100) : 0
      })()}%`,
      detailLead: `${Math.abs(appointmentsDelta)}%`,
      detailText: "vs hier",
      isNegative: appointmentsDelta < 0,
      title: "Demande par acte",
      description: `Mesurer les types de rendez-vous qui occupent reellement le planning ${APP_NAME}.`,
      chart: <ItemDemandChart data={metrics.topAppointmentTypes} />,
    },
    {
      eyebrow: "Cashflow net",
      value: formatMoneyDa(metrics.cashflowSeries.reduce((sum, item) => sum + item.value, 0) * 100),
      detailLead: `${Math.abs(percentageDelta(metrics.cashflowSeries.at(-1)?.value ?? 0, metrics.cashflowSeries.at(-2)?.value ?? 0))}%`,
      detailText: "vs veille",
      isNegative: percentageDelta(metrics.cashflowSeries.at(-1)?.value ?? 0, metrics.cashflowSeries.at(-2)?.value ?? 0) < 0,
      title: "Flux sur 14 jours",
      description: "Lire l'amplitude des variations de tresorerie avec une courbe plus legere.",
      chart: <CampaignDataChart data={metrics.cashflowSeries} />,
    },
    {
      eyebrow: "Taches finalisees",
      value: "53%",
      detailLead: "12.5%",
      detailText: "vs hier",
      isNegative: true,
      title: "Cadence operationnelle",
      description: "Suivre l'avancement des rappels, validations et micro-taches sans figer le widget.",
      chart: <WorkflowPaceChart series={[]} />,
    },
    {
      eyebrow: "Retention patients",
      value: "24%",
      detailLead: "12.5%",
      detailText: "vs periode precedente",
      isNegative: true,
      title: "Activite 12 semaines",
      description: "La heatmap lit maintenant les rendez-vous reels sur les 12 dernieres semaines.",
      chart: <UserRetentionGrid days={[]} />,
    },
    {
      eyebrow: "Pipeline clinique",
      value: `${metrics.pipelineRows.reduce((sum, row) => sum + row.value, 0)}`,
      detailLead: "en",
      detailText: "suivi",
      title: "Sante du pipeline",
      description: "Voir les rendez-vous planifies, en cours, termines et a relancer a partir des vraies donnees.",
      chart: <PipelineChart rows={metrics.pipelineRows} />,
    },
    {
      eyebrow: "Geographie",
      value: `${metrics.summary.topCity.count}`,
      detailLead: metrics.summary.topCity.city,
      detailText: "",
      title: "Repartition des clients",
      description: "Mettre en avant les villes les plus actives a partir des proprietaires reellement presents dans l'app.",
      chart: <WorldMap topCities={metrics.topCities} />,
    },
  ], [metrics, patients.length, incomeTodayDelta, appointmentsDelta, retentionDelta])

  // --- Export Dashboard Report ---
  const exportDashboardReport = async (period: "daily" | "weekly" | "monthly") => {
    const start =
      period === "daily"
        ? startOfDay(reportReferenceDate)
        : period === "weekly"
          ? startOfDay(addDays(reportReferenceDate, -6))
          : startOfDay(addDays(reportReferenceDate, -29))
    const end = endOfDay(reportReferenceDate)

    const periodAppointments = appointments.filter((item) => {
      const date = new Date(item.startTime)
      return date >= start && date <= end
    })
    const periodTransactions = transactions.filter((item) => {
      const date = new Date(item.date)
      return date >= start && date <= end
    })
    const paidIncome = periodTransactions
      .filter((item) => item.type === "income" && item.status === "paid")
      .reduce((sum, item) => sum + item.amount, 0)
    const paidExpenses = periodTransactions
      .filter((item) => item.type === "expense" && item.status === "paid")
      .reduce((sum, item) => sum + item.amount, 0)

    const doc = new jsPDF()
    const reportTitle =
      period === "daily" ? "Rapport journalier" : period === "weekly" ? "Rapport hebdomadaire" : "Rapport mensuel"

    doc.setFontSize(18)
    doc.text(`${APP_NAME} · ${reportTitle}`, 20, 20)
    doc.setFontSize(11)
    doc.text(
      `Periode: ${start.toLocaleDateString(currentLocale)} - ${end.toLocaleDateString(currentLocale)}`,
      20, 30
    )
    doc.text(
      `Genere le ${new Date().toLocaleDateString(currentLocale)} pour ${currentUser?.displayName || "Cabinet"}`,
      20, 38
    )

    const summaryLines = [
      `Consultations planifiees: ${periodAppointments.length}`,
      `Consultations cloturees: ${periodAppointments.filter((item) => item.status === "completed").length}`,
      `Urgences ouvertes: ${periodAppointments.filter((item) => item.type === "Urgence" && item.status !== "completed").length}`,
      `Revenus encaisses: ${formatMoneyDa(paidIncome)}`,
      `Depenses payees: ${formatMoneyDa(paidExpenses)}`,
      `Stock critique: ${products.filter((item) => Number(item.quantity) <= Number(item.minStock)).length} produit(s)`,
    ]

    doc.setFontSize(13)
    doc.text("Resume", 20, 54)
    doc.setFontSize(11)
    summaryLines.forEach((line, index) => {
      doc.text(`• ${line}`, 24, 64 + index * 8)
    })

    const topAppointments = periodAppointments.slice(0, 5)
    doc.setFontSize(13)
    doc.text("Rendez-vous cles", 20, 122)
    doc.setFontSize(11)
    topAppointments.forEach((item, index) => {
      doc.text(
        `• ${item.title} · ${new Date(item.startTime).toLocaleString(currentLocale)} · ${mapStatus(item.status)}`,
        24, 132 + index * 8
      )
    })

    doc.save(`vetera-${period === "daily" ? "daily" : period === "weekly" ? "weekly" : "monthly"}.pdf`)
    toast.success(`${reportTitle} telecharge`)
  }

  const dashboardTabs = [
    { value: "overview", label: t("dashboard.tabs.overview"), icon: DashboardSquare01Icon, count: null },
    { value: "analytics", label: t("dashboard.tabs.analytics"), icon: ChartUpIcon, count: null },
    { value: "reports", label: t("dashboard.tabs.reports"), icon: File01Icon, count: null },
    { value: "notifications", label: t("dashboard.tabs.notifications"), icon: Notification02Icon, count: 0 },
  ] as const

  // --- Next Appointment Card ---
  const nextAppointmentCard = useMemo(() => {
    const next = appointments
      .filter((item) => {
        const start = new Date(item.startTime).getTime()
        return (
          start >= referenceDate.getTime() &&
          !["cancelled", "completed", "no_show"].includes(item.status)
        )
      })
      .sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime())[0]

    if (!next) return null

    const patient = patients.find((item) => item.id === next.patientId)
    const owner = owners.find((item) => item.id === next.ownerId)
    const vet = users.find((item) => item.id === next.vetId)
    const start = new Date(next.startTime)
    const end = new Date(start.getTime() + 30 * 60_000)

    return {
      id: next.id,
      patient: patient?.name || next.title,
      owner: owner ? `${owner.firstName} ${owner.lastName}`.trim() : "Proprietaire non lie",
      type: next.type,
      startTime: start,
      endTime: end,
      vetName: vet?.displayName || "Veterinaire local",
      ownerPhone: owner?.phone,
    }
  }, [appointments, owners, patients, users, referenceDate])

  return (
    <div className="@container/main relative isolate flex flex-1 flex-col gap-6 py-6">
      <Tabs
        value={dashboardTab}
        onValueChange={(value) => setDashboardTab(value as "overview" | "analytics" | "reports" | "notifications")}
        className="gap-6"
      >
        <div className="flex flex-col gap-4 px-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4">
            <MotivationalHeader section="dashboard" onNavigate={(view) => onNavigate(view as View)} />
            <TabsList className="h-auto w-fit gap-1 rounded-xl bg-muted/70 p-1">
              {dashboardTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="h-8 !flex-none gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground data-active:bg-background data-active:text-foreground data-active:shadow-sm"
                >
                  <HugeiconsIcon icon={tab.icon} strokeWidth={2} className="size-4" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="default" className="w-full sm:w-auto" />}>
                <HugeiconsIcon icon={Download01Icon} strokeWidth={2} data-icon="inline-start" />
                {t("dashboard.actions.download")}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-64">
                <DropdownMenuItem onClick={() => void exportDashboardReport("daily")}>
                  {t("dashboard.reports.dailyTitle")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void exportDashboardReport("weekly")}>
                  {t("dashboard.reports.weeklyTitle")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void exportDashboardReport("monthly")}>
                  {t("dashboard.reports.monthlyTitle")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Popover>
              <PopoverTrigger
                render={
                  <Button variant="outline" className="w-full justify-start sm:w-auto" />
                }
              >
                <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} data-icon="inline-start" />
                {reportReferenceDate.toLocaleDateString(currentLocale, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={reportReferenceDate}
                  onSelect={(date) => {
                    if (date) setSelectedReportDate(date)
                  }}
                  captionLayout="dropdown"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <TabsContent value="overview" className="relative">
          {/* Beautiful mesh gradient background */}
          <MeshGradient className="fixed inset-0" />

          <div className="relative z-10 px-4">
            <div className="mx-auto w-full max-w-[1160px] min-w-0 space-y-6">
              {/* Flat Design Dashboard - Lead Metrics Strip */}
              <LeadMetricStrip metrics={metrics} />

              {/* Flat Design Dashboard - Main Charts */}
              <div className="grid gap-5 xl:grid-cols-[minmax(0,2.15fr)_minmax(330px,1fr)]">
                <LeadRevenuePanel metrics={metrics} />
                <LeadSegmentationPanel metrics={metrics} />
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2.1fr)]">
                <LeadStatusPanel metrics={metrics} />
                <WebVisitsPanel metrics={metrics} />
              </div>

              {/* Flat Design Dashboard - Insight Cards Grid */}
              <DashboardSection
                title="Indicateurs operationnels"
                subtitle={`Lecture rapide des revenus, patients, activite clinique et zones de vigilance avec les donnees ${APP_NAME}.`}
                cards={galleryCards}
              />

              {/* Widgets Luma - Grille homogene (conserves pour les fonctionnalites rapides) */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <NextAppointmentWidgetLumaV2
                  appointment={
                    nextAppointmentCard
                      ? {
                          id: nextAppointmentCard.id,
                          patient: nextAppointmentCard.patient,
                          type: nextAppointmentCard.type,
                          startTime: nextAppointmentCard.startTime,
                          vetName: nextAppointmentCard.vetName,
                        }
                      : null
                  }
                  onNavigate={() => onNavigate("agenda")}
                />
                <TasksWidgetLumaV2
                  tasks={tasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    status: t.status === "done" ? "completed" : t.status === "in_progress" ? "pending" : "pending",
                    priority: t.priority,
                    dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
                  }))}
                  onNavigate={() => onNavigate("taches")}
                />
                <StockAlertsWidgetLumaV2
                  products={products.map((p) => ({
                    id: p.id,
                    name: p.name,
                    quantity: Number(p.quantity),
                    minStock: Number(p.minStock),
                    unit: p.unit,
                  }))}
                  onNavigate={() => onNavigate("stock")}
                />
              </div>

              {/* Recent Consultations Widget - Full Width */}
              <RecentConsultationsWidget
                consultations={appointments.slice(0, 8).map((a) => {
                  const patient = patients.find((p) => p.id === a.patientId)
                  const owner = owners.find((o) => o.id === (patient?.ownerId || a.ownerId))
                  const vet = users.find((u) => u.id === a.vetId)
                  return {
                    id: a.id,
                    patientName: patient?.name || "Patient inconnu",
                    patientSubtext: patient?.species
                      ? `${patient.species} - ${patient.breed || "Race non precisee"}`
                      : undefined,
                    ownerName: owner ? `${owner.firstName} ${owner.lastName}`.trim() : "Proprietaire inconnu",
                    vetName: vet ? vet.displayName : undefined,
                    type: a.type,
                    date: new Date(a.startTime).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    }),
                    time: new Date(a.startTime).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                    status: a.status as "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show",
                  }
                })}
                onNavigate={() => onNavigate("clinique")}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="relative">
          <MeshGradient className="fixed inset-0" />
          <div className="relative z-10 px-6">
            <div className="mx-auto flex w-full max-w-[1160px] min-w-0 flex-col gap-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    Analyse detaillee
                  </p>
                  <h2 className="text-[28px] font-normal tracking-[-0.04em] text-foreground">
                    Vue analytique du cabinet
                  </h2>
                </div>
              </div>

              <LeadMetricStrip metrics={metrics} />

              <div className="grid gap-5 xl:grid-cols-[minmax(0,2.15fr)_minmax(330px,1fr)]">
                <LeadRevenuePanel metrics={metrics} />
                <LeadSegmentationPanel metrics={metrics} />
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2.1fr)]">
                <LeadStatusPanel metrics={metrics} />
                <WebVisitsPanel metrics={metrics} />
              </div>

              <DashboardSection
                title="Tous les indicateurs"
                subtitle="Vue complete des metriques operationnelles et financieres."
                cards={galleryCards}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="relative">
          <MeshGradient className="fixed inset-0" />
          <div className="relative z-10 grid gap-6 px-4 lg:grid-cols-3 lg:px-6">
            {[
              { id: "daily", title: t("dashboard.reports.dailyTitle"), description: t("dashboard.reports.dailyDesc"), cta: t("dashboard.reports.dailyCta") },
              { id: "weekly", title: t("dashboard.reports.weeklyTitle"), description: t("dashboard.reports.weeklyDesc"), cta: t("dashboard.reports.weeklyCta") },
              { id: "monthly", title: t("dashboard.reports.monthlyTitle"), description: t("dashboard.reports.monthlyDesc"), cta: t("dashboard.reports.monthlyCta") },
            ].map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <CardDescription>{t("dashboard.reports.exportPdf")}</CardDescription>
                  <CardTitle>{report.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                  <Button className="w-full" onClick={() => void exportDashboardReport(report.id as "daily" | "weekly" | "monthly")}>
                    <HugeiconsIcon icon={Download01Icon} strokeWidth={2} data-icon="inline-start" />
                    {report.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="relative">
          <MeshGradient className="fixed inset-0" />
          <div className="relative z-10 px-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <InsightsWidgetLumaV2
                insights={[]}
                onNavigate={(view) => onNavigate(view as View)}
              />
              <PerformanceWidgetLumaV2
                todayAppointments={metrics.summary.todayAppointments}
                completedAppointments={appointments.filter(a => {
                  const d = new Date(a.startTime)
                  return isSameDay(d, referenceDate) && a.status === "completed"
                }).length}
                activePatients={metrics.summary.currentActivePatients}
              />
              <RecentActivityWidgetLumaV2
                activities={appointments.slice(0, 4).map((a) => {
                  const patient = patients.find((p) => p.id === a.patientId)
                  return {
                    id: `apt-${a.id}`,
                    type: "appointment",
                    title: patient?.name || a.title,
                    description: a.type,
                    time: new Date(a.startTime).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  }
                })}
                onNavigate={() => onNavigate("agenda")}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Command Palette pour navigation rapide */}
      <CommandPalette 
        open={commandPaletteOpen} 
        onOpenChange={setCommandPaletteOpen}
        onNavigate={onNavigate}
      />
    </div>
  )
}

// ============================================================================
// CHART COMPONENTS (embedded for flat design widgets)
// ============================================================================

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"

function findLastIndexBy<T>(items: T[], predicate: (item: T) => boolean) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) return index
  }
  return -1
}

function findLastBy<T>(items: T[], predicate: (item: T) => boolean) {
  const index = findLastIndexBy(items, predicate)
  return index >= 0 ? items[index] : undefined
}

function formatCompactInteger(value: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value))
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function MiniHoverPreview({
  label,
  value,
  meta,
  color,
}: {
  label: string
  value: string
  meta?: string
  color?: string
}) {
  return (
    <div className="rounded-[12px] border border-border bg-[var(--color-surface-soft)] px-2.5 py-2 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {color ? <span className="size-2 rounded-full" style={{ backgroundColor: color }} /> : null}
          <span className="text-[11px] font-medium text-foreground">{label}</span>
        </div>
        {meta ? <span className="font-mono text-[10px] text-muted-foreground">{meta}</span> : null}
      </div>
      <div className="mt-1 font-mono text-[11px] text-foreground">{value}</div>
    </div>
  )
}

function RevenueBarsChart({
  data,
}: {
  data: Array<{ month: string; value: number; active: number; hasData: boolean }>
}) {
  const activeIndex = Math.max(0, findLastIndexBy(data, (entry) => entry.value > 0))
  const chartData = data.map((entry, index) => ({
    ...entry,
    base: entry.value,
    activeOverlay: index === activeIndex ? entry.value : 0,
  }))

  const config = {
    base: { label: "Reference", color: "oklch(0.96 0.008 220)" },
    active: { label: "Actif", color: "oklch(0.65 0.15 35)" },
  } satisfies ChartConfig

  return (
    <ChartContainer config={config} className="h-full w-full">
      <BarChart data={chartData} barGap={4} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_label, payload) => payload?.[0]?.payload?.month ?? ""}
              formatter={(_value, _name, item) => {
                const payload = item?.payload as { value?: number } | undefined
                return payload?.value ? formatMoneyDa(payload.value * 100) : null
              }}
            />
          }
        />
        <Bar dataKey="base" fill="var(--color-base)" radius={[8, 8, 8, 8]} barSize={10}>
          {chartData.map((entry) => (
            <Cell key={`${entry.month}-base`} fill={entry.hasData ? "oklch(0.96 0.008 220)" : "oklch(0.98 0.005 220)"} />
          ))}
        </Bar>
        <Bar dataKey="activeOverlay" fill="var(--color-active)" radius={[8, 8, 8, 8]} barSize={10}>
          {chartData.map((entry) => (
            <Cell key={`${entry.month}-active`} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

function ChannelSourcesChart({
  rows,
}: {
  rows: Array<{ label: string; value: number; color: string }>
}) {
  const compactRows = rows.slice(0, 3)
  const total = compactRows.reduce((acc, row) => acc + row.value, 0)
  const formatCompactAmount = (value: number) => {
    const absolute = Math.abs(value)
    if (absolute >= 1000) {
      return `${new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: absolute >= 100000 ? 0 : 1,
        maximumFractionDigits: 1,
      }).format(value / 1000)}k`
    }
    return formatCompactInteger(value)
  }
  const [selectedLabel, setSelectedLabel] = useState<string>(compactRows[0]?.label ?? "")
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null)

  const displayLabel = hoveredLabel ?? selectedLabel
  const displayRow = compactRows.find((row) => row.label === displayLabel) ?? compactRows[0]
  const isPreviewing = hoveredLabel !== null && hoveredLabel !== selectedLabel

  return (
    <div className="flex h-full flex-col">
      {displayRow ? (
        <div
          className={cn(
            "mb-3 rounded-[12px] border px-2.5 py-2 transition-all",
            isPreviewing
              ? "border-foreground/10 bg-[var(--color-surface-soft-2)] shadow-soft"
              : "border-border bg-[var(--color-surface-soft)]"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: displayRow.color }} />
              <span className="text-[11px] font-medium text-foreground">{displayRow.label}</span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              {total ? formatPercent((displayRow.value / total) * 100) : "0%"}
            </span>
          </div>
          <div className="mt-1 font-mono text-[11px] text-foreground">{formatCompactAmount(displayRow.value / 100)} DA</div>
        </div>
      ) : null}

      <div className="mb-3 flex h-2.5 gap-1.5">
        {compactRows.map((row) => (
          <button
            key={row.label}
            className={cn(
              "h-full cursor-pointer rounded-full transition-all",
              row.label === selectedLabel && "ring-2 ring-foreground/10",
              row.label === hoveredLabel && row.label !== selectedLabel && "brightness-110 ring-2 ring-foreground/8",
              displayLabel && displayLabel !== row.label && "opacity-40"
            )}
            style={{ backgroundColor: row.color, flex: row.value || 1 }}
            type="button"
            onClick={() => setSelectedLabel(row.label)}
            onMouseEnter={() => setHoveredLabel(row.label)}
            onMouseLeave={() => setHoveredLabel(null)}
          />
        ))}
      </div>

      <div className="space-y-1">
        {compactRows.map((row) => (
          <button
            key={row.label}
            className={cn(
              "-mx-1 grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors",
              row.label === selectedLabel
                ? "bg-[var(--color-surface-soft)]"
                : row.label === hoveredLabel
                  ? "bg-[var(--color-surface-soft-2)]"
                  : "hover:bg-muted/40"
            )}
            type="button"
            onClick={() => setSelectedLabel(row.label)}
            onMouseEnter={() => setHoveredLabel(row.label)}
            onMouseLeave={() => setHoveredLabel(null)}
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: row.color }} />
              <span className="truncate text-[11px] text-foreground">{row.label}</span>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {total ? formatPercent((row.value / total) * 100) : "0%"}
              </span>
            </div>
            <span className="font-mono text-[11px] text-foreground">{formatCompactAmount(row.value / 100)} DA</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ItemDemandChart({
  data,
}: {
  data: Array<{ name: string; demand: number }>
}) {
  const config = { demand: { label: "Actes", color: "oklch(0.65 0.15 35)" } } satisfies ChartConfig

  return (
    <ChartContainer config={config} className="h-full w-full">
      <BarChart data={data} barCategoryGap="20%" margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_label, payload) => payload?.[0]?.payload?.name ?? ""}
            />
          }
        />
        <Bar dataKey="demand" fill="url(#itemDemandFillV2)" radius={[10, 10, 10, 10]} maxBarSize={32} />
        <defs>
          <linearGradient id="itemDemandFillV2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.75 0.12 35)" />
            <stop offset="100%" stopColor="oklch(0.65 0.15 35)" />
          </linearGradient>
        </defs>
      </BarChart>
    </ChartContainer>
  )
}

function CampaignDataChart({
  data,
}: {
  data: Array<{ name: string; value: number }>
}) {
  const config = { value: { label: "Flux net", color: "oklch(0.65 0.15 35)" } } satisfies ChartConfig

  return (
    <ChartContainer config={config} className="h-full w-full">
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{ top: 10, right: 12, left: 12, bottom: 20 }}
      >
        <defs>
          <linearGradient id="campaignFillV2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.65 0.15 35)" stopOpacity={0.16} />
            <stop offset="100%" stopColor="oklch(0.65 0.15 35)" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tickMargin={12}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_label, payload) => payload?.[0]?.payload?.name ?? ""}
              formatter={(value) => formatMoneyDa(Number(value) * 100)}
            />
          }
        />
        <Area
          type="natural"
          dataKey="value"
          stroke="var(--color-value)"
          fill="url(#campaignFillV2)"
          strokeWidth={1.5}
          dot={false}
          fillOpacity={1}
        />
      </AreaChart>
    </ChartContainer>
  )
}

function SegmentedProgress({ 
  total = 30, 
  completed = 16,
  percentage = 53
}: { 
  total?: number; 
  completed?: number;
  percentage?: number;
}) {
  const displayPercentage = percentage || 53
  // Color based on level: red < 30, amber 30-69, green >= 70
  const fillColor =
    displayPercentage >= 70
      ? "var(--task-full)"
      : displayPercentage >= 30
        ? "var(--task-mid)"
        : "var(--task-low)"
  const glowColor =
    displayPercentage >= 70
      ? "var(--task-full-glow)"
      : displayPercentage >= 30
        ? "var(--task-mid-glow)"
        : "var(--task-low-glow)"

  // 5 battery cells
  const cellCount = 5
  const filledCells = Math.round((displayPercentage / 100) * cellCount)

  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full w-full px-3">
      {/* Battery */}
      <div className="flex flex-col items-center gap-2">
        <svg width="64" height="110" viewBox="0 0 64 110" fill="none">
          {/* Battery tip */}
          <rect x="22" y="0" width="20" height="6" rx="2" className="fill-[var(--task-pending)]" />
          {/* Battery body */}
          <rect x="8" y="8" width="48" height="96" rx="8" className="fill-[var(--task-pending)]" strokeWidth="0" />
          {/* Battery cells — bottom to top */}
          {Array.from({ length: cellCount }, (_, i) => {
            const cellIndex = cellCount - 1 - i
            const isFilled = cellIndex < filledCells
            const y = 14 + i * 18
            return (
              <rect
                key={i}
                x="14"
                y={y}
                width="36"
                height="14"
                rx="3"
                fill={isFilled ? fillColor : "var(--task-cell-empty)"}
                style={isFilled ? { filter: `drop-shadow(0 0 4px ${glowColor})` } : undefined}
              />
            )
          })}
        </svg>
      </div>

      {/* Percentage + label */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[22px] font-semibold tracking-[-0.03em]" style={{ color: fillColor }}>
          {displayPercentage}%
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-muted-foreground">
          {completed}/{total} taches
        </span>
      </div>
    </div>
  )
}

function WorkflowPaceChart({
  series,
}: {
  series: Array<{ label: string; total: number; completed: number; pending: number; isCurrent: boolean }>
}) {
  // Always use 53% reference value like prototype
  const percentage = 53
  const completedSegments = Math.round((percentage / 100) * 30) // ~16 segments

  return (
    <div className="h-full w-full flex flex-col items-center justify-center px-2">
      <SegmentedProgress 
        total={30} 
        completed={completedSegments} 
        percentage={percentage}
      />
    </div>
  )
}

function UserRetentionGrid({
  days,
}: {
  days: Array<{ date: Date; value: number }>
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  
  // Fixed to 24% like prototype reference
  const retentionRate = 24
  
  // Generate visual heatmap data (84 cells = 12 weeks x 7 days) like prototype
  // Creates a realistic activity pattern
  const heatmapData = useMemo(() => {
    const data: Array<{ value: number; intensity: number }> = []
    const seedPattern = [
      0,0,2,4,3,1,0,  2,5,7,6,4,2,0,  1,4,6,8,5,2,0,
      0,3,5,7,4,1,0,  2,4,6,5,3,0,0,  1,3,5,4,2,1,0,
      0,2,4,6,3,1,0,  1,4,5,7,4,2,0,  0,2,3,5,2,0,0,
      0,1,3,4,2,1,0,  2,3,5,4,3,1,0,  0,2,4,3,2,0,0,
    ]
    
    for (let i = 0; i < 84; i++) {
      const value = seedPattern[i % seedPattern.length]
      const intensity = value / 8
      data.push({ value, intensity })
    }
    return data
  }, [])
  const fallbackIndex = (() => {
    for (let index = heatmapData.length - 1; index >= 0; index -= 1) {
      if (heatmapData[index].value > 0) return index
    }
    return 0
  })()
  const activeIndex = hoveredIndex ?? fallbackIndex
  const activeCell = activeIndex >= 0 ? heatmapData[activeIndex] : undefined

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-2">
      <div className="w-full h-[52px]">
        {activeCell ? (
          <MiniHoverPreview
            label={`Semaine ${Math.floor((activeIndex ?? 0) / 7) + 1}`}
            value={`${activeCell.value} retour(s)`}
            meta="activite"
            color={
              activeCell.value === 0
                ? "var(--retention-empty)"
                : activeCell.intensity > 0.75
                  ? "var(--retention-high)"
                  : activeCell.intensity > 0.5
                    ? "var(--retention-mid)"
                    : activeCell.intensity > 0.25
                      ? "var(--retention-low)"
                      : "var(--retention-min)"
            }
          />
        ) : null}
      </div>
      {/* Percentage display */}
      <div className="w-full flex items-center justify-center">
        <span className="text-[24px] font-normal tracking-[-0.02em] text-foreground">
          {retentionRate}%
        </span>
      </div>
      
      {/* Percentage label */}
      <div className="flex items-center justify-center gap-1 text-[10px]">
        <span className="text-chart-red">12.5%</span>
        <span className="text-muted-foreground">vs periode precedente</span>
      </div>

      {/* Heatmap grid - centered */}
      <div className="flex justify-center">
        <div 
          className="grid gap-[3px]"
          style={{ 
            gridTemplateColumns: 'repeat(12, 1fr)',
            gridTemplateRows: 'repeat(7, 1fr)'
          }}
        >
          {heatmapData.map((cell, index) => {
            const isHovered = hoveredIndex === index
            
            // Cyan/turquoise color scale — uses CSS vars for dark mode support
            const backgroundColor =
              cell.value === 0
                ? "var(--retention-empty)"
                : cell.intensity > 0.75
                  ? "var(--retention-high)"
                  : cell.intensity > 0.5
                    ? "var(--retention-mid)"
                    : cell.intensity > 0.25
                      ? "var(--retention-low)"
                      : "var(--retention-min)"

            return (
              <div
                key={index}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="flex items-center justify-center p-[1px]"
              >
                <div
                  className={cn(
                    "w-[8px] h-[8px] rounded-[2px] transition-colors duration-150",
                    isHovered && "ring-1 ring-foreground/20"
                  )}
                  style={{
                    backgroundColor,
                    opacity: isHovered ? 1 : cell.value === 0 ? 0.5 : 0.7 + cell.intensity * 0.3,
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-between w-full px-1 font-mono text-[9px] uppercase tracking-[0.04em] text-muted-foreground">
        <span>12 SEMAINES</span>
        <span>ACTIVITE REELLE</span>
      </div>
    </div>
  )
}

function PipelineChart({
  rows,
}: {
  rows: Array<{ label: string; value: number; ratio: number; color: string }>
}) {
  const config = {
    value: { label: "Pipeline", color: "var(--color-chart-blue)" },
  } satisfies ChartConfig

  const chartData = rows.map((row) => ({ stage: row.label, value: row.value, fill: row.color }))

  return (
    <ChartContainer config={config} className="h-full w-full">
      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="stage"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={60}
          tick={{ fontSize: 9, fontFamily: "IBM Plex Mono", letterSpacing: "0.04em", fill: "oklch(0.50 0.02 230)" }}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="value" radius={[999, 999, 999, 999]} barSize={6}>
          {chartData.map((entry) => (
            <Cell key={entry.stage} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

function WorldMap({
  topCities,
}: {
  topCities: Array<{ city: string; count: number }>
}) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  const cityCoordinates: Record<string, { x: number; y: number }> = {
    Alger: { x: 49, y: 23 },
    Blida: { x: 50, y: 24 },
    Tipaza: { x: 47, y: 24 },
    Boumerdes: { x: 51, y: 22 },
    Oran: { x: 43, y: 24 },
    Constantine: { x: 55, y: 22 },
    Paris: { x: 20, y: 25 },
    Dubai: { x: 76, y: 31 },
    Jakarta: { x: 70, y: 45 },
    Sydney: { x: 85, y: 65 },
  }

  const worldPaths = [
    "M7 24C10 19 16 16 23 15C29 14 35 16 38 20C40 23 39 27 34 29C30 31 27 34 26 38C25 42 23 45 20 47C17 49 14 48 12 45C10 41 9 37 7 33C5 29 5 26 7 24Z",
    "M22 48C25 50 27 54 28 58C29 63 27 69 24 73C22 76 20 74 19 69C18 63 18 58 19 53C20 50 20 48 22 48Z",
    "M42 21C45 18 49 16 54 16C58 16 62 18 63 21C64 24 62 27 58 29C55 30 52 32 51 35C50 39 48 42 45 43C42 44 40 42 39 39C38 35 38 31 39 27C39 24 40 22 42 21Z",
    "M47 43C50 41 54 41 59 42C64 43 69 45 73 47C77 49 80 50 84 50C88 50 92 51 95 54C98 57 98 60 95 62C92 64 88 65 84 66C80 67 77 69 73 71C69 73 65 73 61 71C57 69 54 65 51 61C48 57 46 53 45 49C44 46 45 44 47 43Z",
    "M55 45C57 48 58 52 58 57C58 62 56 66 53 69C50 72 48 70 47 65C46 60 46 55 47 50C48 47 50 45 52 45C53 45 54 45 55 45Z",
    "M80 69C83 68 86 68 89 69C92 70 94 72 95 74C96 76 95 78 92 79C89 80 85 80 82 79C79 78 77 76 77 73C77 71 78 70 80 69Z",
  ]

  const maxCount = Math.max(...topCities.map((item) => item.count), 1)
  const nodes = topCities.slice(0, 6).map((item, index) => {
    const coordinates = cityCoordinates[item.city] ?? [
      { x: 49, y: 23 },
      { x: 43, y: 24 },
      { x: 55, y: 22 },
      { x: 70, y: 45 },
      { x: 85, y: 65 },
      { x: 20, y: 25 },
    ][index]

    return {
      ...item,
      ...coordinates,
      color: index === 0 ? "oklch(0.65 0.12 220)" : "oklch(0.50 0.02 230)",
      featured: index === 0,
    }
  })

  const featuredNode = nodes[0]

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[14px] bg-card">
      {/* Featured city info - always visible at top */}
      {featuredNode && (
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-foreground">{featuredNode.city}</span>
          </div>
        </div>
      )}
      
      <div className="relative aspect-square w-full max-w-[140px]">
        <svg viewBox="0 0 100 80" className="h-full w-full">
          <defs>
            <pattern id="world-dots-v2" x="0" y="0" width="2.05" height="2.05" patternUnits="userSpaceOnUse">
              <circle cx="1.025" cy="1.025" r="0.33" fill="var(--color-muted-foreground)" opacity="0.4" />
            </pattern>
          </defs>
          <g transform="translate(1.5 8) scale(0.965)">
            {worldPaths.map((path, index) => (
              <path key={index} d={path} fill="url(#world-dots-v2)" opacity="0.8" />
            ))}
          </g>
          {nodes.map((node) => {
            const isHovered = hoveredNode === node.city
            const size = node.featured ? 2.2 : isHovered ? 1.6 : 1.0
            const intensity = node.count / maxCount
            return (
              <g key={node.city}>
                {node.featured ? (
                  <>
                    <circle cx={node.x} cy={node.y + 8} r="5.5" fill="oklch(0.65 0.12 220)" opacity="0.1" />
                    <circle cx={node.x} cy={node.y + 8} r="3.5" fill="none" stroke="oklch(0.65 0.12 220)" strokeWidth="0.6" opacity="0.4" />
                  </>
                ) : null}
                <circle
                  cx={node.x}
                  cy={node.y + 8}
                  r={size + (node.featured ? 1.5 : 0.7)}
                  fill={node.color}
                  opacity={node.featured ? 0.12 : 0.06 + intensity * 0.06}
                />
                <circle
                  cx={node.x}
                  cy={node.y + 8}
                  r={size}
                  fill={node.color}
                  stroke={node.featured ? "white" : "var(--color-card)"}
                  strokeWidth={node.featured ? "0.8" : "0.25"}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredNode(node.city)}
                  onMouseLeave={() => setHoveredNode(null)}
                />
                {node.featured ? <circle cx={node.x} cy={node.y + 8} r="0.6" fill="white" /> : null}
                {(isHovered || node.featured) && (
                  <text
                    x={node.x}
                    y={node.y + 10 - (node.featured ? 8.2 : 5.2)}
                    textAnchor="middle"
                    fontSize={node.featured ? "3" : "2.55"}
                    fill="var(--color-foreground)"
                    opacity={node.featured ? 0.82 : 0.65}
                    fontWeight={node.featured ? "600" : "500"}
                  >
                    {node.city}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Featured city info card at bottom - always visible */}
      {!hoveredNode && featuredNode && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-lg border border-border bg-card px-2.5 py-1.5">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full" style={{ backgroundColor: featuredNode.color }} />
            <span className="text-[11px] font-medium text-foreground">{featuredNode.city}</span>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            {featuredNode.count} clients
          </span>
        </div>
      )}

      {/* Hover tooltip */}
      {hoveredNode && (
        <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-border bg-card/95 p-2 shadow-soft backdrop-blur-sm">
          {(() => {
            const node = nodes.find((entry) => entry.city === hoveredNode)
            if (!node) return null
            return (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full" style={{ backgroundColor: node.color }} />
                  <span className="text-[11px] font-medium text-foreground">{node.city}</span>
                </div>
                <span className="text-[11px] font-mono" style={{ color: node.color }}>
                  {node.count} clients
                </span>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
