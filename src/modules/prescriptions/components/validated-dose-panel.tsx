import {
  ExclamationTriangleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/20/solid";
import { useMemo } from "react";
import "./validated-dose-panel.css";
import { VALIDATION, validatedDose } from "../lib/validated-doses";

/*
 * The reference dose of a prescription line (19 November 2026), for the 24 molecules Aïssa read and found correct.
 * It shows the dose for the patient's weight with its calculation, the route, frequency and duration, the reference's
 * warning word for word, who validated it and when, and the RCP it comes from. When the reference gives no dose for
 * the case, it says why and quotes the reference. It never changes the line: the vet keeps writing the prescription.
 */

// Up to three decimals, the precision of the calculation: two would show 0,03 mg for 0,028 mg (red team, 19 November).
const formatDose = (value: number) =>
  value.toLocaleString("fr-FR", { maximumFractionDigits: 3 });

const validatedOn = new Date(`${VALIDATION.le}T12:00:00`).toLocaleDateString(
  "fr-FR",
  { day: "numeric", month: "short", year: "numeric" }
);

export function ValidatedDosePanel({
  medicationId,
  species,
  weightKg,
}: {
  medicationId: string | undefined;
  species: string | null;
  weightKg: number | undefined;
}) {
  const dose = useMemo(
    () => validatedDose(medicationId, species, weightKg),
    [medicationId, species, weightKg]
  );
  if (!dose) {
    return null;
  }
  const line = dose.line;
  const facts = line
    ? [
        ["Voie", line.voie],
        ["Fréquence", line.frequence],
        ["Durée", line.duree],
      ].filter((pair): pair is [string, string] => Boolean(pair[1]))
    : [];
  const amount =
    dose.kind === "dose"
      ? dose.min === dose.max
        ? `${formatDose(dose.min)} ${dose.unit}`
        : `${formatDose(dose.min)} à ${formatDose(dose.max)} ${dose.unit}`
      : null;
  return (
    <section
      aria-label={`${dose.kind === "dose" ? "Dose de référence validée" : "Pas de dose de référence"} : ${dose.molecule}`}
      className="validated-dose"
      data-kind={dose.kind}
      data-slot="validated-dose"
    >
      <header className="validated-dose-header">
        {dose.kind === "dose" ? (
          <ShieldCheckIcon aria-hidden="true" className="validated-dose-icon" />
        ) : (
          <ExclamationTriangleIcon
            aria-hidden="true"
            className="validated-dose-icon"
          />
        )}
        <div className="validated-dose-title">
          {dose.kind === "dose"
            ? "Dose de référence validée"
            : "Pas de dose de référence pour ce cas"}
        </div>
        <div className="validated-dose-by">
          Relue par {VALIDATION.par} · {validatedOn}
        </div>
      </header>
      {dose.kind === "dose" ? (
        <div className="validated-dose-amount">
          <div className="validated-dose-value">{amount}</div>
          <div className="validated-dose-calcul">{dose.calcul}</div>
        </div>
      ) : (
        <>
          <div className="validated-dose-reason">{dose.reason}</div>
          {/* The line's own calculation comes from the catalogue, not from this reference: say so where they disagree. */}
          <div className="validated-dose-reason">
            La dose saisie sur la ligne ne vient pas de cette référence : la
            vérifier avant de signer.
          </div>
        </>
      )}
      {line && dose.kind === "refus" ? (
        <div className="validated-dose-quote">
          Texte de la référence : « {line.dose} »
        </div>
      ) : null}
      {facts.length ? (
        <dl className="validated-dose-facts">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {line?.attention ? (
        <div className="validated-dose-warning">
          <div className="validated-dose-warning-label">
            Mise en garde de la référence
          </div>
          <div className="validated-dose-warning-text">{line.attention}</div>
        </div>
      ) : null}
      {dose.sources.length ? (
        <div className="validated-dose-source">
          {dose.sources.length > 1 ? "Sources" : "Source"} :{" "}
          {dose.sources.join(" · ")}
        </div>
      ) : null}
    </section>
  );
}
