import { StayTransfer } from "./stay-location-controls";
import { StayRecords } from "./stay-records";
import { StayBilling } from "./stay-billing";
import { StayFollowUp } from "./stay-follow-up";
import { announceCareTasksChanged } from "@/modules/care-tasks/use-care-tasks";
import { vitalAlerts } from "./vital-alerts";
import { CarePlanForm } from "./care-plan-form";
import { VitalsForm } from "./vitals-form";
import { VitalsCurves } from "./vitals-curves";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { staysService } from "./service";
import { announceStaysChanged } from "./use-stays";
import type { Stay, VitalSign } from "./store";
import type { StayStatus } from "./domain";
import { ACTIVE_STAY_STATUSES, stayDays } from "./domain";
export function StayDetail({stay,patientName,species,onBack}: {stay: Stay;patientName: string;species: string;onBack: () => void}) {
 const {currentUser}=useAuth(); const [vitals,setVitals]=useState<VitalSign[]>([]);
 const [error,setError]=useState<string | null>(null),[busy,setBusy]=useState(false),[summary,setSummary]=useState(""),[reason,setReason]=useState("");
 const [planOpen,setPlanOpen]=useState(false);
 const [vitalsOpen,setVitalsOpen]=useState(false);
 const [planned,setPlanned]=useState("");
 const refresh=useCallback(async () => { try {setVitals(await staysService.vitals(stay.id));} catch {setError("Les constantes n’ont pas pu être chargées.");} },[stay.id]);
 useEffect(() => {void refresh();},[refresh]);
 async function transition(to: StayStatus) {
  if (!currentUser || busy) return; setBusy(true); setError(null);
  try { await staysService.transition(stay.id,to,currentUser.id,{reason,summary,plannedAt:planned || undefined});announceStaysChanged();announceCareTasksChanged(); }
  catch(error) {setError(error instanceof Error ? error.message : "Le séjour n’a pas pu être mis à jour.");}
  finally {setBusy(false);}
 }
 const active=ACTIVE_STAY_STATUSES.includes(stay.status);
 return <div className="stay-detail space-y-5"><Button variant="ghost" className="h-11" onClick={onBack}>Retour aux séjours</Button>
 <header><h2 className="text-[18px] font-medium">{patientName}</h2><p className="mt-1 text-[13px] text-muted-foreground">{stay.reason}</p><p className="mt-2 text-[13px]">{stayDays(new Date(stay.admitted_at), new Date(stay.discharged_at || Math.max(Date.now(), new Date(stay.admitted_at).getTime())))} journée(s) occupée(s)</p></header>
 {active && <StayTransfer stay={stay}/>}
 {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
 {active && <section className="space-y-4 rounded-2xl border border-[#F2F2F2] bg-card p-5 dark:border-border"><h3 className="text-[16px] font-medium">Parcours du séjour</h3>
 {stay.status === "admis" && <Button className="h-11" disabled={busy} onClick={() => void transition("en_cours")}>Commencer le suivi</Button>}
 {stay.status === "en_cours" && <div className="flex flex-wrap gap-3"><Input className="h-11 w-auto" aria-label="Date de sortie prévue" type="datetime-local" value={planned} onChange={event => setPlanned(event.target.value)}/><Button className="h-11" disabled={busy || !planned} onClick={() => void transition("sortie_prevue")}>Préparer la sortie</Button></div>}
 {stay.status === "sortie_prevue" && <div className="space-y-3"><label className="block text-[13px]">Résumé de sortie<Input className="mt-2 h-11" value={summary} onChange={event => setSummary(event.target.value)}/></label><Button className="h-11" disabled={busy || !summary.trim()} onClick={() => void transition("sorti")}>Confirmer la sortie</Button></div>}
 <div className="flex flex-wrap gap-3 border-t pt-4"><Input className="h-11 min-w-48 flex-1" placeholder="Motif d’annulation" aria-label="Motif d’annulation du séjour" value={reason} onChange={event => setReason(event.target.value)}/><Button className="h-11" variant="outline" disabled={busy || !reason.trim()} onClick={() => void transition("annule")}>Annuler le séjour</Button></div></section>}
 {stay.discharge_summary && <p className="rounded-xl bg-muted p-4 text-[13px]">{stay.discharge_summary}</p>}
 {stay.status === "sorti" && <><StayFollowUp stayId={stay.id}/><StayBilling stay={stay}/></>}
 <section className="space-y-3 rounded-2xl border border-[#F2F2F2] bg-card p-5 dark:border-border"><div className="flex items-center justify-between"><h3 className="text-[16px] font-medium">Constantes</h3>{active && <Button className="h-11" variant="outline" onClick={() => setVitalsOpen(true)}>Ajouter un relevé</Button>}</div><VitalsCurves vitals={vitals}/>{vitals.length > 0 && vitalAlerts(species,vitals[vitals.length-1]).map(alert => <p key={alert} role="status" className="rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">{alert}. Repère au repos, à interpréter selon le contexte clinique.</p>)}{vitals.length ? vitals.map(vital => <div key={vital.id} className="flex flex-wrap gap-4 border-t py-3 text-[13px]"><time className="text-muted-foreground">{new Date(vital.recorded_at).toLocaleString("fr-FR")}</time>{vital.temperature_c != null && <span>{vital.temperature_c.toLocaleString("fr-FR")} °C</span>}{vital.heart_rate != null && <span>FC {vital.heart_rate}/min</span>}{vital.respiratory_rate != null && <span>FR {vital.respiratory_rate}/min</span>}{vital.weight_kg != null && <span>{vital.weight_kg.toLocaleString("fr-FR")} kg</span>}<span>{vital.general_state}</span><span>{vital.appetite}</span></div>) : <p className="text-[13px] text-muted-foreground">Aucune constante relevée.</p>}</section>
 <StayRecords stayId={stay.id}/>
 {active && <Button className="h-11" variant="outline" onClick={() => setPlanOpen(true)}>Planifier des soins multi-jours</Button>}
 <Dialog open={planOpen} onOpenChange={setPlanOpen}><DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Plan de soins</DialogTitle><DialogDescription>Les horaires sont explicites et les tâches utilisent le suivi de soins existant.</DialogDescription></DialogHeader><CarePlanForm stayId={stay.id} onSaved={() => setPlanOpen(false)}/></DialogContent></Dialog>
 <Dialog open={vitalsOpen} onOpenChange={setVitalsOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Relevé des constantes</DialogTitle><DialogDescription>La mesure sera datée et attribuée à votre compte.</DialogDescription></DialogHeader><VitalsForm stayId={stay.id} onSaved={() => {setVitalsOpen(false);void refresh();}}/></DialogContent></Dialog>
 </div>;
}
