import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  BirdIcon,
  Calendar01Icon,
  Edit01Icon,
  SaveIcon,
  SearchIcon,
  UserGroupIcon,
  HeartPulse,
  CalendarCheckInIcon,
  Notification02Icon,
  Activity01Icon,
  TrendingUp,
  TrendingDown,
  StethoscopeIcon,
  WorkHistoryIcon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Skeleton } from "@/components/ui/skeleton"
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
import { Spinner } from "@/components/ui/spinner"
import { Sparkline } from "@/components/ui/sparkline"
import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useUsersRepository,
} from "@/data/repositories"
import { cn } from "@/lib/utils"
import type { Appointment, Owner, Patient } from "@/types/db"

const COMMON_SPECIES = [
  "Chien",
  "Chat",
  "NAC",
  "Cheval",
  "Lapin",
  "Oiseau",
  "Reptile",
  "Bovin",
  "Ovin",
  "Caprin",
]

const DOG_BREEDS = [
  "Berger Allemand",
  "Malinois",
  "Labrador",
  "Golden Retriever",
  "Bulldog Français",
  "Chihuahua",
  "Husky",
  "Caniche",
  "Yorkshire",
  "Rottweiler",
  "Beagle",
  "Teckel",
  "Border Collie",
  "Shih Tzu",
  "Boxer",
  "Cocker",
  "Dobermann",
  "Jack Russell",
  "Croisé",
]

const CAT_BREEDS = [
  "Européen",
  "Siamois",
  "Persan",
  "Maine Coon",
  "Sphynx",
  "Sacré de Birmanie",
  "Bengal",
  "Ragdoll",
  "Chartreux",
  "Norvégien",
  "British Shorthair",
  "Abyssin",
  "Croisé",
]

const PATIENT_STATUS_OPTIONS = [
  {
    value: "sante" as const,
    label: "En bonne santé",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  {
    value: "traitement" as const,
    label: "En traitement",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  {
    value: "hospitalise" as const,
    label: "Hospitalisé",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    value: "decede" as const,
    label: "Décédé",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
]

const APPOINTMENT_STATUS_META = {
  scheduled: {
    label: "Planifié",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  in_progress: {
    label: "En cours",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  completed: {
    label: "Terminé",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  cancelled: {
    label: "Annulé",
    className: "bg-rose-100 text-rose-700 border-rose-200",
  },
  no_show: {
    label: "Absent",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
} satisfies Record<Appointment["status"], { label: string; className: string }>

type DetailsTab = "info" | "medical" | "history"

type PatientRecord = {
  patient: Patient
  owner?: Owner
  completedAppointments: Appointment[]
  upcomingAppointment?: Appointment
  lastVisit?: string
  searchIndex: string
}

function normalizeDate(value?: string | Date | null) {
  if (!value) return null
  if (value instanceof Date) return value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatOwnerName(owner?: Owner) {
  if (!owner) return "Propriétaire inconnu"
  return (
    `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
    "Propriétaire inconnu"
  )
}

function formatPatientDate(value?: string) {
  const date = normalizeDate(value)
  if (!date) return "Non renseigné"
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatPatientDateTime(value?: string) {
  const date = normalizeDate(value)
  if (!date) return "Non planifié"
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatPatientLongDate(value?: string) {
  const date = normalizeDate(value)
  if (!date) return "Date indisponible"
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatVisitTimeRange(start?: string, end?: string) {
  const startDate = normalizeDate(start)
  const endDate = normalizeDate(end)
  if (!startDate) return "Heure indisponible"

  const startLabel = startDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })

  if (!endDate) return startLabel

  const endLabel = endDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return `${startLabel} - ${endLabel}`
}

function getAgeLabel(value?: string) {
  const date = normalizeDate(value)
  if (!date) return "Âge non renseigné"

  const now = new Date()
  let years = now.getFullYear() - date.getFullYear()
  let months = now.getMonth() - date.getMonth()

  if (months < 0 || (months === 0 && now.getDate() < date.getDate())) {
    years -= 1
    months += 12
  }

  if (years > 0) return `${years} an${years > 1 ? "s" : ""}`
  if (months > 0) return `${months} mois`

  const days = Math.max(
    1,
    Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  )

  return `${days} jour${days > 1 ? "s" : ""}`
}

function getStatusMeta(status: Patient["status"]) {
  return (
    PATIENT_STATUS_OPTIONS.find((option) => option.value === status) ??
    PATIENT_STATUS_OPTIONS[0]
  )
}

function getSpeciesTone(species?: string) {
  const normalized = species?.toLowerCase() ?? ""

  if (normalized.includes("chien")) {
    return "bg-blue-500/10 text-blue-700 dark:text-blue-300"
  }

  if (normalized.includes("chat")) {
    return "bg-violet-500/10 text-violet-700 dark:text-violet-300"
  }

  if (normalized.includes("nac")) {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  }

  return "bg-muted text-muted-foreground"
}

function getSpeciesIcon(species?: string): string {
  const normalized = species?.toLowerCase() ?? ""

  if (normalized.includes("chien")) {
    return "🐕"
  }

  if (normalized.includes("chat")) {
    return "🐱"
  }

  if (normalized.includes("nac")) {
    return "🐹"
  }

  if (normalized.includes("cheval")) {
    return "🐴"
  }

  if (normalized.includes("lapin")) {
    return "🐰"
  }

  if (normalized.includes("oiseau")) {
    return "🐦"
  }

  return "🐾" // Icône par défaut
}

function getBreedSuggestions(species?: string) {
  const normalized = species?.toLowerCase() ?? ""
  if (normalized.includes("chien")) return DOG_BREEDS
  if (normalized.includes("chat")) return CAT_BREEDS
  return []
}

function PatientStatusBadge({ status }: { status: Patient["status"] }) {
  const meta = getStatusMeta(status)

  return (
    <Badge variant="secondary" className={meta.className}>
      {meta.label}
    </Badge>
  )
}

type PatientOverviewCard = {
  label: string
  value: string
  meta: string
  note: string
  icon: typeof UserGroupIcon
  tone: "blue" | "orange" | "emerald" | "slate"
  sparklineData: number[]
}

const patientToneMap: Record<PatientOverviewCard["tone"], { bg: string; text: string; spark: string }> = {
  blue: {
    bg: "bg-orange-500/10",
    text: "text-orange-600",
    spark: "#f97316",
  },
  orange: {
    bg: "bg-orange-500/10",
    text: "text-orange-600",
    spark: "#f97316",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600",
    spark: "#10b981",
  },
  slate: {
    bg: "bg-slate-500/10",
    text: "text-slate-600",
    spark: "#64748b",
  },
}

function buildPatientSparkline(
  base: number,
  pattern: "steady" | "rise" | "watch" | "stable"
) {
  const deltas = {
    steady: [-2, -1, 0, 1, 0, 1, 1, 2],
    rise: [-3, -2, -1, 0, 1, 2, 2, 3],
    watch: [3, 2, 4, 5, 4, 6, 5, 7],
    stable: [1, 1, 0, 1, 0, 1, 0, 0],
  }[pattern]

  return deltas.map((delta) => Math.max(base + delta, 0))
}

function PatientOverviewStrip({ items }: { items: PatientOverviewCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const tone = patientToneMap[item.tone]

        return (
          <Card key={item.label} className="overflow-hidden rounded-[24px] border border-border bg-card shadow-none">
            <CardContent className="flex min-h-[154px] flex-col justify-between p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">{item.label}</p>
                  <p className="text-[24px] font-medium tracking-[-0.04em] text-foreground">{item.value}</p>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="font-mono text-foreground/70">{item.meta}</span>
                    <span className="font-mono uppercase tracking-[0.04em] text-muted-foreground">{item.note}</span>
                  </div>
                </div>
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 aspect-square items-center justify-center rounded-xl border border-border/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
                    tone.bg
                  )}
                >
                  <HugeiconsIcon icon={item.icon} strokeWidth={2} className={cn("size-[18px]", tone.text)} />
                </div>
              </div>

              <div className="flex items-end justify-between gap-3">
                <p className="max-w-[20ch] text-[12px] leading-[1.45] text-muted-foreground">{item.note}</p>
                <Sparkline
                  data={item.sparklineData}
                  width={74}
                  height={28}
                  color={tone.spark}
                  strokeWidth={2}
                  fillOpacity={0.08}
                />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function ReadOnlyDetail({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="rounded-3xl border border-border/80 bg-muted/25 p-4">
      <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      <div className="mt-2 text-sm leading-6 text-foreground">{value}</div>
    </div>
  )
}

function PatientDetailsDialog({
  patient,
  owner,
  allOwners,
  appointments,
  initialTab,
  onClose,
  onUpdatePatient,
  onUpdateOwner,
}: {
  patient: Patient
  owner?: Owner
  allOwners: Owner[]
  appointments: Appointment[]
  initialTab: DetailsTab
  onClose: () => void
  onUpdatePatient: (id: string, data: Partial<Patient>) => Promise<boolean>
  onUpdateOwner: (id: string, data: Partial<Owner>) => Promise<boolean>
}) {
  const [activeTab, setActiveTab] = useState<DetailsTab>(initialTab)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { data: users } = useUsersRepository()

  const [patientData, setPatientData] = useState({
    name: patient.name,
    species: patient.species,
    breed: patient.breed || "",
    sex: patient.sex,
    status: patient.status,
    dateOfBirth: patient.dateOfBirth || "",
    allergies: patient.allergies || "",
    chronicConditions: patient.chronicConditions || "",
    generalNotes: patient.generalNotes || "",
  })

  const [selectedOwnerId, setSelectedOwnerId] = useState(patient.ownerId)
  const [ownerData, setOwnerData] = useState<Partial<Owner>>(
    owner ? { ...owner } : {}
  )

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab, patient.id])

  useEffect(() => {
    setIsEditing(false)
    setPatientData({
      name: patient.name,
      species: patient.species,
      breed: patient.breed || "",
      sex: patient.sex,
      status: patient.status,
      dateOfBirth: patient.dateOfBirth || "",
      allergies: patient.allergies || "",
      chronicConditions: patient.chronicConditions || "",
      generalNotes: patient.generalNotes || "",
    })
    setSelectedOwnerId(patient.ownerId)
    setOwnerData(owner ? { ...owner } : {})
  }, [owner, patient])

  useEffect(() => {
    const linkedOwner = allOwners.find((entry) => entry.id === selectedOwnerId)
    if (linkedOwner) {
      setOwnerData({ ...linkedOwner })
    }
  }, [allOwners, selectedOwnerId])

  const history = useMemo(() => {
    return appointments
      .filter((appointment) => appointment.patientId === patient.id)
      .slice()
      .sort((left, right) => {
        const leftDate = normalizeDate(left.startTime)?.getTime() ?? 0
        const rightDate = normalizeDate(right.startTime)?.getTime() ?? 0
        return rightDate - leftDate
      })
  }, [appointments, patient.id])

  const currentOwner = useMemo(
    () => allOwners.find((entry) => entry.id === selectedOwnerId),
    [allOwners, selectedOwnerId]
  )

  const usersById = useMemo(() => {
    return new Map(users.map((entry) => [entry.id, entry]))
  }, [users])

  const breedSuggestions = useMemo(
    () => getBreedSuggestions(patientData.species),
    [patientData.species]
  )

  const upcomingAppointment = useMemo(() => {
    return history
      .filter((appointment) => {
        const date = normalizeDate(appointment.startTime)
        return (
          appointment.status === "scheduled" &&
          !!date &&
          date.getTime() >= Date.now()
        )
      })
      .slice()
      .sort((left, right) => {
        const leftDate = normalizeDate(left.startTime)?.getTime() ?? 0
        const rightDate = normalizeDate(right.startTime)?.getTime() ?? 0
        return leftDate - rightDate
      })[0]
  }, [history])

  const handleSaveAll = useCallback(async () => {
    if (!patientData.name.trim()) {
      toast.error("Le nom du patient est obligatoire.")
      return
    }

    if (!selectedOwnerId) {
      toast.error("Le patient doit rester lié à un propriétaire.")
      return
    }

    setIsSaving(true)

    try {
      const patientUpdated = await onUpdatePatient(patient.id, {
        ...patientData,
        ownerId: selectedOwnerId,
        breed: patientData.breed || undefined,
        dateOfBirth: patientData.dateOfBirth || undefined,
        allergies: patientData.allergies || undefined,
        chronicConditions: patientData.chronicConditions || undefined,
        generalNotes: patientData.generalNotes || undefined,
      })

      if (!patientUpdated) {
        throw new Error("La mise à jour du patient a échoué.")
      }

      const ownerUpdated = await onUpdateOwner(selectedOwnerId, {
        firstName: ownerData.firstName || "",
        lastName: ownerData.lastName || "",
        phone: ownerData.phone || "",
        email: ownerData.email || undefined,
        address: ownerData.address || undefined,
        city: ownerData.city || undefined,
      })

      if (!ownerUpdated) {
        throw new Error("La mise à jour du propriétaire a échoué.")
      }

      toast.success("Le dossier patient a été mis à jour.")
      setIsEditing(false)
    } catch (error) {
      console.error(error)
      toast.error("Impossible d'enregistrer les modifications.")
    } finally {
      setIsSaving(false)
    }
  }, [patientData, selectedOwnerId, ownerData, onUpdatePatient, onUpdateOwner])

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[min(1100px,calc(100%-2rem))] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-[min(1100px,calc(100%-2rem))]">
        <DialogHeader className="shrink-0 gap-0 border-b">
          <div className="flex flex-col gap-5 px-6 py-5">
            <div className="flex items-start justify-between gap-4 pr-10">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex size-12 items-center justify-center rounded-2xl text-2xl",
                    getSpeciesTone(patient.species)
                  )}
                >
                  {getSpeciesIcon(patient.species)}
                </div>
                <div className="space-y-1">
                  <DialogTitle className="text-2xl tracking-[-0.05em]">
                    {patient.name}
                  </DialogTitle>
                  <DialogDescription>
                    {formatOwnerName(currentOwner)} · Dossier #
                    {patient.id.slice(0, 6)}
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <PatientStatusBadge status={patientData.status} />
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <HugeiconsIcon
                      icon={Edit01Icon}
                      strokeWidth={2}
                      data-icon="inline-start"
                    />
                    Modifier
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleSaveAll} disabled={isSaving}>
                    {isSaving ? (
                      <Spinner className="size-4" />
                    ) : (
                      <HugeiconsIcon
                        icon={SaveIcon}
                        strokeWidth={2}
                        data-icon="inline-start"
                      />
                    )}
                    Enregistrer
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-3xl bg-muted p-4">
                <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Dernière visite
                </p>
                <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">
                  {formatPatientDate(patient.lastVisit)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {
                    history.filter((entry) => entry.status === "completed")
                      .length
                  }{" "}
                  visite
                  {history.filter((entry) => entry.status === "completed")
                    .length > 1
                    ? "s"
                    : ""}{" "}
                  clôturée
                  {history.filter((entry) => entry.status === "completed")
                    .length > 1
                    ? "s"
                    : ""}
                </p>
              </div>

              <div className="rounded-3xl bg-muted p-4">
                <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Prochain créneau
                </p>
                <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">
                  {upcomingAppointment
                    ? formatPatientDateTime(upcomingAppointment.startTime)
                    : "Aucun rendez-vous"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {upcomingAppointment
                    ? upcomingAppointment.type
                    : "Aucune venue planifiée pour ce patient."}
                </p>
              </div>

              <div className="rounded-3xl bg-muted p-4">
                <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Repère clinique
                </p>
                <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">
                  {patient.allergies
                    ? "Allergies à surveiller"
                    : patient.chronicConditions
                      ? "Suivi chronique"
                      : "Rien à signaler"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {patient.allergies ||
                    patient.chronicConditions ||
                    "Le dossier ne contient pas de signal particulier."}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-6 py-4">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as DetailsTab)}
            className="gap-5"
          >
            <TabsList
              variant="line"
              className="w-full justify-start rounded-lg border-b bg-background/50 p-1 backdrop-blur"
            >
              <TabsTrigger value="info" className="rounded-md px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <HugeiconsIcon icon={BirdIcon} strokeWidth={2} className="mr-2 size-4" />
                Informations
              </TabsTrigger>
              <TabsTrigger value="medical" className="rounded-md px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <HugeiconsIcon icon={StethoscopeIcon} strokeWidth={2} className="mr-2 size-4" />
                Dossier médical
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-md px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <HugeiconsIcon icon={WorkHistoryIcon} strokeWidth={2} className="mr-2 size-4" />
                Historique
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <div className="grid gap-4 xl:grid-cols-2">
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Profil animal</CardTitle>
                    <CardDescription>
                      Identité, espèce et statut clinique du patient.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!isEditing ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <ReadOnlyDetail label="Nom" value={patientData.name} />
                        <ReadOnlyDetail
                          label="Espèce"
                          value={patientData.species || "Non renseignée"}
                        />
                        <ReadOnlyDetail
                          label="Race"
                          value={patientData.breed || "Non renseignée"}
                        />
                        <ReadOnlyDetail
                          label="Sexe"
                          value={patientData.sex === "M" ? "Mâle" : "Femelle"}
                        />
                        <ReadOnlyDetail
                          label="Date de naissance"
                          value={formatPatientDate(patientData.dateOfBirth)}
                        />
                        <ReadOnlyDetail
                          label="Âge"
                          value={getAgeLabel(patientData.dateOfBirth)}
                        />
                      </div>
                    ) : (
                      <FieldGroup>
                        <Field>
                          <FieldLabel>Nom</FieldLabel>
                          <Input
                            value={patientData.name}
                            onChange={(event) =>
                              setPatientData((current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                          />
                        </Field>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field>
                            <FieldLabel>Espèce</FieldLabel>
                            <Input
                              list="patient-species-options"
                              value={patientData.species}
                              onChange={(event) =>
                                setPatientData((current) => ({
                                  ...current,
                                  species: event.target.value,
                                }))
                              }
                              placeholder="Chien, Chat..."
                            />
                            <datalist id="patient-species-options">
                              {COMMON_SPECIES.map((species) => (
                                <option key={species} value={species} />
                              ))}
                            </datalist>
                          </Field>

                          <Field>
                            <FieldLabel>Race</FieldLabel>
                            <Input
                              list="patient-breed-options"
                              value={patientData.breed}
                              onChange={(event) =>
                                setPatientData((current) => ({
                                  ...current,
                                  breed: event.target.value,
                                }))
                              }
                              placeholder="Race"
                            />
                            <datalist id="patient-breed-options">
                              {breedSuggestions.map((breed) => (
                                <option key={breed} value={breed} />
                              ))}
                            </datalist>
                          </Field>

                          <Field>
                            <FieldLabel>Sexe</FieldLabel>
                            <NativeSelect
                              value={patientData.sex}
                              onChange={(event) =>
                                setPatientData((current) => ({
                                  ...current,
                                  sex: event.target.value as Patient["sex"],
                                }))
                              }
                              className="w-full"
                            >
                              <NativeSelectOption value="M">
                                Mâle
                              </NativeSelectOption>
                              <NativeSelectOption value="F">
                                Femelle
                              </NativeSelectOption>
                            </NativeSelect>
                          </Field>

                          <Field>
                            <FieldLabel>Statut</FieldLabel>
                            <NativeSelect
                              value={patientData.status}
                              onChange={(event) =>
                                setPatientData((current) => ({
                                  ...current,
                                  status: event.target
                                    .value as Patient["status"],
                                }))
                              }
                              className="w-full"
                            >
                              {PATIENT_STATUS_OPTIONS.map((option) => (
                                <NativeSelectOption
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </NativeSelectOption>
                              ))}
                            </NativeSelect>
                          </Field>
                        </div>

                        <Field>
                          <FieldLabel>Date de naissance</FieldLabel>
                          <Input
                            type="date"
                            value={patientData.dateOfBirth}
                            onChange={(event) =>
                              setPatientData((current) => ({
                                ...current,
                                dateOfBirth: event.target.value,
                              }))
                            }
                          />
                        </Field>
                      </FieldGroup>
                    )}
                  </CardContent>
                </Card>

                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Propriétaire</CardTitle>
                    <CardDescription>
                      Coordonnées et liaison du responsable du dossier.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!isEditing ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <ReadOnlyDetail
                          label="Nom complet"
                          value={formatOwnerName(currentOwner)}
                        />
                        <ReadOnlyDetail
                          label="Téléphone"
                          value={currentOwner?.phone || "Non renseigné"}
                        />
                        <ReadOnlyDetail
                          label="Email"
                          value={currentOwner?.email || "Non renseigné"}
                        />
                        <ReadOnlyDetail
                          label="Adresse"
                          value={
                            [currentOwner?.address, currentOwner?.city]
                              .filter(Boolean)
                              .join(", ") || "Non renseignée"
                          }
                        />
                      </div>
                    ) : (
                      <FieldGroup>
                        <Field>
                          <FieldLabel>Propriétaire lié</FieldLabel>
                          <NativeSelect
                            value={selectedOwnerId}
                            onChange={(event) =>
                              setSelectedOwnerId(event.target.value)
                            }
                            className="w-full"
                          >
                            {allOwners.map((entry) => (
                              <NativeSelectOption
                                key={entry.id}
                                value={entry.id}
                              >
                                {formatOwnerName(entry)} · {entry.phone}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                          <FieldDescription>
                            Le patient restera rattaché au propriétaire
                            sélectionné.
                          </FieldDescription>
                        </Field>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field>
                            <FieldLabel>Nom</FieldLabel>
                            <Input
                              value={ownerData.lastName || ""}
                              onChange={(event) =>
                                setOwnerData((current) => ({
                                  ...current,
                                  lastName: event.target.value,
                                }))
                              }
                            />
                          </Field>

                          <Field>
                            <FieldLabel>Prénom</FieldLabel>
                            <Input
                              value={ownerData.firstName || ""}
                              onChange={(event) =>
                                setOwnerData((current) => ({
                                  ...current,
                                  firstName: event.target.value,
                                }))
                              }
                            />
                          </Field>

                          <Field>
                            <FieldLabel>Téléphone</FieldLabel>
                            <Input
                              value={ownerData.phone || ""}
                              onChange={(event) =>
                                setOwnerData((current) => ({
                                  ...current,
                                  phone: event.target.value,
                                }))
                              }
                            />
                          </Field>

                          <Field>
                            <FieldLabel>Email</FieldLabel>
                            <Input
                              type="email"
                              value={ownerData.email || ""}
                              onChange={(event) =>
                                setOwnerData((current) => ({
                                  ...current,
                                  email: event.target.value,
                                }))
                              }
                            />
                          </Field>
                        </div>

                        <Field>
                          <FieldLabel>Adresse</FieldLabel>
                          <Input
                            value={ownerData.address || ""}
                            onChange={(event) =>
                              setOwnerData((current) => ({
                                ...current,
                                address: event.target.value,
                              }))
                            }
                          />
                        </Field>

                        <Field>
                          <FieldLabel>Ville</FieldLabel>
                          <Input
                            value={ownerData.city || ""}
                            onChange={(event) =>
                              setOwnerData((current) => ({
                                ...current,
                                city: event.target.value,
                              }))
                            }
                          />
                        </Field>
                      </FieldGroup>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="medical">
              <div className="grid gap-4">
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Alertes médicales</CardTitle>
                    <CardDescription>
                      Allergies, contre-indications et informations de suivi.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <Field>
                        <FieldLabel>Allergies et contre-indications</FieldLabel>
                        <Textarea
                          className="min-h-[120px]"
                          value={patientData.allergies}
                          onChange={(event) =>
                            setPatientData((current) => ({
                              ...current,
                              allergies: event.target.value,
                            }))
                          }
                          readOnly={!isEditing}
                          placeholder="Aucune allergie connue"
                        />
                      </Field>

                      <Field>
                        <FieldLabel>Maladies chroniques</FieldLabel>
                        <Textarea
                          className="min-h-[120px]"
                          value={patientData.chronicConditions}
                          onChange={(event) =>
                            setPatientData((current) => ({
                              ...current,
                              chronicConditions: event.target.value,
                            }))
                          }
                          readOnly={!isEditing}
                          placeholder="Aucune maladie chronique"
                        />
                      </Field>

                      <Field>
                        <FieldLabel>Notes générales</FieldLabel>
                        <Textarea
                          className="min-h-[160px]"
                          value={patientData.generalNotes}
                          onChange={(event) =>
                            setPatientData((current) => ({
                              ...current,
                              generalNotes: event.target.value,
                            }))
                          }
                          readOnly={!isEditing}
                          placeholder="Observations, habitudes, précautions..."
                        />
                      </Field>
                    </FieldGroup>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history">
              {history.length === 0 ? (
                <Empty className="border border-dashed border-border/80 bg-muted/20">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} />
                    </EmptyMedia>
                    <EmptyTitle>Aucun historique clinique</EmptyTitle>
                    <EmptyDescription>
                      Ce dossier ne contient pas encore de consultation ou de
                      visite archivée.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="grid gap-4">
                  {history.map((appointment, index) => {
                    const statusMeta =
                      APPOINTMENT_STATUS_META[appointment.status]
                    const veterinarian = usersById.get(appointment.vetId)

                    return (
                      <Card key={appointment.id} size="sm">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <CardDescription>
                                Visite {history.length - index}
                              </CardDescription>
                              <CardTitle className="text-xl tracking-[-0.04em]">
                                {formatPatientLongDate(appointment.startTime)}
                              </CardTitle>
                            </div>
                            <Badge
                              variant="outline"
                              className={statusMeta.className}
                            >
                              {statusMeta.label}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                          <ReadOnlyDetail
                            label="Créneau"
                            value={formatVisitTimeRange(
                              appointment.startTime,
                              appointment.endTime
                            )}
                          />
                          <ReadOnlyDetail
                            label="Type"
                            value={appointment.type}
                          />
                          <ReadOnlyDetail
                            label="Vétérinaire"
                            value={
                              veterinarian?.displayName ||
                              "Vétérinaire non assigné"
                            }
                          />
                          <ReadOnlyDetail
                            label="Motif"
                            value={
                              appointment.reason ||
                              appointment.title ||
                              "Motif non renseigné"
                            }
                          />
                          <ReadOnlyDetail
                            label="Diagnostic"
                            value={
                              appointment.diagnosis || "Aucun diagnostic saisi."
                            }
                          />
                          <ReadOnlyDetail
                            label="Traitement"
                            value={
                              appointment.treatment ||
                              "Aucun traitement enregistré."
                            }
                          />
                          <div className="md:col-span-2">
                            <ReadOnlyDetail
                              label="Notes"
                              value={
                                appointment.notes ||
                                "Aucune note complémentaire."
                              }
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {isEditing ? (
          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveAll} disabled={isSaving}>
              {isSaving ? (
                <Spinner className="size-4" />
              ) : (
                <HugeiconsIcon
                  icon={SaveIcon}
                  strokeWidth={2}
                  data-icon="inline-start"
                />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function PatientCreateDialog({
  open,
  owners,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  owners: Owner[]
  onOpenChange: (open: boolean) => void
  onCreate: (payload: {
    selectedOwnerId: string | null
    owner: Partial<Owner>
    patient: Partial<Patient>
  }) => Promise<void>
}) {
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("new")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newOwner, setNewOwner] = useState<Partial<Owner>>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
    city: "Alger",
  })
  const [newPatient, setNewPatient] = useState<Partial<Patient>>({
    name: "",
    species: "",
    breed: "",
    sex: "M",
    status: "sante",
  })

  useEffect(() => {
    if (!open) {
      setSelectedOwnerId("new")
      setIsSubmitting(false)
      setNewOwner({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        address: "",
        city: "Alger",
      })
      setNewPatient({
        name: "",
        species: "",
        breed: "",
        sex: "M",
        status: "sante",
      })
    }
  }, [open])

  useEffect(() => {
    if (selectedOwnerId === "new") {
      return
    }

    const linkedOwner = owners.find((entry) => entry.id === selectedOwnerId)
    if (linkedOwner) {
      setNewOwner({ ...linkedOwner })
    }
  }, [owners, selectedOwnerId])

  const breedSuggestions = useMemo(
    () => getBreedSuggestions(newPatient.species),
    [newPatient.species]
  )

  const handleCreate = useCallback(async () => {
    if (!newPatient.name?.trim()) {
      toast.error("Le nom du patient est obligatoire.")
      return
    }

    if (selectedOwnerId === "new" && !newOwner.lastName?.trim()) {
      toast.error("Le nom du propriétaire est obligatoire.")
      return
    }

    if (selectedOwnerId === "new" && !newOwner.phone?.trim()) {
      toast.error("Le téléphone du propriétaire est obligatoire.")
      return
    }

    setIsSubmitting(true)

    try {
      await onCreate({
        selectedOwnerId: selectedOwnerId === "new" ? null : selectedOwnerId,
        owner: newOwner,
        patient: newPatient,
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [newPatient, selectedOwnerId, newOwner, onCreate])

  const ownerOptions = useMemo(
    () =>
      owners
        .slice()
        .sort((left, right) =>
          formatOwnerName(left).localeCompare(formatOwnerName(right), "fr")
        ),
    [owners]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[min(940px,calc(100%-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-[min(940px,calc(100%-2rem))]">
        <DialogHeader className="shrink-0 border-b px-6 py-5">
          <DialogTitle className="text-2xl tracking-[-0.05em]">
            Nouveau patient
          </DialogTitle>
          <DialogDescription>
            Créez un nouveau dossier patient en le rattachant à un propriétaire
            existant ou à un nouveau contact.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-6 py-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Propriétaire</CardTitle>
                <CardDescription>
                  Choisissez un contact existant ou renseignez un nouveau
                  propriétaire.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel>Propriétaire existant</FieldLabel>
                    <NativeSelect
                      value={selectedOwnerId}
                      onChange={(event) =>
                        setSelectedOwnerId(event.target.value)
                      }
                      className="w-full"
                    >
                      <NativeSelectOption value="new">
                        Créer un nouveau propriétaire
                      </NativeSelectOption>
                      {ownerOptions.map((owner) => (
                        <NativeSelectOption key={owner.id} value={owner.id}>
                          {formatOwnerName(owner)} · {owner.phone}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <FieldDescription>
                      {selectedOwnerId === "new"
                        ? "Un nouveau propriétaire sera créé avec ce dossier."
                        : "Les informations ci-dessous mettront aussi à jour le propriétaire sélectionné."}
                    </FieldDescription>
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Nom</FieldLabel>
                      <Input
                        value={newOwner.lastName || ""}
                        onChange={(event) =>
                          setNewOwner((current) => ({
                            ...current,
                            lastName: event.target.value,
                          }))
                        }
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Prénom</FieldLabel>
                      <Input
                        value={newOwner.firstName || ""}
                        onChange={(event) =>
                          setNewOwner((current) => ({
                            ...current,
                            firstName: event.target.value,
                          }))
                        }
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Téléphone</FieldLabel>
                      <Input
                        value={newOwner.phone || ""}
                        onChange={(event) =>
                          setNewOwner((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Email</FieldLabel>
                      <Input
                        type="email"
                        value={newOwner.email || ""}
                        onChange={(event) =>
                          setNewOwner((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel>Adresse</FieldLabel>
                    <Input
                      value={newOwner.address || ""}
                      onChange={(event) =>
                        setNewOwner((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Ville</FieldLabel>
                    <Input
                      value={newOwner.city || ""}
                      onChange={(event) =>
                        setNewOwner((current) => ({
                          ...current,
                          city: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle>Patient</CardTitle>
                <CardDescription>
                  Identité et statut initial du dossier.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel>Nom du patient</FieldLabel>
                    <Input
                      value={newPatient.name || ""}
                      onChange={(event) =>
                        setNewPatient((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Espèce</FieldLabel>
                      <Input
                        list="new-patient-species-options"
                        value={newPatient.species || ""}
                        onChange={(event) =>
                          setNewPatient((current) => ({
                            ...current,
                            species: event.target.value,
                          }))
                        }
                        placeholder="Chien, Chat..."
                      />
                      <datalist id="new-patient-species-options">
                        {COMMON_SPECIES.map((species) => (
                          <option key={species} value={species} />
                        ))}
                      </datalist>
                    </Field>

                    <Field>
                      <FieldLabel>Race</FieldLabel>
                      <Input
                        list="new-patient-breed-options"
                        value={newPatient.breed || ""}
                        onChange={(event) =>
                          setNewPatient((current) => ({
                            ...current,
                            breed: event.target.value,
                          }))
                        }
                      />
                      <datalist id="new-patient-breed-options">
                        {breedSuggestions.map((breed) => (
                          <option key={breed} value={breed} />
                        ))}
                      </datalist>
                    </Field>

                    <Field>
                      <FieldLabel>Sexe</FieldLabel>
                      <NativeSelect
                        value={(newPatient.sex || "M") as string}
                        onChange={(event) =>
                          setNewPatient((current) => ({
                            ...current,
                            sex: event.target.value as Patient["sex"],
                          }))
                        }
                        className="w-full"
                      >
                        <NativeSelectOption value="M">Mâle</NativeSelectOption>
                        <NativeSelectOption value="F">
                          Femelle
                        </NativeSelectOption>
                      </NativeSelect>
                    </Field>

                    <Field>
                      <FieldLabel>Statut initial</FieldLabel>
                      <NativeSelect
                        value={(newPatient.status || "sante") as string}
                        onChange={(event) =>
                          setNewPatient((current) => ({
                            ...current,
                            status: event.target.value as Patient["status"],
                          }))
                        }
                        className="w-full"
                      >
                        {PATIENT_STATUS_OPTIONS.map((option) => (
                          <NativeSelectOption
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                  </div>
                </FieldGroup>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={isSubmitting}>
            {isSubmitting ? (
              <Spinner className="size-4" />
            ) : (
              <HugeiconsIcon
                icon={Add01Icon}
                strokeWidth={2}
                data-icon="inline-start"
              />
            )}
            Créer le dossier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const Patients: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [speciesFilter, setSpeciesFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null
  )
  const [detailsInitialTab, setDetailsInitialTab] = useState<DetailsTab>("info")

  const deferredSearchTerm = useDeferredValue(searchTerm)

  const {
    data: patients,
    loading: loadingPatients,
    update: updatePatient,
    createWithOwner,
  } = usePatientsRepository()
  const { data: owners, update: updateOwner } = useOwnersRepository()
  const { data: appointments } = useAppointmentsRepository()

  const ownersMap = useMemo(
    () => new Map(owners.map((owner) => [owner.id, owner])),
    [owners]
  )

  const appointmentsByPatient = useMemo(() => {
    const grouped = new Map<string, Appointment[]>()

    appointments.forEach((appointment) => {
      const current = grouped.get(appointment.patientId) ?? []
      current.push(appointment)
      grouped.set(appointment.patientId, current)
    })

    return grouped
  }, [appointments])

  const visiblePatients = useMemo<PatientRecord[]>(() => {
    const query = deferredSearchTerm.trim().toLowerCase()

    return patients
      .map((patient) => {
        const owner = ownersMap.get(patient.ownerId)
        const patientAppointments = [
          ...(appointmentsByPatient.get(patient.id) ?? []),
        ].sort((left, right) => {
          const leftDate = normalizeDate(left.startTime)?.getTime() ?? 0
          const rightDate = normalizeDate(right.startTime)?.getTime() ?? 0
          return rightDate - leftDate
        })

        const completedAppointments = patientAppointments.filter(
          (appointment) => appointment.status === "completed"
        )

        const upcomingAppointment = patientAppointments
          .filter((appointment) => {
            const date = normalizeDate(appointment.startTime)
            return (
              appointment.status === "scheduled" &&
              !!date &&
              date.getTime() >= Date.now()
            )
          })
          .slice()
          .sort((left, right) => {
            const leftDate = normalizeDate(left.startTime)?.getTime() ?? 0
            const rightDate = normalizeDate(right.startTime)?.getTime() ?? 0
            return leftDate - rightDate
          })[0]

        const lastVisit =
          completedAppointments[0]?.startTime ?? patient.lastVisit
        const searchIndex = [
          patient.name,
          patient.species,
          patient.breed,
          owner?.firstName,
          owner?.lastName,
          owner?.phone,
          owner?.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        return {
          patient,
          owner,
          completedAppointments,
          upcomingAppointment,
          lastVisit,
          searchIndex,
        }
      })
      .filter((entry) => {
        if (speciesFilter !== "all" && entry.patient.species !== speciesFilter)
          return false
        if (statusFilter !== "all" && entry.patient.status !== statusFilter)
          return false
        if (query && !entry.searchIndex.includes(query)) return false
        return true
      })
      .sort((left, right) => {
        const leftDate =
          normalizeDate(
            left.upcomingAppointment?.startTime ||
              left.lastVisit ||
              left.patient.createdAt
          )?.getTime() ?? 0
        const rightDate =
          normalizeDate(
            right.upcomingAppointment?.startTime ||
              right.lastVisit ||
              right.patient.createdAt
          )?.getTime() ?? 0
        return rightDate - leftDate
      })
  }, [
    appointmentsByPatient,
    deferredSearchTerm,
    ownersMap,
    patients,
    speciesFilter,
    statusFilter,
  ])

  useEffect(() => {
    if (
      selectedPatientId &&
      !patients.some((patient) => patient.id === selectedPatientId)
    ) {
      setSelectedPatientId(null)
    }
  }, [patients, selectedPatientId])

  // Listen for new patient event from sidebar
  useEffect(() => {
    const handleNewPatient = () => {
      setIsCreateOpen(true)
    }
    window.addEventListener("vetera:new-patient", handleNewPatient)
    return () => {
      window.removeEventListener("vetera:new-patient", handleNewPatient)
    }
  }, [])

  const selectedPatient =
    patients.find((patient) => patient.id === selectedPatientId) ?? null

  const speciesOptions = useMemo(() => {
    return Array.from(
      new Set(patients.map((patient) => patient.species).filter(Boolean))
    ).sort((left, right) => left.localeCompare(right, "fr"))
  }, [patients])

  const overviewCards = useMemo<PatientOverviewCard[]>(() => {
    const activePatients = patients.filter(
      (patient) => patient.status !== "decede"
    ).length
    const monitoredPatients = patients.filter(
      (patient) =>
        patient.status === "traitement" || patient.status === "hospitalise"
    ).length
    const scheduledPatients = new Set(
      appointments
        .filter((appointment) => {
          const date = normalizeDate(appointment.startTime)
          return (
            appointment.status === "scheduled" &&
            !!date &&
            date.getTime() >= Date.now()
          )
        })
        .map((appointment) => appointment.patientId)
    ).size
    const stalePatients = patients.filter((patient) => {
      const lastVisit = normalizeDate(patient.lastVisit)
      if (!lastVisit) return true
      return Date.now() - lastVisit.getTime() > 1000 * 60 * 60 * 24 * 90
    }).length
    const recentAdmissions = patients.filter((patient) => {
      const createdAt = normalizeDate(patient.createdAt)
      if (!createdAt) return false
      return Date.now() - createdAt.getTime() <= 1000 * 60 * 60 * 24 * 30
    }).length

    return [
      {
        label: "Patients actifs",
        value: String(activePatients),
        meta: `${owners.length} foyers`,
        note: "Patients suivis",
        icon: UserGroupIcon,
        sparklineData: buildPatientSparkline(activePatients, "steady"),
        tone: "blue",
      },
      {
        label: "Suivi clinique",
        value: String(monitoredPatients),
        meta: monitoredPatients > 0 ? "a surveiller" : "stable",
        note: "Traitements en cours",
        icon: HeartPulse,
        sparklineData: buildPatientSparkline(monitoredPatients, "watch"),
        tone: "orange",
      },
      {
        label: "Rendez-vous à venir",
        value: String(scheduledPatients),
        meta: `${recentAdmissions} nouveaux`,
        note: "Prochaines visites",
        icon: CalendarCheckInIcon,
        sparklineData: buildPatientSparkline(scheduledPatients, "rise"),
        tone: "emerald",
      },
      {
        label: "Relances à prévoir",
        value: String(stalePatients),
        meta: "90+ jours",
        note: "Dossiers inactifs",
        icon: Notification02Icon,
        sparklineData: buildPatientSparkline(stalePatients, "stable"),
        tone: "slate",
      },
    ]
  }, [appointments, owners.length, patients])

  const openPatientDetails = (patient: Patient, tab: DetailsTab = "info") => {
    setDetailsInitialTab(tab)
    setSelectedPatientId(patient.id)
  }

  const resetFilters = () => {
    setSearchTerm("")
    setSpeciesFilter("all")
    setStatusFilter("all")
  }

  const handleCreatePatient = useCallback(async ({
    selectedOwnerId,
    owner,
    patient,
  }: {
    selectedOwnerId: string | null
    owner: Partial<Owner>
    patient: Partial<Patient>
  }) => {
    try {
      const createdPatient = await createWithOwner({
        ownerId: selectedOwnerId,
        owner: {
          firstName: owner.firstName || "",
          lastName: owner.lastName || "",
          phone: owner.phone || "",
          email: owner.email || "",
          address: owner.address || "",
          city: owner.city || "",
        },
        patient: {
          name: patient.name || "",
          species: patient.species || "",
          breed: patient.breed || "",
          sex: (patient.sex || "M") as Patient["sex"],
          status: (patient.status || "sante") as Patient["status"],
        },
      })

      if (!createdPatient) {
        throw new Error("La création du patient a échoué.")
      }

      toast.success("Le nouveau dossier patient a été créé.")
      setIsCreateOpen(false)
      setDetailsInitialTab("info")
      setSelectedPatientId(createdPatient.id)
    } catch (error) {
      console.error(error)
      toast.error("Impossible de créer le dossier patient.")
    }
  }, [createWithOwner])

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 pt-4 pb-6 lg:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            Registre patients
          </p>
          <h1 className="text-[28px] font-normal tracking-[-0.04em] text-foreground">
            Dossiers patients
          </h1>
          <p className="max-w-[72ch] text-sm text-muted-foreground">
            {patients.length} dossier{patients.length > 1 ? "s" : ""} centralisé{patients.length > 1 ? "s" : ""} pour garder la consultation,
            le suivi clinique et le contact propriétaire dans la même interface.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="h-10 rounded-xl px-4" onClick={resetFilters}>
            Réinitialiser
          </Button>
          <Button className="h-10 rounded-xl px-4" onClick={() => setIsCreateOpen(true)}>
            <HugeiconsIcon
              icon={Add01Icon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            Nouveau patient
          </Button>
        </div>
      </div>

      <PatientOverviewStrip items={overviewCards} />

      <div className="min-h-0 flex-1">
        <Card className="min-h-[640px] rounded-[24px] border border-border bg-card shadow-none">
          <CardHeader className="border-b border-border px-6 py-5">
            <CardDescription className="font-mono text-[10px] uppercase tracking-[0.06em]">
              Registre clinique
            </CardDescription>
            <CardTitle className="text-[22px] font-normal tracking-[-0.04em]">
              Tableau des dossiers patients
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {visiblePatients.length} visible
                {visiblePatients.length > 1 ? "s" : ""}
              </Badge>
            </CardAction>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 px-0 pb-0">
            <div className="grid gap-3 px-6 pt-5 lg:grid-cols-[minmax(0,1fr)_200px_220px]">
              <div className="relative">
                <HugeiconsIcon
                  icon={SearchIcon}
                  strokeWidth={2}
                  className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Rechercher un patient, un propriétaire ou un téléphone..."
                  className="h-11 rounded-2xl border-border bg-[var(--color-surface-soft)] pl-11 shadow-none"
                />
              </div>

              <NativeSelect
                value={speciesFilter}
                onChange={(event) => setSpeciesFilter(event.target.value)}
                className="w-full [&>[data-slot=native-select]]:h-11 [&>[data-slot=native-select]]:rounded-2xl [&>[data-slot=native-select]]:border-border [&>[data-slot=native-select]]:bg-[var(--color-surface-soft)] [&>[data-slot=native-select]]:pl-4"
              >
                <NativeSelectOption value="all">
                  Toutes les espèces
                </NativeSelectOption>
                {speciesOptions.map((species) => (
                  <NativeSelectOption key={species} value={species}>
                    {species}
                  </NativeSelectOption>
                ))}
              </NativeSelect>

              <NativeSelect
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full [&>[data-slot=native-select]]:h-11 [&>[data-slot=native-select]]:rounded-2xl [&>[data-slot=native-select]]:border-border [&>[data-slot=native-select]]:bg-[var(--color-surface-soft)] [&>[data-slot=native-select]]:pl-4"
              >
                <NativeSelectOption value="all">
                  Tous les statuts
                </NativeSelectOption>
                {PATIENT_STATUS_OPTIONS.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            {loadingPatients ? (
              <div className="flex flex-1 flex-col gap-3 px-6 pb-6">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Skeleton className="h-12 rounded-2xl" />
                  <Skeleton className="h-12 rounded-2xl" />
                  <Skeleton className="h-12 rounded-2xl" />
                  <Skeleton className="h-12 rounded-2xl" />
                </div>
                <div className="overflow-hidden rounded-lg border border-border/70">
                  <div className="space-y-0">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <div
                        key={`patients-skeleton-row-${index}`}
                        className="grid grid-cols-4 gap-3 border-b border-border/60 p-4 last:border-b-0"
                      >
                        <Skeleton className="h-4 w-3/4 rounded-md" />
                        <Skeleton className="h-4 w-2/3 rounded-md" />
                        <Skeleton className="h-4 w-1/2 rounded-md" />
                        <Skeleton className="h-4 w-16 rounded-md justify-self-end" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : visiblePatients.length === 0 ? (
              <div className="flex flex-1 px-6 pb-6">
                <Empty className="border border-dashed border-border/80 bg-muted/20">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <HugeiconsIcon icon={BirdIcon} strokeWidth={2} />
                    </EmptyMedia>
                    <EmptyTitle>Aucun dossier dans cette vue</EmptyTitle>
                    <EmptyDescription>
                      Ajustez la recherche ou les filtres, ou créez un nouveau
                      patient pour enrichir la base.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent className="sm:flex-row">
                    <Button variant="outline" onClick={resetFilters}>
                      Réinitialiser les filtres
                    </Button>
                    <Button onClick={() => setIsCreateOpen(true)}>
                      <HugeiconsIcon
                        icon={Add01Icon}
                        strokeWidth={2}
                        data-icon="inline-start"
                      />
                      Nouveau patient
                    </Button>
                  </EmptyContent>
                </Empty>
              </div>
            ) : (
              <div className="px-6 pb-6">
                <div className="overflow-hidden rounded-[18px] border border-border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Propriétaire</TableHead>
                        <TableHead>Profil</TableHead>
                        <TableHead>Dernière visite</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="pl-6 text-left">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visiblePatients.map((entry) => {
                        return (
                          <TableRow
                            key={entry.patient.id}
                            className="cursor-pointer transition-colors hover:bg-[var(--color-surface-soft)]"
                            onClick={() =>
                              openPatientDetails(entry.patient, "info")
                            }
                          >
                            <TableCell className="min-w-[220px] pl-10">
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "flex size-10 items-center justify-center rounded-2xl text-xl",
                                    getSpeciesTone(entry.patient.species)
                                  )}
                                >
                                  {getSpeciesIcon(entry.patient.species)}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-foreground">
                                    {entry.patient.name}
                                  </p>
                                  <p className="truncate text-sm text-muted-foreground">
                                    {getAgeLabel(entry.patient.dateOfBirth)}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="min-w-[180px]">
                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">
                                  {formatOwnerName(entry.owner)}
                                </p>
                                <p className="truncate text-sm text-muted-foreground">
                                  {entry.owner?.phone ||
                                    "Téléphone non renseigné"}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell className="min-w-[220px]">
                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">
                                  {entry.patient.species}
                                  {entry.patient.breed
                                    ? ` · ${entry.patient.breed}`
                                    : ""}
                                </p>
                                <p className="truncate text-sm text-muted-foreground">
                                  {entry.upcomingAppointment
                                    ? `RDV ${formatPatientDate(entry.upcomingAppointment.startTime)}`
                                    : `${entry.completedAppointments.length} visite${entry.completedAppointments.length > 1 ? "s" : ""} archivée${entry.completedAppointments.length > 1 ? "s" : ""}`}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell>
                              {formatPatientDate(entry.lastVisit)}
                            </TableCell>

                            <TableCell>
                              <PatientStatusBadge
                                status={entry.patient.status}
                              />
                            </TableCell>

                            <TableCell className="pl-6 text-left">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="justify-start px-0"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  openPatientDetails(entry.patient, "info")
                                }}
                              >
                                Consulter
                              </Button>
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
      </div>

      {selectedPatient ? (
        <PatientDetailsDialog
          patient={selectedPatient}
          owner={ownersMap.get(selectedPatient.ownerId)}
          allOwners={owners}
          appointments={appointments}
          initialTab={detailsInitialTab}
          onClose={() => setSelectedPatientId(null)}
          onUpdatePatient={updatePatient}
          onUpdateOwner={updateOwner}
        />
      ) : null}

      <PatientCreateDialog
        open={isCreateOpen}
        owners={owners}
        onOpenChange={setIsCreateOpen}
        onCreate={handleCreatePatient}
      />
    </div>
  )
}

export default React.memo(Patients)
