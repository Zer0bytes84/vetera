import "./patient-reminders.css";
import { ArrowRight } from "lucide-react";
import { WidgetShell } from "@/design-system/patterns/widget-shell";
import { EmptyState, SignalBadge } from "@/design-system/primitives";
import { usePatientsRepository } from "@/data/repositories";
import { isReminderOverdue, localToday } from "./domain";
import { usePatientReminders } from "./use-patient-reminders";
import { RowSkeleton } from "@/modules/dashboard/components/clinical/shared";
import type { Patient } from "@/types/db";

export function MedicalRemindersModule({ onAll }: { onAll: () => void }) {
  const model = usePatientReminders();
  const patients = usePatientsRepository();
  return <MedicalRemindersWidgetContent model={model} onAll={onAll} patients={patients.data} />;
}

export function MedicalRemindersWidgetContent({ model, patients, onAll, today = localToday() }: {
  model: ReturnType<typeof usePatientReminders>;
  patients: Pick<Patient, "id" | "name">[];
  onAll: () => void;
  today?: string;
}) {
  const active = model.reminders.filter((row) => row.statut === "en_cours");
  const overdue = active.filter((row) => isReminderOverdue(row.statut, row.echeance, today));
  const dueToday = active.filter((row) => row.echeance === today);
  const future = active.filter((row) => row.echeance > today)
    .sort((left, right) => left.echeance.localeCompare(right.echeance));
  const upcomingCount = future.length;
  const upcoming = future.slice(0, 3);

  return (
    <WidgetShell
      actions={
        <div className="flex items-center gap-3">
          {/* The status badge would contradict a loading error, so it waits for real data. */}
          {!model.error && !model.loading && (
            <SignalBadge tone={overdue.length ? "critical" : dueToday.length ? "info" : "quiet"}>
              {overdue.length ? `${overdue.length} en retard` : dueToday.length ? `${dueToday.length} aujourd’hui` : "À jour"}
            </SignalBadge>
          )}
          <button className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 t-12 font-medium text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-ring" onClick={onAll} type="button">
            Voir les rappels<ArrowRight aria-hidden="true" className="size-4" strokeWidth={1} />
          </button>
        </div>
      }
      className="medical-reminders-widget frame"
      error={model.error}
      onRetry={model.refresh}
      pending={model.loading}
      showSkeleton={model.loading}
      skeleton={<RowSkeleton count={1} />}
      subtitle="Prévention et suivi médical"
      title="Rappels médicaux"
    >
      <div className="medical-reminders-widget-content">
        <section aria-labelledby="medical-reminders-status-title" className="medical-reminders-widget-zone">
          <h3 className="medical-reminders-widget-label" id="medical-reminders-status-title">Situation</h3>
          <dl className="medical-reminders-widget-totals">
            <div>
              <dt className="t-12 text-ink-muted">En retard</dt>
              <dd className={`mt-1 font-heading text-2xl font-medium tabular-nums ${overdue.length ? "text-destructive" : ""}`}>{overdue.length}</dd>
            </div>
            <div>
              <dt className="t-12 text-ink-muted">Aujourd’hui</dt>
              <dd className={`mt-1 font-heading text-2xl font-medium tabular-nums ${dueToday.length ? "text-[var(--premium-blue,var(--interactive-blue))]" : ""}`}>{dueToday.length}</dd>
            </div>
            <div>
              <dt className="t-12 text-ink-muted">À venir</dt>
              <dd className="mt-1 font-heading text-2xl font-medium tabular-nums">{upcomingCount}</dd>
            </div>
          </dl>
        </section>
        <section aria-labelledby="medical-reminders-next-title" className="medical-reminders-widget-zone">
          <h3 className="medical-reminders-widget-label" id="medical-reminders-next-title">Prochaines échéances</h3>
          {upcoming.length ? (
            <ul className="medical-reminders-widget-upcoming">
              {upcoming.map((reminder) => {
                const patient = patients.find((row) => row.id === reminder.patient_id);
                const type = model.types.find((row) => row.id === reminder.type);
                return (
                  <li key={reminder.id}>
                    <time className="font-mono t-12 text-ink-muted tabular-nums" dateTime={reminder.echeance}>
                      {new Date(`${reminder.echeance}T12:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: reminder.echeance.slice(0, 4) !== today.slice(0, 4) ? "numeric" : undefined })}
                    </time>
                    <span className="truncate t-14 font-medium">{patient?.name ?? "Patient indisponible"}</span>
                    <span className="truncate t-12 text-ink-muted">{type?.name ?? "Rappel médical"}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState compact description={active.length ? "Les rappels échus restent à traiter dans la liste du jour." : "Aucune échéance préventive à venir."} title={active.length ? "Aucune échéance future" : "Suivi à jour"} />
          )}
        </section>
      </div>
    </WidgetShell>
  );
}
