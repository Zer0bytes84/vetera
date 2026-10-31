import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Vaccination } from "@/types/db";
import { usePatientReminders } from "@/modules/patient-reminders/use-patient-reminders";
import { countdownLabel, preventionCountdowns } from "../lib/prevention";
import { recordDate } from "./medical-record-summary";

interface PatientPreventionProps {
  now: number;
  onOpenVaccinations: () => void;
  patientId: string;
  vaccinations: readonly Vaccination[];
}

/** Boosters and reminders as neutral countdowns; red only once late. */
export function PatientPrevention({ now, onOpenVaccinations, patientId, vaccinations }: PatientPreventionProps) {
  const { reminders, types, error } = usePatientReminders();
  const items = useMemo(
    () => preventionCountdowns({ now: new Date(now), patientId, reminders, types, vaccinations }),
    [now, patientId, reminders, types, vaccinations]
  );

  return (
    <section className="medical-prevention" aria-labelledby="medical-prevention-title">
      <div className="medical-prevention-header patient-summary-heading-row">
        <h3 className="patient-summary-heading" id="medical-prevention-title">Rappels et prévention</h3>
        <button className="patient-summary-link" type="button" onClick={onOpenVaccinations}>
          Vaccinations
        </button>
      </div>
      {items.length ? (
        <ul className="medical-prevention-list">
          {items.map((item) => (
            <li key={item.id} className={cn(item.days < 0 && "is-late")}>
              <span className="medical-prevention-label">{item.label}</span>
              <span className="medical-prevention-count">{countdownLabel(item.days)}</span>
              <span className="medical-prevention-date">{recordDate(item.dueDate)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="medical-prevention-empty">Aucun rappel prévu.</p>
      )}
      {error ? <p className="medical-prevention-empty">Les rappels médicaux n’ont pas pu être lus.</p> : null}
    </section>
  );
}
