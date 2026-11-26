import { Button } from "@/components/ui/button";
import { useFocus } from "@/contexts/focus-provider";
import { ErrorState } from "@/design-system/patterns/error-state";
import { useStays } from "./use-stays";
export function PatientStays({
  patientId,
  onOpen,
}: {
  patientId: string;
  onOpen: () => void;
}) {
  const { stays, error, loading, refresh } = useStays(patientId);
  const { requestFocus } = useFocus();
  if (loading) {
    return (
      <p className="t-13 text-muted-foreground" role="status">
        Chargement des séjours…
      </p>
    );
  }
  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }
  if (!stays.length) {
    return null;
  }
  return (
    <section className="mb-6 space-y-3">
      <h2 className="t-16 font-medium">Séjours hospitaliers</h2>
      {stays.map((stay) => (
        <article
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#F2F2F2] p-4 dark:border-border"
          key={stay.id}
        >
          <div>
            <p className="t-14 font-medium">{stay.reason}</p>
            <p className="t-13 mt-1 text-muted-foreground">
              {new Date(stay.admitted_at).toLocaleDateString("fr-FR")}
              {stay.discharged_at
                ? ` au ${new Date(stay.discharged_at).toLocaleDateString("fr-FR")}`
                : stay.status === "annule"
                  ? " · Séjour annulé"
                  : " · Séjour actif"}
            </p>
            {stay.discharge_summary && (
              <p className="t-13 mt-2">{stay.discharge_summary}</p>
            )}
          </div>
          <Button
            className="h-11"
            onClick={() => {
              requestFocus("stay", stay.id);
              onOpen();
            }}
            variant="outline"
          >
            Ouvrir le séjour
          </Button>
        </article>
      ))}
    </section>
  );
}
