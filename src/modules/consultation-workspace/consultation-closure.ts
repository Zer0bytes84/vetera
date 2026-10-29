import { isSoapReviewed } from "@/modules/consultations/local-ai/soap-review";
import type { ConsultationSoap } from "@/types/db";

export const CLOSURE_NEEDS_NOTE =
  "Pas de note validée pour cette visite : écrivez ou dictez la note, relisez-la et validez-la avant de clôturer et facturer.";

/**
 * Why a consultation cannot be closed and billed yet, or null when it can:
 * only a SOAP note reviewed and validated by the vet opens the way. The
 * button and the closing itself ask the same question, so neither can be
 * bypassed by the other.
 */
export function closureBlocker(soap: ConsultationSoap | null | undefined): string | null {
  return soap && isSoapReviewed(soap) ? null : CLOSURE_NEEDS_NOTE;
}

/** Asks the consultation's SOAP panel to open its assistant (dictation). */
export const OPEN_SOAP_ASSISTANT_EVENT = "baitari:open-soap-assistant";
