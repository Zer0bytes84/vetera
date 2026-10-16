import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { staysService } from "./service";
import { announceStaysChanged } from "./use-stays";
const fields=[{key:"temperatureC",label:"Température (°C)"},{key:"heartRate",label:"FC (/min)"},{key:"respiratoryRate",label:"FR (/min)"},{key:"weightKg",label:"Poids (kg)"}] as const;
export function VitalsForm({stayId,onSaved}: {stayId: string;onSaved: () => void}) {
 const {currentUser}=useAuth(); const [values,setValues]=useState<Record<string,string>>({});
 const [error,setError]=useState<string | null>(null),[busy,setBusy]=useState(false);
 return <form className="space-y-4" onSubmit={async event => {
  event.preventDefault();if (!currentUser || busy) return;setBusy(true);setError(null);
  try {
   const number=(key: string) => values[key]?.trim() ? Number(values[key].replace(",",".")) : undefined;
   await staysService.addVitals(stayId,{recordedAt:new Date().toISOString(),temperatureC:number("temperatureC"),heartRate:number("heartRate"),respiratoryRate:number("respiratoryRate"),weightKg:number("weightKg"),generalState:values.generalState,appetite:values.appetite,note:values.note},currentUser.id);
   announceStaysChanged();onSaved();
  } catch(error) {setError(error instanceof Error ? error.message : "Le relevé n’a pas pu être enregistré.");}
  finally {setBusy(false);}
 }}>
 <div className="grid grid-cols-2 gap-4">{fields.map(field => <label key={field.key} className="space-y-2 text-[13px]">{field.label}<Input className="h-11" inputMode="decimal" value={values[field.key] || ""} onChange={event => setValues({...values,[field.key]:event.target.value})}/></label>)}</div>
 <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-[13px]">État général<select className="h-11 w-full rounded-xl border bg-background px-3" value={values.generalState || ""} onChange={event => setValues({...values,generalState:event.target.value})}><option value="">Non renseigné</option>{["Alerte","Abattu","Agité","Non réactif"].map(state => <option key={state}>{state}</option>)}</select></label><label className="space-y-2 text-[13px]">Appétit<select className="h-11 w-full rounded-xl border bg-background px-3" value={values.appetite || ""} onChange={event => setValues({...values,appetite:event.target.value})}><option value="">Non renseigné</option>{["Conservé","Diminué","Absent"].map(state => <option key={state}>{state}</option>)}</select></label></div>
 <label className="block space-y-2 text-[13px]">Observations<Input className="h-11" value={values.note || ""} onChange={event => setValues({...values,note:event.target.value})}/></label>
 {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
 <Button type="submit" className="h-11 w-full" disabled={busy || !currentUser}>{busy ? "Enregistrement…" : "Enregistrer le relevé"}</Button>
 </form>;
}
