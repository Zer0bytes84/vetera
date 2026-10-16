import { useStays } from "./use-stays";
import { useFocus } from "@/contexts/focus-provider";
import { StayClipboardIcon } from "./clipboard-icon";
export function AgendaStays({selectedDate,weekDays,mode,patientName}: {selectedDate: Date;weekDays: Date[];mode: string;patientName: (id: string) => string}) {
 const {stays,error}=useStays(); const {requestFocus}=useFocus();
 const days=mode === "week" ? weekDays : [selectedDate];
 const events=stays.filter(stay => stay.status !== "annule").flatMap(stay => [
  {id:`${stay.id}:admission`,stayId:stay.id,patientId:stay.patient_id,date:stay.admitted_at,label:"Admission"},
  ...(stay.discharged_at || stay.planned_discharge_at ? [{id:`${stay.id}:sortie`,stayId:stay.id,patientId:stay.patient_id,date:(stay.discharged_at || stay.planned_discharge_at)!,label:stay.discharged_at ? "Sortie" : "Sortie prévue"}] : [])
 ]).filter(event => days.some(day => day.toDateString() === new Date(event.date).toDateString())).sort((a,b) => a.date.localeCompare(b.date));
 if (error) return <p role="alert" className="px-6 py-3 text-[13px] text-destructive">{error}</p>;
 if (!events.length) return null;
 return <section aria-label="Admissions et sorties" className="border-t px-6 py-4"><h3 className="mb-3 flex items-center gap-2 text-[14px] font-medium"><StayClipboardIcon/>Hospitalisation</h3><div className="flex flex-wrap gap-3">{events.map(event => <button key={event.id} type="button" className="min-h-11 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-left text-[13px] transition-colors hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-primary dark:border-teal-900 dark:bg-teal-950/40 dark:hover:bg-teal-950" onClick={() => {requestFocus("stay",event.stayId);window.location.hash="/clinique";}}><span className="font-medium">{event.label} · {patientName(event.patientId)}</span><span className="mt-1 block text-[12px] text-muted-foreground">{new Date(event.date).toLocaleString("fr-FR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span></button>)}</div></section>;
}
