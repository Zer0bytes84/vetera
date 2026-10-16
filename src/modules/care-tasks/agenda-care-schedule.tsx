import { useCareTasks } from "./use-care-tasks";
import { useFocus } from "@/contexts/focus-provider";
import { Clipboard } from "./care-icons";
export function AgendaCareSchedule({
  selectedDate,
  weekDays,
  mode,
  patientName,
}: {
  selectedDate: Date;
  weekDays: Date[];
  mode: string;
  patientName: (id: string) => string;
}) {
  const days = mode === "week" ? weekDays : [selectedDate];
  const start = days[0] ?? selectedDate;
  const end = new Date(days.at(-1) ?? selectedDate);
  end.setDate(end.getDate() + 1);
  const { tasks, error, loading } = useCareTasks(start, end);
  const { requestFocus } = useFocus();
  if (error)
    return (
      <p role="alert" className="px-6 py-3 text-destructive">
        {error}
      </p>
    );
  if (loading)
    return (
      <p role="status" className="px-6 py-3 text-muted-foreground">
        Chargement des soins…
      </p>
    );
  return (
    <section className="border-t px-6 py-4" aria-label="Planning des soins">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Clipboard className="size-4 text-amber-600" />
        Soins{mode === "month" ? " du jour sélectionné" : " planifiés"}
      </h3>
      {!tasks.length ? (
        <p className="text-sm text-muted-foreground">
          Aucun soin sur cette période.
        </p>
      ) : (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
          }}
        >
          {days.map((day) => {
            const rows = tasks.filter(
              (task) =>
                new Date(task.heure_prevue).toDateString() ===
                day.toDateString()
            );
            return (
              <div
                key={day.toISOString()}
                className="min-w-0 rounded-xl border border-amber-200 dark:border-amber-900"
              >
                <p className="border-b p-2 text-xs font-medium">
                  {day.toLocaleDateString("fr-FR", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </p>
                <div className="space-y-2 p-2">
                  {rows.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => {
                        requestFocus("care_task", task.id);
                        window.location.hash = "/clinique";
                      }}
                      className="flex w-full items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-left text-xs text-amber-950 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-primary dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
                    >
                      <Clipboard className="mt-0.5 size-4 shrink-0" />
                      <span className="min-w-0 break-words">
                        <time className="block font-semibold tabular-nums">
                          {new Date(task.heure_prevue).toLocaleTimeString(
                            "fr-FR",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </time>
                        <span className="block font-medium">
                          {patientName(task.patient_id)}
                        </span>
                        {task.label}
                        <span className="mt-1 block text-[11px]">
                          {task.statut === "fait"
                            ? "Fait"
                            : task.statut === "annule"
                              ? "Annulé"
                              : task.statut === "en_cours"
                                ? "En cours"
                                : "À faire"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
