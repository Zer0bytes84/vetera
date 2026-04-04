import React, { useDeferredValue, useEffect, useMemo, useState } from "react"
import QRCode from "qrcode"
import { jsPDF } from "jspdf"
import { toast } from "sonner"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import {
  Add01Icon,
  BirdIcon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Delete01Icon,
  Dollar01Icon,
  Mail01Icon,
  MoreVerticalCircle01Icon,
  PhoneCheckIcon,
  PillIcon,
  PlayIcon,
  PrinterIcon,
  SearchIcon,
  StethoscopeIcon,
  WorkHistoryIcon,
} from "@hugeicons/core-free-icons"

import Avatar from "@/components/Avatar"
import MotivationalHeader from "@/components/MotivationalHeader"
import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
} from "@/data/repositories"
import { cn } from "@/lib/utils"
import type { View } from "@/types"
import type { Appointment, Owner, Patient } from "@/types/db"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Spinner } from "@/components/ui/spinner"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type CliniqueProps = {
  onNavigate?: (view: View) => void
}

type BillingItem = {
  desc: string
  amount: number
}

type ListTab = "all" | "scheduled" | "in_progress" | "completed"
type DetailTab = "overview" | "history"

type CliniqueMetricItem = {
  title: string
  value: string
  badge: string
  summary: string
  detail: string
}

const LIST_TABS: Array<{ value: ListTab; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "scheduled", label: "À lancer" },
  { value: "in_progress", label: "En cours" },
  { value: "completed", label: "Terminés" },
]

const STATUS_META: Record<
  Appointment["status"],
  { label: string; className: string }
> = {
  scheduled: {
    label: "À lancer",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  in_progress: {
    label: "En cours",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  completed: {
    label: "Terminé",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  cancelled: {
    label: "Annulé",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  no_show: {
    label: "Absent",
    className:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
}

const PATIENT_STATUS_META: Record<
  Patient["status"],
  { label: string; className: string }
> = {
  sante: {
    label: "En bonne santé",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  traitement: {
    label: "En traitement",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  hospitalise: {
    label: "Hospitalisé",
    className: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  },
  decede: {
    label: "Décédé",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
}

const TYPE_META: Record<
  Appointment["type"],
  { badgeClassName: string; surfaceClassName: string; iconClassName: string }
> = {
  Consultation: {
    badgeClassName: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    surfaceClassName:
      "border-blue-200/70 bg-blue-500/8 dark:border-blue-900/70 dark:bg-blue-500/10",
    iconClassName:
      "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  },
  Vaccin: {
    badgeClassName: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    surfaceClassName:
      "border-emerald-200/70 bg-emerald-500/8 dark:border-emerald-900/70 dark:bg-emerald-500/10",
    iconClassName:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  Chirurgie: {
    badgeClassName: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    surfaceClassName:
      "border-rose-200/70 bg-rose-500/8 dark:border-rose-900/70 dark:bg-rose-500/10",
    iconClassName:
      "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  },
  Urgence: {
    badgeClassName: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
    surfaceClassName:
      "border-amber-200/70 bg-amber-500/10 dark:border-amber-900/70 dark:bg-amber-500/12",
    iconClassName:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  },
  Contrôle: {
    badgeClassName: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    surfaceClassName:
      "border-violet-200/70 bg-violet-500/8 dark:border-violet-900/70 dark:bg-violet-500/10",
    iconClassName:
      "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  },
}

function normalizeDate(value?: string | Date | null) {
  if (!value) return null
  if (value instanceof Date) return value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function isToday(date: Date) {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

function formatTime(value?: string | Date | null) {
  const date = normalizeDate(value)
  if (!date) return "--:--"
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDateLabel(value?: string | Date | null) {
  const date = normalizeDate(value)
  if (!date) return "Date indisponible"
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
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

function getSpeciesIcon(_species?: string): IconSvgElement {
  return BirdIcon
}

function getPatientAge(dateOfBirth?: string) {
  const birthday = normalizeDate(dateOfBirth)
  if (!birthday) return "Âge non renseigné"

  const today = new Date()
  let years = today.getFullYear() - birthday.getFullYear()
  const monthDelta = today.getMonth() - birthday.getMonth()
  if (
    monthDelta < 0 ||
    (monthDelta === 0 && today.getDate() < birthday.getDate())
  ) {
    years -= 1
  }

  if (years <= 0) return "Moins d'un an"
  return `${years} an${years > 1 ? "s" : ""}`
}

function formatOwnerName(owner?: Owner) {
  if (!owner) return "Propriétaire non lié"
  return (
    `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
    "Propriétaire non lié"
  )
}

function getPatientStatusMeta(status?: Patient["status"]) {
  return PATIENT_STATUS_META[status || "sante"]
}

function AppointmentTypeBadge({
  type,
  className,
}: {
  type: Appointment["type"]
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent",
        TYPE_META[type].badgeClassName,
        className
      )}
    >
      {type}
    </Badge>
  )
}

function AppointmentStatusBadge({
  status,
  className,
}: {
  status: Appointment["status"]
  className?: string
}) {
  const meta = STATUS_META[status]

  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", meta.className, className)}
    >
      {meta.label}
    </Badge>
  )
}

function CliniqueMetricCard({
  title,
  value,
  badge,
  summary,
  detail,
}: CliniqueMetricItem) {
  return (
    <Card
      size="sm"
      className="justify-between bg-card"
    >
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-[2rem] font-semibold tracking-[-0.05em] tabular-nums">
          {value}
        </CardTitle>
        <CardAction>
          <Badge variant="outline" className="bg-background/80">
            {badge}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-1.5">
          <p className="font-medium text-foreground">{summary}</p>
          <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  )
}

const generateInvoicePDF = async (data: {
  patientName: string
  ownerName?: string
  date: Date
  items: BillingItem[]
  total: number
  id: string
  diagnosis?: string
}) => {
  const doc = new jsPDF()
  const primaryColor = "#2563EB"
  const grayColor = "#52525B"

  doc.setFontSize(22)
  doc.setTextColor(primaryColor)
  doc.text("Vetera", 20, 20)

  doc.setFontSize(10)
  doc.setTextColor(grayColor)
  doc.text("Clinique vétérinaire", 20, 26)
  doc.text("Gestion locale du cabinet", 20, 31)
  doc.text("Support interne", 20, 36)

  doc.setDrawColor(200, 200, 200)
  doc.line(20, 45, 190, 45)

  doc.setFontSize(16)
  doc.setTextColor(0, 0, 0)
  doc.text("FACTURE", 150, 20, { align: "center" })

  doc.setFontSize(10)
  doc.setTextColor(grayColor)
  doc.text(`N°: ${data.id}`, 150, 26, { align: "center" })
  doc.text(`Date: ${data.date.toLocaleDateString("fr-FR")}`, 150, 31, {
    align: "center",
  })

  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("Facturé à :", 20, 60)

  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(grayColor)

  let yPos = 66
  if (data.ownerName) {
    doc.text(`Propriétaire : ${data.ownerName}`, 20, yPos)
    yPos += 6
  }
  doc.text(`Patient : ${data.patientName}`, 20, yPos)

  let y = 90
  doc.setFillColor(245, 245, 245)
  doc.rect(20, y - 8, 170, 10, "F")
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("DESCRIPTION", 25, y)
  doc.text("MONTANT", 185, y, { align: "right" })

  y += 10
  doc.setFont("helvetica", "normal")
  doc.setTextColor(grayColor)

  data.items.forEach((item) => {
    doc.text(item.desc, 25, y)
    doc.text(`${item.amount} DA`, 185, y, { align: "right" })
    y += 10
  })

  y += 5
  doc.setDrawColor(0, 0, 0)
  doc.line(20, y, 190, y)
  y += 10

  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("TOTAL À PAYER", 90, y)
  doc.setTextColor(primaryColor)
  doc.text(`${data.total} DA`, 185, y, { align: "right" })

  if (data.diagnosis) {
    y += 20
    doc.setFontSize(10)
    doc.setFont("helvetica", "italic")
    doc.setTextColor(grayColor)
    doc.text("Note médicale : " + data.diagnosis, 20, y)
  }

  try {
    const qrDataUrl = await QRCode.toDataURL("https://www.google.com", {
      margin: 1,
      width: 100,
    })
    doc.addImage(qrDataUrl, "PNG", 160, 240, 30, 30)
    doc.setFontSize(8)
    doc.setTextColor(grayColor)
    doc.text("Merci pour votre confiance", 175, 275, { align: "center" })
  } catch (error) {
    console.error(error)
  }

  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.text("Vetera · Système clinique local", 105, 290, { align: "center" })
  doc.save(
    `Facture-${data.patientName}-${data.date.toISOString().split("T")[0]}.pdf`
  )
}

const generatePrescriptionPDF = (data: {
  patientName: string
  ownerName?: string
  species?: string
  breed?: string
  treatment?: string
  diagnosis?: string
}) => {
  const doc = new jsPDF()
  const primaryColor = "#10B981"
  const grayColor = "#52525B"

  doc.setFontSize(22)
  doc.setTextColor(primaryColor)
  doc.text("Vetera", 20, 20)

  doc.setFontSize(10)
  doc.setTextColor(grayColor)
  doc.text("Clinique vétérinaire", 20, 26)
  doc.text("Prescription interne", 20, 31)

  doc.setDrawColor(200, 200, 200)
  doc.line(20, 45, 190, 45)

  doc.setFontSize(18)
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "bold")
  doc.text("ORDONNANCE VÉTÉRINAIRE", 105, 60, { align: "center" })

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(grayColor)
  doc.text(`Date: ${new Date().toLocaleDateString("fr-FR")}`, 190, 50, {
    align: "right",
  })

  let y = 80
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("Patient :", 20, y)

  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(grayColor)
  y += 8
  doc.text(`Nom : ${data.patientName}`, 25, y)
  if (data.species) {
    y += 6
    doc.text(`Espèce : ${data.species}`, 25, y)
  }
  if (data.breed) {
    y += 6
    doc.text(`Race : ${data.breed}`, 25, y)
  }
  if (data.ownerName) {
    y += 6
    doc.text(`Propriétaire : ${data.ownerName}`, 25, y)
  }

  if (data.diagnosis) {
    y += 15
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)
    doc.text("Diagnostic :", 20, y)
    y += 8
    doc.setFont("helvetica", "normal")
    doc.setTextColor(grayColor)
    const diagnosisLines = doc.splitTextToSize(data.diagnosis, 170)
    doc.text(diagnosisLines, 25, y)
    y += diagnosisLines.length * 6
  }

  y += 10
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("Traitement prescrit :", 20, y)
  y += 8
  doc.setFont("helvetica", "normal")
  doc.setTextColor(grayColor)

  if (data.treatment) {
    const treatmentLines = doc.splitTextToSize(data.treatment, 170)
    doc.text(treatmentLines, 25, y)
  } else {
    doc.text("(À compléter)", 25, y)
  }

  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.text("Vetera · Prescription clinique", 105, 270, { align: "center" })
  doc.text("Valable 3 mois à compter de la date d'émission.", 105, 280, {
    align: "center",
  })

  doc.save(
    `Ordonnance-${data.patientName}-${new Date().toISOString().split("T")[0]}.pdf`
  )
}

function MedicalReportDialog({
  appointment,
  patientName,
  onClose,
  onConfirm,
}: {
  appointment: Appointment
  patientName: string
  onClose: () => void
  onConfirm: (diagnosis: string, treatment: string) => void
}) {
  const [diagnosis, setDiagnosis] = useState(appointment.diagnosis || "")
  const [treatment, setTreatment] = useState(appointment.treatment || "")

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[min(860px,calc(100%-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-[min(860px,calc(100%-2rem))]">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="text-xl tracking-[-0.04em]">
            Rapport de consultation
          </DialogTitle>
          <DialogDescription>
            Clôturez la consultation avec un diagnostic clair et le traitement
            prescrit avant l’encaissement.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto p-6">
          <FieldGroup className="grid gap-6">
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-base">Résumé du créneau</CardTitle>
                <CardDescription>
                  {patientName} · {appointment.type} ·{" "}
                  {formatTime(appointment.startTime)}
                </CardDescription>
              </CardHeader>
            </Card>

            <Field>
              <FieldLabel>Diagnostic</FieldLabel>
              <Textarea
                value={diagnosis}
                onChange={(event) => setDiagnosis(event.target.value)}
                placeholder="Ex: gastro-entérite aiguë, syndrome respiratoire, contrôle post-opératoire..."
                className="min-h-28"
              />
              <FieldDescription>
                Ce texte sera visible dans l’historique clinique et sur la
                facture interne.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Traitement prescrit</FieldLabel>
              <Textarea
                value={treatment}
                onChange={(event) => setTreatment(event.target.value)}
                placeholder="Ex: injection anti-vomitive, alimentation fractionnée, antibiothérapie 5 jours..."
                className="min-h-32"
              />
            </Field>
          </FieldGroup>
        </div>

        <div className="flex flex-col gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Retour
          </Button>
          <Button onClick={() => onConfirm(diagnosis, treatment)}>
            <HugeiconsIcon
              icon={Dollar01Icon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            Valider et facturer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function BillingDialog({
  appointment,
  patientName,
  ownerEmail,
  onClose,
  onConfirm,
}: {
  appointment: Appointment
  patientName: string
  ownerEmail?: string
  onClose: () => void
  onConfirm: (items: BillingItem[]) => void
}) {
  const [items, setItems] = useState<BillingItem[]>([
    { desc: `Consultation - ${appointment.type}`, amount: 2000 },
  ])
  const [newItemDesc, setNewItemDesc] = useState("")
  const [newItemAmount, setNewItemAmount] = useState("")

  const total = items.reduce((sum, item) => sum + item.amount, 0)

  const addItem = () => {
    const parsedAmount = Number(newItemAmount)
    if (
      !newItemDesc.trim() ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      toast.error("Renseignez une ligne de prestation valide.")
      return
    }

    setItems((current) => [
      ...current,
      { desc: newItemDesc.trim(), amount: parsedAmount },
    ])
    setNewItemDesc("")
    setNewItemAmount("")
  }

  const removeItem = (index: number) => {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const handleSendEmail = () => {
    if (!ownerEmail) {
      toast.error("Aucune adresse email n’est liée à ce propriétaire.")
      return
    }

    const subject = encodeURIComponent(`Facture vétérinaire - ${patientName}`)
    const itemList = items
      .map((item) => `- ${item.desc}: ${item.amount} DA`)
      .join("\n")
    const body = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver le détail de la consultation pour ${patientName}.\n\n${itemList}\n\nTOTAL: ${total} DA\n\nCordialement,\nL'équipe Vetera`
    )

    window.open(`mailto:${ownerEmail}?subject=${subject}&body=${body}`)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[min(940px,calc(100%-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-[min(940px,calc(100%-2rem))]">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="text-xl tracking-[-0.04em]">
            Facturation et encaissement
          </DialogTitle>
          <DialogDescription>
            Consolidez les actes facturés avant impression du reçu clinique.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto p-6">
          <div className="grid gap-6">
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-base">{patientName}</CardTitle>
                <CardDescription>
                  {appointment.type} · {new Date().toLocaleDateString("fr-FR")}
                </CardDescription>
              </CardHeader>
            </Card>

            <FieldGroup className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_160px_auto]">
              <Field>
                <FieldLabel>Nouvelle ligne</FieldLabel>
                <Input
                  value={newItemDesc}
                  onChange={(event) => setNewItemDesc(event.target.value)}
                  placeholder="Ex: injection, pansement, examen complémentaire..."
                />
              </Field>

              <Field>
                <FieldLabel>Montant (DA)</FieldLabel>
                <Input
                  type="number"
                  value={newItemAmount}
                  onChange={(event) => setNewItemAmount(event.target.value)}
                  placeholder="0"
                />
              </Field>

              <div className="flex items-end">
                <Button type="button" onClick={addItem}>
                  <HugeiconsIcon
                    icon={Add01Icon}
                    strokeWidth={2}
                    data-icon="inline-start"
                  />
                  Ajouter
                </Button>
              </div>
            </FieldGroup>

            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prestation</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={`${item.desc}-${index}`}>
                      <TableCell className="pl-8 font-medium">
                        {item.desc}
                      </TableCell>
                      <TableCell>{item.amount} DA</TableCell>
                      <TableCell className="pr-8 text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <HugeiconsIcon
                            icon={Delete01Icon}
                            strokeWidth={2}
                            className="size-4"
                          />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-4xl border border-border/80 bg-muted/20 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  Total à encaisser
                </span>
                <span className="text-2xl font-semibold tracking-[-0.04em] text-foreground">
                  {total} DA
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" onClick={handleSendEmail}>
            <HugeiconsIcon
              icon={Mail01Icon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            Email
          </Button>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={() => onConfirm(items)}>
              <HugeiconsIcon
                icon={PrinterIcon}
                strokeWidth={2}
                data-icon="inline-start"
              />
              Encaisser et imprimer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const Clinique: React.FC<CliniqueProps> = ({ onNavigate }) => {
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null)
  const [medicalAppointment, setMedicalAppointment] =
    useState<Appointment | null>(null)
  const [billingAppointment, setBillingAppointment] =
    useState<Appointment | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const deferredSearch = useDeferredValue(searchQuery)
  const [listTab, setListTab] = useState<ListTab>("all")
  const [detailTab, setDetailTab] = useState<DetailTab>("overview")

  const {
    data: appointments,
    loading: loadingAppointments,
    update: updateAppointment,
    completeWithBilling,
  } = useAppointmentsRepository()
  const { data: patients, update: updatePatient } = usePatientsRepository()
  const { data: owners } = useOwnersRepository()

  const patientsById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients]
  )
  const ownersById = useMemo(
    () => new Map(owners.map((owner) => [owner.id, owner])),
    [owners]
  )

  const todaysAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => {
          const date = normalizeDate(appointment.startTime)
          return date ? isToday(date) : false
        })
        .sort(
          (left, right) =>
            new Date(left.startTime).getTime() -
            new Date(right.startTime).getTime()
        ),
    [appointments]
  )

  const filteredAppointments = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()

    return todaysAppointments.filter((appointment) => {
      if (listTab !== "all" && appointment.status !== listTab) return false

      if (!query) return true

      const patient = patientsById.get(appointment.patientId)
      const owner = ownersById.get(
        appointment.ownerId || patient?.ownerId || ""
      )

      const searchIndex = [
        patient?.name,
        patient?.species,
        patient?.breed,
        owner?.firstName,
        owner?.lastName,
        appointment.type,
        appointment.reason,
        appointment.diagnosis,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return searchIndex.includes(query)
    })
  }, [deferredSearch, listTab, ownersById, patientsById, todaysAppointments])

  useEffect(() => {
    if (filteredAppointments.length === 0) {
      setSelectedAppointmentId(null)
      return
    }

    if (
      !selectedAppointmentId ||
      !filteredAppointments.some((item) => item.id === selectedAppointmentId)
    ) {
      setSelectedAppointmentId(filteredAppointments[0].id)
    }
  }, [filteredAppointments, selectedAppointmentId])

  const selectedAppointment = useMemo(
    () =>
      selectedAppointmentId
        ? (appointments.find(
            (appointment) => appointment.id === selectedAppointmentId
          ) ?? null)
        : null,
    [appointments, selectedAppointmentId]
  )

  const selectedPatient = selectedAppointment
    ? patientsById.get(selectedAppointment.patientId)
    : undefined
  const selectedOwner = selectedAppointment
    ? ownersById.get(
        selectedAppointment.ownerId || selectedPatient?.ownerId || ""
      )
    : undefined

  const patientHistory = useMemo(() => {
    if (!selectedPatient) return []

    return appointments
      .filter(
        (appointment) =>
          appointment.patientId === selectedPatient.id &&
          appointment.status === "completed"
      )
      .sort(
        (left, right) =>
          new Date(right.startTime).getTime() -
          new Date(left.startTime).getTime()
      )
      .slice(0, 6)
  }, [appointments, selectedPatient])

  const stats = useMemo(
    () => ({
      total: todaysAppointments.length,
      completed: todaysAppointments.filter(
        (appointment) => appointment.status === "completed"
      ).length,
      inProgress: todaysAppointments.filter(
        (appointment) => appointment.status === "in_progress"
      ).length,
      pending: todaysAppointments.filter(
        (appointment) => appointment.status === "scheduled"
      ).length,
    }),
    [todaysAppointments]
  )

  const overviewItems = useMemo<CliniqueMetricItem[]>(
    () => [
      {
        title: "Consultations du jour",
        value: String(stats.total),
        badge: `${stats.total}`,
        summary: `${stats.completed} clôturée${stats.completed > 1 ? "s" : ""}`,
        detail: "Volume global du flux clinique sélectionné aujourd’hui",
      },
      {
        title: "En cours",
        value: String(stats.inProgress),
        badge: `${stats.inProgress}`,
        summary: "Consultations à documenter",
        detail: "Dossiers actifs à finaliser puis facturer",
      },
      {
        title: "Terminés",
        value: String(stats.completed),
        badge: `${stats.completed}`,
        summary: "Consultations déjà clôturées",
        detail: "Inclut historique, diagnostic et encaissement validés",
      },
      {
        title: "En attente",
        value: String(stats.pending),
        badge: `${stats.pending}`,
        summary: "Créneaux à lancer",
        detail: "Patients encore en salle d’attente ou à appeler",
      },
    ],
    [stats.completed, stats.inProgress, stats.pending, stats.total]
  )

  const getPatient = (patientId: string) => patientsById.get(patientId)
  const getOwner = (appointment: Appointment) => {
    const patient = getPatient(appointment.patientId)
    return ownersById.get(appointment.ownerId || patient?.ownerId || "")
  }

  const handleStatusAction = async (appointment: Appointment) => {
    try {
      if (appointment.status === "scheduled") {
        await updateAppointment(appointment.id, { status: "in_progress" })
        toast.success("La consultation a été démarrée.")
        return
      }

      if (appointment.status === "in_progress") {
        setMedicalAppointment(appointment)
      }
    } catch (error) {
      console.error(error)
      toast.error("Impossible de mettre à jour le statut de la consultation.")
    }
  }

  const handleMedicalConfirm = async (diagnosis: string, treatment: string) => {
    if (!medicalAppointment) return

    try {
      await updateAppointment(medicalAppointment.id, { diagnosis, treatment })
      await updatePatient(medicalAppointment.patientId, {
        lastVisit: new Date().toISOString(),
      } as Partial<Patient>)

      const updatedAppointment = {
        ...medicalAppointment,
        diagnosis,
        treatment,
      }

      setMedicalAppointment(null)
      setBillingAppointment(updatedAppointment)
      toast.success("Le rapport médical est enregistré.")
    } catch (error) {
      console.error(error)
      toast.error("Impossible d’enregistrer le rapport médical.")
    }
  }

  const handleBillingConfirm = async (items: BillingItem[]) => {
    if (!billingAppointment) return

    try {
      const patient = getPatient(billingAppointment.patientId)
      const owner = getOwner(billingAppointment)

      const { totalAmountDa } = await completeWithBilling({
        appointmentId: billingAppointment.id,
        items,
        category: "Consultation",
        method: "cash",
      })

      await generateInvoicePDF({
        patientName: patient?.name || "Patient local",
        ownerName: formatOwnerName(owner),
        date: new Date(),
        items,
        total: totalAmountDa,
        id: `FACT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
        diagnosis: billingAppointment.diagnosis,
      })

      setBillingAppointment(null)
      toast.success("Facturation finalisée et reçu généré.")
    } catch (error) {
      console.error(error)
      toast.error("Impossible de finaliser la facturation.")
    }
  }

  const handleCallOwner = (owner?: Owner) => {
    if (!owner?.phone) {
      toast.error("Aucun numéro n’est enregistré pour ce propriétaire.")
      return
    }

    window.open(`tel:${owner.phone}`)
  }

  const handlePrescription = () => {
    if (!selectedAppointment || !selectedPatient) return

    if (
      selectedAppointment.status !== "completed" &&
      !selectedAppointment.treatment
    ) {
      toast.error(
        "Clôturez d’abord la consultation avant de générer l’ordonnance."
      )
      return
    }

    generatePrescriptionPDF({
      patientName: selectedPatient.name,
      ownerName: formatOwnerName(selectedOwner),
      species: selectedPatient.species,
      breed: selectedPatient.breed,
      treatment: selectedAppointment.treatment,
      diagnosis: selectedAppointment.diagnosis,
    })

    toast.success("Ordonnance générée et téléchargée.")
  }

  const todayLabel = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const visibleCount = filteredAppointments.length
  const SelectedSpeciesIcon = getSpeciesIcon(selectedPatient?.species)

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-4 pt-4 pb-6 lg:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <MotivationalHeader
          section="clinique"
          title=""
          subtitle={`${todaysAppointments.length} consultation${todaysAppointments.length > 1 ? "s" : ""} prévues pour ${todayLabel}. Les actes, diagnostics et encaissements restent regroupés dans le même flux.`}
        />

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onNavigate?.("agenda")}>
            <HugeiconsIcon
              icon={Calendar01Icon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            Ouvrir l&apos;agenda
          </Button>
          {selectedAppointment ? (
            <Button
              onClick={() => handleStatusAction(selectedAppointment)}
              disabled={selectedAppointment.status === "completed"}
            >
              {selectedAppointment.status === "scheduled" ? (
                <>
                  <HugeiconsIcon
                    icon={PlayIcon}
                    strokeWidth={2}
                    data-icon="inline-start"
                  />
                  Démarrer
                </>
              ) : selectedAppointment.status === "in_progress" ? (
                <>
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    strokeWidth={2}
                    data-icon="inline-start"
                  />
                  Clôturer
                </>
              ) : (
                <>
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    strokeWidth={2}
                    data-icon="inline-start"
                  />
                  Terminé
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewItems.map((item) => (
          <CliniqueMetricCard key={item.title} {...item} />
        ))}
      </div>

      <div className="grid gap-4">
        <Card className="min-h-[760px]">
          <CardHeader className="border-b">
            <CardDescription>Flux clinique</CardDescription>
            <CardTitle className="text-2xl tracking-[-0.04em]">
              Consultations du jour
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                {visibleCount} visible{visibleCount > 1 ? "s" : ""}
              </Badge>
            </CardAction>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col px-0 pb-0">
            <div className="flex flex-col gap-3 px-6 pt-1 pb-4 xl:flex-row xl:items-center xl:justify-between">
              <Tabs
                value={listTab}
                onValueChange={(value) => setListTab(value as ListTab)}
                className="gap-3"
              >
                <TabsList>
                  {LIST_TABS.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value}>
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="relative w-full xl:max-w-[440px]">
                <HugeiconsIcon
                  icon={SearchIcon}
                  strokeWidth={2}
                  className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Rechercher un patient, un motif ou un type d’acte..."
                  className="h-11 rounded-3xl bg-input/50 pl-11"
                />
              </div>
            </div>

            <Separator />

            {loadingAppointments ? (
              <div className="flex flex-1 items-center justify-center px-6 pb-6">
                <Spinner className="size-6 text-muted-foreground" />
              </div>
            ) : visibleCount === 0 ? (
              <div className="flex flex-1 px-6 pb-6">
                <Empty className="border border-dashed border-border/80 bg-muted/20">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <HugeiconsIcon icon={StethoscopeIcon} strokeWidth={2} />
                    </EmptyMedia>
                    <EmptyTitle>Aucune consultation dans cette vue</EmptyTitle>
                    <EmptyDescription>
                      Ajustez la recherche ou revenez à l’agenda pour planifier
                      de nouveaux créneaux.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent className="sm:flex-row">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("")
                        setListTab("all")
                      }}
                    >
                      Réinitialiser
                    </Button>
                    <Button onClick={() => onNavigate?.("agenda")}>
                      <HugeiconsIcon
                        icon={Calendar01Icon}
                        strokeWidth={2}
                        data-icon="inline-start"
                      />
                      Voir l&apos;agenda
                    </Button>
                  </EmptyContent>
                </Empty>
              </div>
            ) : (
              <div className="px-6 pt-5 pb-6">
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[34%]">Patient</TableHead>
                        <TableHead className="hidden w-[20%] xl:table-cell">
                          Propriétaire
                        </TableHead>
                        <TableHead className="w-[20%]">Créneau</TableHead>
                        <TableHead className="w-[12%]">Acte</TableHead>
                        <TableHead className="w-[14%]">Statut</TableHead>
                        <TableHead className="w-[20%]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.map((appointment) => {
                        const patient = getPatient(appointment.patientId)
                        const owner = getOwner(appointment)
                        const SpeciesIcon = getSpeciesIcon(patient?.species)

                        return (
                          <TableRow
                            key={appointment.id}
                            data-state={
                              selectedAppointmentId === appointment.id
                                ? "selected"
                                : undefined
                            }
                            className={cn(
                              "cursor-pointer",
                              selectedAppointmentId === appointment.id
                                ? "!bg-primary/5 hover:!bg-primary/6"
                                : ""
                            )}
                            onClick={() => {
                              setSelectedAppointmentId(appointment.id)
                              setDetailTab("overview")
                            }}
                          >
                            <TableCell className="pl-10 whitespace-normal">
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "flex size-10 items-center justify-center rounded-2xl",
                                    TYPE_META[appointment.type].iconClassName
                                  )}
                                >
                                  <HugeiconsIcon
                                    icon={SpeciesIcon}
                                    strokeWidth={2}
                                    className="size-4"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium break-words text-foreground">
                                    {patient?.name || "Patient local"}
                                  </p>
                                  <p className="text-sm break-words text-muted-foreground">
                                    {patient?.species || "Espèce"}
                                    {patient?.breed
                                      ? ` · ${patient.breed}`
                                      : ""}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="hidden whitespace-normal xl:table-cell">
                              <div className="min-w-0">
                                <p className="font-medium break-words text-foreground">
                                  {formatOwnerName(owner)}
                                </p>
                                <p className="text-sm break-words text-muted-foreground">
                                  {owner?.phone || "Téléphone non renseigné"}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell className="whitespace-normal">
                              <div className="min-w-0">
                                <p className="font-medium text-foreground">
                                  {formatTime(appointment.startTime)}
                                </p>
                                <p className="text-sm break-words text-muted-foreground">
                                  {appointment.reason || "Motif non renseigné"}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell className="whitespace-normal">
                              <AppointmentTypeBadge type={appointment.type} />
                            </TableCell>

                            <TableCell className="whitespace-normal">
                              <AppointmentStatusBadge
                                status={appointment.status}
                              />
                            </TableCell>

                            <TableCell
                              className="pl-6 text-left whitespace-normal"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <div className="flex flex-wrap items-center gap-1.5">
                                {appointment.status === "scheduled" ? (
                                  <Button
                                    size="xs"
                                    className="rounded-3xl"
                                    onClick={() =>
                                      handleStatusAction(appointment)
                                    }
                                  >
                                    <HugeiconsIcon
                                      icon={PlayIcon}
                                      strokeWidth={2}
                                      data-icon="inline-start"
                                    />
                                    <span>Démarrer</span>
                                  </Button>
                                ) : appointment.status === "in_progress" ? (
                                  <Button
                                    size="xs"
                                    className="rounded-3xl"
                                    onClick={() =>
                                      handleStatusAction(appointment)
                                    }
                                  >
                                    <HugeiconsIcon
                                      icon={CheckmarkCircle02Icon}
                                      strokeWidth={2}
                                      data-icon="inline-start"
                                    />
                                    <span>Clôturer</span>
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    className="rounded-3xl bg-muted/40 text-muted-foreground"
                                    disabled
                                  >
                                    <HugeiconsIcon
                                      icon={CheckmarkCircle02Icon}
                                      strokeWidth={2}
                                      data-icon="inline-start"
                                    />
                                    <span>Facturé</span>
                                  </Button>
                                )}

                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    render={
                                      <Button variant="ghost" size="icon-xs" />
                                    }
                                  >
                                    <HugeiconsIcon
                                      icon={MoreVerticalCircle01Icon}
                                      strokeWidth={2}
                                    />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="w-48"
                                  >
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedAppointmentId(appointment.id)
                                        setDetailTab("overview")
                                      }}
                                    >
                                      Ouvrir
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => onNavigate?.("patients")}
                                    >
                                      Dossier patient
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleCallOwner(owner)}
                                    >
                                      Appeler le propriétaire
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <CardDescription>Dossier sélectionné</CardDescription>
            <CardTitle className="text-xl tracking-[-0.04em]">
              {selectedPatient?.name || "Sélectionnez une consultation"}
            </CardTitle>
            {selectedAppointment ? (
              <CardAction>
                <AppointmentStatusBadge status={selectedAppointment.status} />
              </CardAction>
            ) : null}
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
            {selectedAppointment && selectedPatient ? (
              <Tabs
                value={detailTab}
                onValueChange={(value) => setDetailTab(value as DetailTab)}
                className="flex min-h-0 flex-1 flex-col gap-4"
              >
                <div
                  className={cn(
                    "rounded-4xl border p-5",
                    TYPE_META[selectedAppointment.type].surfaceClassName
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-16 items-center justify-center rounded-3xl bg-background shadow-sm">
                      <HugeiconsIcon
                        icon={SelectedSpeciesIcon}
                        strokeWidth={2}
                        className="size-7 text-foreground"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-xl font-medium tracking-[-0.04em] text-foreground">
                          {selectedPatient.name}
                        </p>
                        <AppointmentTypeBadge type={selectedAppointment.type} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedPatient.species}
                        {selectedPatient.breed
                          ? ` · ${selectedPatient.breed}`
                          : ""}
                        {" · "}
                        {getPatientAge(selectedPatient.dateOfBirth)}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Créneau du jour ·{" "}
                        {formatTime(selectedAppointment.startTime)} ·{" "}
                        {formatDateLabel(selectedAppointment.startTime)}
                      </p>
                    </div>
                  </div>
                </div>

                <TabsList
                  variant="line"
                  className="w-full justify-start rounded-none p-0"
                >
                  <TabsTrigger value="overview">Dossier</TabsTrigger>
                  <TabsTrigger value="history">Historique</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="min-h-0 flex-1">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                    <Card size="sm">
                      <CardHeader>
                        <CardTitle>Repères du dossier</CardTitle>
                        <CardDescription>
                          L’essentiel du patient regroupé dans un seul bloc.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-3xl bg-muted/30 px-4 py-3">
                          <p className="text-sm text-muted-foreground">
                            Espèce
                          </p>
                          <p className="mt-1 font-medium text-foreground">
                            {selectedPatient.species}
                          </p>
                        </div>
                        <div className="rounded-3xl bg-muted/30 px-4 py-3">
                          <p className="text-sm text-muted-foreground">Race</p>
                          <p className="mt-1 font-medium text-foreground">
                            {selectedPatient.breed || "Non renseignée"}
                          </p>
                        </div>
                        <div className="rounded-3xl bg-muted/30 px-4 py-3">
                          <p className="text-sm text-muted-foreground">Âge</p>
                          <p className="mt-1 font-medium text-foreground">
                            {getPatientAge(selectedPatient.dateOfBirth)}
                          </p>
                        </div>
                        <div className="rounded-3xl bg-muted/30 px-4 py-3">
                          <p className="text-sm text-muted-foreground">
                            Statut
                          </p>
                          <div className="mt-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "border-transparent",
                                getPatientStatusMeta(selectedPatient.status)
                                  .className
                              )}
                            >
                              {
                                getPatientStatusMeta(selectedPatient.status)
                                  .label
                              }
                            </Badge>
                          </div>
                        </div>
                        <div className="rounded-3xl bg-muted/30 px-4 py-3">
                          <p className="text-sm text-muted-foreground">
                            Dernière visite
                          </p>
                          <p className="mt-1 font-medium text-foreground">
                            {selectedPatient.lastVisit
                              ? formatShortDate(selectedPatient.lastVisit)
                              : "Non renseignée"}
                          </p>
                        </div>
                        <div className="rounded-3xl bg-muted/30 px-4 py-3">
                          <p className="text-sm text-muted-foreground">
                            Acte du jour
                          </p>
                          <div className="mt-1">
                            <AppointmentTypeBadge
                              type={selectedAppointment.type}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card size="sm">
                      <CardHeader>
                        <CardTitle>Coordination clinique</CardTitle>
                        <CardDescription>
                          Contact propriétaire et éléments à traiter pour la
                          consultation active.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-5">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={formatOwnerName(selectedOwner)}
                            src={
                              selectedOwner?.email
                                ? undefined
                                : "gradient:from-blue-500 to-cyan-500"
                            }
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-foreground">
                              {formatOwnerName(selectedOwner)}
                            </p>
                            <p className="truncate text-sm text-muted-foreground">
                              {selectedOwner?.email || "Email non renseigné"}
                            </p>
                          </div>
                          <AppointmentStatusBadge
                            status={selectedAppointment.status}
                          />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-3xl bg-muted/30 px-4 py-3">
                            <p className="text-sm text-muted-foreground">
                              Téléphone
                            </p>
                            <p className="mt-1 font-medium text-foreground">
                              {selectedOwner?.phone || "Non renseigné"}
                            </p>
                          </div>
                          <div className="rounded-3xl bg-muted/30 px-4 py-3">
                            <p className="text-sm text-muted-foreground">
                              Ville
                            </p>
                            <p className="mt-1 font-medium text-foreground">
                              {selectedOwner?.city || "Non renseignée"}
                            </p>
                          </div>
                        </div>

                        <Separator />

                        <div className="grid gap-3">
                          <div className="rounded-3xl bg-muted/30 px-4 py-3">
                            <p className="text-sm text-muted-foreground">
                              Motif
                            </p>
                            <p className="mt-1 font-medium text-foreground">
                              {selectedAppointment.reason ||
                                "Motif non renseigné"}
                            </p>
                          </div>
                          <div className="rounded-3xl bg-muted/30 px-4 py-3">
                            <p className="text-sm text-muted-foreground">
                              Diagnostic
                            </p>
                            <p className="mt-1 text-foreground">
                              {selectedAppointment.diagnosis ||
                                "Diagnostic à compléter"}
                            </p>
                          </div>
                          <div className="rounded-3xl bg-muted/30 px-4 py-3">
                            <p className="text-sm text-muted-foreground">
                              Traitement
                            </p>
                            <p className="mt-1 text-foreground">
                              {selectedAppointment.treatment ||
                                "Traitement à compléter"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            className="rounded-3xl"
                            onClick={handlePrescription}
                          >
                            <HugeiconsIcon
                              icon={PillIcon}
                              strokeWidth={2}
                              data-icon="inline-start"
                            />
                            Ordonnance
                          </Button>
                          <Button
                            variant="outline"
                            className="rounded-3xl"
                            onClick={() => handleCallOwner(selectedOwner)}
                          >
                            <HugeiconsIcon
                              icon={PhoneCheckIcon}
                              strokeWidth={2}
                              data-icon="inline-start"
                            />
                            Appeler
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="min-h-0 flex-1">
                  {patientHistory.length > 0 ? (
                    <div className="grid gap-3">
                      {patientHistory.map((appointment) => (
                        <Card key={appointment.id} size="sm">
                          <CardHeader>
                            <CardTitle className="text-base">
                              {appointment.type}
                            </CardTitle>
                            <CardDescription>
                              {formatShortDate(appointment.startTime)} ·{" "}
                              {formatTime(appointment.startTime)}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="grid gap-3">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Diagnostic
                              </p>
                              <p className="mt-1 text-foreground">
                                {appointment.diagnosis || "Non renseigné"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Traitement
                              </p>
                              <p className="mt-1 text-foreground">
                                {appointment.treatment || "Non renseigné"}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Empty className="border border-dashed border-border/80 bg-muted/20">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <HugeiconsIcon
                            icon={WorkHistoryIcon}
                            strokeWidth={2}
                            className="size-5"
                          />
                        </EmptyMedia>
                        <EmptyTitle>Aucun historique récent</EmptyTitle>
                        <EmptyDescription>
                          Ce dossier n&apos;a pas encore de consultation
                          archivée.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <Empty className="border border-dashed border-border/80 bg-muted/20">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <HugeiconsIcon icon={StethoscopeIcon} strokeWidth={2} />
                  </EmptyMedia>
                  <EmptyTitle>Sélectionnez une consultation</EmptyTitle>
                  <EmptyDescription>
                    Sélectionnez une consultation pour afficher la synthèse du
                    dossier et le suivi clinique.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>

      {medicalAppointment ? (
        <MedicalReportDialog
          appointment={medicalAppointment}
          patientName={
            patientsById.get(medicalAppointment.patientId)?.name ||
            "Patient local"
          }
          onClose={() => setMedicalAppointment(null)}
          onConfirm={handleMedicalConfirm}
        />
      ) : null}

      {billingAppointment ? (
        <BillingDialog
          appointment={billingAppointment}
          patientName={
            patientsById.get(billingAppointment.patientId)?.name ||
            "Patient local"
          }
          ownerEmail={getOwner(billingAppointment)?.email}
          onClose={() => setBillingAppointment(null)}
          onConfirm={handleBillingConfirm}
        />
      ) : null}
    </div>
  )
}

export default Clinique
