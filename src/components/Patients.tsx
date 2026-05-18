import {
  Add01Icon,
  BirdIcon,
  Calendar01Icon,
  CalendarCheckInIcon,
  CheckmarkCircle02Icon,
  Edit01Icon,
  HeartPulse,
  Notification02Icon,
  SaveIcon,
  SearchIcon,
  StethoscopeIcon,
  UserGroupIcon,
  WorkHistoryIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Sparkline } from "@/components/ui/sparkline";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useUsersRepository,
} from "@/data/repositories";
import { cn } from "@/lib/utils";
import type { Appointment, Owner, Patient } from "@/types/db";

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
];

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
];

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
];

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
];

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
} satisfies Record<Appointment["status"], { label: string; className: string }>;

type DetailsTab = "info" | "medical" | "history";

type PatientRecord = {
  patient: Patient;
  owner?: Owner;
  completedAppointments: Appointment[];
  upcomingAppointment?: Appointment;
  lastVisit?: string;
  searchIndex: string;
};

const PATIENTS_PAGE_SIZE = 12;

function normalizeDate(value?: string | Date | null) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatOwnerName(owner?: Owner) {
  if (!owner) {
    return "Propriétaire inconnu";
  }
  return (
    `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
    "Propriétaire inconnu"
  );
}

function formatPatientDate(value?: string) {
  const date = normalizeDate(value);
  if (!date) {
    return "Non renseigné";
  }
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPatientDateTime(value?: string) {
  const date = normalizeDate(value);
  if (!date) {
    return "Non planifié";
  }
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPatientLongDate(value?: string) {
  const date = normalizeDate(value);
  if (!date) {
    return "Date indisponible";
  }
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatVisitTimeRange(start?: string, end?: string) {
  const startDate = normalizeDate(start);
  const endDate = normalizeDate(end);
  if (!startDate) {
    return "Heure indisponible";
  }

  const startLabel = startDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (!endDate) {
    return startLabel;
  }

  const endLabel = endDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${startLabel} - ${endLabel}`;
}

function getAgeLabel(value?: string) {
  const date = normalizeDate(value);
  if (!date) {
    return "Âge non renseigné";
  }

  const now = new Date();
  let years = now.getFullYear() - date.getFullYear();
  let months = now.getMonth() - date.getMonth();

  if (months < 0 || (months === 0 && now.getDate() < date.getDate())) {
    years -= 1;
    months += 12;
  }

  if (years > 0) {
    return `${years} an${years > 1 ? "s" : ""}`;
  }
  if (months > 0) {
    return `${months} mois`;
  }

  const days = Math.max(
    1,
    Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  );

  return `${days} jour${days > 1 ? "s" : ""}`;
}

function getStatusMeta(status: Patient["status"]) {
  return (
    PATIENT_STATUS_OPTIONS.find((option) => option.value === status) ??
    PATIENT_STATUS_OPTIONS[0]
  );
}

function getSpeciesTone(species?: string) {
  const normalized = species?.toLowerCase() ?? "";

  if (normalized.includes("chien")) {
    return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
  }

  if (normalized.includes("chat")) {
    return "bg-violet-500/10 text-violet-700 dark:text-violet-300";
  }

  if (normalized.includes("nac")) {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  return "bg-muted text-muted-foreground";
}

function getSpeciesIcon(species?: string): string {
  const normalized = species?.toLowerCase() ?? "";

  if (normalized.includes("chien")) {
    return "🐕";
  }

  if (normalized.includes("chat")) {
    return "🐱";
  }

  if (normalized.includes("nac")) {
    return "🐹";
  }

  if (normalized.includes("cheval")) {
    return "🐴";
  }

  if (normalized.includes("lapin")) {
    return "🐰";
  }

  if (normalized.includes("oiseau")) {
    return "🐦";
  }

  return "🐾"; // Icône par défaut
}

function getBreedSuggestions(species?: string) {
  const normalized = species?.toLowerCase() ?? "";
  if (normalized.includes("chien")) {
    return DOG_BREEDS;
  }
  if (normalized.includes("chat")) {
    return CAT_BREEDS;
  }
  return [];
}

function PatientStatusBadge({ status }: { status: Patient["status"] }) {
  const meta = getStatusMeta(status);

  return (
    <Badge className={meta.className} variant="secondary">
      {meta.label}
    </Badge>
  );
}

type PatientOverviewCard = {
  label: string;
  value: string;
  meta: string;
  note: string;
  icon: typeof UserGroupIcon;
  tone: "blue" | "orange" | "emerald" | "slate";
  sparklineData: number[];
};

const patientToneMap: Record<
  PatientOverviewCard["tone"],
  { bg: string; text: string; spark: string }
> = {
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-600",
    spark: "#3b82f6",
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
};

function buildPatientSparkline(
  base: number,
  pattern: "steady" | "rise" | "watch" | "stable"
) {
  const deltas = {
    steady: [-2, -1, 0, 1, 0, 1, 1, 2],
    rise: [-3, -2, -1, 0, 1, 2, 2, 3],
    watch: [3, 2, 4, 5, 4, 6, 5, 7],
    stable: [1, 1, 0, 1, 0, 1, 0, 0],
  }[pattern];

  return deltas.map((delta) => Math.max(base + delta, 0));
}

function PatientOverviewStrip({ items }: { items: PatientOverviewCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const tone = patientToneMap[item.tone];

        return (
          <Card
            className={cn(
              "card-vibrant overflow-hidden rounded-[24px] border border-border bg-card shadow-none",
              `metric-glow-${item.tone}`
            )}
            key={item.label}
          >
            <CardContent className="flex min-h-[154px] flex-col justify-between p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="font-medium text-[24px] text-foreground tracking-[-0.04em]">
                    {item.value}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="font-mono text-foreground/70">
                      {item.meta}
                    </span>
                    <span className="font-mono text-muted-foreground uppercase tracking-[0.04em]">
                      {item.note}
                    </span>
                  </div>
                </div>
                <div className="prospeo-glyph h-10 w-10 shrink-0">
                  <HugeiconsIcon
                    className={cn("size-[18px]", tone.text)}
                    icon={item.icon}
                    strokeWidth={2}
                  />
                </div>
              </div>

              <div className="flex items-end justify-between gap-3">
                <p className="max-w-[20ch] text-[12px] text-muted-foreground leading-[1.45]">
                  {item.note}
                </p>
                <Sparkline
                  color={tone.spark}
                  data={item.sparklineData}
                  fillOpacity={0.08}
                  height={28}
                  strokeWidth={2}
                  width={74}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ReadOnlyDetail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border/80 bg-muted/25 p-4 transition-all duration-200 ease-out hover:border-border/60 hover:bg-muted/30 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
        {label}
      </p>
      <div className="mt-2 text-foreground text-sm leading-6">{value}</div>
    </div>
  );
}

function PatientDetailsDialog({
  patient,
  owner,
  allOwners,
  appointments,
  initialTab,
  onClose,
  onSaved,
  onUpdatePatient,
  onUpdateOwner,
}: {
  patient: Patient;
  owner?: Owner;
  allOwners: Owner[];
  appointments: Appointment[];
  initialTab: DetailsTab;
  onClose: () => void;
  onSaved?: (patientId: string) => void;
  onUpdatePatient: (id: string, data: Partial<Patient>) => Promise<boolean>;
  onUpdateOwner: (id: string, data: Partial<Owner>) => Promise<boolean>;
}) {
  const [activeTab, setActiveTab] = useState<DetailsTab>(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { data: users } = useUsersRepository();

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
  });

  const [selectedOwnerId, setSelectedOwnerId] = useState(patient.ownerId);
  const [ownerData, setOwnerData] = useState<Partial<Owner>>(
    owner ? { ...owner } : {}
  );

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, patient.id]);

  useEffect(() => {
    setIsEditing(false);
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
    });
    setSelectedOwnerId(patient.ownerId);
    setOwnerData(owner ? { ...owner } : {});
  }, [owner, patient]);

  useEffect(() => {
    const linkedOwner = allOwners.find((entry) => entry.id === selectedOwnerId);
    if (linkedOwner) {
      setOwnerData({ ...linkedOwner });
    }
  }, [allOwners, selectedOwnerId]);

  const history = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.patientId === patient.id)
        .slice()
        .sort((left, right) => {
          const leftDate = normalizeDate(left.startTime)?.getTime() ?? 0;
          const rightDate = normalizeDate(right.startTime)?.getTime() ?? 0;
          return rightDate - leftDate;
        }),
    [appointments, patient.id]
  );

  const currentOwner = useMemo(
    () => allOwners.find((entry) => entry.id === selectedOwnerId),
    [allOwners, selectedOwnerId]
  );

  const usersById = useMemo(
    () => new Map(users.map((entry) => [entry.id, entry])),
    [users]
  );

  const breedSuggestions = useMemo(
    () => getBreedSuggestions(patientData.species),
    [patientData.species]
  );

  const upcomingAppointment = useMemo(
    () =>
      history
        .filter((appointment) => {
          const date = normalizeDate(appointment.startTime);
          return (
            appointment.status === "scheduled" &&
            !!date &&
            date.getTime() >= Date.now()
          );
        })
        .slice()
        .sort((left, right) => {
          const leftDate = normalizeDate(left.startTime)?.getTime() ?? 0;
          const rightDate = normalizeDate(right.startTime)?.getTime() ?? 0;
          return leftDate - rightDate;
        })[0],
    [history]
  );

  const handleSaveAll = useCallback(async () => {
    if (!patientData.name.trim()) {
      toast.error("Le nom du patient est obligatoire.");
      return;
    }

    if (!selectedOwnerId) {
      toast.error("Le patient doit rester lié à un propriétaire.");
      return;
    }

    setIsSaving(true);

    try {
      const patientUpdated = await onUpdatePatient(patient.id, {
        ...patientData,
        ownerId: selectedOwnerId,
        breed: patientData.breed || undefined,
        dateOfBirth: patientData.dateOfBirth || undefined,
        allergies: patientData.allergies || undefined,
        chronicConditions: patientData.chronicConditions || undefined,
        generalNotes: patientData.generalNotes || undefined,
      });

      if (!patientUpdated) {
        throw new Error("La mise à jour du patient a échoué.");
      }

      const ownerUpdated = await onUpdateOwner(selectedOwnerId, {
        firstName: ownerData.firstName || "",
        lastName: ownerData.lastName || "",
        phone: ownerData.phone || "",
        email: ownerData.email || undefined,
        address: ownerData.address || undefined,
        city: ownerData.city || undefined,
      });

      if (!ownerUpdated) {
        throw new Error("La mise à jour du propriétaire a échoué.");
      }

      toast.success("Le dossier patient a été mis à jour.");
      setIsEditing(false);
      onSaved?.(patient.id);
    } catch (error) {
      console.error(error);
      toast.error("Impossible d'enregistrer les modifications.");
    } finally {
      setIsSaving(false);
    }
  }, [
    patient.id,
    patientData,
    selectedOwnerId,
    ownerData,
    onSaved,
    onUpdatePatient,
    onUpdateOwner,
  ]);

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
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
                {isEditing ? (
                  <Button disabled={isSaving} onClick={handleSaveAll} size="sm">
                    {isSaving ? (
                      <Spinner className="size-4" />
                    ) : (
                      <HugeiconsIcon
                        data-icon="inline-start"
                        icon={SaveIcon}
                        strokeWidth={2}
                      />
                    )}
                    Enregistrer
                  </Button>
                ) : (
                  <Button
                    onClick={() => setIsEditing(true)}
                    size="sm"
                    variant="outline"
                  >
                    <HugeiconsIcon
                      data-icon="inline-start"
                      icon={Edit01Icon}
                      strokeWidth={2}
                    />
                    Modifier
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-3xl bg-muted p-4 transition-all duration-200 ease-out hover:bg-muted/60 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
                  Dernière visite
                </p>
                <p className="mt-3 font-semibold text-foreground text-lg tracking-[-0.03em]">
                  {formatPatientDate(patient.lastVisit)}
                </p>
                <p className="mt-1 text-muted-foreground text-sm">
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

              <div className="rounded-3xl bg-muted p-4 transition-all duration-200 ease-out hover:bg-muted/60 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
                  Prochain créneau
                </p>
                <p className="mt-3 font-semibold text-foreground text-lg tracking-[-0.03em]">
                  {upcomingAppointment
                    ? formatPatientDateTime(upcomingAppointment.startTime)
                    : "Aucun rendez-vous"}
                </p>
                <p className="mt-1 text-muted-foreground text-sm">
                  {upcomingAppointment
                    ? upcomingAppointment.type
                    : "Aucune venue planifiée pour ce patient."}
                </p>
              </div>

              <div className="rounded-3xl bg-muted p-4 transition-all duration-200 ease-out hover:bg-muted/60 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
                  Repère clinique
                </p>
                <p className="mt-3 font-semibold text-foreground text-lg tracking-[-0.03em]">
                  {patient.allergies
                    ? "Allergies à surveiller"
                    : patient.chronicConditions
                      ? "Suivi chronique"
                      : "Rien à signaler"}
                </p>
                <p className="mt-1 text-muted-foreground text-sm">
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
            className="gap-5"
            onValueChange={(value) => setActiveTab(value as DetailsTab)}
            value={activeTab}
          >
            <TabsList
              className="w-full justify-start rounded-lg border-b bg-background/50 p-1 backdrop-blur"
              variant="line"
            >
              <TabsTrigger
                className="rounded-md px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                value="info"
              >
                <HugeiconsIcon
                  className="mr-2 size-4"
                  icon={BirdIcon}
                  strokeWidth={2}
                />
                Informations
              </TabsTrigger>
              <TabsTrigger
                className="rounded-md px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                value="medical"
              >
                <HugeiconsIcon
                  className="mr-2 size-4"
                  icon={StethoscopeIcon}
                  strokeWidth={2}
                />
                Dossier médical
              </TabsTrigger>
              <TabsTrigger
                className="rounded-md px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                value="history"
              >
                <HugeiconsIcon
                  className="mr-2 size-4"
                  icon={WorkHistoryIcon}
                  strokeWidth={2}
                />
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
                    {isEditing ? (
                      <FieldGroup>
                        <Field>
                          <FieldLabel>Nom</FieldLabel>
                          <Input
                            onChange={(event) =>
                              setPatientData((current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                            value={patientData.name}
                          />
                        </Field>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field>
                            <FieldLabel>Espèce</FieldLabel>
                            <Input
                              list="patient-species-options"
                              onChange={(event) =>
                                setPatientData((current) => ({
                                  ...current,
                                  species: event.target.value,
                                }))
                              }
                              placeholder="Chien, Chat..."
                              value={patientData.species}
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
                              onChange={(event) =>
                                setPatientData((current) => ({
                                  ...current,
                                  breed: event.target.value,
                                }))
                              }
                              placeholder="Race"
                              value={patientData.breed}
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
                              className="w-full"
                              onChange={(event) =>
                                setPatientData((current) => ({
                                  ...current,
                                  sex: event.target.value as Patient["sex"],
                                }))
                              }
                              value={patientData.sex}
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
                              className="w-full"
                              onChange={(event) =>
                                setPatientData((current) => ({
                                  ...current,
                                  status: event.target
                                    .value as Patient["status"],
                                }))
                              }
                              value={patientData.status}
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
                            onChange={(event) =>
                              setPatientData((current) => ({
                                ...current,
                                dateOfBirth: event.target.value,
                              }))
                            }
                            type="date"
                            value={patientData.dateOfBirth}
                          />
                        </Field>
                      </FieldGroup>
                    ) : (
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
                    {isEditing ? (
                      <FieldGroup>
                        <Field>
                          <FieldLabel>Propriétaire lié</FieldLabel>
                          <NativeSelect
                            className="w-full"
                            onChange={(event) =>
                              setSelectedOwnerId(event.target.value)
                            }
                            value={selectedOwnerId}
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
                              onChange={(event) =>
                                setOwnerData((current) => ({
                                  ...current,
                                  lastName: event.target.value,
                                }))
                              }
                              value={ownerData.lastName || ""}
                            />
                          </Field>

                          <Field>
                            <FieldLabel>Prénom</FieldLabel>
                            <Input
                              onChange={(event) =>
                                setOwnerData((current) => ({
                                  ...current,
                                  firstName: event.target.value,
                                }))
                              }
                              value={ownerData.firstName || ""}
                            />
                          </Field>

                          <Field>
                            <FieldLabel>Téléphone</FieldLabel>
                            <Input
                              onChange={(event) =>
                                setOwnerData((current) => ({
                                  ...current,
                                  phone: event.target.value,
                                }))
                              }
                              value={ownerData.phone || ""}
                            />
                          </Field>

                          <Field>
                            <FieldLabel>Email</FieldLabel>
                            <Input
                              onChange={(event) =>
                                setOwnerData((current) => ({
                                  ...current,
                                  email: event.target.value,
                                }))
                              }
                              type="email"
                              value={ownerData.email || ""}
                            />
                          </Field>
                        </div>

                        <Field>
                          <FieldLabel>Adresse</FieldLabel>
                          <Input
                            onChange={(event) =>
                              setOwnerData((current) => ({
                                ...current,
                                address: event.target.value,
                              }))
                            }
                            value={ownerData.address || ""}
                          />
                        </Field>

                        <Field>
                          <FieldLabel>Ville</FieldLabel>
                          <Input
                            onChange={(event) =>
                              setOwnerData((current) => ({
                                ...current,
                                city: event.target.value,
                              }))
                            }
                            value={ownerData.city || ""}
                          />
                        </Field>
                      </FieldGroup>
                    ) : (
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
                          onChange={(event) =>
                            setPatientData((current) => ({
                              ...current,
                              allergies: event.target.value,
                            }))
                          }
                          placeholder="Aucune allergie connue"
                          readOnly={!isEditing}
                          value={patientData.allergies}
                        />
                      </Field>

                      <Field>
                        <FieldLabel>Maladies chroniques</FieldLabel>
                        <Textarea
                          className="min-h-[120px]"
                          onChange={(event) =>
                            setPatientData((current) => ({
                              ...current,
                              chronicConditions: event.target.value,
                            }))
                          }
                          placeholder="Aucune maladie chronique"
                          readOnly={!isEditing}
                          value={patientData.chronicConditions}
                        />
                      </Field>

                      <Field>
                        <FieldLabel>Notes générales</FieldLabel>
                        <Textarea
                          className="min-h-[160px]"
                          onChange={(event) =>
                            setPatientData((current) => ({
                              ...current,
                              generalNotes: event.target.value,
                            }))
                          }
                          placeholder="Observations, habitudes, précautions..."
                          readOnly={!isEditing}
                          value={patientData.generalNotes}
                        />
                      </Field>
                    </FieldGroup>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history">
              {history.length === 0 ? (
                <Empty className="border border-border/80 border-dashed bg-muted/20">
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
                      APPOINTMENT_STATUS_META[appointment.status];
                    const veterinarian = usersById.get(appointment.vetId);

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
                              className={statusMeta.className}
                              variant="outline"
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
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {isEditing ? (
          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button onClick={() => setIsEditing(false)} variant="outline">
              Annuler
            </Button>
            <Button disabled={isSaving} onClick={handleSaveAll}>
              {isSaving ? (
                <Spinner className="size-4" />
              ) : (
                <HugeiconsIcon
                  data-icon="inline-start"
                  icon={SaveIcon}
                  strokeWidth={2}
                />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PatientCreateDialog({
  open,
  owners,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  owners: Owner[];
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: {
    selectedOwnerId: string | null;
    owner: Partial<Owner>;
    patient: Partial<Patient>;
  }) => Promise<void>;
}) {
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("new");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [newOwner, setNewOwner] = useState<Partial<Owner>>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
    city: "Alger",
  });
  const [newPatient, setNewPatient] = useState<Partial<Patient>>({
    name: "",
    species: "",
    breed: "",
    sex: "M",
    status: "sante",
  });

  useEffect(() => {
    if (!open) {
      setSelectedOwnerId("new");
      setIsSubmitting(false);
      setFormError("");
      setNewOwner({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        address: "",
        city: "Alger",
      });
      setNewPatient({
        name: "",
        species: "",
        breed: "",
        sex: "M",
        status: "sante",
      });
    }
  }, [open]);

  useEffect(() => {
    if (selectedOwnerId === "new") {
      return;
    }

    const linkedOwner = owners.find((entry) => entry.id === selectedOwnerId);
    if (linkedOwner) {
      setNewOwner({ ...linkedOwner });
    }
  }, [owners, selectedOwnerId]);

  const breedSuggestions = useMemo(
    () => getBreedSuggestions(newPatient.species),
    [newPatient.species]
  );

  const handleCreate = useCallback(async () => {
    setFormError("");

    if (!newPatient.name?.trim()) {
      const message = "Le nom du patient est obligatoire.";
      setFormError(message);
      toast.error(message);
      return;
    }

    if (!newPatient.species?.trim()) {
      const message = "L'espèce du patient est obligatoire.";
      setFormError(message);
      toast.error(message);
      return;
    }

    if (selectedOwnerId === "new" && !newOwner.lastName?.trim()) {
      const message = "Le nom du propriétaire est obligatoire.";
      setFormError(message);
      toast.error(message);
      return;
    }

    if (selectedOwnerId === "new" && !newOwner.phone?.trim()) {
      const message = "Le téléphone du propriétaire est obligatoire.";
      setFormError(message);
      toast.error(message);
      return;
    }

    setIsSubmitting(true);

    try {
      await onCreate({
        selectedOwnerId: selectedOwnerId === "new" ? null : selectedOwnerId,
        owner: selectedOwnerId === "new" ? newOwner : {},
        patient: newPatient,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de créer le dossier patient.";
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [newPatient, selectedOwnerId, newOwner, onCreate]);

  const ownerOptions = useMemo(
    () =>
      owners
        .slice()
        .sort((left, right) =>
          formatOwnerName(left).localeCompare(formatOwnerName(right), "fr")
        ),
    [owners]
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="modal-medical-shell max-h-[calc(100dvh-2rem)] max-w-[min(940px,calc(100%-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-[min(940px,calc(100%-2rem))]">
        <DialogHeader className="modal-medical-header shrink-0 border-b px-6 py-5">
          <DialogTitle className="text-2xl tracking-[-0.05em]">
            Nouveau patient
          </DialogTitle>
          <DialogDescription>
            Créez un nouveau dossier patient en le rattachant à un propriétaire
            existant ou à un nouveau contact.
          </DialogDescription>
        </DialogHeader>

        <div className="modal-medical-body min-h-0 overflow-y-auto px-6 py-4">
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
                      className="w-full"
                      onChange={(event) =>
                        setSelectedOwnerId(event.target.value)
                      }
                      value={selectedOwnerId}
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
                        : "Le patient sera rattaché à ce propriétaire (sans modifier sa fiche)."}
                    </FieldDescription>
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Nom</FieldLabel>
                      <Input
                        disabled={selectedOwnerId !== "new"}
                        onChange={(event) =>
                          setNewOwner((current) => ({
                            ...current,
                            lastName: event.target.value,
                          }))
                        }
                        value={newOwner.lastName || ""}
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Prénom</FieldLabel>
                      <Input
                        disabled={selectedOwnerId !== "new"}
                        onChange={(event) =>
                          setNewOwner((current) => ({
                            ...current,
                            firstName: event.target.value,
                          }))
                        }
                        value={newOwner.firstName || ""}
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Téléphone</FieldLabel>
                      <Input
                        disabled={selectedOwnerId !== "new"}
                        onChange={(event) =>
                          setNewOwner((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                        value={newOwner.phone || ""}
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Email</FieldLabel>
                      <Input
                        disabled={selectedOwnerId !== "new"}
                        onChange={(event) =>
                          setNewOwner((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                        type="email"
                        value={newOwner.email || ""}
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel>Adresse</FieldLabel>
                    <Input
                      disabled={selectedOwnerId !== "new"}
                      onChange={(event) =>
                        setNewOwner((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                      value={newOwner.address || ""}
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Ville</FieldLabel>
                    <Input
                      disabled={selectedOwnerId !== "new"}
                      onChange={(event) =>
                        setNewOwner((current) => ({
                          ...current,
                          city: event.target.value,
                        }))
                      }
                      value={newOwner.city || ""}
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
                      onChange={(event) =>
                        setNewPatient((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      value={newPatient.name || ""}
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Espèce</FieldLabel>
                      <Input
                        list="new-patient-species-options"
                        onChange={(event) =>
                          setNewPatient((current) => ({
                            ...current,
                            species: event.target.value,
                          }))
                        }
                        placeholder="Chien, Chat..."
                        value={newPatient.species || ""}
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
                        onChange={(event) =>
                          setNewPatient((current) => ({
                            ...current,
                            breed: event.target.value,
                          }))
                        }
                        value={newPatient.breed || ""}
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
                        className="w-full"
                        onChange={(event) =>
                          setNewPatient((current) => ({
                            ...current,
                            sex: event.target.value as Patient["sex"],
                          }))
                        }
                        value={(newPatient.sex || "M") as string}
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
                        className="w-full"
                        onChange={(event) =>
                          setNewPatient((current) => ({
                            ...current,
                            status: event.target.value as Patient["status"],
                          }))
                        }
                        value={(newPatient.status || "sante") as string}
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

        <DialogFooter className="modal-medical-footer border-t px-6 py-4">
          {formError ? (
            <div className="mr-auto rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
              {formError}
            </div>
          ) : null}
          <Button
            className="min-w-[120px]"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Annuler
          </Button>
          <Button
            className="min-w-[168px]"
            disabled={isSubmitting}
            onClick={handleCreate}
            type="button"
          >
            {isSubmitting ? (
              <Spinner className="size-4" />
            ) : (
              <HugeiconsIcon
                data-icon="inline-start"
                icon={Add01Icon}
                strokeWidth={2}
              />
            )}
            Créer le dossier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const Patients: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [recentOwnersById, setRecentOwnersById] = useState<
    Record<string, Owner>
  >({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdPatientPrompt, setCreatedPatientPrompt] = useState<{
    owner?: Owner;
    patient: Patient;
  } | null>(null);
  const [recentlySavedPatientId, setRecentlySavedPatientId] = useState<
    string | null
  >(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null
  );
  const [detailsInitialTab, setDetailsInitialTab] =
    useState<DetailsTab>("info");

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const {
    data: patients,
    loading: loadingPatients,
    update: updatePatient,
    createWithOwner,
  } = usePatientsRepository();
  const { data: owners, update: updateOwner } = useOwnersRepository();
  const { data: appointments } = useAppointmentsRepository();

  const hydratedOwners = useMemo(() => {
    const merged = new Map<string, Owner>();
    owners.forEach((owner) => merged.set(owner.id, owner));
    Object.values(recentOwnersById).forEach((owner) =>
      merged.set(owner.id, owner)
    );
    return Array.from(merged.values());
  }, [owners, recentOwnersById]);

  const ownersMap = useMemo(
    () => new Map(hydratedOwners.map((owner) => [owner.id, owner])),
    [hydratedOwners]
  );

  const appointmentsByPatient = useMemo(() => {
    const grouped = new Map<string, Appointment[]>();

    appointments.forEach((appointment) => {
      const current = grouped.get(appointment.patientId) ?? [];
      current.push(appointment);
      grouped.set(appointment.patientId, current);
    });

    return grouped;
  }, [appointments]);

  const visiblePatients = useMemo<PatientRecord[]>(() => {
    const query = deferredSearchTerm.trim().toLowerCase();

    return patients
      .map((patient) => {
        const owner = ownersMap.get(patient.ownerId);
        const patientAppointments = [
          ...(appointmentsByPatient.get(patient.id) ?? []),
        ].sort((left, right) => {
          const leftDate = normalizeDate(left.startTime)?.getTime() ?? 0;
          const rightDate = normalizeDate(right.startTime)?.getTime() ?? 0;
          return rightDate - leftDate;
        });

        const completedAppointments = patientAppointments.filter(
          (appointment) => appointment.status === "completed"
        );

        const upcomingAppointment = patientAppointments
          .filter((appointment) => {
            const date = normalizeDate(appointment.startTime);
            return (
              appointment.status === "scheduled" &&
              !!date &&
              date.getTime() >= Date.now()
            );
          })
          .slice()
          .sort((left, right) => {
            const leftDate = normalizeDate(left.startTime)?.getTime() ?? 0;
            const rightDate = normalizeDate(right.startTime)?.getTime() ?? 0;
            return leftDate - rightDate;
          })[0];

        const lastVisit =
          completedAppointments[0]?.startTime ?? patient.lastVisit;
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
          .toLowerCase();

        return {
          patient,
          owner,
          completedAppointments,
          upcomingAppointment,
          lastVisit,
          searchIndex,
        };
      })
      .filter((entry) => {
        if (
          speciesFilter !== "all" &&
          entry.patient.species !== speciesFilter
        ) {
          return false;
        }
        if (statusFilter !== "all" && entry.patient.status !== statusFilter) {
          return false;
        }
        if (query && !entry.searchIndex.includes(query)) {
          return false;
        }
        return true;
      })
      .sort((left, right) => {
        const leftDate =
          normalizeDate(
            left.upcomingAppointment?.startTime ||
              left.lastVisit ||
              left.patient.createdAt
          )?.getTime() ?? 0;
        const rightDate =
          normalizeDate(
            right.upcomingAppointment?.startTime ||
              right.lastVisit ||
              right.patient.createdAt
          )?.getTime() ?? 0;
        return rightDate - leftDate;
      });
  }, [
    appointmentsByPatient,
    deferredSearchTerm,
    ownersMap,
    patients,
    speciesFilter,
    statusFilter,
  ]);

  useEffect(() => {
    if (
      selectedPatientId &&
      !patients.some((patient) => patient.id === selectedPatientId)
    ) {
      setSelectedPatientId(null);
    }
  }, [patients, selectedPatientId]);

  useEffect(() => {
    if (!recentlySavedPatientId) {
      return;
    }

    const patientStillExists = patients.some(
      (patient) => patient.id === recentlySavedPatientId
    );
    if (!patientStillExists) {
      return;
    }

    const patientIsVisible = visiblePatients.some(
      (entry) => entry.patient.id === recentlySavedPatientId
    );

    if (!patientIsVisible) {
      setSearchTerm("");
      setSpeciesFilter("all");
      setStatusFilter("all");
      toast.info(
        "Les filtres ont été réinitialisés pour garder le dossier visible après modification."
      );
    }

    setSelectedPatientId(recentlySavedPatientId);
    setRecentlySavedPatientId(null);
  }, [patients, recentlySavedPatientId, visiblePatients]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchTerm, speciesFilter, statusFilter]);

  // Listen for new patient event from sidebar
  useEffect(() => {
    const handleNewPatient = () => {
      setIsCreateOpen(true);
    };
    window.addEventListener("vetera:new-patient", handleNewPatient);
    return () => {
      window.removeEventListener("vetera:new-patient", handleNewPatient);
    };
  }, []);

  const selectedPatient =
    patients.find((patient) => patient.id === selectedPatientId) ?? null;

  const speciesOptions = useMemo(
    () =>
      Array.from(
        new Set(patients.map((patient) => patient.species).filter(Boolean))
      ).sort((left, right) => left.localeCompare(right, "fr")),
    [patients]
  );

  const overviewCards = useMemo<PatientOverviewCard[]>(() => {
    const activePatients = patients.filter(
      (patient) => patient.status !== "decede"
    ).length;
    const monitoredPatients = patients.filter(
      (patient) =>
        patient.status === "traitement" || patient.status === "hospitalise"
    ).length;
    const scheduledPatients = new Set(
      appointments
        .filter((appointment) => {
          const date = normalizeDate(appointment.startTime);
          return (
            appointment.status === "scheduled" &&
            !!date &&
            date.getTime() >= Date.now()
          );
        })
        .map((appointment) => appointment.patientId)
    ).size;
    const stalePatients = patients.filter((patient) => {
      const lastVisit = normalizeDate(patient.lastVisit);
      if (!lastVisit) {
        return true;
      }
      return Date.now() - lastVisit.getTime() > 1000 * 60 * 60 * 24 * 90;
    }).length;
    const recentAdmissions = patients.filter((patient) => {
      const createdAt = normalizeDate(patient.createdAt);
      if (!createdAt) {
        return false;
      }
      return Date.now() - createdAt.getTime() <= 1000 * 60 * 60 * 24 * 30;
    }).length;

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
    ];
  }, [appointments, hydratedOwners.length, patients]);

  const openPatientDetails = (patient: Patient, tab: DetailsTab = "info") => {
    setDetailsInitialTab(tab);
    setSelectedPatientId(patient.id);
  };

  const handlePatientSaved = useCallback((patientId: string) => {
    window.setTimeout(() => {
      setRecentlySavedPatientId(patientId);
    }, 0);
  }, []);

  const resetFilters = () => {
    setSearchTerm("");
    setSpeciesFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const totalPages = Math.max(
    1,
    Math.ceil(visiblePatients.length / PATIENTS_PAGE_SIZE)
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * PATIENTS_PAGE_SIZE;
    return visiblePatients.slice(start, start + PATIENTS_PAGE_SIZE);
  }, [currentPage, visiblePatients]);

  const pageStart = visiblePatients.length
    ? (currentPage - 1) * PATIENTS_PAGE_SIZE + 1
    : 0;
  const pageEnd = Math.min(
    currentPage * PATIENTS_PAGE_SIZE,
    visiblePatients.length
  );

  const paginationRange = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, totalPages];
    }

    if (currentPage >= totalPages - 2) {
      return [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, currentPage - 1, currentPage, currentPage + 1, totalPages];
  }, [currentPage, totalPages]);

  const createAppointmentForPatient = useCallback((patient: Patient) => {
    const pendingAppointment = {
      ownerId: patient.ownerId,
      patientId: patient.id,
    };

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "vetera:pending-appointment",
        JSON.stringify(pendingAppointment)
      );
      window.location.hash = "#/agenda";
      window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("vetera:new-appointment", {
            detail: pendingAppointment,
          })
        );
      }, 180);
    }

    setCreatedPatientPrompt(null);
  }, []);

  const handleCreatePatient = useCallback(
    async ({
      selectedOwnerId,
      owner,
      patient,
    }: {
      selectedOwnerId: string | null;
      owner: Partial<Owner>;
      patient: Partial<Patient>;
    }) => {
      try {
        const createdBundle = await createWithOwner({
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
        });

        if (!createdBundle?.patient) {
          throw new Error("La création du patient a échoué.");
        }

        toast.success("Dossier patient créé.", {
          description: "Vous pouvez maintenant créer le rendez-vous associé.",
        });
        setIsCreateOpen(false);
        setRecentlySavedPatientId(createdBundle.patient.id);
        const createdOwner = createdBundle.owner;
        if (createdOwner) {
          setRecentOwnersById((current) => ({
            ...current,
            [createdOwner.id]: createdOwner,
          }));
        }
        setCreatedPatientPrompt({
          owner:
            createdBundle.owner ||
            ownersMap.get(createdBundle.patient.ownerId) ||
            (selectedOwnerId ? ownersMap.get(selectedOwnerId) : undefined),
          patient: createdBundle.patient,
        });
      } catch (error) {
        console.error(error);
        const message =
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : "Impossible de créer le dossier patient.";
        if (
          message.toLowerCase().includes("database is locked") ||
          message.toLowerCase().includes("code: 5")
        ) {
          toast.error("Base occupée, réessayez dans quelques secondes.");
        } else {
          toast.error(message);
        }
        throw new Error(message);
      }
    },
    [createWithOwner, ownersMap]
  );

  return (
    <div className="prospeo-dashboard flex w-full min-w-0 flex-col gap-5 px-4 pt-5 pb-16 sm:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-end">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="h-10 rounded-xl px-4"
            onClick={resetFilters}
            variant="outline"
          >
            Réinitialiser
          </Button>
          <Button
            className="h-10 rounded-xl px-4"
            onClick={() => setIsCreateOpen(true)}
          >
            <HugeiconsIcon
              data-icon="inline-start"
              icon={Add01Icon}
              strokeWidth={2}
            />
            Nouveau patient
          </Button>
        </div>
      </div>

      <PatientOverviewStrip items={overviewCards} />

      <div className="min-h-0 flex-1">
        <Card className="card-vibrant card-hover-lift min-h-[640px] rounded-[24px] border border-border bg-card shadow-none">
          <CardHeader className="border-border border-b px-6 py-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full px-3 py-1.5" variant="outline">
                    Registre clinique
                  </Badge>
                  <Badge className="rounded-full border-0 bg-blue-500/8 px-3 py-1.5 text-blue-700 dark:text-blue-300">
                    {visiblePatients.length} dossier
                    {visiblePatients.length > 1 ? "s" : ""} visible
                    {visiblePatients.length > 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <CardTitle className="font-normal text-[24px] tracking-[-0.05em]">
                    Liste des patients
                  </CardTitle>
                  <CardDescription className="max-w-[70ch] text-sm leading-6">
                    Une vue plus claire pour parcourir les dossiers, repérer les
                    patients à suivre et ouvrir rapidement la fiche utile.
                  </CardDescription>
                </div>
              </div>

              <CardAction className="flex flex-wrap items-center gap-2 self-start">
                <Badge className="rounded-full px-3 py-1.5" variant="secondary">
                  Page {currentPage}/{totalPages}
                </Badge>
                <Badge className="rounded-full px-3 py-1.5" variant="outline">
                  {pageStart > 0 ? `${pageStart}-${pageEnd}` : "0"} sur{" "}
                  {visiblePatients.length}
                </Badge>
              </CardAction>
            </div>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 px-0 pb-0">
            <div className="px-6 pt-5">
              <div className="rounded-[22px] border border-border/70 bg-[linear-gradient(180deg,color-mix(in_oklch,white_82%,transparent),color-mix(in_oklch,var(--color-surface-soft)_72%,transparent))] p-3 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.28)] dark:bg-[linear-gradient(180deg,color-mix(in_oklch,var(--color-surface-soft)_65%,transparent),color-mix(in_oklch,var(--color-surface-soft-2)_86%,transparent))]">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                  <div className="relative xl:min-w-0 xl:flex-1">
                    <HugeiconsIcon
                      className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
                      icon={SearchIcon}
                      strokeWidth={2}
                    />
                    <Input
                      className="h-12 rounded-2xl border-border/70 bg-background/88 pl-11 shadow-none"
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Rechercher un patient, un propriétaire ou un téléphone..."
                      value={searchTerm}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:w-[430px]">
                    <NativeSelect
                      className="w-full [&>[data-slot=native-select]]:h-12 [&>[data-slot=native-select]]:rounded-2xl [&>[data-slot=native-select]]:border-border/70 [&>[data-slot=native-select]]:bg-background/88 [&>[data-slot=native-select]]:pl-4"
                      onChange={(event) => setSpeciesFilter(event.target.value)}
                      value={speciesFilter}
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
                      className="w-full [&>[data-slot=native-select]]:h-12 [&>[data-slot=native-select]]:rounded-2xl [&>[data-slot=native-select]]:border-border/70 [&>[data-slot=native-select]]:bg-background/88 [&>[data-slot=native-select]]:pl-4"
                      onChange={(event) => setStatusFilter(event.target.value)}
                      value={statusFilter}
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
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full px-3 py-1.5" variant="secondary">
                    {owners.length} propriétaire
                    {owners.length > 1 ? "s" : ""}
                  </Badge>
                  <Badge className="rounded-full px-3 py-1.5" variant="secondary">
                    {speciesOptions.length} espèce
                    {speciesOptions.length > 1 ? "s" : ""}
                  </Badge>
                  {(searchTerm || speciesFilter !== "all" || statusFilter !== "all") && (
                    <Button
                      className="h-8 rounded-full px-3 text-xs"
                      onClick={resetFilters}
                      size="sm"
                      variant="outline"
                    >
                      Réinitialiser la vue
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {loadingPatients ? (
              <div className="flex flex-1 items-center justify-center py-16">
                <Spinner className="size-6 text-muted-foreground" />
              </div>
            ) : visiblePatients.length === 0 ? (
              <div className="flex flex-1 px-6 pb-6">
                <Empty className="border border-border/80 border-dashed bg-muted/20">
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
                    <Button onClick={resetFilters} variant="outline">
                      Réinitialiser les filtres
                    </Button>
                    <Button onClick={() => setIsCreateOpen(true)}>
                      <HugeiconsIcon
                        data-icon="inline-start"
                        icon={Add01Icon}
                        strokeWidth={2}
                      />
                      {searchTerm.trim()
                        ? "Créer avec cette recherche"
                        : "Nouveau patient"}
                    </Button>
                  </EmptyContent>
                </Empty>
              </div>
            ) : (
              <div className="px-6 pb-6">
                <div className="overflow-hidden rounded-[24px] border border-border/80 bg-card/90 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.25)]">
                  <div className="hidden grid-cols-[minmax(0,1.8fr)_minmax(170px,1.2fr)_minmax(180px,1.2fr)_minmax(140px,0.8fr)_auto] gap-4 border-border/70 border-b px-5 py-3 text-muted-foreground text-xs uppercase tracking-[0.14em] lg:grid">
                    <span>Patient</span>
                    <span>Propriétaire</span>
                    <span>Profil</span>
                    <span>Suivi</span>
                    <span className="text-right">Actions</span>
                  </div>

                  <div className="divide-y divide-border/60">
                    {paginatedPatients.map((entry) => (
                      <button
                        className="group block w-full cursor-pointer bg-transparent px-4 py-4 text-left transition-all duration-200 hover:bg-[linear-gradient(90deg,color-mix(in_oklch,var(--color-surface-soft)_75%,transparent),transparent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:px-5"
                        key={entry.patient.id}
                        onClick={() => openPatientDetails(entry.patient, "info")}
                        type="button"
                      >
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(170px,1.2fr)_minmax(180px,1.2fr)_minmax(140px,0.8fr)_auto] lg:items-center">
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={cn(
                                "flex size-12 shrink-0 items-center justify-center rounded-[18px] text-[22px] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]",
                                getSpeciesTone(entry.patient.species)
                              )}
                            >
                              {getSpeciesIcon(entry.patient.species)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate font-medium text-[15px] text-foreground tracking-[-0.02em]">
                                  {entry.patient.name}
                                </p>
                                <Badge
                                  className={cn(
                                    "rounded-full border-0 px-2.5 py-1 text-[11px]",
                                    getSpeciesTone(entry.patient.species)
                                  )}
                                  variant="secondary"
                                >
                                  {entry.patient.species}
                                </Badge>
                              </div>
                              <p className="mt-1 truncate text-muted-foreground text-sm">
                                {getAgeLabel(entry.patient.dateOfBirth)}
                                {entry.patient.sex
                                  ? ` · ${entry.patient.sex === "F" ? "Femelle" : "Mâle"}`
                                  : ""}
                              </p>
                            </div>
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground text-sm">
                              {formatOwnerName(entry.owner)}
                            </p>
                            <p className="mt-1 truncate text-muted-foreground text-sm">
                              {entry.owner?.phone || "Téléphone non renseigné"}
                            </p>
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground text-sm">
                              {entry.patient.breed || "Race non renseignée"}
                            </p>
                            <p className="mt-1 truncate text-muted-foreground text-sm">
                              {entry.upcomingAppointment
                                ? `Prochain RDV · ${formatPatientDate(entry.upcomingAppointment.startTime)}`
                                : `${entry.completedAppointments.length} visite${entry.completedAppointments.length > 1 ? "s" : ""} archivée${entry.completedAppointments.length > 1 ? "s" : ""}`}
                            </p>
                          </div>

                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-sm">
                              {formatPatientDate(entry.lastVisit)}
                            </p>
                            <p className="mt-1 text-muted-foreground text-sm">
                              {entry.upcomingAppointment
                                ? formatPatientLongDate(
                                    entry.upcomingAppointment.startTime
                                  )
                                : "Aucun créneau planifié"}
                            </p>
                          </div>

                          <div className="flex flex-col items-start gap-3 lg:items-end">
                            <PatientStatusBadge status={entry.patient.status} />
                            <Button
                              className="h-9 rounded-full border-border/70 px-4 shadow-none transition-transform duration-200 group-hover:-translate-y-0.5"
                              onClick={(event) => {
                                event.stopPropagation();
                                openPatientDetails(entry.patient, "info");
                              }}
                              size="sm"
                              variant="outline"
                            >
                              Consulter
                            </Button>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 border-border/70 border-t px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <p className="text-muted-foreground text-sm">
                      Affichage de <span className="font-medium text-foreground">{pageStart}</span>
                      {" "}à <span className="font-medium text-foreground">{pageEnd}</span>
                      {" "}sur <span className="font-medium text-foreground">{visiblePatients.length}</span> dossier
                      {visiblePatients.length > 1 ? "s" : ""}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        className="h-9 rounded-full px-4"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        size="sm"
                        variant="outline"
                      >
                        Précédent
                      </Button>

                      {paginationRange.map((page, index) => {
                        const previousPage = paginationRange[index - 1];
                        const shouldRenderGap =
                          previousPage !== undefined && page - previousPage > 1;

                        return (
                          <React.Fragment key={page}>
                            {shouldRenderGap ? (
                              <span className="px-1 text-muted-foreground text-sm">
                                …
                              </span>
                            ) : null}
                            <Button
                              className="h-9 min-w-9 rounded-full px-3"
                              onClick={() => setCurrentPage(page)}
                              size="sm"
                              variant={currentPage === page ? "default" : "outline"}
                            >
                              {page}
                            </Button>
                          </React.Fragment>
                        );
                      })}

                      <Button
                        className="h-9 rounded-full px-4"
                        disabled={currentPage === totalPages}
                        onClick={() =>
                          setCurrentPage((page) => Math.min(totalPages, page + 1))
                        }
                        size="sm"
                        variant="outline"
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedPatient ? (
        <PatientDetailsDialog
          allOwners={hydratedOwners}
          appointments={appointments}
          initialTab={detailsInitialTab}
          onClose={() => setSelectedPatientId(null)}
          onSaved={handlePatientSaved}
          onUpdateOwner={updateOwner}
          onUpdatePatient={updatePatient}
          owner={ownersMap.get(selectedPatient.ownerId)}
          patient={selectedPatient}
        />
      ) : null}

      <PatientCreateDialog
        onCreate={handleCreatePatient}
        onOpenChange={setIsCreateOpen}
        open={isCreateOpen}
        owners={owners}
      />

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setCreatedPatientPrompt(null);
          }
        }}
        open={!!createdPatientPrompt}
      >
        <DialogContent className="modal-medical-shell modal-hero-frame max-w-[min(560px,calc(100%-2rem))] overflow-hidden p-0">
          <DialogHeader className="modal-hero-shell gap-0 px-6 py-5">
            <div className="relative z-[1] grid gap-4">
              <div className="modal-hero-badge w-fit px-3 py-2">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-[14px] bg-emerald-500/12 text-emerald-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:text-emerald-300">
                  <HugeiconsIcon
                    className="size-4"
                    icon={CheckmarkCircle02Icon}
                    strokeWidth={2}
                  />
                </div>
                <span className="font-medium text-[12px] text-emerald-700/90 tracking-[0.02em] dark:text-emerald-300/90">
                  Dossier créé
                </span>
              </div>

              <div className="space-y-1.5">
                <DialogTitle className="text-[1.65rem] leading-[1.05] tracking-[-0.04em]">
                  {createdPatientPrompt?.patient.name}
                </DialogTitle>
                <DialogDescription className="text-[0.95rem] text-muted-foreground leading-6">
                  {createdPatientPrompt?.patient.species}
                  {createdPatientPrompt?.patient.breed
                    ? ` · ${createdPatientPrompt.patient.breed}`
                    : ""}
                  {createdPatientPrompt?.owner
                    ? ` — ${formatOwnerName(createdPatientPrompt.owner)}`
                    : ""}
                  {createdPatientPrompt?.owner?.phone
                    ? ` · ${createdPatientPrompt.owner.phone}`
                    : ""}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="modal-hero-footer flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
            <Button
              className="sm:mr-auto"
              onClick={() => setCreatedPatientPrompt(null)}
              type="button"
              variant="ghost"
            >
              Fermer
            </Button>
            <Button
              onClick={() => {
                if (createdPatientPrompt) {
                  setDetailsInitialTab("info");
                  setSelectedPatientId(createdPatientPrompt.patient.id);
                }
                setCreatedPatientPrompt(null);
              }}
              type="button"
              variant="outline"
            >
              <HugeiconsIcon
                data-icon="inline-start"
                icon={StethoscopeIcon}
                strokeWidth={2}
              />
              Voir le dossier
            </Button>
            <Button
              onClick={() => {
                if (createdPatientPrompt) {
                  createAppointmentForPatient(createdPatientPrompt.patient);
                }
              }}
              type="button"
            >
              <HugeiconsIcon
                data-icon="inline-start"
                icon={Calendar01Icon}
                strokeWidth={2}
              />
              Créer un RDV
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default React.memo(Patients);
