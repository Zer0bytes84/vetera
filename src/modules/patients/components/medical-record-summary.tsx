import type { KeyboardEvent } from "react";
import { parseDashboardDate } from "@/modules/dashboard/v2/model";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertTriangle, Phone, Mail } from "@/lib/icons";
import { getSpeciesGlyph } from "@/lib/species-icons";
import { PATIENT_STATUS_META } from "@/config/status-meta";
import type { Owner, Patient } from "@/types/db";
import { computeAge } from "../lib/age";
import "../medical-record.css";

export function recordDate(value?: string | null, withTime = false) {
  if (!value) return "Non renseignée";
  const parsed = parseDashboardDate(value);
  if (!parsed) return "Date indisponible";
  return parsed.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function PatientIdentity({
  patient,
  compact = false,
}: {
  patient: Patient;
  compact?: boolean;
}) {
  const age = computeAge(patient.dateOfBirth);
  const ageLabel = !age
    ? "Âge non renseigné"
    : age.years
      ? `${age.years} an${age.years > 1 ? "s" : ""}${age.months ? ` ${age.months} mois` : ""}`
      : age.months
        ? `${age.months} mois`
        : `${age.days} jour${age.days > 1 ? "s" : ""}`;
  const status = PATIENT_STATUS_META[patient.status];
  return (
    <div
      className={`medical-identity ${compact ? "medical-identity-compact" : ""}`}
    >
      <div className="medical-avatar">
        {patient.avatarUrl ? (
          <img src={patient.avatarUrl} alt="" />
        ) : (
          <HugeiconsIcon
            icon={getSpeciesGlyph(patient.species)}
            size={30}
            strokeWidth={1.5}
          />
        )}
      </div>
      <div className="min-w-0">
        <div className="medical-identity-line">
          <h1>{patient.name}</h1>
          <span className={`medical-status ${status.className}`}>
            {status.label}
          </span>
        </div>
        <p>
          {[
            patient.species,
            patient.breed,
            patient.sex === "M" ? "Mâle" : "Femelle",
            ageLabel,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <span className="medical-record-id">
          Dossier #{patient.id.slice(0, 8)} · Créé le{" "}
          {recordDate(patient.createdAt)}
        </span>
      </div>
    </div>
  );
}

export function ClinicalAlerts({ patient }: { patient: Patient }) {
  // Empty data must not be presented as a confirmed absence of clinical risk.
  const hasAllergies = Boolean(patient.allergies?.trim());
  return (
    <div
      className="medical-alerts"
      aria-label="Informations cliniques importantes"
    >
      <div
        className={`medical-alert ${hasAllergies ? "medical-alert-critical" : ""}`}
      >
        {hasAllergies && <AlertTriangle size={18} aria-hidden="true" />}
        <div>
          <h3>Allergies</h3>
          <p>
            {patient.allergies?.trim() ||
              "Non renseignées · à confirmer avec le propriétaire"}
          </p>
        </div>
      </div>
      <div className="medical-alert">
        <div>
          <h3>Antécédents et maladies chroniques</h3>
          <p>{patient.chronicConditions?.trim() || "Non renseignés"}</p>
        </div>
      </div>
    </div>
  );
}

export function OwnerContact({ owner }: { owner?: Owner }) {
  return (
    <section className="medical-owner" aria-label="Coordonnées du propriétaire">
      <h3>Propriétaire</h3>
      <p className="medical-owner-name">
        {owner
          ? `${owner.firstName} ${owner.lastName}`.trim()
          : "Non renseigné"}
      </p>
      {owner?.phone && (
        <a href={`tel:${owner.phone}`}>
          <Phone size={15} aria-hidden="true" />
          {owner.phone}
        </a>
      )}
      {owner?.email && (
        <a href={`mailto:${owner.email}`}>
          <Mail size={15} aria-hidden="true" />
          {owner.email}
        </a>
      )}
      {(owner?.address || owner?.city) && (
        <p className="medical-secondary">
          {[owner.address, owner.city].filter(Boolean).join(", ")}
        </p>
      )}
      {owner?.communicationNotes && (
        <p className="medical-secondary whitespace-pre-wrap">
          {owner.communicationNotes}
        </p>
      )}
    </section>
  );
}

export function handleRecordTabKeys(event: KeyboardEvent<HTMLDivElement>) {
  const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
  if (!keys.includes(event.key)) return;
  const tabs = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=tab]")
  );
  const index = tabs.indexOf(event.target as HTMLButtonElement);
  if (index < 0) return;
  event.preventDefault();
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
          tabs.length;
  tabs[next]?.focus();
  tabs[next]?.click();
}
