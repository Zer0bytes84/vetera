import type { KeyboardEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Phone, Mail, User } from "@/lib/icons";
import { getSpeciesGlyph } from "@/lib/species-icons";
import { getSpeciesTheme } from "@/lib/species-theme";
import { getPatientStatusMeta } from "@/config/status-meta";
import type { Owner, Patient } from "@/types/db";
import { computeAge, formatAgeFr } from "../lib/age";
import { normalizeDate } from "./patients-shared";
import { formatPhone } from "@/utils/display-format";
import { cn } from "@/lib/utils";
import { RecordBlockHeading } from "./record-block-heading";
import "../medical-record.css";

export function recordDate(value?: string | null, withTime = false) {
  if (!value) return "À compléter";
  const parsed = normalizeDate(value);
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
  owner,
  compact = false,
  showIdentifiers = true,
}: {
  patient: Patient;
  /** The owner's name stands next to the patient's, as bold as it. */
  owner?: Owner;
  compact?: boolean;
  /** Chip, tattoo and registration date; the record shows them in Identité. */
  showIdentifiers?: boolean;
}) {
  const age = computeAge(patient.dateOfBirth);
  const ageLabel = age ? formatAgeFr(age) : null;
  const status = getPatientStatusMeta(patient.status);
  const speciesTheme = getSpeciesTheme(patient.species);
  const sexLabel =
    patient.sex === "M" ? "Mâle" : patient.sex === "F" ? "Femelle" : null;
  const sexSymbol = patient.sex === "M" ? "♂" : patient.sex === "F" ? "♀" : "";

  return (
    <div
      className={`medical-identity ${compact ? "medical-identity-compact" : ""}`}
    >
      <div
        className={cn(
          "medical-avatar relative shrink-0 transition duration-200 hover:scale-[1.03]",
          speciesTheme.avatarBg,
          speciesTheme.avatarBorder,
          speciesTheme.avatarGlow
        )}
      >
        {patient.avatarUrl ? (
          <img src={patient.avatarUrl} alt={patient.name} className="h-full w-full object-cover" />
        ) : (
          <HugeiconsIcon
            icon={getSpeciesGlyph(patient.species)}
            size={compact ? 24 : 36}
            strokeWidth={1.5}
            className={cn("transition-transform duration-200", speciesTheme.avatarIconColor)}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="medical-identity-line flex flex-wrap items-center gap-2">
          <h1 className="medical-identity-name text-2xl font-bold tracking-tight text-foreground">{patient.name}</h1>
          {patient.reference ? (
            <span className="medical-reference" title="Référence patient, attribuée à la création et jamais modifiée">
              {patient.reference}
            </span>
          ) : null}
          {/* The status is the only tag with a hue; species and sex are facts. */}
          <span className={cn("medical-status", status.className)}>
            <span className="medical-status-dot" aria-hidden="true" />
            {status.label}
          </span>
        </div>

        {/* What the animal is, in one sober line: species, breed, sex, age, chip. */}
        <p className="medical-identity-meta">
          {[
            patient.species,
            patient.breed,
            sexLabel
              ? `${sexLabel}${patient.sterilized ? (patient.sex === "F" ? " stérilisée" : " stérilisé") : ""} ${sexSymbol}`.trim()
              : patient.sterilized
                ? "Stérilisé"
                : null,
            ageLabel,
            !showIdentifiers && patient.chipNumber?.trim() ? `Puce ${patient.chipNumber.trim()}` : null,
          ]
            .filter(Boolean)
            .map((part, index) => (
              <span key={index}>{part}</span>
            ))}
        </p>

        {owner ? (
          <p className="medical-identity-owner">
            <span>Propriétaire</span>
            <strong>{`${owner.firstName} ${owner.lastName}`.trim()}</strong>
            {owner.phone ? <span className="medical-identity-phone">{formatPhone(owner.phone)}</span> : null}
          </p>
        ) : null}

        {showIdentifiers ? (
        <div className="medical-record-id flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {patient.chipNumber?.trim() ? (
            <>
              <span className="font-mono tabular-nums text-foreground/70" title="Puce d’identification">
                Puce {patient.chipNumber.trim()}
              </span>
              <span aria-hidden="true" className="text-muted-foreground/40">·</span>
            </>
          ) : null}
          {patient.tattooNumber?.trim() ? (
            <>
              <span className="font-mono tabular-nums text-foreground/70" title="Tatouage">
                Tatouage {patient.tattooNumber.trim()}
              </span>
              <span aria-hidden="true" className="text-muted-foreground/40">·</span>
            </>
          ) : null}
          <span>Enregistré le {recordDate(patient.createdAt)}</span>
        </div>
        ) : null}
      </div>
    </div>
  );
}

// Les réponses négatives explicites ne constituent pas une alerte clinique.
export function isClinicalSignal(value?: string) {
  if (!value?.trim()) return false;
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[’']/g, " ")
    .replace(/[.!]/g, "")
    .trim();
  return ![
    "aucune",
    "aucun",
    "neant",
    "ras",
    "r a s",
    "non",
    "aucune allergie",
    "aucune allergie connue",
    "pas d allergie",
    "pas d allergies",
    "aucun antecedent",
    "aucune maladie chronique",
  ].includes(normalized);
}

export function OwnerContact({ owner }: { owner?: Owner }) {
  if (!owner) {
    return (
      <section
        className="medical-owner p-5"
        aria-label="Coordonnées du propriétaire"
      >
        <RecordBlockHeading icon={User}>Propriétaire</RecordBlockHeading>
        <p className="medical-contact-hint text-xs text-muted-foreground">
          Associez un propriétaire depuis les informations du patient.
        </p>
      </section>
    );
  }

  const initials =
    `${owner.firstName?.[0] || ""}${owner.lastName?.[0] || ""}`.toUpperCase() ||
    "P";
  const phoneLabel = formatPhone(owner.phone);

  return (
    <section className="medical-owner p-5" aria-label="Coordonnées du propriétaire">
      <RecordBlockHeading icon={User}>Propriétaire</RecordBlockHeading>
      <div className="medical-owner-card flex items-center gap-3.5 p-3 rounded-xl bg-muted/40 border border-border/60">
        <div
          className="medical-owner-avatar size-11 rounded-xl flex items-center justify-center font-bold text-sm text-white bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm shrink-0"
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="medical-owner-name font-semibold text-sm text-foreground">
            {owner.firstName} {owner.lastName}
          </p>
          {(owner.address || owner.city) && (
            <p className="medical-owner-address text-xs text-muted-foreground truncate mt-0.5">
              {[owner.address, owner.city].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </div>

      <div className="medical-owner-links mt-3 flex flex-wrap gap-2">
        {owner.phone && (
          <a
            href={`tel:${owner.phone}`}
            title={`Appeler ${phoneLabel}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 transition-colors dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/40"
          >
            <Phone size={14} className="shrink-0" aria-hidden="true" />
            <span>{phoneLabel}</span>
          </a>
        )}
        {owner.email && (
          <a
            href={`mailto:${owner.email}`}
            title={`Écrire à ${owner.email}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200/80 transition-colors dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/40"
          >
            <Mail size={14} className="shrink-0" aria-hidden="true" />
            <span>{owner.email}</span>
          </a>
        )}
      </div>

      {owner.communicationNotes && (
        <div className="medical-contact-note mt-3 p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/60 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800/40">
          <span className="font-semibold block mb-0.5">Consigne contact</span>
          {owner.communicationNotes}
        </div>
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
  tabs[next]?.scrollIntoView({ block: "nearest", inline: "nearest" });
}
