import type { ConsultationSoap } from "@/types/db";
import { SOAP_SECTIONS } from "./local-ai/soap-schema";

/** L'état de la note SOAP d'une consultation : fonctions pures, sans interface, pour que les règles de sauvegarde se testent seules. */
export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";
export type Payload = Pick<
  ConsultationSoap,
  | "subjective"
  | "objective"
  | "assessment"
  | "plan"
  | "transcript"
  | "aiDraft"
  | "aiConfidence"
  | "content"
  | "templateVersion"
>;
export const samePayload = (a: Payload | null, b: Payload) =>
  a !== null && JSON.stringify(a) === JSON.stringify(b);
export const hasNote = (payload: Payload) =>
  SOAP_SECTIONS.some(({ key }) => payload[key].trim());

/** La note a-t-elle des modifications non enregistrées ? Une note vide jamais enregistrée n'en a pas. */
export function isSoapUnsaved(
  initialised: boolean,
  saved: Payload | null,
  payload: Payload
): boolean {
  return (
    initialised && !samePayload(saved, payload) && (hasNote(payload) || !!saved)
  );
}

/** La sauvegarde automatique doit-elle partir ? Pas avant l'initialisation, pas pendant l'assistant, pas pendant un enregistrement ni après une erreur, et seulement s'il y a quelque chose de nouveau à écrire. */
export function isSoapAutosaveDue(a: {
  initialised: boolean;
  assistantOpen: boolean;
  saveStatus: SaveStatus;
  saved: Payload | null;
  payload: Payload;
}): boolean {
  return !(
    !a.initialised ||
    a.assistantOpen ||
    a.saveStatus === "saving" ||
    a.saveStatus === "error" ||
    !(hasNote(a.payload) || a.saved) ||
    samePayload(a.saved, a.payload)
  );
}

export const VALIDATION_LOST_MESSAGE =
  "Note modifiée depuis sa validation : elle n’est plus validée, ni proposée dans les cas similaires. Revalidez-la.";
/** La note a-t-elle quitté sa version validée ? Revenir au texte validé rend la validation (même clé de source). */
export function isValidationLost(
  validated: Pick<Payload, (typeof SOAP_SECTIONS)[number]["key"]> | null,
  current: Pick<Payload, (typeof SOAP_SECTIONS)[number]["key"]>
) {
  return (
    validated !== null &&
    SOAP_SECTIONS.some(({ key }) => current[key] !== validated[key])
  );
}
