import type { MedicalAct, MedicalReminderProposal } from "./store";

export interface MedicalReminderProposalPort {
  proposeForAct(act: MedicalAct): Promise<MedicalReminderProposal | null>;
}

/**
 * Produit une proposition après l'enregistrement d'un acte médical.
 *
 * Ce hook ne persiste rien. L'appelant présente la proposition au praticien,
 * puis appelle explicitement `createFromProposal` après confirmation.
 */
export async function onMedicalActRecorded(
  act: MedicalAct,
  port?: MedicalReminderProposalPort
): Promise<MedicalReminderProposal | null> {
  const local = port ?? (await import("./service")).patientRemindersService;
  return local.proposeForAct(act);
}
