import {
  ArrowRight,
  CheckCircle,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Owner, Patient, Vaccination, WeightEntry } from "@/types/db";

interface PatientRecordHealthProps {
  className?: string;
  onCompleteProfile: () => void;
  owner?: Owner;
  patient: Patient;
  vaccinations: Vaccination[];
  weightEntries: WeightEntry[];
}

export function PatientRecordHealth({
  className,
  onCompleteProfile,
  owner,
  patient,
  vaccinations,
  weightEntries,
}: PatientRecordHealthProps) {
  const checks = [
    { complete: Boolean(patient.breed), label: "Race" },
    { complete: Boolean(patient.dateOfBirth), label: "Naissance" },
    { complete: Boolean(owner), label: "Propriétaire" },
    { complete: Boolean(owner?.phone), label: "Téléphone" },
    { complete: weightEntries.length > 0, label: "Poids" },
    { complete: vaccinations.length > 0, label: "Vaccins" },
  ];
  const completed = checks.filter((check) => check.complete).length;
  const score = Math.round((completed / checks.length) * 100);
  const missing = checks.filter((check) => !check.complete);
  const isComplete = missing.length === 0;

  return (
    <section className={cn("clinical-surface overflow-hidden", className)}>
      <div className="flex items-center gap-3 border-border/60 border-b px-5 py-4">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-xl",
            isComplete
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300"
          )}
        >
          <ShieldCheck className="size-4" weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
            Santé du dossier
          </p>
          <p className="mt-0.5 text-muted-foreground text-xs">
            {completed}/{checks.length} repères renseignés
          </p>
        </div>
        <span className="font-semibold text-lg tracking-[-0.04em]">
          {score}%
        </span>
      </div>

      <div className="px-5 py-4">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500",
              score === 100 ? "bg-emerald-500" : "bg-amber-500"
            )}
            style={{ width: `${score}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2">
          {checks.map((check) => {
            const Icon = check.complete ? CheckCircle : WarningCircle;
            return (
              <div
                className={cn(
                  "flex min-w-0 items-center gap-1.5 text-xs",
                  check.complete
                    ? "text-muted-foreground"
                    : "font-medium text-amber-700 dark:text-amber-300"
                )}
                key={check.label}
              >
                <Icon
                  className="size-3.5 shrink-0"
                  weight={check.complete ? "fill" : "duotone"}
                />
                <span className="truncate">{check.label}</span>
              </div>
            );
          })}
        </div>

        {!isComplete ? (
          <Button
            className="mt-4 h-8 w-full justify-between rounded-xl px-3"
            onClick={onCompleteProfile}
            size="sm"
            variant="outline"
          >
            Compléter {missing[0]?.label.toLowerCase()}
            <ArrowRight className="size-3.5" weight="bold" />
          </Button>
        ) : (
          <p className="mt-4 text-center font-medium text-emerald-600 text-xs dark:text-emerald-300">
            Dossier prêt pour la consultation
          </p>
        )}
      </div>
    </section>
  );
}
