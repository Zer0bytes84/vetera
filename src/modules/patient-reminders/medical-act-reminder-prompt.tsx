import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { CareCompletedEvent } from "@/modules/care-tasks/hooks";
import { isTauriRuntime } from "@/services/browser-store";
import { localToday, medicalReminderTypeForAct } from "./domain";
import { MEDICAL_ACT_RECORDED_EVENT, MEDICAL_REMINDER_PROPOSAL_EVENT } from "./medical-act-events";
import { MedicalReminderDialog } from "./medical-reminder-dialog";
import { onMedicalActRecorded } from "./on-medical-act-recorded";
import { patientRemindersService } from "./service";
import type { MedicalAct, MedicalReminderProposal } from "./store";
import { announcePatientRemindersChanged } from "./use-patient-reminders";

/** One local proposal queue shared by care and consultation entry points. */
export function MedicalActReminderPrompt() {
  const { currentUser } = useAuth();
  const authorId = currentUser?.id;
  const [queue, setQueue] = useState<MedicalReminderProposal[]>([]);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!authorId) return;
    let mounted = true;
    const offer = async (act: MedicalAct) => {
      if (!isTauriRuntime() || seen.current.has(act.id)) return;
      seen.current.add(act.id);
      try {
        const proposal = await onMedicalActRecorded(act, patientRemindersService);
        if (mounted && proposal) setQueue((current) => [...current, proposal]);
      } catch {
        seen.current.delete(act.id);
        toast.error("L’acte est enregistré. Le prochain rappel n’a pas pu être proposé.", {
          action: { label: "Réessayer", onClick: () => { void offer(act); } },
        });
      }
    };
    const fromAct = (event: Event) => { void offer((event as CustomEvent<MedicalAct>).detail); };
    const fromProposal = (event: Event) => {
      const proposal = (event as CustomEvent<MedicalReminderProposal>).detail;
      setQueue((current) => current.some((row) => row.acteSourceId === proposal.acteSourceId) ? current : [...current, proposal]);
    };
    const fromCare = (event: Event) => {
      const care = (event as CustomEvent<CareCompletedEvent>).detail;
      const type = medicalReminderTypeForAct(care.act);
      if (!type) return;
      void offer({ id: `soin:${care.taskId}`, patientId: care.patientId, type, date: localToday(new Date(care.completedAt)), note: care.act });
    };
    window.addEventListener(MEDICAL_ACT_RECORDED_EVENT, fromAct);
    window.addEventListener(MEDICAL_REMINDER_PROPOSAL_EVENT, fromProposal);
    window.addEventListener("careTaskCompleted", fromCare);
    return () => {
      mounted = false;
      window.removeEventListener(MEDICAL_ACT_RECORDED_EVENT, fromAct);
      window.removeEventListener(MEDICAL_REMINDER_PROPOSAL_EVENT, fromProposal);
      window.removeEventListener("careTaskCompleted", fromCare);
    };
  }, [authorId]);

  const proposal = queue[0];
  if (!proposal) return null;
  return (
    <MedicalReminderDialog
      key={proposal.acteSourceId}
      onClose={() => setQueue((current) => current.slice(1))}
      onConfirm={async (draft) => {
        await patientRemindersService.createFromProposal(draft, currentUser?.id ?? "");
        announcePatientRemindersChanged();
        toast.success("Rappel médical créé");
      }}
      proposal={proposal}
    />
  );
}
