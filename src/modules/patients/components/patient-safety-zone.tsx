import { AlertTriangle } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { Patient } from "@/types/db";
import { isClinicalSignal } from "./medical-record-summary";

interface PatientSafetyZoneProps {
  patient: Patient;
}

/**
 * What must be known before touching the animal, on one flat band: the
 * allergy, the only red mark of the record, and the restraint, neutral, on
 * the same line. Treatments live in the clinical summary.
 */
export function PatientSafetyZone({ patient }: PatientSafetyZoneProps) {
  const allergies = patient.allergies?.trim();
  const restraint = patient.restraint?.trim();
  const hasAllergy = isClinicalSignal(allergies);

  return (
    <section className="medical-safety" aria-label="Sécurité du patient">
      <span className="medical-safety-label">Sécurité</span>
      {hasAllergy ? (
        <p className="medical-safety-pill is-allergy" role="alert">
          <AlertTriangle size={14} className="shrink-0" aria-hidden="true" />
          <span>Allergie</span>
          <strong>{allergies}</strong>
        </p>
      ) : (
        <p className="medical-safety-pill">
          {allergies ? "Aucune allergie connue" : "Allergies non renseignées"}
        </p>
      )}
      <p className={cn("medical-safety-pill", !restraint && "is-empty")}>
        <span>Contention</span>
        <strong>{restraint || "non renseignée"}</strong>
      </p>
    </section>
  );
}
