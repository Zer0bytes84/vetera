import { ChevronRight } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AppointmentTypeBadge } from "@/modules/agenda/components/agenda-shared";
import type { Appointment, ConsultationSoap } from "@/types/db";
import { visitReason } from "../lib/visit-reason";
import { recordDate } from "./medical-record-summary";

const PREVIOUS_VISITS = 5;

/** Only statuses other than "done" are worth a label in a list of past visits. */
const OPEN_STATUS_LABELS: Partial<Record<Appointment["status"], string>> = {
  in_progress: "En cours",
  arrived: "Arrivé",
  waiting: "En attente",
};

function excerpt(value?: string | null) {
  const text = value?.replace(/\s+/g, " ").trim();
  return text || "";
}

/**
 * Synthèse tab: the last visit first, with what the vet concluded (assessment
 * and plan from its note), then the visits before it as a compact list.
 */
export function PatientOverview({
  error,
  getSoap,
  loading,
  onOpenHistory,
  onOpenVisit,
  onRetry,
  patientName,
  visits,
}: {
  error: boolean;
  getSoap: (appointmentId: string) => ConsultationSoap | null;
  loading: boolean;
  onOpenHistory: () => void;
  onOpenVisit: (appointmentId: string) => void;
  onRetry: () => void;
  patientName: string;
  /** Completed or ongoing visits, most recent first. */
  visits: Appointment[];
}) {
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

  const [last, ...previous] = visits;
  const lastSoap = getSoap(last.id);
  const assessment = excerpt(lastSoap?.assessment);
  const plan = excerpt(lastSoap?.plan);
  const lastReason = visitReason(last, patientName);
  const lastOpenStatus = OPEN_STATUS_LABELS[last.status];

  return (
    <div className="patient-overview">
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

      <section
        aria-labelledby="overview-previous-visits"
        className="patient-overview-previous"
      >
        <div className="medical-overview-heading">
          <h3 id="overview-previous-visits">Consultations précédentes</h3>
          <Button onClick={onOpenHistory} size="sm" variant="ghost">
            Voir tout l’historique
          </Button>
        </div>
        {previous.length === 0 ? (
          <p className="patient-overview-no-note">
            Aucune autre consultation.
          </p>
        ) : (
          <ol className="patient-overview-list">
            {previous.slice(0, PREVIOUS_VISITS).map((visit) => {
              const reason = visitReason(visit, patientName);
              const openStatus = OPEN_STATUS_LABELS[visit.status];
              return (
                <li key={visit.id}>
                  <button
                    className="patient-overview-row group"
                    onClick={() => onOpenVisit(visit.id)}
                    type="button"
                  >
                    <time>{recordDate(visit.startTime)}</time>
                    <span className="patient-overview-row-main">
                      <strong>{visit.type}</strong>
                      {reason ? <span>{reason}</span> : null}
                    </span>
                    {openStatus ? (
                      <span className="patient-overview-status">
                        {openStatus}
                      </span>
                    ) : null}
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        {previous.length > PREVIOUS_VISITS ? (
          <p className="patient-overview-more">
            {previous.length - PREVIOUS_VISITS} autre
            {previous.length - PREVIOUS_VISITS > 1 ? "s" : ""} dans la
            chronologie.
          </p>
        ) : null}
      </section>
    </div>
  );
}
