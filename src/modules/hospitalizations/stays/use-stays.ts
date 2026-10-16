import { useCallback, useEffect, useRef, useState } from "react";
import { staysService } from "./service";
import type { Stay, StayLocation } from "./store";
export const STAYS_CHANGED = "baitari:stays-changed";
export function announceStaysChanged() { window.dispatchEvent(new Event(STAYS_CHANGED)); }
export function useStays(patientId?: string) {
 const [stays,setStays]=useState<Stay[]>([]), [locations,setLocations]=useState<StayLocation[]>([]);
 const [error,setError]=useState<string | null>(null), [loading,setLoading]=useState(true);
 const sequence=useRef(0);
 const refresh=useCallback(async () => {
  const request=++sequence.current;
  try {
   const [records,places]=await Promise.all([staysService.list(patientId),staysService.locations()]);
   if (request !== sequence.current) return;
   setStays(records); setLocations(places); setError(null);
  } catch { if (request === sequence.current) setError("Les séjours n’ont pas pu être chargés. Réessayez."); }
  finally { if (request === sequence.current) setLoading(false); }
 },[patientId]);
 const invalidatePending = useCallback(() => { sequence.current++; }, []);
 useEffect(() => {
  void refresh(); const listener=() => { void refresh(); };
  const visible=() => { if (document.visibilityState === "visible") listener(); };
  window.addEventListener(STAYS_CHANGED,listener); window.addEventListener("focus",listener); document.addEventListener("visibilitychange",visible);
  const timer=window.setInterval(listener,30000);
  return () => { window.removeEventListener(STAYS_CHANGED,listener); window.removeEventListener("focus",listener); window.clearInterval(timer); document.removeEventListener("visibilitychange",visible); invalidatePending(); };
 },[refresh,invalidatePending]);
 return {stays,locations,error,loading,refresh};
}
