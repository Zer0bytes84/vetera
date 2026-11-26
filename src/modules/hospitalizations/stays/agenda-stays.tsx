import { useFocus } from "@/contexts/focus-provider";
import { ErrorState } from "@/design-system/patterns/error-state";
import { StayClipboardIcon } from "./clipboard-icon";
import { useStays } from "./use-stays";
export function AgendaStays({
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
  const { stays, error, refresh } = useStays();
  const { requestFocus } = useFocus();
  const days = mode === "week" ? weekDays : [selectedDate];
  const events = stays
    .filter((stay) => stay.status !== "annule")
    .flatMap((stay) => {
      const exit = stay.discharged_at || stay.planned_discharge_at;
      return [
        {
          id: `${stay.id}:admission`,
          stayId: stay.id,
          patientId: stay.patient_id,
          date: stay.admitted_at,
          label: "Admission",
        },
        ...(exit
          ? [
              {
                id: `${stay.id}:sortie`,
                stayId: stay.id,
                patientId: stay.patient_id,
                date: exit,
                label: stay.discharged_at ? "Sortie" : "Sortie prévue",
              },
            ]
          : []),
      ];
    })
    .filter((event) =>
      days.some(
        (day) => day.toDateString() === new Date(event.date).toDateString()
      )
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  if (error) {
    return (
      <ErrorState
        className="px-6"
        message={error}
        onRetry={() => void refresh()}
      />
    );
  }
  if (!events.length) {
    return null;
  }
  return (
    <section aria-label="Admissions et sorties" className="border-t px-6 py-4">
      <h3 className="t-14 mb-3 flex items-center gap-2 font-medium">
        <StayClipboardIcon />
        Hospitalisation
      </h3>
      <div className="flex flex-wrap gap-3">
        {events.map((event) => (
          <button
            className="t-13 min-h-11 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-left transition-colors hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-primary dark:border-teal-900 dark:bg-teal-950/40 dark:hover:bg-teal-950"
            key={event.id}
            onClick={() => {
              requestFocus("stay", event.stayId);
              window.location.hash = "/clinique";
            }}
            type="button"
          >
            <span className="font-medium">
              {event.label} · {patientName(event.patientId)}
            </span>
            <span className="t-12 mt-1 block text-muted-foreground">
              {new Date(event.date).toLocaleString("fr-FR", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
