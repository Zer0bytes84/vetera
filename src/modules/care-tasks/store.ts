import {
  assertCareTransition,
  careCompletionKey,
  careInvoiceId,
  CARE_TYPES,
  type CareHistory,
  type CareStatus,
  type CareTask,
  type CareType,
} from "./domain";
import { notifyCareTaskCompleted } from "./hooks";
import { StockError, stockQuantity } from "@/domain/stock";
import { BillingDomainError } from "@/domain/billing";
import { consumeStockInDatabase, stockProductInDatabase } from "@/modules/stock/services/stock-store";
import { returnCareStockInDatabase } from "@/modules/stock/services/care-stock-rollback";
export interface CareDatabase {
  select<T>(sql: string, values?: unknown[]): Promise<T>;
  execute(sql: string, values?: unknown[]): Promise<{ rowsAffected: number }>;
}
export interface CarePersistence {
  read<T>(operation: (db: CareDatabase) => Promise<T>): Promise<T>;
  transaction<T>(operation: (db: CareDatabase) => Promise<T>): Promise<T>;
}
export interface NewCareTask {
  patientId: string;
  label: string;
  type: CareType;
  scheduledAt: string;
  productId?: string | null;
  productQuantity?: number;
  note?: string;
}
export function createCareStore(
  persistence: CarePersistence,
  id: () => string,
  clock: () => Date = () => new Date()
) {
  return {
    list(start: Date, end: Date) {
      return persistence.read((db) =>
        db.select<CareTask[]>(
          "SELECT * FROM care_tasks WHERE heure_prevue >= $1 AND heure_prevue < $2 ORDER BY heure_prevue, id",
          [start.toISOString(), end.toISOString()]
        )
      );
    },
    get(taskId: string) {
      return persistence.read(
        async (db) =>
          (
            await db.select<CareTask[]>(
              "SELECT * FROM care_tasks WHERE id = $1",
              [taskId]
            )
          )[0] ?? null
      );
    },
    history(taskId: string) {
      return persistence.read((db) =>
        db.select<CareHistory[]>(
          "SELECT * FROM care_task_history WHERE task_id = $1 ORDER BY changed_at, rowid",
          [taskId]
        )
      );
    },
    async create(draft: NewCareTask, author: string): Promise<CareTask> {
      if (!author.trim())
        throw new Error("Un utilisateur connecté est requis.");
      if (!draft.patientId || !draft.label.trim())
        throw new Error("Choisissez un patient et indiquez le soin.");
      if (
        !CARE_TYPES.includes(draft.type) ||
        !Number.isFinite(new Date(draft.scheduledAt).getTime())
      )
        throw new Error("Vérifiez le type et l’heure prévue du soin.");
      const now = clock().toISOString();
      const task: CareTask = {
        id: id(),
        patient_id: draft.patientId,
        label: draft.label.trim(),
        type: draft.type,
        heure_prevue: new Date(draft.scheduledAt).toISOString(),
        statut: "a_faire",
        execute_par: null,
        produit_id: draft.productId || null,
        produit_quantite: draft.productId ? stockQuantity(draft.productQuantity ?? 1) : 1,
        note: draft.note ?? "",
        motif_annulation: null,
        recurrence: null,
        created_at: now,
        updated_at: now,
        completed_at: null,
        completion_revision: 0,
      };
      await persistence.transaction(async (db) => {
        if (task.produit_id) await stockProductInDatabase(db, task.produit_id);
        await db.execute(
          "INSERT INTO care_tasks (id, patient_id, label, type, heure_prevue, statut, execute_par, produit_id, note, motif_annulation, recurrence, created_at, updated_at, completed_at, produit_quantite) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)",
          [
            task.id,
            task.patient_id,
            task.label,
            task.type,
            task.heure_prevue,
            task.statut,
            null,
            task.produit_id,
            task.note,
            null,
            null,
            now,
            now,
            null,
            task.produit_quantite,
          ]
        );
        await db.execute(
          "INSERT INTO care_task_history (id,task_id,from_status,to_status,author_id,changed_at,reason) VALUES ($1,$2,$3,$4,$5,$6,$7)",
          [id(), task.id, null, "a_faire", author, now, null]
        );
      });
      return task;
    },
    async updateProductUsage(taskId: string, productId: string | null, quantity: number, author: string): Promise<CareTask> {
      if (!author.trim()) throw new Error("Un utilisateur connecté est requis.");
      const requested = productId ? stockQuantity(quantity) : 1;
      return persistence.transaction(async db => {
        const [task] = await db.select<CareTask[]>("SELECT * FROM care_tasks WHERE id=?", [taskId]);
        if (!task) throw new Error("Ce soin n’existe plus.");
        if (task.statut === "fait" || task.statut === "annule") throw new Error("Le produit d’un soin terminé ne peut plus être modifié.");
        if (productId) await stockProductInDatabase(db, productId);
        if (task.produit_id === productId && (task.produit_quantite ?? 1) === requested) return task;
        const now = clock().toISOString();
        await db.execute("UPDATE care_tasks SET produit_id=?,produit_quantite=?,updated_at=? WHERE id=?", [productId, requested, now, taskId]);
        await db.execute("INSERT INTO care_task_history(id,task_id,from_status,to_status,author_id,changed_at,reason) VALUES (?,?,?,?,?,?,?)",
          [id(), taskId, task.statut, task.statut, author, now, productId ? `Produit et quantité corrigés : ${requested.toLocaleString("fr-FR", {maximumFractionDigits: 6})}.` : "Produit retiré du soin prévu."]);
        return {...task, produit_id: productId, produit_quantite: requested, updated_at: now};
      });
    },
    async undoCompletion(taskId: string, author: string, reason: string, expectedRevision: number): Promise<CareTask> {
      if (!author.trim()) throw new Error("Un utilisateur connecté est requis.");
      if (!reason.trim()) throw new Error("Indiquez le motif de l’annulation de validation.");
      return persistence.transaction(async db => {
        const [task] = await db.select<CareTask[]>("SELECT * FROM care_tasks WHERE id=?", [taskId]);
        if (!task) throw new Error("Ce soin n’existe plus.");
        const revision = task.completion_revision ?? 0;
        if (task.statut !== "fait" || revision !== expectedRevision) throw new Error("Ce soin vient d’être modifié. Actualisez la vue.");
        const completionKey = careCompletionKey(task.id, revision);
        const now = clock().toISOString();
        const invoiceId = careInvoiceId(task.id, revision);
        const [invoice] = await db.select<{id: string}[]>("SELECT id FROM invoices WHERE id=?", [invoiceId]);
        if (invoice) {
          const {voidInvoiceInDatabase} = await import("@/services/billingService");
          try {
            await voidInvoiceInDatabase(db, {invoiceId, reason: `Annulation de validation du soin : ${reason.trim()}`, voidedAt: now, actor: {userId: author}});
          } catch (error) {
            if (error instanceof BillingDomainError && error.code === "INVOICE_VOID_NOT_ALLOWED") {
              throw new StockError("SOURCE_CONFLICT", "La facture de ce soin comporte un règlement ou un avoir. Régularisez-la dans Finances avant d’annuler la validation.");
            }
            throw error;
          }
        }
        await returnCareStockInDatabase(db, {taskId, completionKey, authorId: author, reason, now}, id);
        const updated = await db.execute(`UPDATE care_tasks SET statut='a_faire',execute_par=NULL,completed_at=NULL,
          motif_annulation=NULL,completion_revision=completion_revision+1,updated_at=? WHERE id=? AND statut='fait' AND completion_revision=?`,
        [now, task.id, revision]);
        if (updated.rowsAffected !== 1) throw new Error("Ce soin vient d’être modifié. Actualisez la vue.");
        await db.execute("INSERT INTO care_task_history(id,task_id,from_status,to_status,author_id,changed_at,reason) VALUES (?,?,'fait','a_faire',?,?,?)",
          [id(), task.id, author, now, reason.trim()]);
        return {...task, statut: "a_faire", execute_par: null, completed_at: null, motif_annulation: null, completion_revision: revision + 1, updated_at: now};
      });
    },
    async transition(
      taskId: string,
      to: CareStatus,
      author: string,
      reason?: string
    ): Promise<CareTask> {
      const result = await persistence.transaction(async (db) => {
        const [task] = await db.select<CareTask[]>(
          "SELECT * FROM care_tasks WHERE id = $1",
          [taskId]
        );
        if (!task) throw new Error("Ce soin n’existe plus.");
        assertCareTransition(task.statut, to, author, reason);
        const now = clock().toISOString();
        if (to === "fait" && task.produit_id) {
          await consumeStockInDatabase(db, {
            productId: task.produit_id, quantity: task.produit_quantite ?? 1,
            sourceType: "care", sourceId: task.id, sourceLineId: careCompletionKey(task.id, task.completion_revision),
            sourceLabel: task.label, patientId: task.patient_id, authorId: author, occurredAt: now,
          }, id);
        }
        const next: CareTask = {
          ...task,
          statut: to,
          updated_at: now,
          execute_par:
            to === "en_cours" || to === "fait" ? author : task.execute_par,
          completed_at: to === "fait" ? now : null,
          motif_annulation: to === "annule" ? reason!.trim() : null,
        };
        const updated = await db.execute(
          "UPDATE care_tasks SET statut=$1,execute_par=$2,completed_at=$3,motif_annulation=$4,updated_at=$5 WHERE id=$6 AND statut=$7",
          [
            next.statut,
            next.execute_par,
            next.completed_at,
            next.motif_annulation,
            now,
            task.id,
            task.statut,
          ]
        );
        if (updated.rowsAffected !== 1)
          throw new Error("Ce soin vient d’être modifié. Actualisez la vue.");
        await db.execute(
          "INSERT INTO care_task_history (id,task_id,from_status,to_status,author_id,changed_at,reason) VALUES ($1,$2,$3,$4,$5,$6,$7)",
          [id(), task.id, task.statut, to, author, now, next.motif_annulation]
        );
        return next;
      });
      if (to === "fait") await notifyCareTaskCompleted(result);
      return result;
    },
  };
}
