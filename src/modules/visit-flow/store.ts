import type { AppointmentStatus } from "@/types/db";
import { VISIT_FLOW_UNDO_WINDOW_MS, type VisitFlowCause, type VisitFlowStage } from "./domain";

export interface VisitFlowEvent {
  actorId: string | null;
  appointmentId: string;
  cause: VisitFlowCause;
  createdAt: string;
  fromStage: VisitFlowStage | null;
  fromStatus: AppointmentStatus | null;
  id: number;
  toStage: VisitFlowStage | null;
  toStatus: AppointmentStatus | null;
  undoesEventId: number | null;
  version: number;
}

export interface UndoableFlowEvent extends VisitFlowEvent {
  /** Time left in the undo window, by the database clock. */
  remainingMs: number;
}

export interface VisitFlowState {
  appointmentId: string;
  care: boolean;
  stage: VisitFlowStage | null;
  status: AppointmentStatus;
  version: number;
}

export interface FlowDatabase {
  select<T>(sql: string, values?: unknown[]): Promise<T>;
  execute(sql: string, values?: unknown[]): Promise<{ rowsAffected: number }>;
}

export interface FlowPersistence {
  read<T>(operation: (db: FlowDatabase) => Promise<T>): Promise<T>;
  transaction<T>(operation: (db: FlowDatabase) => Promise<T>): Promise<T>;
}

export class VisitFlowError extends Error {
  constructor(
    readonly code: "not_found" | "stale" | "not_undoable" | "expired",
    message: string
  ) {
    super(message);
    this.name = "VisitFlowError";
  }
}

interface EventRow {
  actor_id: string | null;
  appointment_id: string;
  cause: VisitFlowCause;
  created_at: string;
  from_stage: VisitFlowStage | null;
  from_status: AppointmentStatus | null;
  id: number;
  to_stage: VisitFlowStage | null;
  to_status: AppointmentStatus | null;
  undoes_event_id: number | null;
  version: number;
}

const toEvent = (row: EventRow): VisitFlowEvent => ({
  actorId: row.actor_id,
  appointmentId: row.appointment_id,
  cause: row.cause,
  createdAt: row.created_at,
  fromStage: row.from_stage,
  fromStatus: row.from_status,
  id: Number(row.id),
  toStage: row.to_stage,
  toStatus: row.to_status,
  undoesEventId: row.undoes_event_id === null ? null : Number(row.undoes_event_id),
  version: Number(row.version),
});

const WINDOW_SECONDS = VISIT_FLOW_UNDO_WINDOW_MS / 1000;
// Age is measured by the database clock that stamped the event, so two
// workstations with drifting clocks agree on the 10 seconds.
const AGE_SECONDS = "(julianday('now') - julianday(created_at)) * 86400.0";

async function latestEvent(db: FlowDatabase, appointmentId: string) {
  const rows = await db.select<EventRow[]>(
    "SELECT * FROM visit_flow_events WHERE appointment_id = ? ORDER BY id DESC LIMIT 1",
    [appointmentId]
  );
  return rows[0] ? toEvent(rows[0]) : null;
}

function attribute(db: FlowDatabase, appointmentId: string, actorId: string) {
  return db.execute(
    `UPDATE visit_flow_events SET actor_id = ?
     WHERE id = (SELECT MAX(id) FROM visit_flow_events WHERE appointment_id = ?)
       AND actor_id IS NULL AND ${AGE_SECONDS} <= ?`,
    [actorId, appointmentId, WINDOW_SECONDS]
  );
}

export function createVisitFlowStore(persistence: FlowPersistence) {
  async function state(db: FlowDatabase, appointmentId: string): Promise<VisitFlowState> {
    const rows = await db.select<
      Array<{ appointment_id: string; care: number; stage: VisitFlowStage | null; status: AppointmentStatus; version: number | null }>
    >(
      `SELECT s.appointment_id, s.care, s.stage, s.status, f.version
       FROM visit_flow_stages s LEFT JOIN visit_flow f ON f.appointment_id = s.appointment_id
       WHERE s.appointment_id = ?`,
      [appointmentId]
    );
    const row = rows[0];
    if (!row) throw new VisitFlowError("not_found", "Ce rendez-vous n'existe plus.");
    return {
      appointmentId: row.appointment_id,
      care: Number(row.care) === 1,
      stage: row.stage,
      status: row.status,
      version: Number(row.version ?? 0),
    };
  }

  return {
    state(appointmentId: string) {
      return persistence.read((db) => state(db, appointmentId));
    },

    events(appointmentId: string): Promise<VisitFlowEvent[]> {
      return persistence.read(async (db) =>
        (
          await db.select<EventRow[]>("SELECT * FROM visit_flow_events WHERE appointment_id = ? ORDER BY id", [
            appointmentId,
          ])
        ).map(toEvent)
      );
    },

    /**
     * Moves an open visit between Consultation and Soins ou résultats.
     * `expectedVersion` rejects a move based on an outdated screen.
     */
    setCare(appointmentId: string, care: boolean, actorId: string | null, expectedVersion?: number) {
      return persistence.transaction(async (db) => {
        const current = await state(db, appointmentId);
        if (expectedVersion !== undefined && current.version !== expectedVersion) {
          throw new VisitFlowError("stale", "Ce patient vient d'être déplacé sur un autre poste. Le tableau est à jour.");
        }
        if (current.status !== "in_progress") {
          throw new VisitFlowError("not_undoable", "Seule une consultation en cours passe en soins ou résultats.");
        }
        await db.execute(
          `INSERT INTO visit_flow(appointment_id, care) VALUES (?, ?)
           ON CONFLICT(appointment_id) DO UPDATE SET care = excluded.care`,
          [appointmentId, care ? 1 : 0]
        );
        if (actorId) await attribute(db, appointmentId, actorId);
        return state(db, appointmentId);
      });
    },

    /** Names who made the transition the triggers just journaled. */
    async attribute(appointmentId: string, actorId: string | null) {
      if (actorId) await persistence.transaction((db) => attribute(db, appointmentId, actorId));
    },

    /** The last move of a visit, if it can still be taken back, and for how long. */
    undoable(appointmentId: string): Promise<UndoableFlowEvent | null> {
      return persistence.read(async (db) => {
        const rows = await db.select<Array<EventRow & { age: number }>>(
          `SELECT *, ${AGE_SECONDS} AS age FROM visit_flow_events
           WHERE id = (SELECT MAX(id) FROM visit_flow_events WHERE appointment_id = ?)
             AND cause IN ('status', 'care') AND from_status IS NOT NULL AND ${AGE_SECONDS} <= ?`,
          [appointmentId, WINDOW_SECONDS]
        );
        const row = rows[0];
        if (!row) return null;
        return {
          ...toEvent(row),
          remainingMs: Math.max(0, Math.round((WINDOW_SECONDS - Number(row.age)) * 1000)),
        };
      });
    },

    /**
     * Takes back a manual move within 10 seconds. Billing is never undone
     * here: an invoice or a payment has its own void and refund commands.
     */
    undo(eventId: number, actorId: string | null): Promise<VisitFlowState> {
      return persistence.transaction(async (db) => {
        const rows = await db.select<Array<EventRow & { age: number }>>(
          `SELECT *, ${AGE_SECONDS} AS age FROM visit_flow_events WHERE id = ?`,
          [eventId]
        );
        const row = rows[0];
        if (!row) throw new VisitFlowError("not_found", "Ce déplacement n'existe plus.");
        const event = toEvent(row);
        const latest = await latestEvent(db, event.appointmentId);
        if (latest?.id !== event.id) {
          throw new VisitFlowError("stale", "Ce patient a bougé depuis. Rien n'a été annulé.");
        }
        if (!["status", "care"].includes(event.cause) || !event.fromStatus) {
          throw new VisitFlowError("not_undoable", "Ce déplacement ne s'annule pas ici.");
        }
        if (Number(row.age) > WINDOW_SECONDS) {
          throw new VisitFlowError("expired", "Le délai de 10 secondes est passé. Déplacez le patient à nouveau si besoin.");
        }

        if (event.cause === "care") {
          await db.execute("UPDATE visit_flow SET care = 1 - care WHERE appointment_id = ?", [event.appointmentId]);
        } else {
          // Status rules only go forward; taking back a mistake is the exception.
          await db.execute(
            "UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = ?",
            [event.fromStatus, event.appointmentId, event.toStatus]
          );
        }
        const reverted = await latestEvent(db, event.appointmentId);
        if (!reverted || reverted.id === event.id) {
          throw new VisitFlowError("stale", "Ce patient a bougé depuis. Rien n'a été annulé.");
        }
        await db.execute("UPDATE visit_flow_events SET cause = 'undo', undoes_event_id = ?, actor_id = ? WHERE id = ?", [
          event.id,
          actorId,
          reverted.id,
        ]);
        return state(db, event.appointmentId);
      });
    },
  };
}

export type VisitFlowStore = ReturnType<typeof createVisitFlowStore>;
