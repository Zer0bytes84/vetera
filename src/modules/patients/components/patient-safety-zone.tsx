import { ShieldCheck } from "lucide-react";
import { AlertTriangle } from "@/lib/icons";
import type { Patient } from "@/types/db";
import { isClinicalSignal } from "./medical-record-summary";

interface PatientSafetyZoneProps {
  patient: Patient;
  /** The record shows the allergy on the patient's line: the zone then holds only the restraint. */
  allergyElsewhere?: boolean;
}

/**
 * What must be known before touching the animal. An allergy dominates: a red, rounded block, the only alarm colour of the
 * record, with the restraint beside it when there is one. When nothing is recorded, one discreet line is enough: no band to
 * say « not filled in ».
 */
export function PatientSafetyZone({ patient, allergyElsewhere = false }: PatientSafetyZoneProps) {
  const allergies = patient.allergies?.trim();
  const restraint = patient.restraint?.trim();
  const hasAllergy = isClinicalSignal(allergies);

  if (hasAllergy && allergyElsewhere) {
    return restraint ? (
      <section aria-label="Sécurité du patient" className="patient-safety">
        <p className="patient-safety-note text-[0.8125rem] text-muted-foreground">
          Contention <strong className="font-medium text-foreground">{restraint}</strong>
        </p>
      </section>
    ) : null;
  }

  if (hasAllergy) {
    return (
      <section
        aria-label="Sécurité du patient"
        className="patient-safety flex flex-wrap items-center gap-3"
      >
        <p
          className="patient-safety-allergy inline-flex min-w-0 items-center gap-2 rounded-2xl bg-negative/10 px-4 py-2.5 text-[0.875rem] text-negative"
          role="alert"
        >
          <AlertTriangle aria-hidden="true" className="shrink-0" size={16} />
          <span className="font-medium">Allergie</span>
          <strong className="font-semibold">{allergies}</strong>
        </p>
        {restraint ? (
          <p className="patient-safety-note text-[0.8125rem] text-muted-foreground">
            Contention{" "}
            <strong className="font-medium text-foreground">{restraint}</strong>
          </p>
        ) : null}
      </section>
    );
  }

  const quiet = [
    allergies ? "Aucune allergie connue" : "Allergies non renseignées",
    restraint ? `Contention : ${restraint}` : "contention non renseignée",
  ].join(" · ");
  return (
    <section aria-label="Sécurité du patient" className="patient-safety">
      <p className="patient-safety-note inline-flex items-center gap-2 px-1 text-[0.8125rem] text-muted-foreground">
        <ShieldCheck
          aria-hidden="true"
          className="size-4 shrink-0"
          strokeWidth={1.75}
        />
        {quiet}
      </p>
    </section>
  );
}
