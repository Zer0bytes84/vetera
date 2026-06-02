import {
  ArrowLeft,
  CalendarBlank,
  CalendarPlus,
  Notebook,
  Pill,
} from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PATIENT_STATUS_META, getSpeciesTone } from "@/config/status-meta";
import { cn } from "@/lib/utils";
import type { Owner, Patient } from "@/types/db";
import { computeAge, formatAge } from "../lib";

interface PatientHeaderProps {
  className?: string;
  onBack: () => void;
  onNewAppointment: () => void;
  onNewNote: () => void;
  owner?: Owner;
  patient: Patient;
}

function buildInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function getAgeKey(
  age: ReturnType<typeof computeAge>
):
  | "ageYears"
  | "ageMonths"
  | "ageDays"
  | "ageUnknown" {
  if (!age) {
    return "ageUnknown";
  }
  if (age.years >= 1) {
    return "ageYears";
  }
  if (age.months >= 1) {
    return "ageMonths";
  }
  return "ageDays";
}

export function PatientHeader({
  className,
  onBack,
  onNewAppointment,
  onNewNote,
  owner,
  patient,
}: PatientHeaderProps) {
  const { t } = useTranslation();
  const status = PATIENT_STATUS_META[patient.status];
  const age = computeAge(patient.dateOfBirth);
  const ageLabel = formatAge(age, (key, options) => {
    const typedKey = key.replace("patientDetail.header.", "") as
      | "ageYears"
      | "ageMonths"
      | "ageDays"
      | "ageUnknown";
    return t(`patientDetail.header.${typedKey}`, options);
  });

  const ageKey = getAgeKey(age);
  const ageFinalLabel = t(`patientDetail.header.${ageKey}`, {
    count: age?.years ?? age?.months ?? age?.days ?? 0,
  });

  // formatAge inclut déjà potentially "X ans Y mois" — on simplifie :
  void ageLabel;
  const ownerName = owner
    ? `${owner.firstName} ${owner.lastName}`.trim()
    : t("patientDetail.header.unknownOwner");

  return (
    <div
      className={cn(
        "flex flex-col gap-6 rounded-3xl border border-border/40 bg-white/60 p-6 shadow-[0_1px_0_rgba(0,0,0,0.02)] backdrop-blur-md md:flex-row md:items-start md:gap-8 dark:bg-zinc-900/40",
        className
      )}
    >
      <div className="flex flex-1 items-start gap-5">
        <Button
          aria-label={t("patientDetail.backToList")}
          className="size-9 shrink-0"
          onClick={onBack}
          size="icon"
          variant="ghost"
        >
          <ArrowLeft weight="duotone" className="size-4" />
        </Button>

        <Avatar className="size-20 ring-2 ring-background shadow-sm">
          {patient.avatarUrl ? (
            <AvatarImage alt={patient.name} src={patient.avatarUrl} />
          ) : null}
          <AvatarFallback className="bg-gradient-to-br from-emerald-100 to-sky-100 text-lg font-semibold text-emerald-700 dark:from-emerald-900/40 dark:to-sky-900/40 dark:text-emerald-300">
            {buildInitials(patient.name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-2xl font-semibold tracking-tight text-foreground">
              {patient.name}
            </h1>
            <Badge
              className={cn("rounded-full px-2.5 py-0.5", status.className)}
              variant="secondary"
            >
              {status.label}
            </Badge>
            <Badge
              className={cn("rounded-full px-2.5 py-0.5", getSpeciesTone(patient.species))}
              variant="secondary"
            >
              {patient.species}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {patient.breed ? (
              <span className="font-medium">{patient.breed}</span>
            ) : null}
            {patient.sex ? (
              <span className="text-muted-foreground/70">·</span>
            ) : null}
            {patient.sex ? (
              <span>{patient.sex === "M" ? "♂ Mâle" : "♀ Femelle"}</span>
            ) : null}
            <span className="text-muted-foreground/70">·</span>
            <span>{ageFinalLabel}</span>
            <span className="text-muted-foreground/70">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-muted-foreground/40" />
              {ownerName}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end md:gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
          {t("patientDetail.header.quickActions")}
        </span>
        <div className="flex flex-wrap gap-2">
          <Button
            className="h-9 gap-2"
            onClick={onNewAppointment}
            size="sm"
            variant="default"
          >
            <CalendarPlus weight="duotone" className="size-4" />
            {t("patientDetail.header.newAppointment")}
          </Button>
          <Button
            className="h-9 gap-2"
            onClick={onNewNote}
            size="sm"
            variant="outline"
          >
            <Notebook weight="duotone" className="size-4" />
            {t("patientDetail.header.newNote")}
          </Button>
        </div>
      </div>

      {/* Unused imports — keep icons available for future actions */}
      <div className="hidden">
        <CalendarBlank />
        <Pill />
      </div>
    </div>
  );
}
