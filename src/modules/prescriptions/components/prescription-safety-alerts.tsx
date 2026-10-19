import { Warning } from "@/lib/icons";

import type {
  SafetyAlert,
  SafetyAlertLevel,
} from "../lib/prescription-safety";

import "./prescription-safety.css";

const LEVEL_LABEL: Record<SafetyAlertLevel, string> = {
  interaction: "Interaction médicamenteuse",
  contraindication: "Contre-indication",
};

function formatDay(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("fr-FR");
}

function AlertSubject({ alert }: { alert: SafetyAlert }) {
  if (alert.level === "interaction" && alert.other) {
    const since = formatDay(alert.other.prescribedOn);
    const context =
      alert.other.origin === "traitement"
        ? `traitement en cours${since ? ` prescrit le ${since}` : ""}`
        : "même ordonnance";
    return (
      <span>
        <strong>{alert.medicationName}</strong> avec{" "}
        <strong>{alert.other.name}</strong> ({context})
      </span>
    );
  }
  const finding = alert.patientFinding;
  return (
    <span>
      <strong>{alert.medicationName}</strong>
      {finding ? (
        <>
          {" "}
          face à {finding.field === "allergies" ? "l'allergie" : "l'affection"}{" "}
          <strong>« {finding.text} »</strong> du dossier
        </>
      ) : null}
    </span>
  );
}

/** Bandeau rouge non bloquant, au-dessus des lignes de l'ordonnance. */
export function PrescriptionSafetyBanner({ alerts }: { alerts: SafetyAlert[] }) {
  if (alerts.length === 0) {
    return null;
  }
  return (
    <section
      aria-live="polite"
      className="rx-safety"
      data-testid="prescription-safety-banner"
      role="alert"
    >
      <p className="rx-safety-head">
        <Warning className="size-4 shrink-0" weight="fill" />
        Contrôle de sécurité · {alerts.length}{" "}
        {alerts.length > 1 ? "alertes" : "alerte"}
      </p>
      <p className="rx-safety-sub">
        Alerte informative : l'ordonnance reste modifiable et peut être
        validée après vérification.
      </p>
      <ul className="rx-safety-list">
        {alerts.map((alert) => (
          <li className="rx-safety-item" key={alert.id}>
            <span className="rx-safety-tag" data-level={alert.level}>
              {LEVEL_LABEL[alert.level]}
            </span>
            <AlertSubject alert={alert} />
            <span className="rx-safety-reason">{alert.reason}</span>
            {alert.source ? (
              <span className="rx-safety-source" title={alert.source.url}>
                Source : {alert.source.label}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Badges rouges sur la ligne du médicament concerné. */
export function PrescriptionSafetyBadges({ alerts }: { alerts: SafetyAlert[] }) {
  if (alerts.length === 0) {
    return null;
  }
  const levels = (["interaction", "contraindication"] as const).filter(
    (level) => alerts.some((alert) => alert.level === level)
  );
  return (
    <span className="rx-safety-badges">
      {levels.map((level) => (
        <span
          className="rx-safety-tag"
          data-level={level}
          key={level}
          title={alerts
            .filter((alert) => alert.level === level)
            .map((alert) => alert.reason)
            .join("\n")}
        >
          <Warning className="size-3" weight="fill" />
          {LEVEL_LABEL[level]}
        </span>
      ))}
    </span>
  );
}
