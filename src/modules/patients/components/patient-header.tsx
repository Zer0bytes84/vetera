import { CalendarPlus, PencilSimple } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSpeciesTone, PATIENT_STATUS_META } from "@/config/status-meta";
import { cn } from "@/lib/utils";
import type { Owner, Patient } from "@/types/db";
import { computeAge, formatAge } from "../lib";

interface PatientHeaderProps {
  className?: string;
  onEditProfile: () => void;
  onNewAppointment: () => void;
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

export function PatientHeader({
  className,
  onEditProfile,
  onNewAppointment,
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

  const ownerName = owner
    ? `${owner.firstName} ${owner.lastName}`.trim()
    : t("patientDetail.header.unknownOwner");

  return (
    <div
      className={cn(
        "clinical-feature-surface flex flex-col gap-4 border-l-4 border-l-emerald-400 p-4 md:flex-row md:items-center md:gap-6 md:p-5",
        className
      )}
    >
      <div className="flex flex-1 items-center gap-4">
        <Avatar className="size-14 shadow-sm ring-2 ring-background sm:size-16">
          {patient.avatarUrl ? (
            <AvatarImage alt={patient.name} src={patient.avatarUrl} />
          ) : null}
          <AvatarFallback className="bg-gradient-to-br from-emerald-100 to-sky-100 font-semibold text-emerald-700 text-lg dark:from-emerald-900/40 dark:to-sky-900/40 dark:text-emerald-300">
            {buildInitials(patient.name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display font-semibold text-2xl text-foreground tracking-[-0.04em]">
              {patient.name}
            </h1>
            <Badge
              className={cn("rounded-full px-2.5 py-0.5", status.className)}
              variant="secondary"
            >
              {status.label}
            </Badge>
            <Badge
              className={cn(
                "rounded-full px-2.5 py-0.5",
                getSpeciesTone(patient.species)
              )}
              variant="secondary"
            >
              {patient.species}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-sm">
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
            <span>{ageLabel}</span>
            <span className="text-muted-foreground/70">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-muted-foreground/40" />
              {ownerName}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          className="h-9 gap-2 rounded-xl bg-emerald-600 px-4 text-white hover:bg-emerald-700"
          onClick={onNewAppointment}
          size="sm"
          variant="default"
        >
          <CalendarPlus className="size-4" weight="duotone" />
          {t("patientDetail.header.newAppointment")}
        </Button>
        <Button
          className="h-9 gap-2 rounded-xl px-4"
          onClick={onEditProfile}
          size="sm"
          variant="outline"
        >
          <PencilSimple className="size-4" weight="duotone" />
          Modifier le dossier
        </Button>
      </div>
    </div>
  );
}
