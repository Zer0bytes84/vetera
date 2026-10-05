import {
  Add01Icon,
  BirdIcon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  Edit01Icon,
  SaveIcon,
  StethoscopeIcon,
  WorkHistoryIcon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Bird, Cat, Dog, PawPrint, Rabbit, UserRound } from "@/lib/icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FormDialogHeader } from "@/components/ui/form-dialog";
import { ModalBanner } from "@/components/ui/modal-banner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  APPOINTMENT_STATUS_META,
  PATIENT_STATUS_META,
} from "@/config/status-meta";

import { cn } from "@/lib/utils";

import type {
  Appointment,
  Owner,
  Patient,
  User,
  Transaction,
} from "@/types/db";
import { formatDZD } from "@/utils/currency";

export const COMMON_SPECIES = [
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

export const DOG_BREEDS = [
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

export const CAT_BREEDS = [
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

export type DetailsTab = "info" | "medical" | "history";

export const OWNER_CONTACT_LABELS: Record<
  NonNullable<Owner["preferredContact"]>,
  string
> = {
  phone: "Appel téléphonique",
  sms: "SMS",
  email: "Email",
};

export type PatientRecord = {
  patient: Patient;
  owner?: Owner;
  completedAppointments: Appointment[];
  upcomingAppointment?: Appointment;
  lastVisit?: string;
  searchIndex: string;
};

export const PATIENTS_PAGE_SIZE = 12;

export function normalizeDate(value?: string | Date | null) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatOwnerName(owner?: Owner) {
  if (!owner) {
    return "Propriétaire inconnu";
  }
  return (
    `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
    "Propriétaire inconnu"
  );
}

export function formatPatientDate(value?: string) {
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

export function formatPatientDateTime(value?: string) {
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

export function formatPatientLongDate(value?: string) {
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

export function formatVisitTimeRange(start?: string, end?: string) {
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

export function getAgeLabel(value?: string) {
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

export function getStatusMeta(status: Patient["status"]) {
  return PATIENT_STATUS_META[status] ?? PATIENT_STATUS_META.sante;
}

export { getSpeciesGlyph as getSpeciesIcon } from "@/lib/species-icons";

export function getSpeciesComponent(species?: string) {
  const normalized = species?.toLowerCase() ?? "";

  if (normalized.includes("chien")) return Dog;
  if (normalized.includes("chat")) return Cat;
  if (normalized.includes("lapin")) return Rabbit;
  if (normalized.includes("oiseau")) return Bird;
  return PawPrint;
}

export function getBreedSuggestions(species?: string) {
  const normalized = species?.toLowerCase() ?? "";
  if (normalized.includes("chien")) {
    return DOG_BREEDS;
  }
  if (normalized.includes("chat")) {
    return CAT_BREEDS;
  }
  return [];
}

export function PatientStatusBadge({ status }: { status: Patient["status"] }) {
  const meta = getStatusMeta(status);

  return (
    <Badge
      className={cn("medical-status-tag", meta.className)}
      data-status={status}
      variant="secondary"
    >
      {meta.label}
    </Badge>
  );
}

export function ReadOnlyDetail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <dl className="record-detail min-w-0 border-border/60 border-b py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-medium text-foreground text-sm leading-5">
        {value}
      </dd>
    </dl>
  );
}

export function ClinicalNote({
  emptyLabel,
  label,
  tone = "neutral",
  value,
}: {
  emptyLabel: string;
  label: string;
  tone?: "alert" | "neutral";
  value?: string;
}) {
  return (
    <div className="border-border/60 border-b py-4 last:border-b-0">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "size-2 rounded-full",
            tone === "alert" && value ? "bg-rose-500" : "bg-emerald-500"
          )}
        />
        <p className="font-semibold text-sm">{label}</p>
      </div>
      <p
        className={cn(
          "mt-2 pl-4 text-sm leading-6",
          value ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {value || emptyLabel}
      </p>
    </div>
  );
}

export function PatientDetailsDialog({
  patient,
  owner,
  allOwners,
  appointments,
  users,
  transactions,
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
  users: User[];
  transactions: Transaction[];
  initialTab: DetailsTab;
  onClose: () => void;
  onSaved?: (patientId: string) => void;
  onUpdatePatient: (id: string, data: Partial<Patient>) => Promise<boolean>;
  onUpdateOwner: (id: string, data: Partial<Owner>) => Promise<boolean>;
}) {
  const [activeTab, setActiveTab] = useState<DetailsTab>(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const ownerFinancialHistory = useMemo(() => {
    const appointmentIds = new Set(
      appointments
        .filter((appointment) => appointment.ownerId === selectedOwnerId)
        .map((appointment) => appointment.id)
    );
    const linkedIncome = transactions.filter(
      (transaction) =>
        transaction.type === "income" &&
        !!transaction.referenceId &&
        appointmentIds.has(transaction.referenceId)
    );

    return {
      count: linkedIncome.length,
      paid: linkedIncome
        .filter((transaction) => transaction.status === "paid")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      pending: linkedIncome
        .filter((transaction) => transaction.status === "pending")
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    };
  }, [appointments, selectedOwnerId, transactions]);

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

  const handleCancelEdit = () => {
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
    setIsEditing(false);
  };

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
        preferredContact: ownerData.preferredContact,
        secondaryContactName: ownerData.secondaryContactName || undefined,
        secondaryContactPhone: ownerData.secondaryContactPhone || undefined,
        communicationNotes: ownerData.communicationNotes || undefined,
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
      <DialogContent className="patient-record-dialog modal-medical-shell max-h-[calc(100dvh-1.5rem)] max-w-[min(1180px,calc(100%-1.5rem))] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-[28px] p-0 sm:max-h-[calc(100dvh-2rem)] sm:max-w-[min(1180px,calc(100%-2rem))]">
        <DialogHeader className="modal-medical-header shrink-0 gap-0 border-border/40 border-b">
          <ModalBanner
            artwork="patient-record"
            className="modal-banner-compact modal-banner-record"
            icon={<PawPrint strokeWidth={1.5} />}
          >
            <div className="flex w-full min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3.5">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <DialogTitle className="truncate text-xl tracking-[-0.04em] sm:text-2xl">
                      {patient.name}
                    </DialogTitle>
                    <PatientStatusBadge status={patientData.status} />
                  </div>
                  <DialogDescription className="truncate text-xs sm:text-sm">
                    {patientData.species}
                    {patientData.breed ? ` · ${patientData.breed}` : ""} ·{" "}
                    {formatOwnerName(currentOwner)}
                  </DialogDescription>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {isEditing ? (
                  <>
                    <Button
                      disabled={isSaving}
                      onClick={handleCancelEdit}
                      size="sm"
                      variant="ghost"
                    >
                      Annuler
                    </Button>
                    <Button
                      disabled={isSaving}
                      onClick={handleSaveAll}
                      size="sm"
                    >
                      {isSaving ? (
                        <Spinner className="size-4" />
                      ) : (
                        <HugeiconsIcon
                          data-icon="inline-start"
                          icon={SaveIcon}
                          strokeWidth={1.5}
                        />
                      )}
                      Enregistrer
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setIsEditing(true)}
                    size="sm"
                    variant="outline"
                  >
                    <HugeiconsIcon
                      data-icon="inline-start"
                      icon={Edit01Icon}
                      strokeWidth={1.5}
                    />
                    Modifier
                  </Button>
                )}
              </div>
            </div>
          </ModalBanner>
          <div className="flex flex-col gap-4 px-5 py-4 sm:px-7 sm:py-5">
            <div className="record-summary grid gap-2 sm:grid-cols-3">
              <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-muted/30 px-3.5 py-3 text-foreground ring-1 ring-border/40 transition-colors dark:bg-muted/15 dark:ring-border/30">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm shadow-sky-500/20">
                  <HugeiconsIcon icon={Calendar01Icon} strokeWidth={1.5} />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
                    Dernière visite
                  </p>
                  <p className="mt-0.5 truncate font-semibold text-sm tracking-[-0.02em]">
                    {formatPatientDate(patient.lastVisit)}
                  </p>
                  <p className="truncate text-muted-foreground text-xs">
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
              </div>

              <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-muted/30 px-3.5 py-3 text-foreground ring-1 ring-border/40 transition-colors dark:bg-muted/15 dark:ring-border/30">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm shadow-amber-500/20">
                  <HugeiconsIcon icon={WorkHistoryIcon} strokeWidth={1.5} />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
                    Prochain créneau
                  </p>
                  <p className="mt-0.5 truncate font-semibold text-sm tracking-[-0.02em]">
                    {upcomingAppointment
                      ? formatPatientDateTime(upcomingAppointment.startTime)
                      : "Aucun rendez-vous"}
                  </p>
                  <p className="truncate text-muted-foreground text-xs">
                    {upcomingAppointment
                      ? upcomingAppointment.type
                      : "Aucune venue planifiée"}
                  </p>
                </div>
              </div>

              <div
                data-clinical-alert={Boolean(
                  patient.allergies || patient.chronicConditions
                )}
                className="flex min-w-0 items-center gap-3 rounded-2xl bg-muted/30 px-3.5 py-3 text-foreground ring-1 ring-border/40 transition-colors dark:bg-muted/15 dark:ring-border/30"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/20">
                  <HugeiconsIcon icon={StethoscopeIcon} strokeWidth={1.5} />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
                    Repère clinique
                  </p>
                  <p className="mt-0.5 truncate font-semibold text-sm tracking-[-0.02em]">
                    {patient.allergies
                      ? "Allergies à surveiller"
                      : patient.chronicConditions
                        ? "Suivi chronique"
                        : "Aucune alerte renseignée"}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-muted-foreground text-xs">
                    {patient.allergies ||
                      patient.chronicConditions ||
                      "Aucune alerte clinique"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="record-workspace min-h-0 overflow-y-auto bg-card">
          <div className="grid min-h-full md:grid-cols-[180px_minmax(0,1fr)]">
            <aside className="border-border/40 border-b bg-card px-4 py-3 md:sticky md:top-0 md:h-full md:border-r md:border-b-0 md:px-4 md:py-5">
              <p className="mb-2 hidden px-3 font-semibold text-[10px] text-muted-foreground uppercase tracking-[0.14em] md:block">
                Dossier patient
              </p>
              <nav
                aria-label="Sections du dossier patient"
                className="flex gap-1 overflow-x-auto md:flex-col"
              >
                <button
                  aria-current={activeTab === "info" ? "page" : undefined}
                  className={cn(
                    "flex h-10 shrink-0 items-center gap-2.5 rounded-xl px-3 font-medium text-sm transition-colors md:w-full",
                    activeTab === "info"
                      ? "bg-sky-500/10 font-semibold text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                  onClick={() => setActiveTab("info")}
                  type="button"
                >
                  <HugeiconsIcon
                    className="size-4"
                    icon={BirdIcon}
                    strokeWidth={1.5}
                  />
                  Identité
                </button>
                <button
                  aria-current={activeTab === "medical" ? "page" : undefined}
                  className={cn(
                    "flex h-10 shrink-0 items-center gap-2.5 rounded-xl px-3 font-medium text-sm transition-colors md:w-full",
                    activeTab === "medical"
                      ? "bg-emerald-500/10 font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                  onClick={() => setActiveTab("medical")}
                  type="button"
                >
                  <HugeiconsIcon
                    className="size-4"
                    icon={StethoscopeIcon}
                    strokeWidth={1.5}
                  />
                  Suivi médical
                </button>
                <button
                  aria-current={activeTab === "history" ? "page" : undefined}
                  className={cn(
                    "flex h-10 shrink-0 items-center gap-2.5 rounded-xl px-3 font-medium text-sm transition-colors md:w-full",
                    activeTab === "history"
                      ? "bg-amber-500/10 font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                  onClick={() => setActiveTab("history")}
                  type="button"
                >
                  <HugeiconsIcon
                    className="size-4"
                    icon={WorkHistoryIcon}
                    strokeWidth={1.5}
                  />
                  Historique
                </button>
              </nav>

              <div className="mt-5 hidden border-border/60 border-t px-3 pt-4 md:block">
                <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
                  Dossier
                </p>
                <p className="mt-1 font-mono text-foreground text-xs">
                  #{patient.id.slice(0, 8)}
                </p>
                <p className="mt-3 line-clamp-2 text-muted-foreground text-xs leading-5">
                  {currentOwner?.phone || "Téléphone non renseigné"}
                </p>
              </div>
            </aside>

            <section className="min-w-0 p-4 sm:p-6">
              {activeTab === "info" ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900">
                      <HugeiconsIcon icon={BirdIcon} strokeWidth={1.5} />
                    </span>
                    <h2 className="font-semibold text-xl tracking-[-0.03em]">
                      Identité & contacts
                    </h2>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="rounded-2xl shadow-none" size="sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-sky-500" />
                          Animal
                        </CardTitle>
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
                                  {Object.entries(PATIENT_STATUS_META).map(
                                    ([value, option]) => (
                                      <NativeSelectOption
                                        key={value}
                                        value={value}
                                      >
                                        {option.label}
                                      </NativeSelectOption>
                                    )
                                  )}
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
                            <ReadOnlyDetail
                              label="Nom"
                              value={patientData.name}
                            />
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
                              value={
                                patientData.sex === "M" ? "Mâle" : "Femelle"
                              }
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

                    <Card className="rounded-2xl shadow-none" size="sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-amber-500" />
                          Propriétaire
                        </CardTitle>
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

                            <div className="grid gap-4 sm:grid-cols-2">
                              <Field>
                                <FieldLabel>Contact privilégié</FieldLabel>
                                <NativeSelect
                                  className="w-full"
                                  onChange={(event) =>
                                    setOwnerData((current) => ({
                                      ...current,
                                      preferredContact: event.target
                                        .value as Owner["preferredContact"],
                                    }))
                                  }
                                  value={ownerData.preferredContact || "phone"}
                                >
                                  <NativeSelectOption value="phone">
                                    Appel téléphonique
                                  </NativeSelectOption>
                                  <NativeSelectOption value="sms">
                                    SMS
                                  </NativeSelectOption>
                                  <NativeSelectOption value="email">
                                    Email
                                  </NativeSelectOption>
                                </NativeSelect>
                              </Field>

                              <Field>
                                <FieldLabel>Contact secondaire</FieldLabel>
                                <Input
                                  onChange={(event) =>
                                    setOwnerData((current) => ({
                                      ...current,
                                      secondaryContactName: event.target.value,
                                    }))
                                  }
                                  placeholder="Nom complet"
                                  value={ownerData.secondaryContactName || ""}
                                />
                              </Field>
                            </div>

                            <Field>
                              <FieldLabel>Téléphone secondaire</FieldLabel>
                              <Input
                                onChange={(event) =>
                                  setOwnerData((current) => ({
                                    ...current,
                                    secondaryContactPhone: event.target.value,
                                  }))
                                }
                                placeholder="Numéro en cas d'indisponibilité"
                                value={ownerData.secondaryContactPhone || ""}
                              />
                            </Field>

                            <Field>
                              <FieldLabel>Consigne de communication</FieldLabel>
                              <Textarea
                                className="min-h-20"
                                onChange={(event) =>
                                  setOwnerData((current) => ({
                                    ...current,
                                    communicationNotes: event.target.value,
                                  }))
                                }
                                placeholder="Ex. appeler après 17 h"
                                value={ownerData.communicationNotes || ""}
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
                            <ReadOnlyDetail
                              label="Contact privilégié"
                              value={
                                currentOwner?.preferredContact
                                  ? OWNER_CONTACT_LABELS[
                                      currentOwner.preferredContact
                                    ]
                                  : "Non renseigné"
                              }
                            />
                            <ReadOnlyDetail
                              label="Contact secondaire"
                              value={
                                [
                                  currentOwner?.secondaryContactName,
                                  currentOwner?.secondaryContactPhone,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || "Non renseigné"
                              }
                            />
                            {currentOwner?.communicationNotes ? (
                              <ReadOnlyDetail
                                label="Consigne de communication"
                                value={currentOwner.communicationNotes}
                              />
                            ) : null}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : null}

              {activeTab === "medical" ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900">
                      <HugeiconsIcon icon={StethoscopeIcon} strokeWidth={1.5} />
                    </span>
                    <h2 className="font-semibold text-xl tracking-[-0.03em]">
                      Suivi médical
                    </h2>
                  </div>
                  <div className="grid gap-4">
                    <Card className="rounded-2xl shadow-none" size="sm">
                      <CardContent>
                        {isEditing ? (
                          <FieldGroup>
                            <Field>
                              <FieldLabel>
                                Allergies et contre-indications
                              </FieldLabel>
                              <Textarea
                                className="min-h-[120px]"
                                onChange={(event) =>
                                  setPatientData((current) => ({
                                    ...current,
                                    allergies: event.target.value,
                                  }))
                                }
                                placeholder="Aucune allergie connue"
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
                                value={patientData.generalNotes}
                              />
                            </Field>
                          </FieldGroup>
                        ) : (
                          <div>
                            <ClinicalNote
                              emptyLabel="Aucune allergie ou contre-indication connue."
                              label="Allergies et contre-indications"
                              tone="alert"
                              value={patientData.allergies}
                            />
                            <ClinicalNote
                              emptyLabel="Aucune maladie chronique renseignée."
                              label="Maladies chroniques"
                              tone="alert"
                              value={patientData.chronicConditions}
                            />
                            <ClinicalNote
                              emptyLabel="Aucune consigne générale enregistrée."
                              label="Observations et précautions"
                              value={patientData.generalNotes}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : null}

              {activeTab === "history" ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900">
                      <HugeiconsIcon icon={WorkHistoryIcon} strokeWidth={1.5} />
                    </span>
                    <div>
                      <h2 className="font-semibold text-xl tracking-[-0.03em]">
                        Historique des visites
                      </h2>
                      <p className="text-muted-foreground text-xs">
                        {history.length} visite{history.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <Card className="rounded-2xl shadow-none" size="sm">
                    <CardContent className="grid gap-0 p-0 sm:grid-cols-3">
                      <div className="px-4 py-3.5 sm:border-border/70 sm:border-r">
                        <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
                          Réglé par le foyer
                        </p>
                        <p className="mt-1 font-semibold text-lg tracking-[-0.03em]">
                          {formatDZD(ownerFinancialHistory.paid)}
                        </p>
                      </div>
                      <div className="border-border/70 border-t px-4 py-3.5 sm:border-t-0 sm:border-r">
                        <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
                          En attente
                        </p>
                        <p className="mt-1 font-semibold text-lg tracking-[-0.03em]">
                          {formatDZD(ownerFinancialHistory.pending)}
                        </p>
                      </div>
                      <div className="border-border/70 border-t px-4 py-3.5 sm:border-t-0">
                        <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
                          Écritures liées
                        </p>
                        <p className="mt-1 font-semibold text-lg tracking-[-0.03em]">
                          {ownerFinancialHistory.count}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  {history.length === 0 ? (
                    <Empty className="border border-border/80 border-dashed bg-muted/20">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <HugeiconsIcon
                            icon={Calendar01Icon}
                            strokeWidth={1.5}
                          />
                        </EmptyMedia>
                        <EmptyTitle>Aucun historique clinique</EmptyTitle>
                        <EmptyDescription>
                          Ce dossier ne contient pas encore de consultation ou
                          de visite archivée.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card">
                      {history.map((appointment, index) => {
                        const statusMeta =
                          APPOINTMENT_STATUS_META[appointment.status];
                        const veterinarian = usersById.get(appointment.vetId);

                        return (
                          <details
                            className="group border-border/70 border-b last:border-b-0"
                            key={appointment.id}
                            open={index === 0}
                          >
                            <summary className="grid cursor-pointer list-none items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:grid-cols-[42px_minmax(0,1fr)_minmax(130px,0.7fr)_auto] [&::-webkit-details-marker]:hidden">
                              <span className="flex size-9 items-center justify-center rounded-xl bg-amber-50 font-semibold text-amber-700 text-xs dark:bg-amber-950/40 dark:text-amber-300">
                                {history.length - index}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-sm">
                                  {formatPatientLongDate(appointment.startTime)}
                                </p>
                                <p className="truncate text-muted-foreground text-xs sm:hidden">
                                  {appointment.type}
                                </p>
                              </div>
                              <div className="hidden min-w-0 sm:block">
                                <p className="truncate font-medium text-sm">
                                  {appointment.type}
                                </p>
                                <p className="truncate text-muted-foreground text-xs">
                                  {veterinarian?.displayName || "Non assigné"}
                                </p>
                              </div>
                              <Badge
                                className={statusMeta.className}
                                variant="outline"
                              >
                                {statusMeta.label}
                              </Badge>
                            </summary>
                            <div className="grid gap-x-6 border-border/60 border-t bg-muted/15 px-4 py-2 md:grid-cols-2">
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
                                  appointment.diagnosis ||
                                  "Aucun diagnostic saisi."
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
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PatientCreateDialog({
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

  const SpeciesIcon = getSpeciesComponent(newPatient.species);
  const selectedOwner =
    selectedOwnerId === "new"
      ? null
      : (owners.find((owner) => owner.id === selectedOwnerId) ?? null);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="modal-medical-shell max-h-[calc(100dvh-2rem)] max-w-[min(1040px,calc(100%-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-3rem)] sm:max-w-[min(1040px,calc(100%-2rem))]"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            if (!isSubmitting) {
              void handleCreate();
            }
          }
        }}
      >
        <FormDialogHeader
          artwork="patient"
          description="Identité de l’animal et coordonnées du propriétaire."
          icon={<SpeciesIcon strokeWidth={1.5} />}
          title="Nouveau patient"
        />

        <div className="modal-medical-body min-h-0 overflow-y-auto">
          <div className="modal-patient-grid">
            {/* Section: Propriétaire */}
            <section className="modal-patient-panel modal-patient-panel-owner flex flex-col gap-5">
              <div className="modal-patient-section-heading">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="modal-section-icon modal-section-icon-owner"
                  >
                    <UserRound className="size-[18px]" strokeWidth={1.9} />
                  </span>
                  <div>
                    <h3 className="font-semibold text-[15px] text-foreground">
                      Propriétaire
                    </h3>
                    <p className="mt-0.5 text-muted-foreground text-xs">
                      Coordonnées et rattachement du contact.
                    </p>
                  </div>
                </div>
                <span className="modal-section-state modal-section-state-owner">
                  <HugeiconsIcon
                    icon={selectedOwner ? CheckmarkCircle02Icon : Add01Icon}
                    size={13}
                    strokeWidth={1.5}
                  />
                  {selectedOwner ? "Contact existant" : "Nouveau contact"}
                </span>
              </div>

              <FieldGroup className="modal-form-fields">
                <Field className="modal-primary-choice">
                  <FieldLabel>Mode de rattachement</FieldLabel>
                  <NativeSelect
                    className="w-full cursor-pointer"
                    onChange={(event) => setSelectedOwnerId(event.target.value)}
                    value={selectedOwnerId}
                  >
                    <NativeSelectOption value="new">
                      + Créer un nouveau propriétaire
                    </NativeSelectOption>
                    {ownerOptions.map((owner) => (
                      <NativeSelectOption key={owner.id} value={owner.id}>
                        {formatOwnerName(owner)} · {owner.phone}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldDescription className="text-xs">
                    {selectedOwnerId === "new"
                      ? "Saisissez les coordonnées du nouveau propriétaire ci-dessous."
                      : "Dossier rattaché à un client existant."}
                  </FieldDescription>
                </Field>

                {selectedOwner ? (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 transition-[background-color,color,border-color,box-shadow,opacity,transform]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-sm text-foreground">
                          {formatOwnerName(selectedOwner)}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {selectedOwner.phone || "Sans téléphone"}
                          {selectedOwner.email
                            ? ` · ${selectedOwner.email}`
                            : ""}
                        </p>
                        {selectedOwner.address ? (
                          <p className="text-muted-foreground text-xs">
                            {selectedOwner.address}
                            {selectedOwner.city
                              ? `, ${selectedOwner.city}`
                              : ""}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        onClick={() => setSelectedOwnerId("new")}
                        size="xs"
                        type="button"
                        variant="ghost"
                      >
                        Changer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel>
                          Nom{" "}
                          <span className="modal-required">Obligatoire</span>
                        </FieldLabel>
                        <Input
                          aria-invalid={Boolean(
                            formError &&
                              selectedOwnerId === "new" &&
                              !newOwner.lastName?.trim()
                          )}
                          onChange={(event) =>
                            setNewOwner((current) => ({
                              ...current,
                              lastName: event.target.value,
                            }))
                          }
                          placeholder="Benali"
                          value={newOwner.lastName || ""}
                        />
                      </Field>

                      <Field>
                        <FieldLabel>Prénom</FieldLabel>
                        <Input
                          onChange={(event) =>
                            setNewOwner((current) => ({
                              ...current,
                              firstName: event.target.value,
                            }))
                          }
                          placeholder="Nadia"
                          value={newOwner.firstName || ""}
                        />
                      </Field>

                      <Field>
                        <FieldLabel>
                          Téléphone
                          <span className="modal-required">Obligatoire</span>
                        </FieldLabel>
                        <Input
                          aria-invalid={Boolean(
                            formError &&
                              selectedOwnerId === "new" &&
                              !newOwner.phone?.trim()
                          )}
                          onChange={(event) =>
                            setNewOwner((current) => ({
                              ...current,
                              phone: event.target.value,
                            }))
                          }
                          placeholder="0550 00 00 00"
                          value={newOwner.phone || ""}
                        />
                      </Field>

                      <Field>
                        <FieldLabel>Email</FieldLabel>
                        <Input
                          onChange={(event) =>
                            setNewOwner((current) => ({
                              ...current,
                              email: event.target.value,
                            }))
                          }
                          placeholder="nom@exemple.com"
                          type="email"
                          value={newOwner.email || ""}
                        />
                      </Field>
                    </div>

                    <Field>
                      <FieldLabel>Adresse</FieldLabel>
                      <Input
                        onChange={(event) =>
                          setNewOwner((current) => ({
                            ...current,
                            address: event.target.value,
                          }))
                        }
                        placeholder="Rue, numéro…"
                        value={newOwner.address || ""}
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Ville</FieldLabel>
                      <Input
                        onChange={(event) =>
                          setNewOwner((current) => ({
                            ...current,
                            city: event.target.value,
                          }))
                        }
                        value={newOwner.city || ""}
                      />
                    </Field>
                  </>
                )}
              </FieldGroup>
            </section>

            {/* Section: Patient */}
            <section className="modal-patient-panel modal-patient-panel-animal flex flex-col gap-5">
              <div className="modal-patient-section-heading">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="modal-section-icon modal-section-icon-patient"
                  >
                    <SpeciesIcon className="size-[18px]" strokeWidth={1.9} />
                  </span>
                  <div>
                    <h3 className="font-semibold text-[15px] text-foreground">
                      Patient
                    </h3>
                    <p className="mt-0.5 text-muted-foreground text-xs">
                      Identité et état clinique initial de l’animal.
                    </p>
                  </div>
                </div>
                <span className="modal-section-state modal-section-state-patient">
                  <SpeciesIcon className="size-3.5" strokeWidth={1.5} />
                  {newPatient.species?.trim() || "Animal à identifier"}
                </span>
              </div>

              <FieldGroup className="modal-form-fields">
                <Field className="modal-patient-name-field">
                  <FieldLabel>
                    Nom du patient
                    <span className="modal-required">Obligatoire</span>
                  </FieldLabel>
                  <Input
                    aria-invalid={Boolean(
                      formError && !newPatient.name?.trim()
                    )}
                    autoFocus
                    className="modal-patient-name-input"
                    onChange={(event) =>
                      setNewPatient((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Simba"
                    value={newPatient.name || ""}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>
                      Espèce <span className="modal-required">Obligatoire</span>
                    </FieldLabel>
                    <Input
                      aria-invalid={Boolean(
                        formError && !newPatient.species?.trim()
                      )}
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
                      placeholder="Européen, Malinois…"
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
                      className="w-full cursor-pointer"
                      onChange={(event) =>
                        setNewPatient((current) => ({
                          ...current,
                          sex: event.target.value as Patient["sex"],
                        }))
                      }
                      value={(newPatient.sex || "M") as string}
                    >
                      <NativeSelectOption value="M">Mâle</NativeSelectOption>
                      <NativeSelectOption value="F">Femelle</NativeSelectOption>
                    </NativeSelect>
                  </Field>

                  <Field>
                    <FieldLabel>Statut initial</FieldLabel>
                    <NativeSelect
                      className="w-full cursor-pointer"
                      onChange={(event) =>
                        setNewPatient((current) => ({
                          ...current,
                          status: event.target.value as Patient["status"],
                        }))
                      }
                      value={(newPatient.status || "sante") as string}
                    >
                      {Object.entries(PATIENT_STATUS_META).map(
                        ([value, option]) => (
                          <NativeSelectOption key={value} value={value}>
                            {option.label}
                          </NativeSelectOption>
                        )
                      )}
                    </NativeSelect>
                  </Field>
                </div>
              </FieldGroup>
            </section>
          </div>
        </div>

        <DialogFooter className="modal-medical-footer !mx-0 !mb-0 !flex-col sm:!flex-row shrink-0 gap-3 px-6 py-5 sm:items-center sm:justify-end">
          <div className="modal-medical-footer-meta">
            {formError ? (
              <div className="w-full rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
                {formError}
              </div>
            ) : (
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <span className="modal-footer-status-icon" aria-hidden="true">
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    size={14}
                    strokeWidth={1.5}
                  />
                </span>
                {selectedOwner
                  ? `Le patient sera relié à ${formatOwnerName(selectedOwner)}.`
                  : "Le propriétaire et le patient seront créés dans un même dossier."}
              </span>
            )}
          </div>
          <div className="modal-medical-actions w-full flex-col-reverse sm:ml-auto sm:w-auto sm:flex-row">
            <Button
              className="h-11 min-w-[132px] justify-center"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Annuler
            </Button>
            <Button
              className="h-11 min-w-[194px] justify-center shadow-sm"
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
                  strokeWidth={1.5}
                />
              )}
              <span>Créer le dossier</span>
              <kbd className="hidden rounded bg-primary-foreground/20 px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
                ⌘↵
              </kbd>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface PatientsProps {
  onNavigateToPatient?: (patientId: string) => void;
}
