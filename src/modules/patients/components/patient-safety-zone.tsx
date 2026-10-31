import { AlertTriangle } from "@/lib/icons";
import type { Patient } from "@/types/db";
import type { HealthCardTreatment } from "../health-card/health-card-data";
import { isClinicalSignal, recordDate } from "./medical-record-summary";

interface PatientSafetyZoneProps {
  patient: Patient;
  treatments: { hidden: number; items: HealthCardTreatment[] };
}

function treatmentLine(treatment: HealthCardTreatment) {
  const until =
    treatment.until === "long_cours"
      ? "au long cours"
      : treatment.until
        ? `jusqu’au ${recordDate(treatment.until)}`
        : undefined;
  return [treatment.name, treatment.dose, treatment.frequency, until].filter(Boolean).join(" · ");
}

/**
 * What must be known before touching the animal. The allergy dominates and is
 * the only red surface; the current treatment, the restraint and the history
 * stay neutral.
 */
export function PatientSafetyZone({ patient, treatments }: PatientSafetyZoneProps) {
  const allergies = patient.allergies?.trim();
  const chronic = patient.chronicConditions?.trim();
  const restraint = patient.restraint?.trim();
  const hasAllergy = isClinicalSignal(allergies);

  return (
    <section className="medical-safety" aria-label="Sécurité du patient">
      {hasAllergy ? (
        <div className="medical-safety-allergy" role="alert">
          <AlertTriangle size={20} className="shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <strong>Allergie</strong>
            <p>{allergies}</p>
          </div>
        </div>
      ) : (
        <p className="medical-safety-quiet">
          {allergies ? "Aucune allergie connue" : "Allergies non renseignées"}
        </p>
      )}
      <dl className="medical-safety-facts">
        <div>
          <dt>Traitement en cours</dt>
          <dd>
            {treatments.items.length ? (
              <ul>
                {treatments.items.map((treatment) => (
                  <li key={`${treatment.name}-${treatment.since}`}>{treatmentLine(treatment)}</li>
                ))}
                {treatments.hidden ? <li>et {treatments.hidden} autre{treatments.hidden > 1 ? "s" : ""}</li> : null}
              </ul>
            ) : (
              "Aucun"
            )}
          </dd>
        </div>
        <div>
          <dt>Contention</dt>
          <dd>{restraint || "Non renseignée"}</dd>
        </div>
        {isClinicalSignal(chronic) ? (
          <div>
            <dt>Antécédents</dt>
            <dd>{chronic}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
