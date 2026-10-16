import {
  generateId,
  runDbRead,
  runDbTransaction,
} from "@/services/sqlite/database";
import { createCareStore } from "./store";
import type { CareStatus } from "./domain";
import { emitSQLiteDataChanged } from "@/hooks/useSQLite";
const store = createCareStore(
  { read: runDbRead, transaction: runDbTransaction },
  generateId,
);

// Register with the service, independently of which clinical view is mounted.
import { subscribeCareTaskCompleted } from "./hooks";
import { toast } from "sonner";
subscribeCareTaskCompleted(async ({ taskId }) => {
  try {
    const { billCompletedCareTask } = await import("@/services/billingService");
    await billCompletedCareTask(taskId);
  } catch (error) {
    toast.error(
      "Le soin est enregistré, mais sa facturation a échoué. Réessayez avant de clôturer le dossier.",
    );
    throw error;
  }
});

export const careTasksService = {
  ...store,
  async undoCompletion(taskId: string, author: string, reason: string, expectedRevision: number) {
    const task = await store.undoCompletion(taskId, author, reason, expectedRevision);
    if (typeof window !== "undefined") {
      for (const table of ["products", "stock_movements", "stock_balances", "invoices", "invoice_lines", "audit_log"]) emitSQLiteDataChanged(table);
    }
    return task;
  },
  async transition(taskId: string, to: CareStatus, author: string, reason?: string) {
    const result = await store.transition(taskId, to, author, reason);
    if (to === "fait" && typeof window !== "undefined") {
      emitSQLiteDataChanged("products");
      emitSQLiteDataChanged("stock_movements");
    }
    return result;
  },
  async list(start: Date, end: Date) {
    const tasks = await store.list(start, end);
    // Recover all completed care, including yesterday after a midnight rollover.
    // The visible tasks still belong only to the requested date range.
    let billingFailed = false;
    try {
      const pending = await runDbRead((database) =>
        database.select<{ id: string }[]>(
          `SELECT c.id FROM care_tasks c LEFT JOIN invoices i ON i.id = 'care-invoice:' || c.id ||
            CASE WHEN c.completion_revision > 0 THEN ':validation:' || c.completion_revision ELSE '' END
         WHERE c.statut = 'fait' AND i.id IS NULL
         ORDER BY c.completed_at, c.id`,
        ),
      );
      if (pending.length) {
        const { billCompletedCareTask } =
          await import("@/services/billingService");
        for (const task of pending) {
          try {
            await billCompletedCareTask(task.id);
          } catch {
            billingFailed = true;
          }
        }
      }
    } catch {
      billingFailed = true;
    }
    if (billingFailed) {
      toast.error(
        "Les soins restent affichés. Certaines facturations n’ont pas pu être finalisées et seront retentées à l’actualisation.",
        { id: "care-billing-recovery" },
      );
    }
    return tasks;
  },
};
