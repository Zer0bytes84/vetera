import { Button } from "@/components/ui/button";
import { useFocus } from "@/contexts/focus-provider";
import { useStays } from "./use-stays";
export function PatientStays({patientId,onOpen}: {patientId: string;onOpen: () => void}) {
 const {stays,error,loading}=useStays(patientId); const {requestFocus}=useFocus();
 if (loading) return <p role="status" className="text-[13px] text-muted-foreground">Chargement des séjours…</p>;
 if (error) return <p role="alert" className="text-[13px] text-destructive">{error}</p>;
 if (!stays.length) return null;
 return <section className="mb-6 space-y-3"><h2 className="text-[16px] font-medium">Séjours hospitaliers</h2>{stays.map(stay => <article key={stay.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#F2F2F2] p-4 dark:border-border"><div><p className="text-[14px] font-medium">{stay.reason}</p><p className="mt-1 text-[13px] text-muted-foreground">{new Date(stay.admitted_at).toLocaleDateString("fr-FR")}{stay.discharged_at ? ` au ${new Date(stay.discharged_at).toLocaleDateString("fr-FR")}` : stay.status === "annule" ? " · Séjour annulé" : " · Séjour actif"}</p>{stay.discharge_summary && <p className="mt-2 text-[13px]">{stay.discharge_summary}</p>}</div><Button className="h-11" variant="outline" onClick={() => {requestFocus("stay",stay.id);onOpen();}}>Ouvrir le séjour</Button></article>)}</section>;
}
