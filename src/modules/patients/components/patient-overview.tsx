import type { ReactNode } from "react";
import { Heartbeat, Pill } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AppointmentTypeBadge } from "@/modules/agenda/components/agenda-shared";
import type { Appointment, ConsultationSoap } from "@/types/db";
import type { HealthCardTreatment } from "../health-card/health-card-data";
import { visitReason } from "../lib/visit-reason";
import { isClinicalSignal, recordDate } from "./medical-record-summary";
import { RecordBlockHeading } from "./record-block-heading";

/** Only statuses other than "done" are worth a label on the last visit. */
const OPEN_STATUS_LABELS: Partial<Record<Appointment["status"], string>> = {
  in_progress: "En cours",
  arrived: "Arrivé",
  waiting: "En attente",
};

function excerpt(value?: string | null) {
  const text = value?.replace(/\s+/g, " ").trim();
  return text || "";
}

function treatmentRhythm(treatment: HealthCardTreatment) {
  const until =
    treatment.until === "long_cours"
      ? "au long cours"
      : treatment.until
        ? `jusqu’au ${recordDate(treatment.until)}`
        : undefined;
  return [treatment.dose, treatment.frequency, until].filter(Boolean).join(" · ");
}

/**
 * Synthèse clinique: three calm columns, what is followed, what is given and
 * what is due. Only what the record holds; an empty column says so.
 */
export function PatientClinicalSummary({
  chronicConditions,
  onOpenPrescriptions,
  prevention,
  treatments,
}: {
  chronicConditions?: string;
  onOpenPrescriptions: () => void;
  /** The prevention countdowns, red only once late. */
  prevention: ReactNode;
  treatments: { hidden: number; items: HealthCardTreatment[] };
}) {
  const chronic = chronicConditions?.trim();
  return (
    <section className="patient-clinical-summary" aria-labelledby="patient-clinical-summary-title">
      <h2 className="sr-only" id="patient-clinical-summary-title">
        Synthèse clinique
      </h2>
      <div className="patient-summary-column">
        <div className="patient-summary-heading-row">
          <RecordBlockHeading icon={Heartbeat}>Affections suivies</RecordBlockHeading>
        </div>
        {isClinicalSignal(chronic) ? (
          <ul className="patient-summary-list">
            <li>
              <strong>{chronic}</strong>
            </li>
          </ul>
        ) : (
          <p className="patient-summary-empty">Aucune affection suivie.</p>
        )}
      </div>
      <div className="patient-summary-column">
        <div className="patient-summary-heading-row">
          <RecordBlockHeading icon={Pill}>Traitements en cours</RecordBlockHeading>
          <button className="patient-summary-link" onClick={onOpenPrescriptions} type="button">
            Ordonnances
          </button>
        </div>
        {treatments.items.length ? (
          <ul className="patient-summary-list">
            {treatments.items.map((treatment) => (
              <li key={`${treatment.name}-${treatment.since}`}>
                <strong>{treatment.name}</strong>
                {treatmentRhythm(treatment) ? <span>{treatmentRhythm(treatment)}</span> : null}
              </li>
            ))}
            {treatments.hidden ? (
              <li className="patient-summary-more">
                et {treatments.hidden} autre{treatments.hidden > 1 ? "s" : ""}
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="patient-summary-empty">Aucun traitement en cours.</p>
        )}
      </div>
      <div className="patient-summary-column">{prevention}</div>
    </section>
  );
}

/**
 * Synthèse: the last visit, with what the vet concluded (assessment and plan
 * from its note), and beside it what is due next. The visits before it are
 * in the chronology that follows, never listed twice.
 */
export function PatientOverview({
  aside,
  error,
  getSoap,
  loading,
  onOpenVisit,
  onRetry,
  patientName,
  visits,
}: {
  /** Shown beside the last visit (the prevention countdowns). */
  aside?: ReactNode;
  error: boolean;
  getSoap: (appointmentId: string) => ConsultationSoap | null;
  loading: boolean;
  onOpenVisit: (appointmentId: string) => void;
  onRetry: () => void;
  patientName: string;
  /** Completed or ongoing visits, most recent first. */
  visits: Appointment[];
}) {
  return (
    <div className="patient-overview">
      <div className="patient-overview-main">
        <LastVisit
          error={error}
          getSoap={getSoap}
          loading={loading}
          onOpenVisit={onOpenVisit}
          onRetry={onRetry}
          patientName={patientName}
          visits={visits}
        />
      </div>
      {aside ? <div className="patient-overview-aside">{aside}</div> : null}
    </div>
  );
}

function LastVisit({
  error,
  getSoap,
  loading,
  onOpenVisit,
  onRetry,
  patientName,
  visits,
}: Omit<Parameters<typeof PatientOverview>[0], "aside">) {
  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner className="size-5" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="medical-empty">
        Les consultations ne sont pas disponibles.{" "}
        <Button onClick={onRetry} size="sm" variant="ghost">
          Réessayer
        </Button>
      </div>
    );
  }
  if (visits.length === 0) {
    return (
      <p className="medical-overview-empty">
        Aucune consultation enregistrée pour {patientName}. Les visites
        apparaîtront ici dès la première consultation.
      </p>
    );
  }

  const [last] = visits;
  const lastSoap = getSoap(last.id);
  const assessment = excerpt(lastSoap?.assessment);
  const plan = excerpt(lastSoap?.plan);
  const lastReason = visitReason(last, patientName);
  const lastOpenStatus = OPEN_STATUS_LABELS[last.status];

  return (
    <section
        aria-labelledby="overview-last-visit"
        className="patient-overview-last"
      >
        <div className="medical-overview-heading">
          <h3 id="overview-last-visit">Dernière consultation</h3>
          <Button
            onClick={() => onOpenVisit(last.id)}
            size="sm"
            variant="outline"
          >
            Ouvrir la consultation
          </Button>
        </div>
        <div className="patient-overview-last-meta">
          <time>{recordDate(last.startTime, true)}</time>
          <AppointmentTypeBadge type={last.type} />
          {lastOpenStatus ? (
            <span className="patient-overview-status">{lastOpenStatus}</span>
          ) : null}
        </div>
        <p className="patient-overview-reason">
          {lastReason || "Motif non renseigné"}
        </p>
        {assessment || plan ? (
          <dl className="patient-overview-soap">
            {assessment ? (
              <div>
                <dt>Évaluation</dt>
                <dd>{assessment}</dd>
              </div>
            ) : null}
            {plan ? (
              <div>
                <dt>Plan</dt>
                <dd>{plan}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="patient-overview-no-note">
            Pas encore de note rédigée pour cette consultation.
          </p>
        )}
    </section>
  );
}
