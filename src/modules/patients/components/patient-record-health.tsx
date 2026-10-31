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
      className={cn("medical-record-health p-5 rounded-2xl border border-border/80 bg-card shadow-xs", className)}
      aria-label="Complétude du dossier"
    >
      <div className="medical-health-heading flex items-center justify-between mb-3">
        <RecordBlockHeading icon={ListChecks}>
          {isComplete ? "Dossier médical complet" : "Complétude du dossier"}
        </RecordBlockHeading>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/40"
          aria-label={`${completed} informations renseignées sur ${checks.length}`}
        >
          {completed}/{checks.length}
        </span>
      </div>
      <div
        className="medical-health-progress h-2 w-full rounded-full bg-muted/80 overflow-hidden shadow-inner mb-4"
        role="progressbar"
        aria-label="Informations clés du dossier"
        aria-valuemin={0}
        aria-valuemax={checks.length}
        aria-valuenow={completed}
      >
        <span
          className="h-full block rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)] transition-[width] duration-500 ease-out"
          style={{ width: `${(completed / checks.length) * 100}%` }}
        />
      </div>

      {isComplete ? (
        <div className="medical-health-complete flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50/80 text-emerald-800 border border-emerald-200/80 text-xs font-medium dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
          <Check size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
          <span>Toutes les informations clés sont renseignées.</span>
        </div>
      ) : (
        <div className="medical-health-actions grid gap-2">
          {missing.slice(0, 3).map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onCompleteCheck(item.label)}
              className="medical-health-action flex items-center justify-between p-2.5 px-3 rounded-xl border border-border/70 bg-muted/30 hover:bg-muted/80 hover:border-border text-xs text-foreground font-medium transition duration-160 cursor-pointer group"
            >
              <span>{item.action}</span>
              <ArrowRight size={14} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition shrink-0" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
