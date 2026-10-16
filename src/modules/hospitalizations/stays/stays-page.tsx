import "./hospitalisation.css";
import { LocationAvailability } from "./stay-location-controls";
import { StayRounds } from "./stay-rounds";
import { StayDetail } from "./stay-detail";
import { AdmissionForm, LocationForm } from "./stay-forms";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePatientsRepository } from "@/data/repositories";
import { ACTIVE_STAY_STATUSES, type StayStatus } from "./domain";
import { useStays } from "./use-stays";
const labels: Record<StayStatus,string>={admis:"Admis",en_cours:"En cours",sortie_prevue:"Sortie prévue",sorti:"Sorti",annule:"Annulé"};
export default function StaysPage({patientId,initialStayId}: {patientId?: string;initialStayId?: string}) {
 const {stays,locations,error,loading,refresh}=useStays(patientId);
 const patients=usePatientsRepository(); const [view,setView]=useState("sejours");
 const [form,setForm]=useState<"admission" | "location" | null>(null);
 const [selected,setSelected]=useState<string | null>(initialStayId || null);
 const active=stays.filter(stay => ACTIVE_STAY_STATUSES.includes(stay.status));
 const patientName=(id: string) => patients.data.find(patient => patient.id === id)?.name || "Patient";
 const selectedStay=stays.find(stay => stay.id === selected);
 if (selectedStay) return <section className="hospitalisation-view p-4 lg:p-6"><StayDetail stay={selectedStay} patientName={patientName(selectedStay.patient_id)} species={patients.data.find(patient => patient.id === selectedStay.patient_id)?.species || ""} onBack={() => setSelected(null)}/></section>;
 return <section className="hospitalisation-view space-y-6 p-4 lg:p-6">
  <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[13px] text-[#7F7F7F]">Clinique</p><h1 className="text-[24px] font-medium">Hospitalisation</h1><p className="mt-1 text-[13px] text-[#5D5D5D] dark:text-muted-foreground">Séjours, surveillance et occupation des emplacements.</p></div><span className="text-[13px] text-muted-foreground">{active.length} séjour{active.length > 1 ? "s" : ""} actif{active.length > 1 ? "s" : ""}</span><Button className="h-11" onClick={() => setForm(view === "emplacements" ? "location" : "admission")}>{view === "emplacements" ? "Créer un emplacement" : "Admettre un patient"}</Button></header>
  <Tabs value={view} onValueChange={setView}><TabsList aria-label="Vues de l’hospitalisation" className="engraved-view-tabs"><TabsTrigger value="sejours">Séjours</TabsTrigger><TabsTrigger value="occupation">Occupation</TabsTrigger><TabsTrigger value="tournee">Tournée</TabsTrigger><TabsTrigger value="emplacements">Emplacements</TabsTrigger></TabsList></Tabs>
  {error ? <div role="alert" className="rounded-xl border p-4 text-[13px]">{error}<Button className="ml-3" variant="outline" onClick={() => void refresh()}>Réessayer</Button></div> : loading ? <p role="status" className="text-[13px] text-muted-foreground">Chargement des séjours…</p> : view === "tournee" ? <StayRounds stays={active} locations={locations} patientName={patientName} onOpen={setSelected}/> : view === "sejours" ?
   <div className="stay-list space-y-3">{stays.length ? stays.map(stay => <article key={stay.id} className="stay-summary-card flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#F2F2F2] bg-card p-5 dark:border-border"><div><h2 className="text-[16px] font-medium">{patientName(stay.patient_id)}</h2><p className="mt-1 text-[13px] text-muted-foreground">{stay.reason}</p><p className="mt-2 text-[12px] text-muted-foreground">Admis le {new Date(stay.admitted_at).toLocaleString("fr-FR")}</p></div><div className="text-right"><p className="text-[13px] font-medium">{labels[stay.status]}</p><Button variant="ghost" className="mt-2 h-11" onClick={() => setSelected(stay.id)}>Ouvrir le séjour</Button><p className="mt-1 text-[12px] text-muted-foreground">{locations.find(location => location.id === stay.location_id)?.name || "Sans emplacement"}</p></div></article>) : <div className="rounded-2xl border border-dashed p-8 text-center text-[14px] text-muted-foreground">Aucun séjour enregistré.</div>}</div> :
   <div className="stay-location-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{locations.length ? locations.map(location => { const occupant=active.find(stay => stay.location_id === location.id); return <article key={location.id} className="stay-location-card rounded-2xl border border-[#F2F2F2] bg-card p-5 dark:border-border"><div className="flex items-center justify-between gap-3"><h2 className="text-[16px] font-medium">{location.name}</h2><span className="text-[12px] text-muted-foreground">{location.type === "box" ? "Box" : location.type === "cage" ? "Cage" : "Chenil"}</span></div><p className="mt-4 text-[14px]">{occupant ? patientName(occupant.patient_id) : location.active ? "Disponible" : "Désactivé"}</p><p className="mt-1 text-[12px] text-muted-foreground">{occupant ? labels[occupant.status] : location.species || "Toutes espèces"}</p>{occupant && <Button type="button" variant="outline" className="mt-4 h-11" onClick={() => setSelected(occupant.id)}>Ouvrir le séjour</Button>}{view === "emplacements" && <LocationAvailability location={location} occupied={!!occupant}/>}</article>; }) : <p className="text-[14px] text-muted-foreground">Aucun emplacement configuré.</p>}</div>}
 <Dialog open={form !== null} onOpenChange={open => {if (!open) setForm(null);}}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{form === "location" ? "Nouvel emplacement" : "Admission d’un patient"}</DialogTitle><DialogDescription>{form === "location" ? "Configurez une cage, un box ou un chenil." : "Vérifiez le patient et son emplacement avant confirmation."}</DialogDescription></DialogHeader>{form === "location" ? <LocationForm onSaved={() => setForm(null)}/> : <AdmissionForm locations={locations.filter(place => !active.some(stay => stay.location_id === place.id))} onSaved={() => setForm(null)}/>}</DialogContent></Dialog>
 </section>;
}
