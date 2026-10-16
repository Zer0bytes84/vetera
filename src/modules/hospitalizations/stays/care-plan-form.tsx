import type { CarePlan } from "./store";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useProductsRepository } from "@/data/repositories";
import { CARE_TYPES, type CareType } from "@/modules/care-tasks/domain";
import { careTypeLabels } from "@/modules/care-tasks/care-task-form";
import { announceCareTasksChanged } from "@/modules/care-tasks/use-care-tasks";
import { carePlanOccurrences } from "./domain";
import { staysService } from "./service";
import { announceStaysChanged } from "./use-stays";
function localDate(value?: string) { if (!value) return ""; const date=new Date(value); return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16); }
export function CarePlanForm({stayId,onSaved,plan}: {stayId: string;onSaved: () => void;plan?: CarePlan}) {
 const {currentUser}=useAuth(); const products=useProductsRepository();
 const [label,setLabel]=useState(plan?.label || ""),[type,setType]=useState<CareType>(plan?.type || "controle"),[product,setProduct]=useState(plan?.product_id || ""),[starts,setStarts]=useState(localDate(plan?.starts_at)),[ends,setEnds]=useState(localDate(plan?.ends_at)),[times,setTimes]=useState(plan ? (JSON.parse(plan.times_json) as string[]).join(", ") : ""),[note,setNote]=useState(plan?.note || "");
 const [error,setError]=useState<string | null>(null),[busy,setBusy]=useState(false);
 const hours=times.split(/[,;\s]+/).filter(Boolean);
 let count=0,validation="";
 try {if (starts && ends && hours.length) count=carePlanOccurrences(new Date(starts),new Date(ends),hours).filter(value => !plan || new Date(value) >= new Date()).length;} catch(error) {validation=error instanceof Error ? error.message : "Vérifiez les horaires.";}
 return <form className="space-y-4" onSubmit={async event => {event.preventDefault();if (!currentUser || busy || !count) return;setBusy(true);setError(null);try {const draft={label,type,productId:product || undefined,startsAt:starts,endsAt:ends,times:hours,note};if (plan) await staysService.updatePlan(plan.id,draft,currentUser.id); else await staysService.createPlan(stayId,draft,currentUser.id);announceStaysChanged();announceCareTasksChanged();onSaved();} catch(error) {setError(error instanceof Error ? error.message : "Le plan n’a pas pu être créé.");} finally {setBusy(false);}}}>
 <label className="block space-y-2 text-[13px]">Soin<Input className="h-11" value={label} onChange={event => setLabel(event.target.value)} required/></label>
 <label className="block space-y-2 text-[13px]">Type<select className="h-11 w-full rounded-xl border bg-background px-3" value={type} onChange={event => setType(event.target.value as CareType)}>{CARE_TYPES.map(item => <option key={item} value={item}>{careTypeLabels[item]}</option>)}</select></label>
 <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-[13px]">Début<Input className="h-11" type="datetime-local" value={starts} onChange={event => setStarts(event.target.value)} required/></label><label className="space-y-2 text-[13px]">Fin<Input className="h-11" type="datetime-local" value={ends} onChange={event => setEnds(event.target.value)} required/></label></div>
 <label className="block space-y-2 text-[13px]">Horaires quotidiens<Input className="h-11" placeholder="08:00, 18:00" value={times} onChange={event => setTimes(event.target.value)} required/></label>
 <label className="block space-y-2 text-[13px]">Produit lié (facultatif)<select className="h-11 w-full rounded-xl border bg-background px-3" value={product} onChange={event => setProduct(event.target.value)}><option value="">Aucun produit</option>{products.data.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
 <label className="block space-y-2 text-[13px]">Consignes<Input className="h-11" value={note} onChange={event => setNote(event.target.value)}/></label>
 <p role="status" className="text-[13px] text-muted-foreground">{validation || `${count} soin(s) à planifier. ${plan ? "Les soins réalisés ou en cours sont conservés." : "Vérifiez les horaires avant confirmation."}`}</p>
 {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
 <Button type="submit" className="h-11 w-full" disabled={busy || !currentUser || !label.trim() || !count || Boolean(validation)}>{busy ? "Enregistrement…" : "Confirmer le plan de soins"}</Button>
 </form>;
}
