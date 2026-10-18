import type { MedicalAct, MedicalReminderProposal } from "./store";

export const MEDICAL_ACT_RECORDED_EVENT = "baitari:medical-act-recorded";
export const MEDICAL_REMINDER_PROPOSAL_EVENT = "baitari:medical-reminder-proposal";

export function announceMedicalReminderProposal(proposal: MedicalReminderProposal): void {
  window.dispatchEvent(new CustomEvent(MEDICAL_REMINDER_PROPOSAL_EVENT, { detail: proposal }));
}

/** Dispatch only after the medical act has been saved. No reminder is written. */
export function announceMedicalActRecorded(act: MedicalAct): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(MEDICAL_ACT_RECORDED_EVENT, { detail: act }));
  }
}
