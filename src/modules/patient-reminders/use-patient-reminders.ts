import { useCallback, useEffect, useRef, useState } from "react";
import { patientRemindersService } from "./service";
import type { PatientReminder, ReminderType } from "./store";
export const PATIENT_REMINDERS_CHANGED = "baitari:patient-reminders-changed";
export function announcePatientRemindersChanged() { window.dispatchEvent(new Event(PATIENT_REMINDERS_CHANGED)); }
export function usePatientReminders() {
 const [reminders,setReminders]=useState<PatientReminder[]>([]);
 const [types,setTypes]=useState<ReminderType[]>([]);
 const [error,setError]=useState<string | null>(null);
 const [loading,setLoading]=useState(true);
 const sequence=useRef(0);
 const refresh=useCallback(async()=>{
  const request=++sequence.current;
  try {
   const [rows,kinds]=await Promise.all([patientRemindersService.list(),patientRemindersService.types()]);
   if (request !== sequence.current) return;
   setReminders(rows);setTypes(kinds);setError(null);
  } catch {if(request===sequence.current) setError("Les rappels patients n’ont pas pu être chargés.");}
  finally {if(request===sequence.current)setLoading(false);}
 },[]);
 const invalidate=useCallback(()=>{sequence.current++;},[]);
 useEffect(()=>{
  void refresh();const listener=()=>{void refresh();};
  window.addEventListener(PATIENT_REMINDERS_CHANGED,listener);
  window.addEventListener("focus",listener);
  const timer=window.setInterval(listener,60000);
  return()=>{window.removeEventListener(PATIENT_REMINDERS_CHANGED,listener);window.removeEventListener("focus",listener);window.clearInterval(timer);invalidate();};
 },[refresh,invalidate]);
 return {reminders,types,error,loading,refresh};
}
