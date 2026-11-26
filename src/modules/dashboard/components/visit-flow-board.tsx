import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Panel, Shell, ShellHeader } from "@/components/ui/surface";
import { ActionButton, SignalBadge } from "@/design-system/primitives";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Check,
  Clock3,
  DoorOpen,
  Stethoscope,
} from "@/lib/icons";
import { getSpeciesGlyph } from "@/lib/species-icons";
import { useRoomLabel } from "@/modules/rooms/use-rooms";
import type { NowSnapshot } from "../model/clinical-dashboard";
import { formatTime } from "../v2/model";
import "./clinical/clinical-workspace.css";

const NO_ALLERGY = /^(aucun(?:e)?(?: connue)?|néant|non|ras)$/i;

/**
 * A read-only summary of the day's care: who is next, the waiting room and
 * the day's progress. Visits move on in Flux, which this summary opens.
 */
export function VisitFlowBoard({
  snapshot,
  onFlux,
  viewControl,
}: {
  snapshot: NowSnapshot;
  onFlux?: (appointmentId?: string) => void;
  /** Beside « Ouvrir Flux »: the switch between the dashboard's two views. */
  viewControl?: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const { next, waiting, queue, startsIn, allergies, today, at } = snapshot;
  const nextRoom = useRoomLabel()(next?.appointment.room);
  const hasAllergy = allergies && !NO_ALLERGY.test(allergies.trim());
  const completed = today.filter(
    (row) => row.appointment.status === "completed"
  ).length;
  const absent = today.filter(
    (row) => row.appointment.status === "no_show"
  ).length;
  const remaining = today.filter((row) =>
    ["scheduled", "confirmed", "arrived", "waiting", "in_progress"].includes(
      row.appointment.status
    )
  ).length;
  const active = next?.appointment.status === "in_progress";
  const arrived =
    next && ["arrived", "waiting"].includes(next.appointment.status);
  const stage = next ? (active ? 2 : arrived ? 1 : 0) : completed ? 3 : -1;
  const timing =
    startsIn === null
      ? ""
      : startsIn > 0
        ? `dans ${startsIn} min`
        : startsIn < 0
          ? `créneau dépassé de ${-startsIn} min`
          : "maintenant";
  return (
    <Shell aria-labelledby="visit-flow-title" className="visit-flow-widget">
      <ShellHeader
        as="h2"
        aside={
          <>
            {viewControl}
            <ActionButton
              className="visit-flow-open"
              disabled={!onFlux}
              onClick={() => onFlux?.(next?.appointment.id)}
            >
              Ouvrir Flux
              <ArrowRight aria-hidden="true" size={14} />
            </ActionButton>
          </>
        }
        icon={Stethoscope}
        id="visit-flow-title"
        subtitle={`Mis à jour à ${formatTime(at)}`}
        title="Maintenant"
      />
      <div className="visit-flow-board">
        <Panel aria-label="Prise en charge" className="visit-flow-card">
          <div className="visit-flow-main">
            <div className="visit-flow-topline">
              <SignalBadge
                tone={
                  active
                    ? "info"
                    : next
                      ? "watch"
                      : today.length
                        ? "positive"
                        : "quiet"
                }
              >
                {active
                  ? "Consultation en cours"
                  : arrived
                    ? "Patient prêt à être reçu"
                    : next
                      ? "Prochaine prise en charge"
                      : today.length
                        ? "Journée à jour"
                        : "Agenda disponible"}
              </SignalBadge>
              <span className="visit-flow-date">
                <CalendarDays aria-hidden="true" size={14} />
                Aujourd’hui · {today.length} visite{today.length > 1 ? "s" : ""}
              </span>
            </div>
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                className="visit-flow-patient"
                exit={reduced ? { opacity: 1 } : { opacity: 0.8, y: -3 }}
                initial={
                  reduced ? false : { opacity: 0.8, y: 4, filter: "blur(2px)" }
                }
                key={`${next?.appointment.id ?? "empty"}-${next?.appointment.status ?? "idle"}`}
                transition={{ duration: reduced ? 0 : 0.16 }}
              >
                <span
                  aria-hidden="true"
                  className={`visit-flow-symbol ${next ? "" : "visit-flow-symbol-done"}`}
                >
                  {next ? (
                    <HugeiconsIcon
                      icon={getSpeciesGlyph(next.species)}
                      size={30}
                      strokeWidth={1.5}
                    />
                  ) : (
                    <CalendarCheck size={26} />
                  )}
                </span>
                <div className="visit-flow-identity">
                  {next ? (
                    <h3 className="visit-flow-name">{next.patientName}</h3>
                  ) : (
                    <h3 className="visit-flow-name">
                      {today.length
                        ? "Les prises en charge sont terminées."
                        : "Une nouvelle journée commence."}
                    </h3>
                  )}
                  <p>
                    {next
                      ? [next.species, next.ownerName]
                          .filter(Boolean)
                          .join(" · ")
                      : today.length
                        ? `${completed} consultation${completed > 1 ? "s" : ""} terminée${completed > 1 ? "s" : ""}${absent ? ` · ${absent} absence${absent > 1 ? "s" : ""}` : ""}. Retrouvez le parcours de chaque visite dans Flux.`
                        : "Les visites du jour apparaîtront ici et dans Flux."}
                  </p>
                </div>
                {next && (
                  <div className="visit-flow-slot">
                    <span className="visit-flow-slot-label">
                      <Clock3 aria-hidden="true" size={13} /> Créneau prévu
                    </span>
                    <time>{formatTime(next.start)}</time>
                    {!active && (
                      <span className="visit-flow-slot-timing">{timing}</span>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
            {next && (
              <div className="visit-flow-details">
                <span>
                  <Stethoscope aria-hidden="true" size={14} />
                  {next.appointment.type}
                </span>
                {nextRoom && (
                  <span>
                    <DoorOpen aria-hidden="true" size={14} />
                    {nextRoom}
                  </span>
                )}
                {next.appointment.reason &&
                  next.appointment.reason !== next.appointment.type && (
                    <span className="visit-flow-reason">
                      {next.appointment.reason}
                    </span>
                  )}
              </div>
            )}
            {hasAllergy && (
              <p className="visit-flow-allergy">
                <AlertTriangle aria-hidden="true" size={15} />
                <span>
                  <strong>Allergies :</strong> {allergies}
                </span>
              </p>
            )}
            <ol aria-label="Parcours de la visite" className="visit-flow-steps">
              {["Planifiée", "Arrivée", "Consultation", "Terminée"].map(
                (label, i) => (
                  <li
                    aria-current={i === stage ? "step" : undefined}
                    data-state={
                      i < stage ? "done" : i === stage ? "current" : "future"
                    }
                    key={label}
                  >
                    <span>{i < stage ? <Check size={12} /> : i + 1}</span>
                    {label}
                  </li>
                )
              )}
            </ol>
          </div>
        </Panel>
        <Panel
          aria-label="Salle d’attente et avancement"
          className="visit-flow-card"
        >
          <aside aria-label="File des visites" className="visit-flow-queue">
            <div className="visit-flow-queue-title">
              <DoorOpen size={16} />
              <h3>Salle d’attente</h3>
              <strong>{waiting.length}</strong>
            </div>
            {waiting.length ? (
              <>
                <ul>
                  {queue.slice(0, 3).map(({ entry, position, estimatedAt }) => (
                    <li key={entry.appointment.id}>
                      <span className="visit-flow-queue-row">
                        <span className="visit-flow-queue-number">
                          {position}
                        </span>
                        <span>{entry.patientName}</span>
                        <span className="visit-flow-queue-eta">
                          vers <time>{formatTime(estimatedAt)}</time>
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <span className="visit-flow-caption">
                  Heures estimées d’après les créneaux prévus
                </span>
              </>
            ) : (
              <p className="visit-flow-queue-empty">
                Aucun patient en attente.
                <br />
                Les arrivées apparaîtront ici.
              </p>
            )}
            {waiting.length > 3 && (
              <span className="visit-flow-caption">
                + {waiting.length - 3} patient{waiting.length > 4 ? "s" : ""}
              </span>
            )}
            <div className="visit-flow-day-progress">
              <div>
                <span>Avancement du jour</span>
                <strong>
                  {completed}/{today.length}
                </strong>
              </div>
              <div
                aria-label={`${completed} visites terminées sur ${today.length}`}
                className="visit-flow-track"
                role="img"
              >
                <span
                  style={{
                    width: `${today.length ? (completed / today.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="visit-flow-caption">
                {remaining
                  ? `${remaining} visite${remaining > 1 ? "s" : ""} à prendre en charge`
                  : absent
                    ? `${absent} absence${absent > 1 ? "s" : ""} enregistrée${absent > 1 ? "s" : ""}`
                    : completed
                      ? "Toutes les visites sont terminées"
                      : "Aucune visite planifiée aujourd’hui"}
              </span>
            </div>
          </aside>
        </Panel>
      </div>
    </Shell>
  );
}
