import { useMemo } from "react"

import {
  type ClinicalActivityPoint,
} from "@/components/chart-area-interactive"
import { DataTable, type DashboardRow } from "@/components/data-table"
import { SectionCards, type SectionCardItem } from "@/components/section-cards"
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
  const { currentUser } = useAuth()
  const { data: appointments } = useAppointmentsRepository()
  const { data: patients } = usePatientsRepository()
  const { data: owners } = useOwnersRepository()
  const { data: users } = useUsersRepository()
  const { data: products } = useProductsRepository()
  const { data: transactions } = useTransactionsRepository()

  const referenceDate = useMemo(() => {
    const timestamps = [
      ...appointments.map((item) => new Date(item.startTime).getTime()),
      ...transactions.map((item) => new Date(item.date).getTime()),
    ].filter((value) => Number.isFinite(value))

    return new Date(timestamps.length ? Math.max(...timestamps) : Date.now())
  }, [appointments, transactions])

  const sectionCards = useMemo<SectionCardItem[]>(() => {
    const todayStart = startOfDay(referenceDate)
    const todayEnd = endOfDay(referenceDate)
    const current30Start = startOfDay(addDays(referenceDate, -29))
    const previous30Start = startOfDay(addDays(referenceDate, -59))
    const previous30End = endOfDay(addDays(referenceDate, -30))

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
        title: "CA encaissé",
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
  }, [appointments, patients, products, referenceDate, transactions])

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
        <SectionCards items={sectionCards} />
        <DashboardAnalytics
          data={chartData}
          weeklyData={weeklyActivity}
          referenceDate={referenceDate.toISOString()}
        />
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
          <DataTable data={dashboardRows} onCreate={() => onNavigate("agenda")} />
        </div>
      </div>
    </div>
  )
}
