import type { KeyboardEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertTriangle, Phone, Mail, Stethoscope } from "@/lib/icons";
import { getSpeciesGlyph } from "@/lib/species-icons";
import { getSpeciesTheme } from "@/lib/species-theme";
import { getPatientStatusMeta } from "@/config/status-meta";
import type { Owner, Patient } from "@/types/db";
import { computeAge, formatAgeFr } from "../lib/age";
import { normalizeDate } from "./patients-shared";
import { formatPhone } from "@/utils/display-format";
import { cn } from "@/lib/utils";
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
  compact = false,
}: {
  patient: Patient;
  compact?: boolean;
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
          "medical-avatar relative shrink-0 transition-all duration-200 hover:scale-[1.03]",
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{patient.name}</h1>
          <span className={cn("medical-status shadow-xs", status.className)}>
            <span className="relative flex size-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
              <span className="relative inline-flex rounded-full size-2 bg-current" />
            </span>
            {status.label}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-xs",
              speciesTheme.badgeBg,
              speciesTheme.badgeText,
              speciesTheme.badgeBorder
            )}
          >
            <HugeiconsIcon
              icon={getSpeciesGlyph(patient.species)}
              size={13}
              strokeWidth={1.5}
              className="shrink-0"
              aria-hidden="true"
            />
            {patient.species}
          </span>
          {patient.sex && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-xs",
                patient.sex === "M"
                  ? "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/40"
                  : "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/40"
              )}
            >
              {sexLabel} {sexSymbol}
            </span>
          )}
          {patient.sterilized ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/40 shadow-xs">
              {patient.sex === "F" ? "Stérilisée" : "Stérilisé"}
            </span>
          ) : null}
          {patient.chipNumber?.trim() ? (
            <span className="medical-id-chip font-mono text-[11px] bg-muted/60" title="Puce d'identification">
              Puce {patient.chipNumber.trim()}
            </span>
          ) : null}
          {patient.tattooNumber?.trim() ? (
            <span className="medical-id-chip font-mono text-[11px] bg-muted/60" title="Tatouage">
              Tatouage {patient.tattooNumber.trim()}
            </span>
          ) : null}
        </div>

        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground my-2 font-normal">
          {patient.breed ? (
            <span className="font-medium text-foreground/80">{patient.breed}</span>
          ) : null}
          {patient.breed && ageLabel ? <span aria-hidden="true" className="text-muted-foreground/50">·</span> : null}
          {ageLabel ? (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              {ageLabel}
            </span>
          ) : null}
        </p>

        <div className="medical-record-id flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono px-1.5 py-0.5 rounded bg-muted/70 text-foreground/70">
            #{patient.id.slice(0, 8)}
          </span>
          <span aria-hidden="true" className="text-muted-foreground/40">·</span>
          <span>Enregistré le {recordDate(patient.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

export function ClinicalAlerts({ patient }: { patient: Patient }) {
  const allergies = patient.allergies?.trim();
  const chronicConditions = patient.chronicConditions?.trim();
  // Les réponses négatives explicites ne constituent pas une alerte clinique.
  const isClinicalSignal = (value?: string) => {
    if (!value) return false;
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
  };
  const hasAllergies = isClinicalSignal(allergies);
  const hasChronic = isClinicalSignal(chronicConditions);

  if (!hasAllergies && !hasChronic) {
    return null;
  }

  return (
    <div
      className="medical-alerts grid gap-2.5 px-6 py-4 border-t border-border/70 bg-gradient-to-r from-red-500/5 via-amber-500/5 to-transparent"
      aria-label="Informations cliniques importantes"
    >
      {hasAllergies && (
        <div
          className="flex items-start gap-3 p-3.5 rounded-xl border border-rose-300/80 bg-rose-50/90 text-rose-900 shadow-xs dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-200"
          role="alert"
        >
          <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-600 dark:bg-rose-500/30 dark:text-rose-400 shrink-0 mt-0.5">
            <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <strong className="text-xs font-semibold tracking-wide uppercase text-rose-700 dark:text-rose-300">
              Allergies et contre-indications
            </strong>
            <p className="mt-0.5 text-sm font-medium leading-relaxed">{allergies}</p>
          </div>
        </div>
      )}

      {hasChronic && (
        <div className="flex items-start gap-3 p-3 rounded-xl border border-amber-300/70 bg-amber-50/80 text-amber-900 shadow-xs dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:bg-amber-500/30 dark:text-amber-400 shrink-0 mt-0.5">
            <Stethoscope size={16} className="shrink-0" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <strong className="text-xs font-semibold tracking-wide uppercase text-amber-700 dark:text-amber-300">
              Antécédents & Affections chroniques
            </strong>
            <p className="mt-0.5 text-sm font-medium leading-relaxed">{chronicConditions}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function OwnerContact({ owner }: { owner?: Owner }) {
  if (!owner) {
    return (
      <section
        className="medical-owner p-5"
        aria-label="Coordonnées du propriétaire"
      >
        <h3 className="text-sm font-semibold text-foreground mb-2">Propriétaire</h3>
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
      <h3 className="text-sm font-semibold text-foreground mb-3">Propriétaire</h3>
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
