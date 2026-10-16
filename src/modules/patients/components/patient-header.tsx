import { CalendarPlus, Notebook, PencilSimple } from "@/lib/icons";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSpeciesTheme } from "@/lib/species-theme";
import type { Owner, Patient } from "@/types/db";
import { ClinicalAlerts, PatientIdentity } from "./medical-record-summary";

interface PatientHeaderProps {
  children?: ReactNode;
  className?: string;
  onEditProfile: () => void;
  onNewAppointment: () => void;
  onOpenClinicalNote?: () => void;
  owner?: Owner;
  patient: Patient;
}

export function PatientHeader({
  children,
  className,
  onEditProfile,
  onNewAppointment,
  onOpenClinicalNote,
  patient,
}: PatientHeaderProps) {
  const speciesTheme = getSpeciesTheme(patient.species);

  return (
    <section
      className={cn("patient-identity medical-patient-header relative overflow-hidden", className)}
      aria-label={`Identité et alertes de ${patient.name}`}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${speciesTheme.accentHex} 0%, ${speciesTheme.accentHex}88 40%, transparent 100%)`,
        }}
        aria-hidden="true"
      />
      <div className="medical-header-main">
        <PatientIdentity patient={patient} />
        <div className="medical-header-actions" aria-label="Actions du dossier">
          {onOpenClinicalNote && (
            <Button
              size="sm"
              className="medical-action medical-action-primary"
              onClick={onOpenClinicalNote}
            >
              <Notebook className="size-4" aria-hidden="true" />
              Note clinique
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="medical-action medical-action-outline"
            onClick={onNewAppointment}
          >
            <CalendarPlus className="size-4" aria-hidden="true" />
            Planifier un rendez-vous
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="medical-action medical-action-ghost"
            onClick={onEditProfile}
          >
            <PencilSimple className="size-4" aria-hidden="true" />
            Modifier
          </Button>
        </div>
      </div>
      <ClinicalAlerts patient={patient} />
      {children}
    </section>
  );
}
