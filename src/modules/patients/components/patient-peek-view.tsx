import { useEffect, useId, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ActionButton,
  EmptyState,
  SkeletonBlock,
} from "@/design-system/primitives";
import { Activity, CalendarBlank, Notebook, Syringe } from "@/lib/icons";
import type {
  Appointment,
  Owner,
  Patient,
  Vaccination,
  WeightEntry,
} from "@/types/db";
import {
  getNextDueVaccination,
  getVaccinationStatus,
} from "../lib/vaccination-status";
import {
  handleRecordTabKeys,
  isClinicalSignal,
  OwnerContact,
  PatientIdentity,
  recordDate,
} from "./medical-record-summary";
import { PatientSafetyZone } from "./patient-safety-zone";
import { RecordBlockHeading } from "./record-block-heading";

export interface PatientPeekViewProps {
  appointments: Appointment[];
  error: boolean;
  /**
   * Opened from a list cursor: non-modal, no backdrop, focus left on the
   * list so the arrows keep moving and the peek follows them.
   */
  follow?: boolean;
  followUpError: boolean;
  followUpLoading: boolean;
  historyError: boolean;
  historyLoading: boolean;
  loading: boolean;
  onClose: () => void;
  onOpenFull: () => void;
  onRetry: () => void;
  owner?: Owner;
  patient?: Patient;
  skeletons: { profile: boolean; history: boolean; followUp: boolean };
  vaccinations: Vaccination[];
  weights: WeightEntry[];
}
const VISIT_STATUSES: Record<Appointment["status"], string> = {
  scheduled: "Planifiée",
  confirmed: "Confirmée",
  arrived: "Arrivé",
  waiting: "En attente",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
  no_show: "Absent",
};

export function PatientPeekView({
  patient,
  owner,
  appointments,
  vaccinations,
  weights,
  loading,
  error,
  skeletons,
  historyLoading,
  followUpLoading,
  historyError,
  followUpError,
  onRetry,
  onClose,
  onOpenFull,
  follow = false,
}: PatientPeekViewProps) {
  const [tab, setTab] = useState("summary");
  const id = useId();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const lastWeight = [...weights].sort((a, b) =>
    b.measuredAt.localeCompare(a.measuredAt)
  )[0];
  const lastVisit = appointments.find(
    (row) =>
      row.status === "completed" && new Date(row.startTime).getTime() <= now
  );
  const nextVisit = appointments
    .filter((row) =>
      ["scheduled", "confirmed", "arrived", "waiting", "in_progress"].includes(
        row.status
      )
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .find(
      (row) =>
        new Date(row.startTime).getTime() >= now ||
        ["arrived", "waiting", "in_progress"].includes(row.status)
    );
  const nextVaccine = getNextDueVaccination(vaccinations);
  const pending = loading || skeletons.profile;
  return (
    <Sheet
      modal={!follow}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open
    >
      <SheetContent
        className="patient-peek-panel w-full! sm:max-w-[620px]"
        data-peek-follow={follow ? "" : undefined}
        finalFocus={follow ? false : undefined}
        initialFocus={follow ? false : undefined}
        showOverlay={!follow}
      >
        <SheetHeader icon={<Notebook />}>
          <SheetTitle>Dossier médical</SheetTitle>
          <SheetDescription>
            Lecture rapide du patient et de son suivi clinique.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {pending ? (
            <div aria-busy="true" className="space-y-5 p-6">
              <SkeletonBlock className="h-16" visible={skeletons.profile} />
              <SkeletonBlock className="h-24" visible={skeletons.profile} />
              <SkeletonBlock className="h-40" visible={skeletons.profile} />
            </div>
          ) : error ? (
            <EmptyState
              action={<ActionButton onClick={onRetry}>Réessayer</ActionButton>}
              title="Le dossier n’a pas pu être chargé"
            />
          ) : patient ? (
            <>
              <div className="patient-peek-identity px-6 py-6">
                <PatientIdentity compact patient={patient} />
              </div>
              {/* Safety first, as in the record: the allergy in red, the restraint beside it. */}
              <div className="patient-peek-safety">
                <PatientSafetyZone patient={patient} />
              </div>
              <div
                aria-label="Aperçu du dossier"
                className="medical-tabs"
                onKeyDown={handleRecordTabKeys}
                role="tablist"
              >
                {[
                  { value: "summary", label: "Synthèse" },
                  { value: "visits", label: "Visites" },
                  { value: "followup", label: "Suivi préventif" },
                ].map((item) => (
                  <button
                    aria-controls={`${id}-content`}
                    aria-selected={tab === item.value}
                    id={`${id}-${item.value}`}
                    key={item.value}
                    onClick={() => setTab(item.value)}
                    role="tab"
                    tabIndex={tab === item.value ? 0 : -1}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div
                aria-labelledby={`${id}-${tab}`}
                className="medical-peek-content"
                id={`${id}-content`}
                role="tabpanel"
                tabIndex={0}
              >
                {tab === "summary" && (
                  <>
                    <section>
                      <RecordBlockHeading icon={Activity}>
                        Repères cliniques
                      </RecordBlockHeading>
                      <dl className="medical-facts">
                        <div>
                          <dt>Dernière visite terminée</dt>
                          <dd>
                            {historyLoading
                              ? "Chargement…"
                              : historyError
                                ? "Indisponible"
                                : lastVisit
                                  ? recordDate(lastVisit.startTime)
                                  : patient.lastVisit
                                    ? recordDate(patient.lastVisit)
                                    : "Aucune enregistrée"}
                          </dd>
                        </div>
                        <div>
                          <dt>Prochaine prise en charge</dt>
                          <dd>
                            {historyLoading
                              ? "Chargement…"
                              : historyError
                                ? "Indisponible"
                                : nextVisit
                                  ? recordDate(nextVisit.startTime, true)
                                  : "Aucune prévue"}
                          </dd>
                        </div>
                        <div>
                          <dt>Dernier poids</dt>
                          <dd>
                            {followUpLoading
                              ? "Chargement…"
                              : followUpError
                                ? "Indisponible"
                                : lastWeight
                                  ? `${lastWeight.weightKg.toLocaleString("fr-FR")} kg`
                                  : "Non renseigné"}
                          </dd>
                        </div>
                        <div>
                          <dt>Date de naissance</dt>
                          <dd>{recordDate(patient.dateOfBirth)}</dd>
                        </div>
                        {isClinicalSignal(patient.chronicConditions) ? (
                          <div>
                            <dt>Antécédents</dt>
                            <dd>{patient.chronicConditions?.trim()}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </section>
                    <OwnerContact animal={patient.name} owner={owner} />
                    <section>
                      <RecordBlockHeading icon={Notebook}>
                        Notes utiles à la prise en charge
                      </RecordBlockHeading>
                      <p className="medical-note">
                        {patient.generalNotes?.trim() ||
                          "Aucune note générale enregistrée."}
                      </p>
                    </section>
                  </>
                )}
                {tab === "visits" && (
                  <section aria-busy={historyLoading}>
                    <RecordBlockHeading icon={CalendarBlank}>
                      Visites et rendez-vous
                    </RecordBlockHeading>
                    {historyLoading || skeletons.history ? (
                      <SkeletonBlock
                        className="h-40"
                        visible={skeletons.history}
                      />
                    ) : historyError ? (
                      <ActionButton onClick={onRetry} quiet>
                        Réessayer le chargement des visites
                      </ActionButton>
                    ) : appointments.length ? (
                      <ul className="medical-visit-list">
                        {appointments.slice(0, 6).map((row) => (
                          <li className="medical-visit" key={row.id}>
                            <time>{recordDate(row.startTime)}</time>
                            <div>
                              <strong>
                                {row.type} · {VISIT_STATUSES[row.status]}
                              </strong>
                              <p>{row.reason || row.title}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="medical-empty">
                        Aucune visite enregistrée. Les consultations et
                        rendez-vous apparaîtront ici.
                      </p>
                    )}
                  </section>
                )}
                {tab === "followup" && (
                  <section aria-busy={followUpLoading}>
                    <RecordBlockHeading icon={Syringe}>
                      Vaccinations et pesées
                    </RecordBlockHeading>
                    {followUpLoading || skeletons.followUp ? (
                      <SkeletonBlock
                        className="h-40"
                        visible={skeletons.followUp}
                      />
                    ) : followUpError ? (
                      <ActionButton onClick={onRetry} quiet>
                        Réessayer le chargement du suivi
                      </ActionButton>
                    ) : (
                      <>
                        <dl className="medical-facts">
                          <div>
                            <dt>Dernière pesée</dt>
                            <dd>
                              {lastWeight
                                ? `${lastWeight.weightKg.toLocaleString("fr-FR")} kg · ${recordDate(lastWeight.measuredAt)}`
                                : "Aucune mesure enregistrée"}
                            </dd>
                          </div>
                          <div>
                            <dt>Prochain rappel enregistré</dt>
                            <dd>
                              {nextVaccine
                                ? `${nextVaccine.vaccineName} · ${recordDate(nextVaccine.nextDueAt)}`
                                : "Aucun rappel programmé"}
                            </dd>
                          </div>
                        </dl>
                        <ul className="medical-visit-list mt-4">
                          {[...vaccinations]
                            .sort((a, b) =>
                              b.administeredAt.localeCompare(a.administeredAt)
                            )
                            .slice(0, 5)
                            .map((row) => (
                              <li className="medical-visit" key={row.id}>
                                <time>{recordDate(row.administeredAt)}</time>
                                <div>
                                  <strong>{row.vaccineName}</strong>
                                  <p>
                                    {row.nextDueAt
                                      ? `Rappel le ${recordDate(row.nextDueAt)}${getVaccinationStatus(row) === "overdue" ? " · En retard" : ""}`
                                      : "Rappel non renseigné"}
                                  </p>
                                </div>
                              </li>
                            ))}
                        </ul>
                        {!vaccinations.length && (
                          <p className="medical-empty">
                            Aucune vaccination enregistrée dans le dossier.
                          </p>
                        )}
                      </>
                    )}
                  </section>
                )}
              </div>
            </>
          ) : (
            <EmptyState
              action={
                <ActionButton onClick={onRetry} quiet>
                  Actualiser
                </ActionButton>
              }
              description="Actualisez la liste pour retrouver les dossiers actuels."
              title="Ce patient n’est plus disponible"
            />
          )}
        </div>
        <SheetFooter>
          <ActionButton onClick={onClose} quiet>
            Fermer
          </ActionButton>
          <ActionButton
            data-peek-open-full=""
            disabled={!patient || pending || error}
            onClick={onOpenFull}
          >
            Ouvrir le dossier détaillé
          </ActionButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
