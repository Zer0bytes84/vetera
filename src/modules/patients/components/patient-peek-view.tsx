import { useState, useId, useEffect } from "react";
import type {
  Appointment,
  Owner,
  Patient,
  Vaccination,
  WeightEntry,
} from "@/types/db";
import {
  ActionButton,
  EmptyState,
  SkeletonBlock,
} from "@/design-system/primitives";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ClinicalAlerts,
  OwnerContact,
  PatientIdentity,
  recordDate,
  handleRecordTabKeys,
} from "./medical-record-summary";
import {
  getNextDueVaccination,
  getVaccinationStatus,
} from "../lib/vaccination-status";

export interface PatientPeekViewProps {
  patient?: Patient;
  owner?: Owner;
  appointments: Appointment[];
  vaccinations: Vaccination[];
  weights: WeightEntry[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onClose: () => void;
  onOpenFull: () => void;
  skeletons: { profile: boolean; history: boolean; followUp: boolean };
  historyLoading: boolean;
  followUpLoading: boolean;
  historyError: boolean;
  followUpError: boolean;
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
}: PatientPeekViewProps) {
  const [tab, setTab] = useState("summary");
  const id = useId();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60000);
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
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="w-full! gap-0 bg-card sm:max-w-[620px]">
        <SheetHeader className="border-b border-border px-6 py-5 pr-14">
          <SheetTitle className="text-base">Dossier médical</SheetTitle>
          <SheetDescription>
            Lecture rapide du patient et de son suivi clinique.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {pending ? (
            <div aria-busy="true" className="space-y-5 p-6">
              <SkeletonBlock visible={skeletons.profile} className="h-16" />
              <SkeletonBlock visible={skeletons.profile} className="h-24" />
              <SkeletonBlock visible={skeletons.profile} className="h-40" />
            </div>
          ) : error ? (
            <EmptyState
              title="Le dossier n’a pas pu être chargé"
              action={<ActionButton onClick={onRetry}>Réessayer</ActionButton>}
            />
          ) : !patient ? (
            <EmptyState
              title="Ce patient n’est plus disponible"
              description="Actualisez la liste pour retrouver les dossiers actuels."
              action={
                <ActionButton quiet onClick={onRetry}>
                  Actualiser
                </ActionButton>
              }
            />
          ) : (
            <>
              <div className="px-6 py-6">
                <PatientIdentity patient={patient} compact />
              </div>
              <ClinicalAlerts patient={patient} />
              <div
                className="medical-tabs"
                role="tablist"
                onKeyDown={handleRecordTabKeys}
                aria-label="Aperçu du dossier"
              >
                {[
                  { value: "summary", label: "Synthèse" },
                  { value: "visits", label: "Visites" },
                  { value: "followup", label: "Suivi préventif" },
                ].map((item) => (
                  <button
                    key={item.value}
                    role="tab"
                    tabIndex={tab === item.value ? 0 : -1}
                    id={`${id}-${item.value}`}
                    aria-selected={tab === item.value}
                    aria-controls={`${id}-content`}
                    onClick={() => setTab(item.value)}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div
                className="medical-peek-content"
                id={`${id}-content`}
                role="tabpanel"
                tabIndex={0}
                aria-labelledby={`${id}-${tab}`}
              >
                {tab === "summary" && (
                  <>
                    <section>
                      <h3 className="medical-section-title">
                        Repères cliniques
                      </h3>
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
                      </dl>
                    </section>
                    <OwnerContact owner={owner} />
                    <section>
                      <h3 className="medical-section-title">
                        Notes utiles à la prise en charge
                      </h3>
                      <p className="medical-note">
                        {patient.generalNotes?.trim() ||
                          "Aucune note générale enregistrée."}
                      </p>
                    </section>
                  </>
                )}
                {tab === "visits" && (
                  <section aria-busy={historyLoading}>
                    <h3 className="medical-section-title">
                      Visites et rendez-vous
                    </h3>
                    {historyLoading || skeletons.history ? (
                      <SkeletonBlock
                        visible={skeletons.history}
                        className="h-40"
                      />
                    ) : historyError ? (
                      <ActionButton quiet onClick={onRetry}>
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
                    <h3 className="medical-section-title">
                      Vaccinations et pesées
                    </h3>
                    {followUpLoading || skeletons.followUp ? (
                      <SkeletonBlock
                        visible={skeletons.followUp}
                        className="h-40"
                      />
                    ) : followUpError ? (
                      <ActionButton quiet onClick={onRetry}>
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
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-6 py-4">
          <ActionButton quiet onClick={onClose}>
            Fermer
          </ActionButton>
          <ActionButton
            disabled={!patient || pending || error}
            onClick={onOpenFull}
          >
            Ouvrir le dossier détaillé
          </ActionButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}
