import React, { useMemo, useState } from "react"
import { jsPDF } from "jspdf"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  CreditCardIcon,
  Database01Icon,
  Download01Icon,
  File01Icon,
  LandmarkIcon,
  Package02Icon,
  ReceiptTextIcon,
  SearchIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons"

import { DashboardPageIntro } from "@/components/dashboard-page-intro"
import {
  MetricOverviewStrip,
  type MetricOverviewItem,
} from "@/components/metric-overview-strip"
import { useTransactionsRepository } from "@/data/repositories"
import { APP_NAME } from "@/lib/brand"
import { cn } from "@/lib/utils"
import type { Transaction } from "@/types/db"
import { formatDZD, toCentimes } from "@/utils/currency"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { View } from "@/types"

type TimeRange = "today" | "week" | "month" | "year"
type TransactionFilter = "all" | "income" | "expense"

type TransactionDraft = {
  description: string
  amount: string
  category: string
  date: string
  type: Transaction["type"]
  method: Transaction["method"]
  status: Transaction["status"]
}

type FinancialStats = {
  income: number
  expense: number
  net: number
  pending: number
  paidIncomeCount: number
  paidExpenseCount: number
  pendingCount: number
  averageTicket: number
}

const RANGE_OPTIONS: Array<{ value: TimeRange; label: string }> = [
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
  { value: "year", label: "Cette année" },
]

const FILTER_OPTIONS: Array<{ value: TransactionFilter; label: string }> = [
  { value: "all", label: "Toutes" },
  { value: "income", label: "Revenus" },
  { value: "expense", label: "Dépenses" },
]

const TYPE_META: Record<
  Transaction["type"],
  {
    label: string
    badgeClassName: string
    amountClassName: string
  }
> = {
  income: {
    label: "Revenu",
    badgeClassName: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    amountClassName: "text-emerald-600 dark:text-emerald-400",
  },
  expense: {
    label: "Dépense",
    badgeClassName: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    amountClassName: "text-rose-600 dark:text-rose-400",
  },
}

const STATUS_META: Record<
  Transaction["status"],
  { label: string; className: string }
> = {
  paid: {
    label: "Payé",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  pending: {
    label: "En attente",
    className: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  },
}

const METHOD_LABELS: Record<Transaction["method"], string> = {
  cash: "Espèces",
  card: "Carte",
}

function getDefaultDraft(): TransactionDraft {
  return {
    description: "",
    amount: "",
    category: "Achats",
    date: new Date().toISOString().slice(0, 10),
    type: "expense",
    method: "cash",
    status: "paid",
  }
}

function normalizeDate(value?: string | Date | null) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getDateRange(range: TimeRange) {
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)

  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)

  if (range === "week") {
    const day = now.getDay() || 7
    start.setDate(now.getDate() - (day - 1))
  } else if (range === "month") {
    start.setDate(1)
  } else if (range === "year") {
    start.setMonth(0, 1)
  }

  return { start, end }
}

function formatShortDate(value?: string | Date | null) {
  const date = normalizeDate(value)
  if (!date) return "Date indisponible"

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function calculateFinancialStats(transactions: Transaction[]): FinancialStats {
  return transactions.reduce<FinancialStats>(
    (acc, transaction) => {
      if (transaction.status === "paid") {
        if (transaction.type === "income") {
          acc.income += transaction.amount
          acc.paidIncomeCount += 1
        } else {
          acc.expense += transaction.amount
          acc.paidExpenseCount += 1
        }
      } else {
        acc.pending += transaction.amount
        acc.pendingCount += 1
      }

      acc.net = acc.income - acc.expense
      acc.averageTicket =
        acc.paidIncomeCount > 0
          ? Math.round(acc.income / acc.paidIncomeCount)
          : 0

      return acc
    },
    {
      income: 0,
      expense: 0,
      net: 0,
      pending: 0,
      paidIncomeCount: 0,
      paidExpenseCount: 0,
      pendingCount: 0,
      averageTicket: 0,
    }
  )
}

function generateFinancialReportPDF({
  transactions,
  stats,
  rangeLabel,
  filterLabel,
}: {
  transactions: Transaction[]
  stats: FinancialStats
  rangeLabel: string
  filterLabel: string
}) {
  const doc = new jsPDF()
  const primaryColor = "#f97316"
  const mutedColor = "#64748b"

  doc.setFontSize(22)
  doc.setTextColor(primaryColor)
  doc.text(APP_NAME, 20, 20)

  doc.setFontSize(16)
  doc.setTextColor(17, 24, 39)
  doc.text("Rapport financier", 132, 20)

  doc.setFontSize(10)
  doc.setTextColor(mutedColor)
  doc.text(`Période : ${rangeLabel}`, 132, 26)
  doc.text(`Vue : ${filterLabel}`, 132, 31)
  doc.text(`Généré le : ${new Date().toLocaleDateString("fr-FR")}`, 132, 36)

  doc.setDrawColor(229, 231, 235)
  doc.line(20, 44, 190, 44)

  let y = 58

  doc.setFontSize(12)
  doc.setTextColor(17, 24, 39)
  doc.text("Synthèse", 20, y)
  y += 10

  const summaryBoxes = [
    {
      x: 20,
      label: "Encaissé",
      value: formatDZD(stats.income),
      fill: [240, 253, 244],
      text: [21, 128, 61],
    },
    {
      x: 78,
      label: "Dépenses",
      value: formatDZD(stats.expense),
      fill: [254, 242, 242],
      text: [185, 28, 28],
    },
    {
      x: 136,
      label: "Net",
      value: formatDZD(stats.net),
      fill: [239, 246, 255],
      text: [29, 78, 216],
    },
  ]

  summaryBoxes.forEach((box) => {
    doc.setFillColor(box.fill[0], box.fill[1], box.fill[2])
    doc.roundedRect(box.x, y, 50, 26, 4, 4, "F")
    doc.setFontSize(10)
    doc.setTextColor(box.text[0], box.text[1], box.text[2])
    doc.setFont("helvetica", "normal")
    doc.text(box.label, box.x + 5, y + 8)
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text(box.value, box.x + 5, y + 18)
  })

  y += 40

  doc.setFontSize(12)
  doc.setTextColor(17, 24, 39)
  doc.setFont("helvetica", "bold")
  doc.text("Détail des écritures", 20, y)
  y += 8

  doc.setFillColor(245, 245, 245)
  doc.rect(20, y - 5, 170, 8, "F")
  doc.setFontSize(9)
  doc.setTextColor(mutedColor)
  doc.text("DATE", 22, y)
  doc.text("DESCRIPTION", 48, y)
  doc.text("CATÉGORIE", 112, y)
  doc.text("STATUT", 151, y)
  doc.text("MONTANT", 186, y, { align: "right" })

  y += 10
  doc.setFont("helvetica", "normal")

  transactions.forEach((transaction) => {
    if (y > 280) {
      doc.addPage()
      y = 20
    }

    doc.setTextColor(17, 24, 39)
    doc.text(formatShortDate(transaction.date), 22, y)
    doc.text(transaction.description.slice(0, 28), 48, y)
    doc.text(transaction.category.slice(0, 18), 112, y)
    doc.text(STATUS_META[transaction.status].label, 151, y)
    if (transaction.type === "income") {
      doc.setTextColor(21, 128, 61)
    } else {
      doc.setTextColor(185, 28, 28)
    }
    doc.text(
      `${transaction.type === "income" ? "+" : "-"} ${formatDZD(transaction.amount)}`,
      186,
      y,
      { align: "right" }
    )
    doc.setTextColor(17, 24, 39)
    y += 8

    if (transaction.status === "pending") {
      doc.setFontSize(8)
      doc.setTextColor(mutedColor)
      doc.text(`A traiter · ${METHOD_LABELS[transaction.method]}`, 48, y)
      doc.setFontSize(9)
      y += 6
    } else {
      y += 1
    }
  })

  doc.save(`Rapport-Financier-${rangeLabel.replace(/\s+/g, "-")}.pdf`)
}

function TransactionTypeBadge({
  type,
  className,
}: {
  type: Transaction["type"]
  className?: string
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-transparent",
        TYPE_META[type].badgeClassName,
        className
      )}
    >
      {TYPE_META[type].label}
    </Badge>
  )
}

function TransactionStatusBadge({
  status,
  className,
}: {
  status: Transaction["status"]
  className?: string
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-transparent",
        STATUS_META[status].className,
        className
      )}
    >
      {STATUS_META[status].label}
    </Badge>
  )
}

const Finances: React.FC<{ onNavigate?: (view: View) => void }> = ({
  onNavigate,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>("month")
  const [filterType, setFilterType] = useState<TransactionFilter>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [draft, setDraft] = useState<TransactionDraft>(getDefaultDraft())
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    data: transactions,
    loading,
    update,
    recordIncome,
    recordExpense,
  } = useTransactionsRepository()

  const rangeLabel = useMemo(
    () =>
      RANGE_OPTIONS.find((option) => option.value === timeRange)?.label ??
      "Ce mois",
    [timeRange]
  )

  const transactionsInRange = useMemo(() => {
    const { start, end } = getDateRange(timeRange)
    return [...transactions]
      .filter((transaction) => {
        const date = normalizeDate(transaction.date)
        if (!date) return false
        return date >= start && date <= end
      })
      .sort((left, right) => {
        const leftDate = normalizeDate(left.date)?.getTime() ?? 0
        const rightDate = normalizeDate(right.date)?.getTime() ?? 0
        return rightDate - leftDate
      })
  }, [transactions, timeRange])

  const stats = useMemo(
    () => calculateFinancialStats(transactionsInRange),
    [transactionsInRange]
  )

  const visibleTransactions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return transactionsInRange.filter((transaction) => {
      const matchesType =
        filterType === "all" || transaction.type === filterType
      if (!matchesType) return false

      if (!query) return true

      const haystack = [
        transaction.description,
        transaction.category,
        METHOD_LABELS[transaction.method],
        STATUS_META[transaction.status].label,
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [filterType, searchTerm, transactionsInRange])

  const visibleStats = useMemo(
    () => calculateFinancialStats(visibleTransactions),
    [visibleTransactions]
  )

  const pendingTransactions = useMemo(
    () =>
      transactionsInRange
        .filter((transaction) => transaction.status === "pending")
        .slice(0, 4),
    [transactionsInRange]
  )

  const categoryBreakdown = useMemo(() => {
    const grouped = new Map<
      string,
      {
        key: string
        category: string
        type: Transaction["type"]
        total: number
        count: number
      }
    >()

    transactionsInRange
      .filter((transaction) => transaction.status === "paid")
      .forEach((transaction) => {
        const key = `${transaction.type}:${transaction.category}`
        const current = grouped.get(key)

        if (current) {
          current.total += transaction.amount
          current.count += 1
          return
        }

        grouped.set(key, {
          key,
          category: transaction.category,
          type: transaction.type,
          total: transaction.amount,
          count: 1,
        })
      })

    return [...grouped.values()]
      .sort((left, right) => right.total - left.total)
      .slice(0, 5)
  }, [transactionsInRange])

  const overviewCards = useMemo<MetricOverviewItem[]>(() => {
    const generateSparkline = (base: number) => 
      Array.from({ length: 8 }, () => base + Math.floor(Math.random() * base * 0.1) - Math.floor(base * 0.05))
    
    return [
      {
        label: "Encaissé",
        value: formatDZD(stats.income),
        meta: `${stats.paidIncomeCount} réglé${stats.paidIncomeCount > 1 ? "s" : ""}`,
        note: "Recettes confirmées",
        icon: ArrowUp01Icon,
        sparklineData: generateSparkline(Math.round(stats.income / 100)),
        tone: "emerald",
      },
      {
        label: "Dépensé",
        value: formatDZD(stats.expense),
        meta: `${stats.paidExpenseCount} sortie${stats.paidExpenseCount > 1 ? "s" : ""}`,
        note: "Décaissements validés",
        icon: ArrowDown01Icon,
        sparklineData: generateSparkline(Math.round(stats.expense / 100)),
        tone: "rose",
      },
      {
        label: "Solde net",
        value: formatDZD(stats.net),
        meta: stats.net >= 0 ? "positif" : "à surveiller",
        note: "Vue nette",
        icon: LandmarkIcon,
        sparklineData: generateSparkline(Math.round(stats.net / 100)),
        tone: stats.net >= 0 ? "blue" : "amber",
      },
      {
        label: "Encours",
        value: formatDZD(stats.pending),
        meta: `${stats.pendingCount} attente${stats.pendingCount > 1 ? "s" : ""}`,
        note: "Écritures ouvertes",
        icon: Clock01Icon,
        sparklineData: generateSparkline(Math.round(stats.pending / 100)),
        tone: "amber",
      },
    ]
  }, [stats])

  const subtitle = `${transactionsInRange.length} mouvement${transactionsInRange.length > 1 ? "s" : ""} sur ${rangeLabel.toLowerCase()} pour suivre recettes, dépenses et encours dans la même vue.`

  const resetDraft = () => {
    setDraft(getDefaultDraft())
  }

  const handleCreateTransaction = async () => {
    const amount = Number(draft.amount)
    const description = draft.description.trim()
    const category =
      draft.category.trim() ||
      (draft.type === "income" ? "Consultation" : "Achats")
    const parsedDate = draft.date
      ? new Date(`${draft.date}T12:00:00`)
      : new Date()

    if (!description) {
      toast.error("Ajoutez une description pour cette écriture.")
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Le montant doit être supérieur à 0.")
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        amount: toCentimes(amount),
        category,
        description,
        method: draft.method,
        status: draft.status,
        date: Number.isNaN(parsedDate.getTime())
          ? new Date().toISOString()
          : parsedDate.toISOString(),
      }

      if (draft.type === "income") {
        await recordIncome(payload)
      } else {
        await recordExpense(payload)
      }

      toast.success(
        draft.type === "income"
          ? "Revenu enregistré dans le journal."
          : "Dépense enregistrée dans le journal."
      )

      setIsDialogOpen(false)
      resetDraft()
    } catch (error) {
      console.error(error)
      toast.error("Impossible d'enregistrer cette écriture.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (transaction: Transaction) => {
    const nextStatus: Transaction["status"] =
      transaction.status === "paid" ? "pending" : "paid"

    try {
      const updated = await update(transaction.id, { status: nextStatus })
      if (!updated) {
        toast.error("Le statut n'a pas pu être mis à jour.")
        return
      }

      toast.success(
        nextStatus === "paid"
          ? "Écriture marquée comme payée."
          : "Écriture repassée en attente."
      )
    } catch (error) {
      console.error(error)
      toast.error("Impossible de modifier le statut.")
    }
  }

  const handleExport = () => {
    if (visibleTransactions.length === 0) {
      toast.info("Aucune écriture à exporter dans cette vue.")
      return
    }

    const filterLabel =
      FILTER_OPTIONS.find((option) => option.value === filterType)?.label ??
      "Toutes"

    generateFinancialReportPDF({
      transactions: visibleTransactions,
      stats: visibleStats,
      rangeLabel,
      filterLabel,
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 pt-4 pb-6 lg:px-6">
      <DashboardPageIntro
        eyebrow="Pilotage financier"
        title="Finances"
        subtitle={subtitle}
        actions={
          <>
          <Button
            variant="outline"
            className="h-10 rounded-xl px-4"
            onClick={() => onNavigate?.("finances_analytics")}
          >
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              strokeWidth={1.5}
              className="size-4"
            />
            Vue analytique
          </Button>
          <Button
            variant="outline"
            className="h-10 rounded-xl px-4"
            onClick={handleExport}
            disabled={visibleTransactions.length === 0}
          >
            <HugeiconsIcon
              icon={Download01Icon}
              strokeWidth={1.5}
              className="size-4"
            />
            Exporter
          </Button>
          <Button className="h-10 rounded-xl px-4" onClick={() => setIsDialogOpen(true)}>
            <HugeiconsIcon
              icon={Add01Icon}
              strokeWidth={1.5}
              className="size-4"
            />
            Nouvelle écriture
          </Button>
          </>
        }
      />

      <MetricOverviewStrip items={overviewCards} />

      {/* Main Table Card */}
      <Card className="rounded-[24px] border border-border bg-card shadow-none">
        <CardHeader className="border-b border-border px-6 py-5">
          <CardDescription className="font-mono text-[10px] uppercase tracking-[0.06em]">Registre financier</CardDescription>
          <CardTitle className="text-[22px] font-normal tracking-[-0.04em]">Journal des écritures</CardTitle>
          <CardAction className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1">{rangeLabel}</Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {visibleTransactions.length} visible
              {visibleTransactions.length > 1 ? "s" : ""}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4 px-6 py-5">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <HugeiconsIcon
                icon={SearchIcon}
                strokeWidth={1.5}
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Rechercher..."
                className="h-10 rounded-xl pl-9"
              />
            </div>

            <ToggleGroup
              multiple={false}
              value={[filterType]}
              onValueChange={(value) => {
                setFilterType(
                  (value[0] as TransactionFilter | undefined) ?? "all"
                )
              }}
              variant="outline"
              size="sm"
              spacing={0}
              className="shrink-0"
            >
              {FILTER_OPTIONS.map((option) => (
                <ToggleGroupItem key={option.value} value={option.value}>
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <ToggleGroup
              multiple={false}
              value={[timeRange]}
              onValueChange={(value) => {
                setTimeRange((value[0] as TimeRange | undefined) ?? "month")
              }}
              variant="outline"
              size="sm"
              spacing={0}
              className="shrink-0"
            >
              {RANGE_OPTIONS.map((option) => (
                <ToggleGroupItem key={option.value} value={option.value}>
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <Separator />

          {/* Table */}
          {loading ? (
            <div className="space-y-2 py-3">
              {Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={`finances-skeleton-row-${index}`}
                  className="grid grid-cols-[40%_18%_12%_18%_12%] items-center gap-3 rounded-md border border-border/60 p-3"
                >
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-4/5 rounded-md" />
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-2/3 rounded-md justify-self-end" />
                  <Skeleton className="h-4 w-16 rounded-md justify-self-end" />
                </div>
              ))}
            </div>
          ) : visibleTransactions.length === 0 ? (
            <Empty className="border border-dashed border-border/80 bg-muted/20 py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon
                    icon={ReceiptTextIcon}
                    strokeWidth={1.5}
                    className="size-5"
                  />
                </EmptyMedia>
                <EmptyTitle>Aucune écriture dans cette vue</EmptyTitle>
                <EmptyDescription>
                  Ajustez la recherche, la période ou le type de mouvement.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent className="sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setFilterType("all")
                    setTimeRange("month")
                  }}
                >
                  Réinitialiser
                </Button>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <HugeiconsIcon
                    icon={Add01Icon}
                    strokeWidth={1.5}
                    className="size-4"
                  />
                  Nouvelle écriture
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Opération</TableHead>
                    <TableHead className="w-[18%]">Catégorie</TableHead>
                    <TableHead className="hidden w-[12%] lg:table-cell">
                      Mode
                    </TableHead>
                    <TableHead className="w-[18%] text-right">
                      Montant
                    </TableHead>
                    <TableHead className="w-[12%] text-right">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleTransactions.map((transaction) => {
                    const isIncome = transaction.type === "income"
                    const TransactionIcon = isIncome
                      ? ArrowUp01Icon
                      : ArrowDown01Icon

                    return (
                      <TableRow
                        key={transaction.id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                                isIncome
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              )}
                            >
                              <HugeiconsIcon
                                icon={TransactionIcon}
                                strokeWidth={2}
                                className="size-4"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {transaction.description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatShortDate(transaction.date)}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                              {transaction.category}
                            </p>
                            <TransactionTypeBadge type={transaction.type} />
                          </div>
                        </TableCell>

                        <TableCell className="hidden lg:table-cell">
                          <p className="text-sm text-muted-foreground">
                            {METHOD_LABELS[transaction.method]}
                          </p>
                        </TableCell>

                        <TableCell className="text-right">
                          <p
                            className={cn(
                              "font-semibold tabular-nums",
                              isIncome
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            )}
                          >
                            {isIncome ? "+" : "-"}
                            {formatDZD(transaction.amount)}
                          </p>
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-7 gap-1 text-xs font-medium",
                              transaction.status === "paid"
                                ? "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                                : "text-amber-600 hover:text-amber-700 dark:text-amber-400"
                            )}
                            onClick={() => handleToggleStatus(transaction)}
                          >
                            <HugeiconsIcon
                              icon={
                                transaction.status === "paid"
                                  ? CheckmarkCircle02Icon
                                  : Clock01Icon
                              }
                              strokeWidth={2}
                              className="size-3.5"
                            />
                            {STATUS_META[transaction.status].label}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Widgets */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Category Breakdown */}
        <Card className="rounded-[24px] border border-border bg-card shadow-none">
          <CardHeader className="border-b border-border px-6 py-5">
            <CardDescription>Lecture rapide</CardDescription>
            <CardTitle>Postes dominants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-6 py-5">
            {categoryBreakdown.length > 0 ? (
              categoryBreakdown.map((entry) => (
                <div
                  key={entry.key}
                  className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-foreground">
                        {entry.category}
                      </p>
                      <TransactionTypeBadge type={entry.type} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.count} mouvement{entry.count > 1 ? "s" : ""}
                    </p>
                  </div>

                  <p
                    className={cn(
                      "shrink-0 font-semibold tabular-nums",
                      entry.type === "income"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {entry.type === "income" ? "+" : "-"}
                    {formatDZD(entry.total)}
                  </p>
                </div>
              ))
            ) : (
              <Empty className="border border-dashed border-border/80 bg-muted/20 py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <HugeiconsIcon
                      icon={Wallet01Icon}
                      strokeWidth={2}
                      className="size-5"
                    />
                  </EmptyMedia>
                  <EmptyTitle>Aucune catégorie dominante</EmptyTitle>
                  <EmptyDescription>
                    Les regroupements s'afficheront dès que des mouvements
                    seront disponibles.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>

        {/* Pending Transactions */}
        <Card className="rounded-[24px] border border-border bg-card shadow-none">
          <CardHeader className="border-b border-border px-6 py-5">
            <CardDescription>Suivi court terme</CardDescription>
            <CardTitle>Encours à valider</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-6 py-5">
            {pendingTransactions.length > 0 ? (
              pendingTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="rounded-lg bg-muted/30 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatShortDate(transaction.date)} ·{" "}
                        {METHOD_LABELS[transaction.method]}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold text-amber-600 tabular-nums dark:text-amber-400">
                      {formatDZD(transaction.amount)}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <TransactionStatusBadge status={transaction.status} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(transaction)}
                    >
                      <HugeiconsIcon
                        icon={CheckmarkCircle02Icon}
                        strokeWidth={2}
                        className="size-3.5"
                      />
                      Marquer payé
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <Empty className="border border-dashed border-border/80 bg-muted/20 py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <HugeiconsIcon
                      icon={CreditCardIcon}
                      strokeWidth={2}
                      className="size-5"
                    />
                  </EmptyMedia>
                  <EmptyTitle>Aucun encours ouvert</EmptyTitle>
                  <EmptyDescription>
                    Toutes les écritures de cette période sont réglées.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Transaction Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nouvelle écriture</DialogTitle>
            <DialogDescription>
              Ajoutez une recette ou une dépense dans le journal financier.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel>Type de mouvement</FieldLabel>
              <ToggleGroup
                multiple={false}
                value={[draft.type]}
                onValueChange={(value) => {
                  const nextType = value[0] as Transaction["type"] | undefined
                  if (!nextType) return
                  setDraft((current) => ({
                    ...current,
                    type: nextType,
                    category:
                      current.category === "Achats" ||
                      current.category === "Consultation"
                        ? nextType === "income"
                          ? "Consultation"
                          : "Achats"
                        : current.category,
                  }))
                }}
                variant="outline"
                size="sm"
                spacing={0}
              >
                <ToggleGroupItem value="expense">Dépense</ToggleGroupItem>
                <ToggleGroupItem value="income">Revenu</ToggleGroupItem>
              </ToggleGroup>
              <FieldDescription>
                Recette ou dépense de trésorerie.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="transaction-description">
                Description
              </FieldLabel>
              <Input
                id="transaction-description"
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Ex. Consultation Bella, Loyer..."
              />
            </Field>

            <FieldGroup className="gap-4 md:grid md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="transaction-amount">
                  Montant (DA)
                </FieldLabel>
                <Input
                  id="transaction-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.amount}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="0.00"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="transaction-date">Date</FieldLabel>
                <Input
                  id="transaction-date"
                  type="date"
                  value={draft.date}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                />
              </Field>
            </FieldGroup>

            <FieldGroup className="gap-4 md:grid md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="transaction-category">
                  Catégorie
                </FieldLabel>
                <Input
                  id="transaction-category"
                  value={draft.category}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  placeholder="Consultation, Stock, Loyer..."
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="transaction-method">Mode</FieldLabel>
                <NativeSelect
                  id="transaction-method"
                  value={draft.method}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      method: event.target.value as Transaction["method"],
                    }))
                  }
                  className="w-full"
                >
                  <NativeSelectOption value="cash">Espèces</NativeSelectOption>
                  <NativeSelectOption value="card">Carte</NativeSelectOption>
                </NativeSelect>
              </Field>
            </FieldGroup>

            <Field>
              <FieldLabel htmlFor="transaction-status">Statut</FieldLabel>
              <NativeSelect
                id="transaction-status"
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as Transaction["status"],
                  }))
                }
                className="w-full"
              >
                <NativeSelectOption value="paid">Payé</NativeSelectOption>
                <NativeSelectOption value="pending">
                  En attente
                </NativeSelectOption>
              </NativeSelect>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false)
                resetDraft()
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateTransaction}
              disabled={
                isSubmitting || !draft.description.trim() || !draft.amount
              }
            >
              {isSubmitting ? (
                <Spinner className="size-4" />
              ) : (
                <HugeiconsIcon
                  icon={Add01Icon}
                  strokeWidth={2}
                  className="size-4"
                />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default React.memo(Finances)
