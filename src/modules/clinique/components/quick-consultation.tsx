import { useRef } from "react";
import { toast } from "sonner";
import { QuickPatientPicker } from "@/components/QuickPatientPicker";
import { useAuth } from "@/contexts/AuthContext";
import { useAppointmentsRepository } from "@/data/repositories";
import { prepareQuickConsultation } from "@/modules/shell/model/quick-consultation";
import type { View } from "@/types";
import type { Patient } from "@/types/db";

export default function QuickConsultation({open,onOpenChange,onNavigate}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (view: View) => void;
}) {
  const { currentUser } = useAuth();
  const appointments = useAppointmentsRepository();
  const busy = useRef(false);
  async function select(patient: Patient) {
    if (busy.current) return;
    busy.current = true;
    try {
      const appointment = await prepareQuickConsultation({patient,userId:currentUser?.id,appointments:appointments.data,create:appointments.add});
      sessionStorage.setItem("vetera:pending-consultation-start",appointment.id);
      sessionStorage.setItem("vetera:pending-clinical-tab","consultations");
      onNavigate("clinique");
      window.dispatchEvent(new Event("vetera:open-consultation"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La consultation n’a pas pu être ouverte.");
    } finally { busy.current = false; }
  }
  return <QuickPatientPicker open={open} onOpenChange={onOpenChange} onSelect={patient => void select(patient)}
    title="Nouvelle consultation" description="Choisissez le patient pour commencer la consultation clinique."/>;
}
