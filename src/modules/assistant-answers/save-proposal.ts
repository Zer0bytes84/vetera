/*
 * The one write of the assistant's data tab: the tasks of a card the vet validated.
 *
 * Called only from the card's « Valider ». The drafts are checked again against the tasks as they are at that moment, so a
 * second validation, or a second card for the same reminders, creates nothing twice. A refused write is counted, not hidden:
 * the card says how many tasks were saved and stays validable for the rest.
 */

import type { Task } from "@/types/db";
import { proposeTasks } from "./answer";
import type { Proposal } from "./types";

type NewTask = Omit<Task, "id" | "createdAt" | "updatedAt">;
type AddTask = (task: NewTask) => Promise<Task | null>;

export async function saveProposal(
  proposal: Proposal,
  existing: Task[],
  add: AddTask
): Promise<{ created: number; expected: number }> {
  const pending = proposeTasks(proposal.tasks, existing)?.tasks ?? [];
  let created = 0;
  for (const draft of pending) {
    const row = await add({
      title: draft.title,
      description: draft.description,
      patientId: draft.patientId,
      dueDate: draft.dueDate,
      priority: "medium",
      status: "todo",
      isReminder: false,
    });
    if (row) {
      created += 1;
    }
  }
  return { created, expected: pending.length };
}
