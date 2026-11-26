import { useRef } from "react";
import { toast } from "sonner";
import { QuickPatientPicker } from "@/components/QuickPatientPicker";
import { useAuth } from "@/contexts/AuthContext";
import { useAppointmentsRepository } from "@/data/repositories";
import { guard } from "@/lib/guard";
import { startInFlux } from "@/modules/flow-board/open-in-flux";
import { prepareQuickConsultation } from "@/modules/shell/model/quick-consultation";
import type { View } from "@/types";
import type { Patient } from "@/types/db";

export default function QuickConsultation({
  open,
  onOpenChange,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (view: View) => void;
}) {
  const { currentUser } = useAuth();
  const appointments = useAppointmentsRepository();
  const busy = useRef(false);
  async function select(patient: Patient) {
    if (busy.current) {
      return;
    }
    busy.current = true;
    await guard(
      async () => {
        const appointment = await prepareQuickConsultation({
          patient,
          userId: currentUser?.id,
          appointments: appointments.data,
          create: appointments.add,
        });
        startInFlux(appointment.id, onNavigate);
      },
      {
        recover: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "La consultation n’a pas pu être ouverte."
          );
        },
        cleanup: () => {
          busy.current = false;
        },
      }
    );
  }
  return (
    <QuickPatientPicker
      description="Choisissez le patient pour commencer la consultation clinique."
      onOpenChange={onOpenChange}
      onSelect={(patient) => void select(patient)}
      open={open}
      title="Nouvelle consultation"
    />
  );
}
