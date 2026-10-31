import { CalendarPlus, FirstAid, Notebook, PencilSimple } from "@/lib/icons";
import { Download, HeartPulse } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSpeciesTheme } from "@/lib/species-theme";
import { isTauriRuntime } from "@/services/browser-store";
import type { Owner, Patient } from "@/types/db";
import { formatDinars } from "@/utils/display-format";
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

/**
 * What the owner still owes, over every issued invoice in their name (all
 * their animals), in centimes. Null while unknown: nothing is shown then.
 */
function useOwnerBalance(ownerId?: string) {
  const [balance, setBalance] = useState<{ ownerId: string; cents: number } | null>(null);
  useEffect(() => {
    if (!ownerId || !isTauriRuntime()) return;
    let cancelled = false;
    void import("@/services/billingService")
      .then(({ listInvoices }) => listInvoices())
      .then((invoices) => {
        if (cancelled) return;
        const cents = invoices
          .filter((invoice) => invoice.ownerId === ownerId && invoice.documentStatus === "issued")
          .reduce((sum, invoice) => sum + Math.max(0, invoice.balanceAmount), 0);
        setBalance({ ownerId, cents });
      })
      .catch(() => {
        // The record stays readable without the balance.
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId]);
  return balance && balance.ownerId === ownerId ? balance.cents : null;
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
  owner,
  patient,
}: PatientHeaderProps) {
  const speciesTheme = getSpeciesTheme(patient.species);
  const balance = useOwnerBalance(owner?.id);
  // One primary action, on the right of the card: the note of the visit under
  // way, or a note without visit when none is.
  const primary = onOpenClinicalNote
    ? { label: "Note clinique", icon: Notebook, onClick: onOpenClinicalNote }
    : onNewOffVisitNote
      ? { label: "Note hors visite", icon: PencilSimple, onClick: onNewOffVisitNote }
      : null;

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
        <PatientIdentity owner={owner} patient={patient} showIdentifiers={false} />
        <div className="medical-header-aside">
          {balance !== null ? (
            <p className="medical-owner-balance">
              Solde du propriétaire <strong>{formatDinars(balance / 100)}</strong>
            </p>
          ) : null}
          {primary ? (
            <Button
              size="sm"
              className="medical-action medical-action-primary"
              onClick={primary.onClick}
            >
              <primary.icon className="size-4" aria-hidden="true" />
              {primary.label}
            </Button>
          ) : null}
        </div>
        <div className="medical-header-actions" aria-label="Actions du dossier">
          {onOpenClinicalNote && onNewOffVisitNote && (
            <Button
              size="sm"
              variant="outline"
              className="medical-action medical-action-outline"
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
