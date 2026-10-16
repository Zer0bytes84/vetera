import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { ACTIVE_STAY_STATUSES } from "./domain";
import { staysService } from "./service";
import type { Stay, StayLocation } from "./store";
import { announceStaysChanged, useStays } from "./use-stays";
export function LocationAvailability({ location, occupied }: { location: StayLocation; occupied: boolean }) {
  const { currentUser } = useAuth();
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  return <div className="mt-4 space-y-2">
    <Button className="h-11" variant="outline" disabled={busy || !currentUser || occupied} onClick={async () => {
      if (!currentUser || busy) return;
      setBusy(true); setError(null);
      try { await staysService.setLocationActive(location.id, !location.active, currentUser.id); announceStaysChanged(); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "L’emplacement n’a pas pu être modifié."); }
      finally { setBusy(false); }
    }}>{busy ? "Enregistrement…" : location.active ? "Désactiver" : "Activer"}</Button>
    {occupied && <p className="text-[12px] text-muted-foreground">Transférez le patient avant de désactiver cet emplacement.</p>}
    {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
  </div>;
}
export function StayTransfer({ stay }: { stay: Stay }) {
  const { currentUser } = useAuth();
  const { locations, stays } = useStays();
  const [locationId, setLocationId] = useState(""), [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const available = locations.filter(location => location.active && location.id !== stay.location_id && !stays.some(item => item.location_id === location.id && ACTIVE_STAY_STATUSES.includes(item.status)));
  return <section className="space-y-3 rounded-2xl border border-[#F2F2F2] bg-card p-5 dark:border-border">
    <h3 className="text-[16px] font-medium">Emplacement</h3>
    <p className="text-[13px] text-muted-foreground">{locations.find(location => location.id === stay.location_id)?.name || "Sans emplacement"}</p>
    <form className="flex flex-wrap items-end gap-3" onSubmit={async event => {
      event.preventDefault(); if (!currentUser || busy || !locationId || !reason.trim()) return;
      setBusy(true); setError(null);
      try { await staysService.transfer(stay.id, locationId, currentUser.id, reason); setLocationId(""); setReason(""); announceStaysChanged(); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Le transfert n’a pas pu être enregistré."); }
      finally { setBusy(false); }
    }}>
      <label className="min-w-48 space-y-2 text-[13px]">Nouvel emplacement<select className="h-11 w-full rounded-xl border bg-background px-3" value={locationId} onChange={event => setLocationId(event.target.value)}><option value="">Choisir un emplacement libre</option>{available.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
      <label className="min-w-48 flex-1 space-y-2 text-[13px]">Motif du transfert<Input className="h-11" value={reason} onChange={event => setReason(event.target.value)}/></label>
      <Button className="h-11" type="submit" disabled={busy || !currentUser || !locationId || !reason.trim()}>{busy ? "Enregistrement…" : "Transférer le patient"}</Button>
    </form>
    {!available.length && <p className="text-[12px] text-muted-foreground">Aucun autre emplacement libre.</p>}
    {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
  </section>;
}
