import { useState } from "react";
import { Button } from "@/components/ui/button";
import CarePage from "@/modules/care-tasks/care-page";
import { VitalsForm } from "./vitals-form";
import type { Stay, StayLocation } from "./store";
export function StayRounds({stays,locations,patientName,onOpen}: {stays: Stay[];locations: StayLocation[];patientName: (id: string) => string;onOpen: (id: string) => void}) {
 const [selected,setSelected]=useState<string | null>(null),[measure,setMeasure]=useState(false);
 const stay=stays.find(item => item.id === selected);
 return <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{stays.map(item => <article key={item.id} className={`rounded-2xl border bg-card p-5 ${selected === item.id ? "border-primary" : "border-[#F2F2F2] dark:border-border"}`}><h2 className="text-[18px] font-medium">{patientName(item.patient_id)}</h2><p className="mt-1 text-[13px] text-muted-foreground">{locations.find(location => location.id === item.location_id)?.name || "Sans emplacement"}</p><div className="mt-4 flex flex-wrap gap-3"><Button className="h-11" variant={selected === item.id ? "default" : "outline"} onClick={() => {setSelected(item.id);setMeasure(false);}}>Soins et constantes</Button><Button className="h-11" variant="ghost" onClick={() => onOpen(item.id)}>Détail</Button></div></article>)}</div>
 {!stays.length && <p className="rounded-2xl border border-dashed p-8 text-center text-[14px] text-muted-foreground">Aucun patient hospitalisé à visiter.</p>}
 {stay && <section className="space-y-4 rounded-2xl border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-[18px] font-medium">{patientName(stay.patient_id)}</h2><Button className="h-11" variant="outline" onClick={() => setMeasure(!measure)}>{measure ? "Fermer le relevé" : "Relever les constantes"}</Button></div>{measure && <div className="max-w-xl"><VitalsForm key={stay.id} stayId={stay.id} onSaved={() => setMeasure(false)}/></div>}<CarePage key={stay.patient_id} patientId={stay.patient_id}/></section>}
 </div>;
}
