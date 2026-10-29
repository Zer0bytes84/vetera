import { CalendarPlus, FirstAid, Notebook, PencilSimple } from "@/lib/icons";
import { Download, HeartPulse } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSpeciesTheme } from "@/lib/species-theme";
import type { Owner, Patient } from "@/types/db";
import { PatientIdentity } from "./medical-record-summary";

interface PatientHeaderProps {
  children?: ReactNode;
  className?: string;
  onEditProfile: () => void;
  onNewAppointment: () => void;
  /** Opens Soins & hospitalisation > Soins filtered on this patient. */
  onOpenCare?: () => void;
  onOpenClinicalNote?: () => void;
  /** Writes a note in the record without any visit (call, advice, observation). */
  onNewOffVisitNote?: () => void;
  onExportPdf?: () => void;
  /** Ouvre le carnet de santé (une page à remettre au propriétaire). */
  onHealthCard?: () => void;
  owner?: Owner;
  patient: Patient;
}

export function PatientHeader({
  children,
  className,
  onEditProfile,
  onNewAppointment,
  onOpenCare,
  onOpenClinicalNote,
  onNewOffVisitNote,
  onExportPdf,
  onHealthCard,
  patient,
}: PatientHeaderProps) {
  const speciesTheme = getSpeciesTheme(patient.species);

  return (
    <section
      className={cn("patient-identity medical-patient-header relative overflow-hidden", className)}
      aria-label={`Identité de ${patient.name}`}
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
          {onNewOffVisitNote && (
            // The primary action when no visit is under way to carry a note.
            <Button
              size="sm"
              variant={onOpenClinicalNote ? "outline" : "default"}
              className={cn("medical-action", onOpenClinicalNote ? "medical-action-outline" : "medical-action-primary")}
              onClick={onNewOffVisitNote}
            >
              <PencilSimple className="size-4" aria-hidden="true" />
              Note hors visite
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
          {onOpenCare && (
            <Button
              variant="outline"
              size="sm"
              className="medical-action medical-action-outline"
              onClick={onOpenCare}
            >
              <FirstAid className="size-4" aria-hidden="true" />
              Ouvrir les soins
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="medical-action medical-action-ghost"
            onClick={onEditProfile}
          >
            <PencilSimple className="size-4" aria-hidden="true" />
            Modifier
          </Button>
          {onExportPdf && <Button variant="outline" size="sm" className="medical-action medical-action-outline" onClick={onExportPdf}>
            <Download className="size-4" strokeWidth={1} aria-hidden="true" />
            Exporter en PDF
          </Button>}
          {onHealthCard && <Button variant="outline" size="sm" className="medical-action medical-action-outline" onClick={onHealthCard} data-testid="patient-health-card">
            <HeartPulse className="size-4" strokeWidth={1} aria-hidden="true" />
            Carnet de santé
          </Button>}
        </div>
      </div>
      {children}
    </section>
  );
}
