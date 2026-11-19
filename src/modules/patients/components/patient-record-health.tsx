import { Check, ArrowRight, ListChecks } from "@/lib/icons";
import { RecordBlockHeading } from "./record-block-heading";
import { cn } from "@/lib/utils";
import type { Owner, Patient, Vaccination, WeightEntry } from "@/types/db";

interface PatientRecordHealthProps {
  className?: string;
  onCompleteCheck: (label: string) => void;
  owner?: Owner;
  patient: Patient;
  vaccinations: Vaccination[];
  weightEntries: WeightEntry[];
}

export function PatientRecordHealth({
  className,
  onCompleteCheck,
  owner,
  patient,
  vaccinations,
  weightEntries,
}: PatientRecordHealthProps) {
  const checks = [
    {
      complete: Boolean(patient.breed),
      label: "Race",
      action: "Race à renseigner",
    },
    {
      complete: Boolean(patient.dateOfBirth),
      label: "Date de naissance",
      action: "Date de naissance à renseigner",
    },
    {
      complete: Boolean(owner),
      label: "Propriétaire",
      action: "Propriétaire à associer",
    },
    {
      complete: Boolean(owner?.phone),
      label: "Téléphone contact",
      action: "Téléphone à renseigner",
    },
    {
      complete: weightEntries.length > 0,
      label: "Première pesée",
      action: "Aucune pesée : onglet Poids",
    },
    {
      complete: vaccinations.length > 0,
      label: "Vaccination",
      action: "Aucun vaccin : onglet Vaccinations",
    },
  ];
  const completed = checks.filter((check) => check.complete).length;
  const missing = checks.filter((check) => !check.complete);
  const isComplete = missing.length === 0;

  return (
    <section
      aria-label="Complétude du dossier"
      className={cn(
        "medical-record-health rounded-2xl border border-border/80 bg-card p-5 shadow-xs",
        className
      )}
    >
      <div className="medical-health-heading mb-3 flex items-center justify-between">
        <RecordBlockHeading icon={ListChecks}>
          {isComplete ? "Dossier médical complet" : "Complétude du dossier"}
        </RecordBlockHeading>
        <span
          aria-label={`${completed} informations renseignées sur ${checks.length}`}
          className="rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 text-xs dark:border-emerald-800/40 dark:bg-emerald-950/50 dark:text-emerald-300"
        >
          {completed}/{checks.length}
        </span>
      </div>
      <div
        aria-label="Informations clés du dossier"
        aria-valuemax={checks.length}
        aria-valuemin={0}
        aria-valuenow={completed}
        className="medical-health-progress mb-4 h-2 w-full overflow-hidden rounded-full bg-muted/80 shadow-inner"
        role="progressbar"
      >
        <span
          className="block h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)] transition-[width] duration-500 ease-out"
          style={{ width: `${(completed / checks.length) * 100}%` }}
        />
      </div>

      {isComplete ? (
        <div className="medical-health-complete flex items-center gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/80 p-3 font-medium text-emerald-800 text-xs dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Check
            aria-hidden="true"
            className="shrink-0 text-emerald-600 dark:text-emerald-400"
            size={16}
          />
          <span>Toutes les informations clés sont renseignées.</span>
        </div>
      ) : (
        <div className="medical-health-actions grid gap-2">
          {missing.slice(0, 3).map((item) => (
            <button
              className="medical-health-action group flex cursor-pointer items-center justify-between rounded-xl border border-border/70 bg-muted/30 p-2.5 px-3 font-medium text-foreground text-xs transition duration-160 hover:border-border hover:bg-muted/80"
              key={item.label}
              onClick={() => onCompleteCheck(item.label)}
              type="button"
            >
              <span>{item.action}</span>
              <ArrowRight
                aria-hidden="true"
                className="shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground"
                size={14}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
