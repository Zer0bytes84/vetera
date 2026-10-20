import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Owner, Patient } from "@/types/db";
import { formatOwnerName } from "./agenda-shared";

/**
 * Quick dossier search of the Nouveau RDV form: one field for the patient,
 * the owner, the phone or the species, then the matching dossiers to pick.
 * Shared so every place choosing a patient looks and behaves the same.
 */
export function PatientDossierSearch({
  autoFocus,
  className,
  description = "Sélectionnez directement le bon dossier. Le propriétaire et le patient seront remplis ensemble.",
  emptyMessage = "Aucun dossier trouvé. Créez d’abord le patient dans le module Patients, puis revenez ici.",
  label = "Recherche rapide patient / propriétaire",
  matches,
  onChange,
  onSelect,
  selectedPatientId,
  value,
}: {
  autoFocus?: boolean;
  className?: string;
  description?: string;
  emptyMessage?: string;
  label?: string;
  matches: ReadonlyArray<{ owner?: Owner; patient: Patient }>;
  onChange: (value: string) => void;
  onSelect: (patientId: string) => void;
  selectedPatientId?: string;
  value: string;
}) {
  return (
    <Field className={className}>
      <FieldLabel>{label}</FieldLabel>
      <Input
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Nom de l’animal ou du propriétaire, téléphone, espèce…"
        value={value}
      />
      <FieldDescription>{description}</FieldDescription>
      {value.trim() ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {matches.length > 0 ? (
            matches.map(({ owner, patient }) => (
              <button
                aria-pressed={selectedPatientId === patient.id}
                className={cn(
                  "cursor-pointer rounded-2xl border px-4 py-3 text-left transition hover:border-primary/40 hover:bg-primary/5",
                  selectedPatientId === patient.id
                    ? "border-primary bg-primary/10"
                    : "border-border/80 bg-background/70"
                )}
                key={patient.id}
                onClick={() => onSelect(patient.id)}
                type="button"
              >
                <span className="block font-medium text-foreground">
                  {patient.name}
                </span>
                <span className="mt-1 block text-muted-foreground text-sm">
                  {patient.species}
                  {patient.breed ? ` · ${patient.breed}` : ""} ·{" "}
                  {formatOwnerName(owner)}
                </span>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed p-4 text-muted-foreground text-sm sm:col-span-2">
              {emptyMessage}
            </div>
          )}
        </div>
      ) : null}
    </Field>
  );
}
