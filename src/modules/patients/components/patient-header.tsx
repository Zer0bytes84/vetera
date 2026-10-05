import { CalendarPlus, Notebook, PencilSimple } from "@/lib/icons";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  return (
    <section
      className={cn(
        "patient-identity overflow-hidden rounded-[14px] border border-border bg-card",
        className
      )}
      aria-label={`Identité et alertes de ${patient.name}`}
    >
      <div className="flex flex-col gap-5 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
        <PatientIdentity patient={patient} />
        <div className="flex shrink-0 flex-wrap gap-2">
          {onOpenClinicalNote && (
            <Button variant="outline" size="sm" onClick={onOpenClinicalNote}>
              <Notebook className="size-4" />
              Note clinique
            </Button>
          )}
          <Button size="sm" onClick={onNewAppointment}>
            <CalendarPlus className="size-4" />
            Rendez-vous
          </Button>
          <Button variant="ghost" size="sm" onClick={onEditProfile}>
            <PencilSimple className="size-4" />
            Modifier
          </Button>
        </div>
      </div>
      <ClinicalAlerts patient={patient} />
      {children}
    </section>
  );
}
