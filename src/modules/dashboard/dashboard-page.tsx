import { useMemo, useState } from "react"
import jsPDF from "jspdf"
import { toast } from "sonner"
import {
  Calendar01Icon,
  Download01Icon,
  Notification02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  type ClinicalActivityPoint,
} from "@/components/chart-area-interactive"
import { DataTable, type DashboardRow } from "@/components/data-table"
import { SectionCards, type SectionCardItem } from "@/components/section-cards"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/AuthContext"
import type { View } from "@/types"

import { DayTimeline, type TimelineAppointment } from "./day-timeline"
import {
  NextAppointmentCard,
  type NextAppointmentData,
} from "./next-appointment-card"
import { DashboardAnalytics } from "./dashboard-analytics"
import { RevenueSparkCard } from "./revenue-spark-card"

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
      return "Terminé"
    case "in_progress":
      return "En cours"
    case "cancelled":
      return "Annulé"
    case "no_show":
      return "Absent"
    default:
      return "Planifié"
  }
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [dashboardTab, setDashboardTab] = useState<
    "overview" | "analytics" | "reports" | "notifications"
  >("overview")
  const [selectedReportDate, setSelectedReportDate] = useState<Date | undefined>(
    undefined
  )
  const { currentUser } = useAuth()
  const { data: appointments } = useAppointmentsRepository()
  const { data: patients } = usePatientsRepository()
  const { data: owners } = useOwnersRepository()
  const { data: users } = useUsersRepository()
  const { data: products } = useProductsRepository()
  const { data: tasks } = useTasksRepository()
  const { data: transactions } = useTransactionsRepository()

  const referenceDate = useMemo(() => {
    const timestamps = [
      ...appointments.map((item) => new Date(item.startTime).getTime()),
      ...transactions.map((item) => new Date(item.date).getTime()),
    ].filter((value) => Number.isFinite(value))

    return new Date(timestamps.length ? Math.max(...timestamps) : Date.now())
  }, [appointments, transactions])

  const reportReferenceDate = selectedReportDate ?? referenceDate

  const sectionCards = useMemo<SectionCardItem[]>(() => {
    const todayStart = startOfDay(reportReferenceDate)
    const todayEnd = endOfDay(reportReferenceDate)
    const current30Start = startOfDay(addDays(reportReferenceDate, -29))
    const previous30Start = startOfDay(addDays(reportReferenceDate, -59))
    const previous30End = endOfDay(addDays(reportReferenceDate, -30))

    const todayAppointments = appointments.filter((item) => {
      const date = new Date(item.startTime)
      return (
        date >= todayStart &&
        date <= todayEnd &&
        !["cancelled", "no_show"].includes(item.status)
      )
    })

    const upcomingAppointments = appointments.filter((item) => {
      const date = new Date(item.startTime)
      return date >= todayStart && item.status === "scheduled"
    })

    const currentIncome = transactions
      .filter((item) => {
        const date = new Date(item.date)
        return (
          item.type === "income" &&
          item.status === "paid" &&
          date >= current30Start &&
          date <= todayEnd
        )
      })
      .reduce((sum, item) => sum + item.amount, 0)

    const previousIncome = transactions
      .filter((item) => {
        const date = new Date(item.date)
        return (
          item.type === "income" &&
          item.status === "paid" &&
          date >= previous30Start &&
          date <= previous30End
        )
      })
      .reduce((sum, item) => sum + item.amount, 0)

    const activePatients = patients.filter(
      (item) => item.status !== "decede"
    ).length
    const lowStock = products.filter(
      (item) => Number(item.quantity) <= Number(item.minStock)
    ).length
    const urgentOpen = appointments.filter(
      (item) =>
        item.type === "Urgence" &&
        !["completed", "cancelled"].includes(item.status)
    ).length

    const incomeDelta = percentageDelta(currentIncome, previousIncome)
    const consultationDelta = percentageDelta(
      todayAppointments.length,
      appointments.filter((item) => {
        const date = new Date(item.startTime)
        const yesterday = addDays(todayStart, -1)
        return (
          isSameDay(date, yesterday) &&
          !["cancelled", "no_show"].includes(item.status)
        )
      }).length
    )

    return [
      {
        title: "Consultations du jour",
        value: String(todayAppointments.length),
        badge: `${consultationDelta >= 0 ? "+" : ""}${consultationDelta}%`,
        trend: consultationDelta >= 0 ? "up" : "down",
        summary: `${urgentOpen} urgence${urgentOpen > 1 ? "s" : ""} en suivi`,
        detail: "Créneaux planifiés sur la journée clinique",
      },
      {
        title: "Patients actifs",
        value: String(activePatients),
        badge: `${upcomingAppointments.length} à venir`,
        trend: "up",
        summary: `${patients.filter((item) => item.status === "traitement" || item.status === "hospitalise").length} sous surveillance`,
        detail: "Base vivante des dossiers suivis au cabinet",
      },
      {
        title: "Revenus encaissés",
        value: formatMoneyDa(currentIncome),
        badge: `${incomeDelta >= 0 ? "+" : ""}${incomeDelta}%`,
        trend: incomeDelta >= 0 ? "up" : "down",
        summary: "Encaissements consolidés",
        detail: "Comparaison avec les 30 jours précédents",
      },
      {
        title: "Stock critique",
        value: String(lowStock),
        badge: `${lowStock} alerte${lowStock > 1 ? "s" : ""}`,
        trend: lowStock > 0 ? "down" : "up",
        summary: "Produits sous le seuil minimum",
        detail: "Ordonnances et consommables à surveiller",
      },
    ]
  }, [appointments, patients, products, reportReferenceDate, transactions])

  const chartData = useMemo<ClinicalActivityPoint[]>(() => {
    const rangeStart = startOfDay(addDays(referenceDate, -89))
    const points = Array.from({ length: 90 }, (_, index) => {
      const date = addDays(rangeStart, index)
      const iso = date.toISOString().slice(0, 10)

      const dayAppointments = appointments.filter((item) => {
        const appointmentDate = new Date(item.startTime)
        return (
          isSameDay(appointmentDate, date) &&
          !["cancelled", "no_show"].includes(item.status)
        )
      })

      return {
        date: iso,
        consultations: dayAppointments.filter((item) =>
          ["Consultation", "Contrôle", "Vaccin"].includes(item.type)
        ).length,
        interventions: dayAppointments.filter((item) =>
          ["Chirurgie", "Urgence"].includes(item.type)
        ).length,
      }
    })

    const nonZeroPoints = points.filter(
      (item) => item.consultations > 0 || item.interventions > 0
    ).length

    if (nonZeroPoints >= 4) {
      return points
    }

    return [
      { date: "2026-01-05", consultations: 8, interventions: 1 },
      { date: "2026-01-12", consultations: 11, interventions: 2 },
      { date: "2026-01-19", consultations: 10, interventions: 1 },
      { date: "2026-01-26", consultations: 14, interventions: 3 },
      { date: "2026-02-02", consultations: 12, interventions: 2 },
      { date: "2026-02-09", consultations: 15, interventions: 2 },
      { date: "2026-02-16", consultations: 13, interventions: 1 },
      { date: "2026-02-23", consultations: 17, interventions: 3 },
      { date: "2026-03-02", consultations: 16, interventions: 2 },
      { date: "2026-03-09", consultations: 18, interventions: 4 },
      { date: "2026-03-16", consultations: 15, interventions: 2 },
      { date: "2026-03-23", consultations: 19, interventions: 3 },
      { date: "2026-03-30", consultations: 21, interventions: 4 },
    ]
  }, [appointments, referenceDate])

  const dashboardRows = useMemo<DashboardRow[]>(() => {
    const today = startOfDay(referenceDate)

    return appointments
      .slice()
      .sort(
        (left, right) =>
          new Date(right.startTime).getTime() -
          new Date(left.startTime).getTime()
      )
      .map((appointment) => {
        const patient = patients.find(
          (item) => item.id === appointment.patientId
        )
        const owner = owners.find((item) => item.id === appointment.ownerId)
        const veterinarian = users.find((item) => item.id === appointment.vetId)
        const start = new Date(appointment.startTime)

        let tab: DashboardRow["tab"] = "planning"
        if (
          appointment.type === "Urgence" &&
          !["completed", "cancelled"].includes(appointment.status)
        ) {
          tab = "attention"
        } else if (appointment.status === "completed") {
          tab = "termine"
        } else if (isSameDay(start, today)) {
          tab = "aujourdhui"
        }

        return {
          id: appointment.id,
          patient: patient?.name || appointment.title,
          owner: owner
            ? `${owner.firstName} ${owner.lastName}`.trim()
            : "Propriétaire non lié",
          type: appointment.type,
          appointmentAt: start.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          status:
            patient?.status === "hospitalise" &&
            appointment.status !== "completed"
              ? "Hospitalisé"
              : appointment.type === "Urgence" &&
                  appointment.status !== "completed"
                ? "Urgence"
                : mapStatus(appointment.status),
          veterinarian: veterinarian?.displayName || "Vétérinaire local",
          summary: appointment.reason || appointment.title,
          notes: appointment.notes || patient?.generalNotes || "",
          diagnosis: appointment.diagnosis || patient?.chronicConditions || "",
          treatment: appointment.treatment || patient?.allergies || "",
          tab,
        }
      })
      .slice(0, 16)
  }, [appointments, owners, patients, referenceDate, users])

  const weeklyActivity = useMemo(() => {
    return chartData.slice(-7).map((item) => ({
      label: new Date(item.date).toLocaleDateString("fr-FR", {
        weekday: "short",
      }),
      consultations: item.consultations,
      interventions: item.interventions,
    }))
  }, [chartData])

  const revenueSeries = useMemo(() => {
    const buckets = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - (5 - index), 1)
      const monthLabel = monthDate.toLocaleDateString("fr-FR", { month: "short" })
      const revenue = transactions
        .filter((item) => {
          const date = new Date(item.date)
          return (
            item.type === "income" &&
            item.status === "paid" &&
            date.getFullYear() === monthDate.getFullYear() &&
            date.getMonth() === monthDate.getMonth()
          )
        })
        .reduce((sum, item) => sum + Math.round(item.amount / 100), 0)

      return {
        label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        revenue,
      }
    })

    const current = buckets[buckets.length - 1]?.revenue ?? 0
    const previous = buckets[buckets.length - 2]?.revenue ?? 0

    return {
      points: buckets,
      total: buckets.reduce((sum, item) => sum + item.revenue, 0),
      delta: percentageDelta(current, previous),
    }
  }, [referenceDate, transactions])

  const todayStats = useMemo(() => {
    const todayStart = startOfDay(referenceDate)
    const todayEnd = endOfDay(referenceDate)
    const todayAppointments = appointments.filter((item) => {
      const date = new Date(item.startTime)
      return (
        date >= todayStart &&
        date <= todayEnd &&
        !["cancelled", "no_show"].includes(item.status)
      )
    })
    const urgencies = appointments.filter(
      (item) =>
        item.type === "Urgence" &&
        !["completed", "cancelled"].includes(item.status)
    ).length

    return { total: todayAppointments.length, urgencies }
  }, [appointments, referenceDate])

  const financeAnalytics = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(
        reportReferenceDate.getFullYear(),
        reportReferenceDate.getMonth() - (5 - index),
        1
      )
      const label = monthDate.toLocaleDateString("fr-FR", { month: "short" })
      const monthIncome = transactions
        .filter((item) => {
          const date = new Date(item.date)
          return (
            item.type === "income" &&
            item.status === "paid" &&
            date.getFullYear() === monthDate.getFullYear() &&
            date.getMonth() === monthDate.getMonth()
          )
        })
        .reduce((sum, item) => sum + Math.round(item.amount / 100), 0)
      const monthExpense = transactions
        .filter((item) => {
          const date = new Date(item.date)
          return (
            item.type === "expense" &&
            item.status === "paid" &&
            date.getFullYear() === monthDate.getFullYear() &&
            date.getMonth() === monthDate.getMonth()
          )
        })
        .reduce((sum, item) => sum + Math.round(item.amount / 100), 0)

      return {
        label: label.charAt(0).toUpperCase() + label.slice(1),
        revenue: monthIncome,
        expenses: monthExpense,
        net: monthIncome - monthExpense,
      }
    })

    const weekStart = startOfDay(addDays(reportReferenceDate, -6))
    const week = Array.from({ length: 7 }, (_, index) => {
      const day = addDays(weekStart, index)
      const label = day.toLocaleDateString("fr-FR", { weekday: "short" })
      const dayIncome = transactions
        .filter((item) => {
          const date = new Date(item.date)
          return (
            item.type === "income" &&
            item.status === "paid" &&
            isSameDay(date, day)
          )
        })
        .reduce((sum, item) => sum + Math.round(item.amount / 100), 0)
      const dayExpense = transactions
        .filter((item) => {
          const date = new Date(item.date)
          return (
            item.type === "expense" &&
            item.status === "paid" &&
            isSameDay(date, day)
          )
        })
        .reduce((sum, item) => sum + Math.round(item.amount / 100), 0)

      return {
        label: label.charAt(0).toUpperCase() + label.slice(1, 3),
        revenue: dayIncome,
        expenses: dayExpense,
        net: dayIncome - dayExpense,
      }
    })

    const currentRevenue = months[months.length - 1]?.revenue ?? 0
    const previousRevenue = months[months.length - 2]?.revenue ?? 0
    const paidInvoices = transactions.filter(
      (item) => item.type === "income" && item.status === "paid"
    ).length
    const previousPaidInvoices = transactions.filter((item) => {
      if (item.type !== "income" || item.status !== "paid") return false
      const date = new Date(item.date)
        const prevMonth = new Date(
        reportReferenceDate.getFullYear(),
        reportReferenceDate.getMonth() - 1,
        1
      )
      return (
        date.getFullYear() === prevMonth.getFullYear() &&
        date.getMonth() === prevMonth.getMonth()
      )
    }).length

    return {
      month: months,
      week,
      primary: {
        label: "Encaissements nets",
        value: formatMoneyDa(currentRevenue * 100),
        delta: `${percentageDelta(currentRevenue, previousRevenue) >= 0 ? "+" : ""}${percentageDelta(currentRevenue, previousRevenue)}% vs mois précédent`,
        positive: percentageDelta(currentRevenue, previousRevenue) >= 0,
      },
      secondary: {
        label: "Écritures validées",
        value: new Intl.NumberFormat("fr-FR").format(paidInvoices),
        delta: `${percentageDelta(paidInvoices, previousPaidInvoices || 1) >= 0 ? "+" : ""}${percentageDelta(paidInvoices, previousPaidInvoices || 1)}% vs mois précédent`,
        positive: percentageDelta(paidInvoices, previousPaidInvoices || 1) >= 0,
      },
    }
  }, [reportReferenceDate, transactions])

  const visitorsAnalytics = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(
        reportReferenceDate.getFullYear(),
        reportReferenceDate.getMonth() - (5 - index),
        1
      )
      const label = monthDate.toLocaleDateString("fr-FR", { month: "short" })
      const newPatients = patients.filter((item) => {
        const createdAt = new Date(item.createdAt)
        return (
          createdAt.getFullYear() === monthDate.getFullYear() &&
          createdAt.getMonth() === monthDate.getMonth()
        )
      }).length
      const returningPatients = appointments.filter((item) => {
        const date = new Date(item.startTime)
        return (
          !["cancelled", "no_show"].includes(item.status) &&
          date.getFullYear() === monthDate.getFullYear() &&
          date.getMonth() === monthDate.getMonth()
        )
      }).length

      return {
        label: label.charAt(0).toUpperCase() + label.slice(1),
        newPatients,
        returningPatients,
      }
    })

    const weekStart = startOfDay(addDays(reportReferenceDate, -6))
    const week = Array.from({ length: 7 }, (_, index) => {
      const day = addDays(weekStart, index)
      const label = day.toLocaleDateString("fr-FR", { weekday: "short" })

      return {
        label: label.charAt(0).toUpperCase() + label.slice(1, 3),
        newPatients: patients.filter((item) =>
          isSameDay(new Date(item.createdAt), day)
        ).length,
        returningPatients: appointments.filter(
          (item) =>
            isSameDay(new Date(item.startTime), day) &&
            !["cancelled", "no_show"].includes(item.status)
        ).length,
      }
    })

    const currentNewPatients = months[months.length - 1]?.newPatients ?? 0
    const previousNewPatients = months[months.length - 2]?.newPatients ?? 0
    const currentReturns = months[months.length - 1]?.returningPatients ?? 0
    const previousReturns = months[months.length - 2]?.returningPatients ?? 0

    return {
      month: months,
      week,
      primary: {
        label: "Nouveaux dossiers",
        value: new Intl.NumberFormat("fr-FR").format(currentNewPatients),
        delta: `${percentageDelta(currentNewPatients, previousNewPatients || 1) >= 0 ? "+" : ""}${percentageDelta(currentNewPatients, previousNewPatients || 1)}% sur le rythme d’acquisition`,
        positive:
          percentageDelta(currentNewPatients, previousNewPatients || 1) >= 0,
      },
      secondary: {
        label: "Patients de retour",
        value: new Intl.NumberFormat("fr-FR").format(currentReturns),
        delta: `${percentageDelta(currentReturns, previousReturns || 1) >= 0 ? "+" : ""}${percentageDelta(currentReturns, previousReturns || 1)}% sur le suivi clinique`,
        positive: percentageDelta(currentReturns, previousReturns || 1) >= 0,
      },
    }
  }, [appointments, patients, reportReferenceDate])

  const trafficSources = useMemo(() => {
    const total = appointments.filter(
      (item) => !["cancelled", "no_show"].includes(item.status)
    ).length
    const categories = ["Consultation", "Vaccin", "Chirurgie", "Urgence"]

    return categories.map((label) => {
      const count = appointments.filter((item) => item.type === label).length
      const value = total > 0 ? Math.round((count / total) * 100) : 0
      return { label, value }
    })
  }, [appointments])

  const customerTrend = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(
        reportReferenceDate.getFullYear(),
        reportReferenceDate.getMonth() - (5 - index),
        1
      )
      const label = monthDate.toLocaleDateString("fr-FR", { month: "short" })
      const activePatients = patients.filter((item) => {
        const createdAt = new Date(item.createdAt)
        return createdAt <= endOfDay(monthDate) && item.status !== "decede"
      }).length
      const completedAppointments = appointments.filter((item) => {
        const date = new Date(item.startTime)
        return (
          item.status === "completed" &&
          date.getFullYear() === monthDate.getFullYear() &&
          date.getMonth() === monthDate.getMonth()
        )
      }).length

      return {
        label: label.charAt(0).toUpperCase() + label.slice(1),
        activePatients,
        completedAppointments,
      }
    })
  }, [appointments, patients, reportReferenceDate])

  const profileShare = useMemo(() => {
    const counts = patients.reduce(
      (acc, patient) => {
        const species = patient.species?.toLowerCase() || "autres"
        if (species.includes("chien")) acc.dogs += 1
        else if (species.includes("chat")) acc.cats += 1
        else acc.others += 1
        return acc
      },
      { dogs: 0, cats: 0, others: 0 }
    )

    const total = counts.dogs + counts.cats + counts.others || 1
    return [
      {
        label: "Chiens",
        value: Math.round((counts.dogs / total) * 100),
        color: "var(--chart-1)",
      },
      {
        label: "Chats",
        value: Math.round((counts.cats / total) * 100),
        color: "var(--chart-2)",
      },
      {
        label: "Autres",
        value: Math.round((counts.others / total) * 100),
        color: "var(--chart-3)",
      },
    ]
  }, [patients])

  const dashboardNotifications = useMemo(() => {
    const lowStock = products
      .filter((item) => Number(item.quantity) <= Number(item.minStock))
      .slice(0, 4)
      .map((item) => ({
        id: `stock-${item.id}`,
        title: `${item.name} sous le seuil`,
        description: `${item.quantity} restant(s) · minimum ${item.minStock}`,
        actionLabel: "Ouvrir le stock",
        onClick: () => onNavigate("stock"),
      }))

    const urgentAppointments = appointments
      .filter(
        (item) =>
          item.type === "Urgence" &&
          !["completed", "cancelled"].includes(item.status)
      )
      .slice(0, 4)
      .map((item) => ({
        id: `appointment-${item.id}`,
        title: `Urgence en attente`,
        description: `${item.title} · ${new Date(item.startTime).toLocaleString("fr-FR", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        actionLabel: "Voir l'agenda",
        onClick: () => onNavigate("agenda"),
      }))

    const dueTasks = tasks
      .filter((task) => task.status !== "done")
      .slice(0, 4)
      .map((task) => ({
        id: `task-${task.id}`,
        title: task.title,
        description: task.dueDate
          ? `Échéance ${new Date(task.dueDate).toLocaleDateString("fr-FR")}`
          : "Tâche à suivre aujourd’hui",
        actionLabel: "Voir les rappels",
        onClick: () => onNavigate("taches"),
      }))

    return [...urgentAppointments, ...lowStock, ...dueTasks].slice(0, 8)
  }, [appointments, onNavigate, products, tasks])

  const exportDashboardReport = async (
    period: "daily" | "weekly" | "monthly"
  ) => {
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
      period === "daily"
        ? "Rapport quotidien"
        : period === "weekly"
          ? "Rapport hebdomadaire"
          : "Rapport mensuel"

    doc.setFontSize(18)
    doc.text(`Vetera · ${reportTitle}`, 20, 20)
    doc.setFontSize(11)
    doc.text(
      `Période: ${start.toLocaleDateString("fr-FR")} - ${end.toLocaleDateString("fr-FR")}`,
      20,
      30
    )
    doc.text(
      `Généré le ${new Date().toLocaleDateString("fr-FR")} pour ${currentUser?.displayName || "la clinique"}`,
      20,
      38
    )

    const summaryLines = [
      `Consultations planifiées: ${periodAppointments.length}`,
      `Consultations clôturées: ${periodAppointments.filter((item) => item.status === "completed").length}`,
      `Urgences ouvertes: ${periodAppointments.filter((item) => item.type === "Urgence" && item.status !== "completed").length}`,
      `Revenus encaissés: ${formatMoneyDa(paidIncome)}`,
      `Dépenses payées: ${formatMoneyDa(paidExpenses)}`,
      `Stock critique: ${products.filter((item) => Number(item.quantity) <= Number(item.minStock)).length} produit(s)`,
    ]

    doc.setFontSize(13)
    doc.text("Synthèse", 20, 54)
    doc.setFontSize(11)
    summaryLines.forEach((line, index) => {
      doc.text(`• ${line}`, 24, 64 + index * 8)
    })

    const topAppointments = periodAppointments.slice(0, 5)
    doc.setFontSize(13)
    doc.text("Rendez-vous clés", 20, 122)
    doc.setFontSize(11)
    topAppointments.forEach((item, index) => {
      doc.text(
        `• ${item.title} · ${new Date(item.startTime).toLocaleString("fr-FR")} · ${mapStatus(item.status)}`,
        24,
        132 + index * 8
      )
    })

    doc.save(`vetera-${period === "daily" ? "quotidien" : period === "weekly" ? "hebdomadaire" : "mensuel"}.pdf`)
    toast.success(`${reportTitle} téléchargé.`)
  }

  const dashboardTabs = [
    { value: "overview", label: "Vue d’ensemble" },
    { value: "analytics", label: "Analyse" },
    { value: "reports", label: "Rapports" },
    { value: "notifications", label: "Notifications" },
  ] as const

  // --- New: Next Appointment with countdown ---
  const nextAppointmentCard = useMemo<NextAppointmentData | null>(() => {
    const next = appointments
      .filter((item) => {
        const start = new Date(item.startTime).getTime()
        return (
          start >= referenceDate.getTime() &&
          !["cancelled", "completed", "no_show"].includes(item.status)
        )
      })
      .sort(
        (left, right) =>
          new Date(left.startTime).getTime() -
          new Date(right.startTime).getTime()
      )[0]

    if (!next) return null

    const patient = patients.find((item) => item.id === next.patientId)
    const owner = owners.find((item) => item.id === next.ownerId)
    const vet = users.find((item) => item.id === next.vetId)
    const start = new Date(next.startTime)
    const end = new Date(start.getTime() + 30 * 60_000)

    return {
      id: next.id,
      patient: patient?.name || next.title,
      owner: owner
        ? `${owner.firstName} ${owner.lastName}`.trim()
        : "Propriétaire non lié",
      type: next.type,
      startTime: start,
      endTime: end,
      vetName: vet?.displayName || "Vétérinaire local",
      ownerPhone: owner?.phone,
    }
  }, [appointments, owners, patients, users, referenceDate])

  // --- New: Day Timeline ---
  const todayTimeline = useMemo<TimelineAppointment[]>(() => {
    const todayStart = startOfDay(referenceDate)
    const todayEnd = endOfDay(referenceDate)

    return appointments
      .filter((item) => {
        const date = new Date(item.startTime)
        return date >= todayStart && date <= todayEnd
      })
      .map((item) => {
        const patient = patients.find((p) => p.id === item.patientId)
        const vet = users.find((u) => u.id === item.vetId)
        const start = new Date(item.startTime)
        const end = new Date(start.getTime() + 30 * 60_000)
        return {
          id: item.id,
          patient: patient?.name || item.title,
          type: item.type,
          startTime: start,
          endTime: end,
          status: item.status,
          vetName: vet?.displayName || "Vétérinaire local",
        }
      })
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  }, [appointments, patients, users, referenceDate])

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <MotivationalHeader
            section="dashboard"
            title=""
            subtitle={
              todayStats.total > 0
                ? `${todayStats.total} consultation${todayStats.total > 1 ? "s" : ""} prévue${todayStats.total > 1 ? "s" : ""} aujourd'hui${todayStats.urgencies > 0 ? ` · ${todayStats.urgencies} urgence${todayStats.urgencies > 1 ? "s" : ""}` : ""}`
                : "Aucune consultation aujourd'hui, la journée est calme."
            }
          />
        </div>
        <Tabs
          value={dashboardTab}
          onValueChange={(value) =>
            setDashboardTab(
              value as "overview" | "analytics" | "reports" | "notifications"
            )
          }
          className="gap-4"
        >
          <div className="flex flex-col gap-4 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <TabsList className="h-auto gap-1 rounded-xl bg-muted/70 p-1">
              {dashboardTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="h-8 rounded-lg px-3 text-sm font-medium"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="flex flex-col gap-2 sm:flex-row">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="default" className="w-full sm:w-auto" />}
                >
                  <HugeiconsIcon
                    icon={Download01Icon}
                    strokeWidth={2}
                    data-icon="inline-start"
                  />
                  Télécharger
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-64">
                  <DropdownMenuItem onClick={() => void exportDashboardReport("daily")}>
                    Rapport quotidien
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void exportDashboardReport("weekly")}>
                    Rapport hebdomadaire
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void exportDashboardReport("monthly")}>
                    Rapport mensuel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className="w-full justify-start sm:w-auto"
                    />
                  }
                >
                  <HugeiconsIcon
                    icon={Calendar01Icon}
                    strokeWidth={2}
                    data-icon="inline-start"
                  />
                  {reportReferenceDate.toLocaleDateString("fr-FR", {
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

          <TabsContent value="overview" className="space-y-6">
            <SectionCards items={sectionCards} />
            <div className="grid gap-6 px-4 lg:px-6">
              <div className="grid gap-6 xl:grid-cols-3">
                <RevenueSparkCard
                  total={revenueSeries.total}
                  delta={revenueSeries.delta}
                  points={revenueSeries.points}
                  onNavigate={() => onNavigate("finances")}
                />
                <NextAppointmentCard
                  appointment={nextAppointmentCard}
                  onNavigate={() => onNavigate("agenda")}
                />
                <DayTimeline
                  appointments={todayTimeline}
                  onNavigate={() => onNavigate("agenda")}
                />
              </div>
              <DataTable
                data={dashboardRows}
                onCreate={() => onNavigate("agenda")}
              />
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <DashboardAnalytics
              financeSeries={financeAnalytics}
              visitorsSeries={visitorsAnalytics}
              trafficSources={trafficSources}
              customerTrend={customerTrend}
              profileShare={profileShare}
            />
          </TabsContent>

          <TabsContent value="reports">
            <div className="grid gap-6 px-4 lg:grid-cols-3 lg:px-6">
              {[
                {
                  id: "daily",
                  title: "Rapport quotidien",
                  description:
                    "Synthèse des consultations, encaissements et urgences du jour.",
                  cta: "Télécharger le quotidien",
                },
                {
                  id: "weekly",
                  title: "Rapport hebdomadaire",
                  description:
                    "Vue consolidée de la semaine clinique avec activité et trésorerie.",
                  cta: "Télécharger l’hebdomadaire",
                },
                {
                  id: "monthly",
                  title: "Rapport mensuel",
                  description:
                    "Bilan global du mois avec revenus, stock critique et suivi patient.",
                  cta: "Télécharger le mensuel",
                },
              ].map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <CardDescription>Export PDF</CardDescription>
                    <CardTitle>{report.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {report.description}
                    </p>
                    <Button
                      className="w-full"
                      onClick={() =>
                        void exportDashboardReport(
                          report.id as "daily" | "weekly" | "monthly"
                        )
                      }
                    >
                      <HugeiconsIcon
                        icon={Download01Icon}
                        strokeWidth={2}
                        data-icon="inline-start"
                      />
                      {report.cta}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <div className="grid gap-6 px-4 lg:grid-cols-2 lg:px-6">
              {dashboardNotifications.length > 0 ? (
                dashboardNotifications.map((item) => (
                  <Card key={item.id}>
                    <CardHeader>
                      <CardDescription>Notification métier</CardDescription>
                      <CardTitle className="text-xl">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                      <Button variant="outline" onClick={item.onClick}>
                        <HugeiconsIcon
                          icon={Notification02Icon}
                          strokeWidth={2}
                          data-icon="inline-start"
                        />
                        {item.actionLabel}
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Aucune alerte prioritaire</CardTitle>
                    <CardDescription>
                      Les notifications critiques du cabinet apparaîtront ici.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
