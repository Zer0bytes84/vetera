import "./patient-reminders.css";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useOwnersRepository, usePatientsRepository, useUsersRepository } from "@/data/repositories";
import { formatPhone } from "@/utils/display-format";
import { isReminderOverdue, localToday } from "./domain";
import { callsCsv, callsPrintHtml, type CallRow } from "./export";
import { patientRemindersService } from "./service";
import { announcePatientRemindersChanged, usePatientReminders } from "./use-patient-reminders";
import type { PatientReminder } from "./store";
const field="min-h-11 rounded-xl border border-border bg-background px-3 text-[13px]";
export function PatientRemindersPanel() {
 const model=usePatientReminders();
 return <PatientRemindersContent model={model}/>;
}
export function PatientRemindersContent({model,view,embedded=false}: {
 model: ReturnType<typeof usePatientReminders>;
 view?: "active" | "completed" | "calls" | "types";
 embedded?: boolean;
}) {
 const {reminders,types,error,loading,refresh}=model;
 const patients=usePatientsRepository(),owners=useOwnersRepository(),users=useUsersRepository();const {currentUser}=useAuth();
 const [internalTab,setTab]=useState("active"),[type,setType]=useState(""),[origin,setOrigin]=useState("");
 const tab=view ?? internalTab;
 const [action,setAction]=useState<{reminder: PatientReminder;kind: string} | null>(null);
 const [date,setDate]=useState(""),[reason,setReason]=useState(""),[busy,setBusy]=useState(false),[notice,setNotice]=useState<string | null>(null);
 const [history,setHistory]=useState<{id: string;rows: Record<string,unknown>[]} | null>(null);
 const [editingType,setEditingType]=useState<string | null>(null),[name,setName]=useState(""),[months,setMonths]=useState("12"),[active,setActive]=useState(true);
 const today=localToday();
 const filtered=reminders.filter(r=>(!type || r.type_id===type)&&(!origin || r.origin===origin));
 const rows=filtered.filter(r=>tab==="completed" ? r.status!=="en_cours" : r.status==="en_cours" && (tab!=="calls" || r.due_date<=today));
 const callRows: CallRow[]=rows.map(r=>{
  const patient=patients.data.find(p=>p.id===r.patient_id);const owner=owners.data.find(o=>o.id===patient?.ownerId);
  return {patient:patient?.name || "Patient indisponible",owner:owner ? `${owner.firstName} ${owner.lastName}` : "Propriétaire indisponible",phone:formatPhone(owner?.phone) || "Non renseigné",type:types.find(t=>t.id===r.type_id)?.name || "Rappel",dueDate:r.due_date};
 });
 async function perform(operation:()=>Promise<unknown>) {
  if(busy)return;setBusy(true);setNotice(null);
  try{await operation();announcePatientRemindersChanged();await refresh();setAction(null);setEditingType(null);}catch(e){setNotice(e instanceof Error?e.message:"L’action n’a pas pu être enregistrée.");}finally{setBusy(false);}
 }
 function download() {const url=URL.createObjectURL(new Blob([callsCsv(callRows)],{type:"text/csv;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download=`appels-${today}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function print() {const frame=document.createElement("iframe");frame.style.position="fixed";frame.style.width="0";frame.style.height="0";frame.style.border="0";frame.title="Liste d’appels à imprimer";frame.srcdoc=callsPrintHtml(callRows);frame.onload=()=>{frame.contentWindow?.print();setTimeout(()=>frame.remove(),60000);};document.body.appendChild(frame);}
 return <section className={embedded ? "patient-reminders-panel flex flex-col gap-3" : "patient-reminders-panel clinical-feature-surface space-y-4 p-4 sm:p-5"} aria-label="Rappels patients">
  {!embedded && <div><h2 className="text-[18px] font-medium">Rappels patients</h2><p className="mt-1 text-[13px] text-muted-foreground">Vaccinations et suivis, sans modifier vos tâches manuelles.</p></div>}
  {!embedded && <div role="tablist" aria-label="Vues des rappels patients" className="flex flex-wrap gap-2">{[["active","En cours"],["completed","Terminés"],["calls","Appels du jour"],["types","Types de rappels"]].map(([value,label])=><Button key={value} type="button" role="tab" aria-selected={tab===value} variant={tab===value?"secondary":"ghost"} className="min-h-11" onClick={()=>{setTab(value);setAction(null);setHistory(null);}}>{label}</Button>)}</div>}
  {error && <div role="alert" className="text-[13px]">{error} <Button variant="outline" className="min-h-11" onClick={()=>void refresh()}>Réessayer</Button></div>}
  {notice && <p role="alert" className="text-[13px] text-destructive">{notice}</p>}
  {tab!=="types" && <>{(!embedded || tab==="calls") && <div className="flex flex-wrap gap-3"><select aria-label="Type de rappel patient" className={field} value={type} onChange={e=>setType(e.target.value)}><option value="">Tous les types</option>{types.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><select aria-label="Origine du rappel" className={field} value={origin} onChange={e=>setOrigin(e.target.value)}><option value="">Toutes les origines</option><option value="auto">Automatique</option><option value="manuel">Manuel</option></select>{tab==="calls" && <><Button variant="outline" className="min-h-11" disabled={!rows.length} onClick={print}>Imprimer</Button><Button variant="outline" className="min-h-11" disabled={!rows.length} onClick={download}>Exporter CSV</Button></>}</div>}
  {(!embedded || tab==="calls") && !rows.length && <p className="py-6 text-[13px] text-muted-foreground">{loading?"Chargement des rappels…":"Aucun rappel dans cette vue."}</p>}
  <div className="space-y-3">{rows.map((r,index)=><article key={r.id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-[14px] font-medium">{callRows[index].patient} · {callRows[index].type}</h3><p className="mt-1 text-[13px] text-muted-foreground">{new Date(`${r.due_date}T12:00:00`).toLocaleDateString("fr-FR")} · {r.origin==="auto"?"Automatique":"Manuel"}</p>{isReminderOverdue(r.status,r.due_date,today)?<p className="mt-2 text-[12px] font-medium text-destructive">En retard</p>:<p className="mt-2 text-[12px] text-muted-foreground">{r.status==="traite"?"Traité":r.status==="annule"?"Annulé":"En cours"}</p>}{tab==="calls"&&<p className="mt-2 text-[13px]">{callRows[index].owner} · {callRows[index].phone}</p>}</div><div className="flex flex-wrap gap-2">{r.status==="en_cours"&&["Traiter","Reporter","Annuler"].map(kind=><Button key={kind} variant="outline" className="min-h-11" disabled={busy} onClick={()=>{setAction({reminder:r,kind});setDate(r.due_date);setReason("");setNotice(null);}}>{kind}</Button>)}<Button variant="ghost" className="min-h-11" onClick={()=>{void patientRemindersService.history(r.id).then(records=>setHistory({id:r.id,rows:records})).catch(()=>setNotice("L’historique n’a pas pu être chargé."));}}>Historique</Button></div></div>
  {history?.id===r.id&&<ol className="mt-3 space-y-2 border-t pt-3 text-[12px] text-muted-foreground">{history.rows.map(h=><li key={String(h.id)}>{new Date(String(h.created_at)).toLocaleString("fr-FR")} · {users.data.find(u=>u.id===h.author_id)?.displayName || "Auteur enregistré"} · {({creation:"Création",migration:"Import de l’échéance existante",report:"Report",annulation:"Annulation",traitement_manuel:"Traitement manuel",traitement_acte:"Vaccination enregistrée",modification_acte:"Vaccination modifiée"} as Record<string,string>)[String(h.action)] || "Modification"}{h.old_due_date && h.new_due_date && h.old_due_date!==h.new_due_date ? ` · ${String(h.old_due_date)} → ${String(h.new_due_date)}` : ""}{h.reason?` · ${String(h.reason)}`:""}</li>)}</ol>}
  </article>)}</div></>}
  {action&&<form aria-label={`${action.kind} le rappel`} className="space-y-3 rounded-xl border border-border p-4" onSubmit={e=>{e.preventDefault();void perform(()=>action.kind==="Reporter"?patientRemindersService.postpone(action.reminder.id,date,currentUser?.id || "",reason):patientRemindersService.transition(action.reminder.id,action.kind==="Traiter"?"traite":"annule",currentUser?.id || "",reason));}}><h3 className="text-[14px] font-medium">{action.kind} le rappel</h3>{action.kind==="Reporter"&&<label className="block text-[13px]">Nouvelle échéance<Input type="date" className="mt-1 min-h-11" value={date} onChange={e=>setDate(e.target.value)} required/></label>}{action.kind!=="Traiter"&&<label className="block text-[13px]">Motif<Input className="mt-1 min-h-11" value={reason} onChange={e=>setReason(e.target.value)} required/></label>}<div className="flex gap-2"><Button type="button" variant="outline" className="min-h-11" onClick={()=>setAction(null)}>Fermer</Button><Button type="submit" className="min-h-11" disabled={busy || !currentUser || (action.kind!=="Traiter"&&!reason.trim())}>Confirmer</Button></div></form>}
  {tab==="types"&&<><div className="space-y-3">{types.map(t=><div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"><div><p className="text-[14px] font-medium">{t.name}</p><p className="text-[13px] text-muted-foreground">{t.interval_months} mois · {t.active?"Actif":"Inactif"}</p></div><Button variant="outline" className="min-h-11" onClick={()=>{setEditingType(t.id);setName(t.name);setMonths(String(t.interval_months));setActive(!!t.active);}}>Modifier</Button></div>)}</div><Button variant="outline" className="min-h-11" onClick={()=>{setEditingType("");setName("");setMonths("12");setActive(true);}}>Ajouter un type</Button>{editingType!==null&&<form className="space-y-3 rounded-xl border border-border p-4" onSubmit={e=>{e.preventDefault();void perform(()=>patientRemindersService.saveType({id:editingType || undefined,name,intervalMonths:Number(months),active},currentUser?.id || ""));}}><label className="block text-[13px]">Nom<Input className="mt-1 min-h-11" value={name} onChange={e=>setName(e.target.value)} required/></label><label className="block text-[13px]">Intervalle en mois<Input className="mt-1 min-h-11" type="number" min="1" max="120" step="1" value={months} onChange={e=>setMonths(e.target.value)} required/></label><label className="flex min-h-11 items-center gap-2 text-[13px]"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/>Actif</label><Button type="submit" className="min-h-11" disabled={busy || !currentUser}>Enregistrer le type</Button></form>}</>}
 </section>;
}
