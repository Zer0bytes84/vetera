/*
 * Which card of the « Données » thread is still waiting for the vet. Kept out of clinic-answers.tsx so that file exports
 * components only (React Fast Refresh reloads the whole panel otherwise).
 */

import type { ConfirmationStatus } from "@/components/ui/confirmation-card";
import type { Turn } from "./clinic-answers";
import type { Proposal } from "./types";

export interface CardState {
  status: ConfirmationStatus | "dismissed";
  error?: string;
  reference?: string;
  doneAt?: string;
}

/** The latest card still waiting for the vet (neither validated nor set aside), with its turn: what the foot of the panel shows. */
export function pendingProposal(
  turns: Turn[],
  cards: Record<string, CardState>
): { turnId: string; proposal: Proposal; card?: CardState } | null {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];
    const proposal =
      turn.answer.kind === "answer" ? turn.answer.proposal : null;
    if (!proposal) {
      continue;
    }
    const card = cards[turn.id];
    if (card?.status === "done" || card?.status === "dismissed") {
      continue;
    }
    return { turnId: turn.id, proposal, card };
  }
  return null;
}
