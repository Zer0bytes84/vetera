import {
  Bird,
  CalendarBlank,
  CalendarPlus,
  Cat,
  Dog,
  Fish,
  FirstAid,
  Horse,
  Notebook,
  PawPrint,
  PencilSimple,
  Phone,
  Rabbit,
  ShieldCheck,
  UserCircle,
  WarningDiamond,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSpeciesTone, PATIENT_STATUS_META } from "@/config/status-meta";
import { cn } from "@/lib/utils";
import type { Owner, Patient } from "@/types/db";
import { computeAge, formatAge } from "../lib";

interface PatientHeaderProps {
  children?: ReactNode;
  className?: string;
  onEditProfile: () => void;
  onNewAppointment: () => void;
  onOpenClinicalNote?: () => void;
  owner?: Owner;
  patient: Patient;
}

function AnimalAvatarIcon({ species }: { species: string }) {
  const normalized = species.trim().toLocaleLowerCase("fr");
  const iconProps = { className: "size-8 sm:size-10", weight: "duotone" as const };
  if (normalized.includes("chien") || normalized.includes("dog")) {
    return <Dog {...iconProps} />;
  }
  if (normalized.includes("chat") || normalized.includes("cat")) {
    return <Cat {...iconProps} />;
  }
  if (normalized.includes("lapin") || normalized.includes("rabbit")) {
    return <Rabbit {...iconProps} />;
  }
  if (normalized.includes("oiseau") || normalized.includes("bird")) {
    return <Bird {...iconProps} />;
  }
  if (normalized.includes("cheval") || normalized.includes("horse")) {
    return <Horse {...iconProps} />;
  }
  if (normalized.includes("poisson") || normalized.includes("fish")) {
    return <Fish {...iconProps} />;
  }
  return <PawPrint {...iconProps} />;
}

export function PatientHeader({
  children,
  className,
  onEditProfile,
  onNewAppointment,
  onOpenClinicalNote,
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
    <section
      aria-labelledby="patient-record-title"
      className={cn("clinical-feature-surface overflow-hidden", className)}
    >
      <div className="relative p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <Avatar className="size-16 rounded-2xl ring-1 ring-border sm:size-20">
                {patient.avatarUrl ? (
                  <AvatarImage alt={patient.name} src={patient.avatarUrl} />
                ) : null}
                <AvatarFallback className={cn("rounded-2xl", getSpeciesTone(patient.species))}>
                  <AnimalAvatarIcon species={patient.species} />
                </AvatarFallback>
              </Avatar>
              <span
                aria-label={status.label}
                className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border-2 border-card bg-emerald-500"
              >
                <span className="size-1.5 rounded-full bg-white" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-muted-foreground text-[10px] uppercase tracking-[0.18em]">
                Dossier patient
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <h1
                  className="truncate font-display font-semibold text-2xl text-foreground tracking-[-0.04em] sm:text-3xl"
                  id="patient-record-title"
                >
                  {patient.name}
                </h1>
                <Badge
                  className={cn("rounded-full px-2.5 py-0.5", status.className)}
                  variant="secondary"
                >
                  {status.label}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-muted-foreground text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <PawPrint className="size-4" weight="duotone" />
                  <strong className="font-medium text-foreground/85">{patient.species}</strong>
                  {patient.breed ? <span>· {patient.breed}</span> : null}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarBlank className="size-4" weight="duotone" />
                  {ageLabel} · {patient.sex === "M" ? "Mâle" : "Femelle"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <UserCircle className="size-4" weight="duotone" />
                  {ownerName}
                </span>
                {owner?.phone ? (
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Phone className="size-4" weight="duotone" />
                    {owner.phone}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:max-w-[430px] xl:justify-end">
            {onOpenClinicalNote ? (
              <Button
                className="h-9 gap-2 rounded-xl px-4"
                onClick={onOpenClinicalNote}
                size="sm"
                variant="outline"
              >
                <Notebook className="size-4" weight="duotone" />
                Note clinique
              </Button>
            ) : null}
            <Button
              className="h-9 gap-2 rounded-xl bg-emerald-600 px-4 text-white hover:bg-emerald-700"
              onClick={onNewAppointment}
              size="sm"
            >
              <CalendarPlus className="size-4" weight="duotone" />
              {t("patientDetail.header.newAppointment")}
            </Button>
            <Button
              className="h-9 gap-2 rounded-xl px-4"
              onClick={onEditProfile}
              size="sm"
              variant="ghost"
            >
              <PencilSimple className="size-4" weight="duotone" />
              Modifier
            </Button>
          </div>
        </div>
      </div>

      <div className="grid border-border/70 border-t bg-muted/15 sm:grid-cols-2 sm:divide-x sm:divide-border/70">
        <div className="flex min-w-0 items-start gap-3 px-4 py-3.5 sm:px-5">
          <span
            className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl",
              patient.allergies
                ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"
                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
            )}
          >
            {patient.allergies ? (
              <WarningDiamond className="size-4" weight="duotone" />
            ) : (
              <ShieldCheck className="size-4" weight="duotone" />
            )}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-muted-foreground text-xs">Allergies</p>
            <p className="mt-1 break-words font-medium text-sm leading-5">
              {patient.allergies || "Aucune allergie connue"}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 items-start gap-3 border-border/70 border-t px-4 py-3.5 sm:border-t-0 sm:px-5">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <FirstAid className="size-4" weight="duotone" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-muted-foreground text-xs">
              Antécédents et maladies chroniques
            </p>
            <p className="mt-1 break-words font-medium text-sm leading-5">
              {patient.chronicConditions || "Aucun antécédent signalé"}
            </p>
          </div>
        </div>
      </div>

      {children}
    </section>
  );
}
