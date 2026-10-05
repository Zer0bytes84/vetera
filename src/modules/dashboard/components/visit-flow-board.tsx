import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Check,
  Clock3,
  DoorOpen,
  Loader2,
  Plus,
  Stethoscope,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { getSpeciesGlyph } from "@/lib/species-icons";
import { Panel, SignalBadge } from "@/design-system/primitives";
import type { NowSnapshot } from "../model/clinical-dashboard";
import { formatTime } from "../v2/model";
import "./clinical/clinical-workspace.css";

export function VisitFlowBoard({
  snapshot,
  busy = false,
  onStart,
  onArrive,
  onPatient,
  onAgenda,
  onPlan,
}: {
  snapshot: NowSnapshot;
  busy?: boolean;
  onStart?: (id: string) => void;
  onArrive?: (id: string) => void;
  onPatient?: (id: string) => void;
  onAgenda?: () => void;
  onPlan?: () => void;
}) {
  const reduced = useReducedMotion();
  const { next, waiting, startsIn, allergies, today } = snapshot;
  const hasAllergy =
    allergies &&
    !/^(aucun(?:e)?(?: connue)?|néant|non|ras)$/i.test(allergies.trim());
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
  const stage = !next ? (completed ? 3 : -1) : active ? 2 : arrived ? 1 : 0;
  const timing =
    startsIn === null
      ? ""
      : startsIn > 0
        ? `dans ${startsIn} min`
        : startsIn < 0
          ? `créneau dépassé de ${-startsIn} min`
          : "maintenant";
  return (
    <div className="visit-flow-board" aria-busy={busy}>
      <Panel className="visit-flow-card" aria-label="Prise en charge">
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
              <CalendarDays size={14} aria-hidden="true" />
              Aujourd’hui · {today.length} visite{today.length > 1 ? "s" : ""}
            </span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${next?.appointment.id ?? "empty"}-${next?.appointment.status ?? "idle"}`}
              initial={
                reduced ? false : { opacity: 0.8, y: 4, filter: "blur(2px)" }
              }
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={reduced ? { opacity: 1 } : { opacity: 0.8, y: -3 }}
              transition={{ duration: reduced ? 0 : 0.16 }}
              className="visit-flow-patient"
            >
              <span
                className={`visit-flow-symbol ${!next ? "visit-flow-symbol-done" : ""}`}
                aria-hidden="true"
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
                  <button
                    type="button"
                    disabled={!onPatient}
                    onClick={() => onPatient?.(next.appointment.patientId)}
                    className="visit-flow-name"
                  >
                    {next.patientName}
                    <ArrowRight size={18} />
                  </button>
                ) : (
                  <h2 className="visit-flow-name">
                    {today.length
                      ? "Les prises en charge sont terminées."
                      : "Une nouvelle journée commence."}
                  </h2>
                )}
                <p>
                  {next
                    ? [next.species, next.ownerName].filter(Boolean).join(" · ")
                    : today.length
                      ? `${completed} consultation${completed > 1 ? "s" : ""} terminée${completed > 1 ? "s" : ""}${absent ? ` · ${absent} absence${absent > 1 ? "s" : ""}` : ""}. Retrouvez les dossiers dans l’agenda.`
                      : "Planifiez une visite ou consultez les rendez-vous à venir."}
                </p>
              </div>
              {next && (
                <div className="visit-flow-slot">
                  <span className="visit-flow-slot-label">
                    <Clock3 size={13} aria-hidden="true" /> Créneau prévu
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
                <Stethoscope size={14} aria-hidden="true" />
                {next.appointment.type}
              </span>
              {next.appointment.room && (
                <span>
                  <DoorOpen size={14} aria-hidden="true" />
                  {next.appointment.room}
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
              <AlertTriangle size={15} aria-hidden="true" />
              <span>
                <strong>Allergies :</strong> {allergies}
              </span>
            </p>
          )}
          <ol className="visit-flow-steps" aria-label="Parcours de la visite">
            {["Planifiée", "Arrivée", "Consultation", "Terminée"].map(
              (label, i) => (
                <li
                  key={label}
                  data-state={
                    i < stage ? "done" : i === stage ? "current" : "future"
                  }
                  aria-current={i === stage ? "step" : undefined}
                >
                  <span>{i < stage ? <Check size={12} /> : i + 1}</span>
                  {label}
                </li>
              )
            )}
          </ol>
          <div className="visit-flow-actions">
            {next ? (
              <>
                <Button
                  disabled={busy || (active || arrived ? !onStart : !onArrive)}
                  className="h-9 px-4 text-xs"
                  onClick={() =>
                    active || arrived
                      ? onStart?.(next.appointment.id)
                      : onArrive?.(next.appointment.id)
                  }
                >
                  {busy ? (
                    <Loader2 className="animate-spin" size={15} />
                  ) : (
                    <Stethoscope size={15} />
                  )}
                  {busy
                    ? "Enregistrement…"
                    : active
                      ? "Reprendre la consultation"
                      : arrived
                        ? "Démarrer la consultation"
                        : "Marquer arrivé"}
                </Button>
                <Button
                  variant="outline"
                  disabled={!onPatient}
                  onClick={() => onPatient?.(next.appointment.patientId)}
                >
                  Ouvrir le dossier
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="h-9 px-4 text-xs"
                  disabled={!onPlan && !onAgenda}
                  onClick={onPlan ?? onAgenda}
                >
                  <Plus size={15} />
                  {onPlan
                    ? "Planifier une visite"
                    : "Préparer la prochaine visite"}
                </Button>
                <Button
                  variant="outline"
                  disabled={!onAgenda}
                  onClick={onAgenda}
                >
                  Voir l’agenda
                  <ArrowRight size={14} />
                </Button>
              </>
            )}
          </div>
        </div>
      </Panel>
      <Panel
        className="visit-flow-card"
        aria-label="Salle d’attente et avancement"
      >
        <aside className="visit-flow-queue" aria-label="File des visites">
          <div className="visit-flow-queue-title">
            <DoorOpen size={16} />
            <h3>Salle d’attente</h3>
            <strong>{waiting.length}</strong>
          </div>
          {waiting.length ? (
            <ul>
              {waiting.slice(0, 3).map((row, i) => (
                <li key={row.appointment.id}>
                  <button
                    disabled={!onPatient}
                    onClick={() => onPatient?.(row.appointment.patientId)}
                    type="button"
                  >
                    <span className="visit-flow-queue-number">{i + 1}</span>
                    <span>{row.patientName}</span>
                    <time>{formatTime(row.start)}</time>
                  </button>
                </li>
              ))}
            </ul>
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
              className="visit-flow-track"
              role="img"
              aria-label={`${completed} visites terminées sur ${today.length}`}
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
          <button
            type="button"
            className="visit-flow-agenda"
            disabled={!onAgenda}
            onClick={onAgenda}
          >
            Ouvrir le planning
            <ArrowRight size={14} />
          </button>
        </aside>
      </Panel>
    </div>
  );
}
