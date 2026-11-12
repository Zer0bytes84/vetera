import "@/design-system/page-header-line.css";
import { CalendarPlus, FirstAid, Notebook, PencilSimple } from "@/lib/icons";
import { Archive, ArchiveRestore, ChevronDown, Download, HeartPulse, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSpeciesTheme } from "@/lib/species-theme";
import { speciesIcon } from "@/lib/species-icon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { getPatientStatusMeta } from "@/config/status-meta";
import { computeAge, formatAgeFr } from "../lib/age";
import { isTauriRuntime } from "@/services/browser-store";
import type { Invoice, Owner, Patient } from "@/types/db";
import { formatDinars, formatPhone } from "@/utils/display-format";
import { AlertTriangle } from "@/lib/icons";
import { isClinicalSignal } from "./medical-record-summary";


/**
 * What the owner still owes, over every issued invoice in their name (all
 * their animals), in centimes. Null while unknown: nothing is shown then.
 */
export function summarizeOwnerBalance(
  invoices: Pick<Invoice, "ownerId" | "documentStatus" | "balanceAmount" | "settlementStatus">[],
  ownerId: string,
) {
  const open = invoices.filter((invoice) => invoice.ownerId === ownerId && invoice.documentStatus === "issued");
  return {
    cents: open.reduce((sum, invoice) => sum + Math.max(0, invoice.balanceAmount), 0),
    late: open.some((invoice) => invoice.balanceAmount > 0 && invoice.settlementStatus === "overdue"),
  };
}

function useOwnerBalance(ownerId?: string) {
  const [balance, setBalance] = useState<{
    ownerId: string;
    cents: number;
    late: boolean;
  } | null>(null);
  useEffect(() => {
    if (!ownerId || !isTauriRuntime()) return;
    let cancelled = false;
    void import("@/services/billingService")
      .then(({ listInvoices }) => listInvoices())
      .then((invoices) => {
        if (cancelled) return;
        const { cents, late } = summarizeOwnerBalance(invoices, ownerId);
        setBalance({ ownerId, cents, late });
      })
      .catch(() => {
        // The record stays readable without the balance.
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId]);
  return balance && balance.ownerId === ownerId ? balance : null;
}

const STATUS_TONE: Record<string, StatusTone> = {
  sante: "positive",
  traitement: "brand",
  hospitalise: "warning",
  decede: "neutral",
};

/**
 * The record's header, on the model of the other pages: one line, the patient's name with its identity in context (species,
 * breed, owner), the ID badge, the status as a pill, and on the right the owner's balance and the main note button. The way
 * back to the list is the round button before the name.
 */
export function PatientRecordHeader({
  owner,
  patient,
}: {
  owner?: Owner;
  patient: Patient;
}) {
  const speciesTheme = getSpeciesTheme(patient.species);
  const balance = useOwnerBalance(owner?.id);
  const status = getPatientStatusMeta(patient.status);
  const age = computeAge(patient.dateOfBirth);
  const sex =
    patient.sex === "M" ? "Mâle" : patient.sex === "F" ? "Femelle" : null;
  // The patient's line: the allergy first, then the restraint, then who the animal is; then the owner, with their phone and their
  // balance. When one of them is not recorded it says so, discreetly, in the same place.
  const allergyText = patient.allergies?.trim();
  const allergy = isClinicalSignal(allergyText) ? allergyText! : "";
  const restraint = patient.restraint?.trim();
  const facts = [
    patient.species,
    patient.breed,
    sex
      ? `${sex}${patient.sterilized ? (patient.sex === "F" ? " stérilisée" : " stérilisé") : ""}`
      : patient.sterilized
        ? "Stérilisé"
        : null,
    age ? formatAgeFr(age) : null,
    patient.chipNumber?.trim() ? `Puce ${patient.chipNumber.trim()}` : null,
  ].filter(Boolean);
  const ownerFacts = [
    owner ? `${owner.firstName} ${owner.lastName}`.trim() : null,
    owner?.phone ? formatPhone(owner.phone) : null,
  ].filter(Boolean);
  // What the owner owes is the owner's information: amber when due, red when late, nothing at zero.
  const due = balance && balance.cents > 0 ? balance : null;
  const context = (
    <>
      {allergy ? (
        <span className="patient-record-allergy mr-2 inline-flex items-center gap-1.5 rounded-full bg-negative/10 px-2.5 py-0.5 align-middle text-[0.8125rem] font-medium text-negative" role="alert">
          <AlertTriangle aria-hidden="true" className="shrink-0" size={13} />
          Allergie : {allergy}
        </span>
      ) : (
        <span className="patient-record-allergy-note mr-2 text-muted-foreground/80">
          {allergyText ? "Aucune allergie connue" : "Allergies non renseignées"} ·
        </span>
      )}
      <span className={restraint ? "mr-2" : "mr-2 text-muted-foreground/80"}>
        {restraint ? `Contention : ${restraint}` : "Contention non renseignée"} ·
      </span>
      {facts.join(" · ")}
      {ownerFacts.length ? (
        <>
          {facts.length ? " · " : ""}
          {ownerFacts.join(" · ")}
        </>
      ) : null}
      {due ? (
        <StatusPill className="ml-2 align-middle" size="sm" tone={due.late ? "negative" : "warning"}>
          {due.late ? "Solde en retard" : "Solde dû"} {formatDinars(due.cents / 100)}
        </StatusPill>
      ) : null}
    </>
  );
  const { icon: SpeciesGlyph } = speciesIcon(patient.species);
  return (
    <div
      className="page-header page-header-line patient-record-heading"
      data-page-title={patient.name}
      data-slot="page-header"
    >
      <div className="page-header-lead">
        <span
          aria-hidden="true"
          className={cn(
            "grid size-11 shrink-0 place-items-center overflow-hidden rounded-full",
            speciesTheme.avatarBg,
            speciesTheme.avatarIconColor,
          )}
        >
          {patient.avatarUrl ? (
            <img
              alt=""
              className="size-full object-cover"
              src={patient.avatarUrl}
            />
          ) : (
            <SpeciesGlyph className="size-5" strokeWidth={1.5} />
          )}
        </span>
        <div className="min-w-0">
          <h1 className="page-header-title">
            <span className="page-header-name">{patient.name}</span>
            {patient.reference ? (
              <StatusPill
                className="ml-2 align-middle font-mono"
                size="sm"
                tone="neutral"
              >
                {patient.reference}
              </StatusPill>
            ) : null}
            <StatusPill
              className="ml-1.5 align-middle"
              size="sm"
              tone={STATUS_TONE[patient.status] ?? "neutral"}
            >
              {status.label}
            </StatusPill>
          </h1>
          {/* The identity in context, under the name, smaller: never cut, the owner's name least of all. */}
          <p className="patient-record-context mt-0.5 text-[0.8125rem] leading-5 text-muted-foreground">
            {context}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * The record's two buttons, for the right of the « Chiffres clés » band: « Actions » (its own colour, a menu holding the six
 * actions of the record) and the main note button (the note of the visit under way, or a note without visit when none is).
 */
export function PatientRecordActions({
  onEditProfile,
  onNewAppointment,
  onOpenCare,
  onExportPdf,
  onHealthCard,
  onOpenClinicalNote,
  onNewOffVisitNote,
  archived,
  onArchive,
  onUnarchive,
}: {
  onEditProfile: () => void;
  onNewAppointment: () => void;
  onOpenCare?: () => void;
  onExportPdf?: () => void;
  onHealthCard?: () => void;
  onOpenClinicalNote?: () => void;
  onNewOffVisitNote?: () => void;
  archived?: boolean;
  onArchive?: () => void;
  onUnarchive?: () => void;
}) {
  // One primary action: the note of the visit under way, or a note without visit when none is.
  const primary = onOpenClinicalNote
    ? { label: "Note clinique", icon: Notebook, onClick: onOpenClinicalNote }
    : onNewOffVisitNote
      ? {
          label: "Note hors visite",
          icon: PencilSimple,
          onClick: onNewOffVisitNote,
        }
      : null;

  return (
    <div className="patient-record-actions flex items-center gap-2">

        <Button
          className="medical-action rounded-full px-4"
          data-testid="patient-record-edit"
          onClick={onEditProfile}
          size="sm"
          variant="outline"
        >
          <PencilSimple aria-hidden="true" className="size-4" />
          Modifier
        </Button>
        {/* The record's actions behind one button, as the « + » of the header holds the quick actions. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                className="medical-action rounded-full px-4"
                data-testid="patient-record-actions"
                size="sm"
              />
            }
          >
            <Zap aria-hidden="true" className="size-4" />
            Actions
            <ChevronDown aria-hidden="true" className="size-4 opacity-80" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="patient-record-actions-menu w-72" sideOffset={8}>
            <DropdownMenuItem onClick={onEditProfile}>
              <PencilSimple aria-hidden="true" className="size-4" />
              Modifier le dossier
            </DropdownMenuItem>
            {onNewOffVisitNote ? (
              <DropdownMenuItem onClick={onNewOffVisitNote}>
                <PencilSimple aria-hidden="true" className="size-4" />
                Note hors visite
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={onNewAppointment}>
              <CalendarPlus aria-hidden="true" className="size-4" />
              Planifier un rendez-vous
            </DropdownMenuItem>
            {onOpenCare ? (
              <DropdownMenuItem onClick={onOpenCare}>
                <FirstAid aria-hidden="true" className="size-4" />
                Ouvrir les soins
              </DropdownMenuItem>
            ) : null}
            {onExportPdf ? (
              <DropdownMenuItem onClick={onExportPdf}>
                <Download aria-hidden="true" className="size-4" strokeWidth={1.5} />
                Exporter en PDF
              </DropdownMenuItem>
            ) : null}
            {onHealthCard ? (
              <DropdownMenuItem data-testid="patient-health-card" onClick={onHealthCard}>
                <HeartPulse aria-hidden="true" className="size-4" strokeWidth={1.5} />
                Carnet de santé
              </DropdownMenuItem>
            ) : null}
            {archived && onUnarchive ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem data-testid="patient-unarchive" onClick={onUnarchive}>
                  <ArchiveRestore aria-hidden="true" className="size-4" />
                  Désarchiver ce dossier
                </DropdownMenuItem>
              </>
            ) : null}
            {!archived && onArchive ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem data-testid="patient-archive" onClick={onArchive}>
                  <Archive aria-hidden="true" className="size-4" />
                  Archiver ce dossier
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
        {primary ? (
          <Button
            className="medical-action medical-action-primary rounded-full px-4"
            onClick={primary.onClick}
            size="sm"
          >
            <primary.icon aria-hidden="true" className="size-4" />
            {primary.label}
          </Button>
        ) : null}
    </div>
  );
}
