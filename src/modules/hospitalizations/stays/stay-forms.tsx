import { useState } from "react";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "@/lib/icons";
import { admissionDateTime } from "./admission-date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { usePatientsRepository } from "@/data/repositories";
import { staysService } from "./service";
import { announceStaysChanged } from "./use-stays";
import type { StayLocation } from "./store";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
export function AdmissionForm({locations,onSaved}: {locations: StayLocation[];onSaved: () => void}) {
 const {currentUser}=useAuth(); const patients=usePatientsRepository();
 const [patient,setPatient]=useState(""),[location,setLocation]=useState(""),[reason,setReason]=useState("");
 const [date,setDate]=useState<Date | undefined>(() => new Date());
 const [time,setTime]=useState(() => { const now=new Date(); return `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`; });
 const [calendarOpen,setCalendarOpen]=useState(false);
 const admittedAt=admissionDateTime(date,time);
 const [error,setError]=useState<string | null>(null),[busy,setBusy]=useState(false);
 return <form className="space-y-4" onSubmit={async event => { event.preventDefault(); if (!currentUser || busy) return; if (!admittedAt) { setError("Choisissez une date et une heure d’admission valides."); return; } setBusy(true); setError(null); try { await staysService.admit({patientId:patient,locationId:location || undefined,admittedAt,reason},currentUser.id); announceStaysChanged(); toast.success("Admission enregistrée."); onSaved(); } catch { setError("L’admission n’a pas pu être enregistrée. Vérifiez les dates et la disponibilité du patient et de l’emplacement."); } finally {setBusy(false);} }}>
 <div className="flex flex-col gap-2"><label htmlFor="admission-patient" className="text-[13px]">Patient</label>
 <SearchableSelect id="admission-patient" label="Patient à admettre" placeholder="Rechercher un patient…" value={patient} onValueChange={setPatient} disabled={busy}
 options={patients.data.map(p => ({value:p.id,label:p.name,keywords:`${p.species} ${p.breed || ""}`}))}/></div>
 <label className="block space-y-2 text-[13px]">Emplacement<select className="h-11 w-full rounded-xl border bg-background px-3" value={location} onChange={event => setLocation(event.target.value)}><option value="">Sans emplacement</option>{locations.filter(place => place.active).map(place => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
 <div className="space-y-2 text-[13px]">
 <span>Date et heure d’admission</span>
 <div className="flex gap-2">
 <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
 <PopoverTrigger aria-label="Choisir la date d’admission" render={<Button type="button" variant="outline" className="h-11 min-w-0 flex-1 justify-start gap-2 px-3"/>}>
 <CalendarDays className="size-4 text-muted-foreground"/><span>{date ? date.toLocaleDateString("fr-FR") : "Choisir la date"}</span>
 </PopoverTrigger>
 <PopoverContent align="start" className="w-auto p-2">
 <Calendar mode="single" required locale={fr} selected={date} defaultMonth={date} className="[--cell-size:44px] text-[14px]" onSelect={selected => {setDate(selected);setCalendarOpen(false);}}/>
 </PopoverContent>
 </Popover>
 <label className="sr-only" htmlFor="admission-time">Heure d’admission</label>
 <Input id="admission-time" className="h-11 w-28 tabular-nums" type="text" inputMode="numeric" placeholder="HH:mm" value={time} onChange={event => setTime(event.target.value)} aria-invalid={!admittedAt} autoComplete="off"/>
 </div>
 {!admittedAt && <p role="alert" className="text-destructive">Indiquez une heure valide au format 24 h, par exemple 14:30.</p>}
 </div>
 <label className="block space-y-2 text-[13px]">Motif<Input className="h-11" value={reason} onChange={event => setReason(event.target.value)} required/></label>
 {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
 <Button type="submit" className="h-11 w-full" disabled={busy || !currentUser || !patient || !reason.trim() || !admittedAt}>{busy ? "Enregistrement…" : "Confirmer l’admission"}</Button>
 </form>;
}
export function LocationForm({onSaved}: {onSaved: () => void}) {
 const {currentUser}=useAuth(); const [name,setName]=useState(""),[type,setType]=useState<StayLocation["type"]>("cage"),[error,setError]=useState<string | null>(null),[busy,setBusy]=useState(false);
 return <form className="space-y-4" onSubmit={async event => {event.preventDefault();if (!currentUser || busy) return;setBusy(true);setError(null);try {await staysService.createLocation(name,type,currentUser.id);announceStaysChanged();toast.success("Emplacement créé.");onSaved();} catch {setError("L’emplacement n’a pas pu être créé. Vérifiez que son nom est unique.");} finally {setBusy(false);}}}>
 <label className="block space-y-2 text-[13px]">Nom<Input className="h-11" value={name} onChange={event => setName(event.target.value)} required/></label>
 <label className="block space-y-2 text-[13px]">Type<select className="h-11 w-full rounded-xl border bg-background px-3" value={type} onChange={event => setType(event.target.value as StayLocation["type"])}><option value="cage">Cage</option><option value="box">Box</option><option value="chenil">Chenil</option></select></label>
 {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
 <Button type="submit" className="h-11 w-full" disabled={busy || !name.trim() || !currentUser}>{busy ? "Enregistrement…" : "Créer l’emplacement"}</Button>
 </form>;
}
