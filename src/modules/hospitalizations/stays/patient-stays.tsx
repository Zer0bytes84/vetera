import { ErrorState } from "@/design-system/patterns/error-state";
import { Button } from "@/components/ui/button";
import { useFocus } from "@/contexts/focus-provider";
import { useStays } from "./use-stays";
export function PatientStays({patientId,onOpen}: {patientId: string;onOpen: () => void}) {
 const {stays,error,loading,refresh}=useStays(patientId); const {requestFocus}=useFocus();
 if (loading) return <p role="status" className="t-13 text-muted-foreground">Chargement des séjours…</p>;
 if (error) return <ErrorState message={error} onRetry={() => void refresh()} />;
 if (!stays.length) return null;
 return <section className="mb-6 space-y-3"><h2 className="t-16 font-medium">Séjours hospitaliers</h2>{stays.map(stay => <article key={stay.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#F2F2F2] p-4 dark:border-border"><div><p className="t-14 font-medium">{stay.reason}</p><p className="mt-1 t-13 text-muted-foreground">{new Date(stay.admitted_at).toLocaleDateString("fr-FR")}{stay.discharged_at ? ` au ${new Date(stay.discharged_at).toLocaleDateString("fr-FR")}` : stay.status === "annule" ? " · Séjour annulé" : " · Séjour actif"}</p>{stay.discharge_summary && <p className="mt-2 t-13">{stay.discharge_summary}</p>}</div><Button className="h-11" variant="outline" onClick={() => {requestFocus("stay",stay.id);onOpen();}}>Ouvrir le séjour</Button></article>)}</section>;
}
