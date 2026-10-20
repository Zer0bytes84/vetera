/**
 * Visit flow: the stage of each visit is derived in one SQL view from the
 * appointment status, an optional care flag and the invoices. Triggers
 * journal every change of stage or status, whatever screen or workstation
 * made it, and bump a version used to detect concurrent moves.
 * Existing appointments get their current stage without invented history.
 */

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

// Balance of invoice `i`, with the same terms as payments_amount_within_balance.
const INVOICE_BALANCE = `(i.gross_amount
      - COALESCE((SELECT SUM(c.gross_amount) FROM credit_notes c WHERE c.invoice_id = i.id AND c.document_status = 'issued'), 0)
      - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id AND p.status = 'completed'), 0)
      + COALESCE((SELECT SUM(r.amount) FROM refunds r JOIN payments p ON p.id = r.payment_id WHERE p.invoice_id = i.id AND r.status = 'completed'), 0))`;

const STAGE_VIEW = `CREATE VIEW visit_flow_stages AS
SELECT a.id AS appointment_id,
  a.status AS status,
  COALESCE(f.care, 0) AS care,
  CASE
    WHEN a.status IN ('arrived', 'waiting') THEN 'waiting'
    WHEN a.status = 'in_progress' THEN CASE WHEN COALESCE(f.care, 0) = 1 THEN 'care' ELSE 'consultation' END
    WHEN a.status = 'completed' THEN CASE
      WHEN EXISTS (SELECT 1 FROM invoices i WHERE i.appointment_id = a.id AND i.document_status = 'issued')
       AND NOT EXISTS (
         SELECT 1 FROM invoices i
         WHERE i.appointment_id = a.id AND i.document_status = 'issued' AND ${INVOICE_BALANCE} > 0
       )
      THEN 'done' ELSE 'billing' END
  END AS stage
FROM appointments a
LEFT JOIN visit_flow f ON f.appointment_id = a.id;`;

/**
 * Statements that journal and store the stage of appointment `id`.
 * `statusChange` gives the old and new status when the trigger is a status
 * change, which is journaled even inside one stage (arrived to waiting).
 */
function syncFlow(id: string, cause: "status" | "care" | "billing", statusChange?: { from: string; to: string }) {
  const fromStatus = statusChange?.from ?? "s.status";
  const toStatus = statusChange?.to ?? "s.status";
  const changed = statusChange
    ? `(s.stage IS NOT f.stage OR ${statusChange.from} IS NOT ${statusChange.to})`
    : "s.stage IS NOT f.stage";
  return `  INSERT INTO visit_flow_events(appointment_id, from_stage, to_stage, from_status, to_status, cause, version, created_at)
  SELECT s.appointment_id, f.stage, s.stage, ${fromStatus}, ${toStatus}, '${cause}', COALESCE(f.version, 0) + 1, ${NOW}
  FROM visit_flow_stages s LEFT JOIN visit_flow f ON f.appointment_id = s.appointment_id
  WHERE s.appointment_id = ${id} AND ${changed};
  INSERT INTO visit_flow(appointment_id, stage, version, updated_at)
  SELECT s.appointment_id, s.stage,
    COALESCE((SELECT MAX(e.version) FROM visit_flow_events e WHERE e.appointment_id = s.appointment_id), 0), ${NOW}
  FROM visit_flow_stages s
  WHERE s.appointment_id = ${id}
  ON CONFLICT(appointment_id) DO UPDATE SET
    stage = excluded.stage, version = excluded.version, updated_at = excluded.updated_at
  WHERE visit_flow.version IS NOT excluded.version OR visit_flow.stage IS NOT excluded.stage;`;
}

function trigger(name: string, event: string, body: string, when?: string) {
  return `CREATE TRIGGER ${name}
AFTER ${event}
${when ? `WHEN ${when}\n` : ""}BEGIN
${body}
END;`;
}

const invoiceAppointment = (invoiceId: string) => `(SELECT appointment_id FROM invoices WHERE id = ${invoiceId})`;

export const VISIT_FLOW_MIGRATION_SQL = `
CREATE TABLE visit_flow (
  appointment_id TEXT PRIMARY KEY REFERENCES appointments(id) ON DELETE CASCADE,
  stage TEXT CHECK(stage IS NULL OR stage IN ('waiting', 'consultation', 'care', 'billing', 'done')),
  care INTEGER NOT NULL DEFAULT 0 CHECK(care IN (0, 1)),
  version INTEGER NOT NULL DEFAULT 0 CHECK(version >= 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE visit_flow_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT,
  from_status TEXT,
  to_status TEXT,
  cause TEXT NOT NULL CHECK(cause IN ('status', 'care', 'billing', 'undo')),
  actor_id TEXT,
  version INTEGER NOT NULL,
  undoes_event_id INTEGER REFERENCES visit_flow_events(id),
  created_at TEXT NOT NULL
);
CREATE INDEX idx_visit_flow_events_appointment ON visit_flow_events(appointment_id, id);
CREATE INDEX idx_visit_flow_stage ON visit_flow(stage);
${STAGE_VIEW}
INSERT INTO visit_flow(appointment_id, stage, version)
SELECT appointment_id, stage, 0 FROM visit_flow_stages WHERE true;
${trigger("visit_flow_on_appointment_insert", "INSERT ON appointments", syncFlow("NEW.id", "status", { from: "NULL", to: "NEW.status" }))}
${trigger(
  "visit_flow_on_appointment_status",
  "UPDATE OF status ON appointments",
  syncFlow("NEW.id", "status", { from: "OLD.status", to: "NEW.status" }),
  "OLD.status IS NOT NEW.status"
)}
${trigger("visit_flow_on_care", "UPDATE OF care ON visit_flow", syncFlow("NEW.appointment_id", "care"), "OLD.care IS NOT NEW.care")}
${trigger(
  "visit_flow_on_invoice_status",
  "UPDATE OF document_status ON invoices",
  syncFlow("NEW.appointment_id", "billing"),
  "NEW.appointment_id IS NOT NULL"
)}
${trigger("visit_flow_on_payment_insert", "INSERT ON payments", syncFlow(invoiceAppointment("NEW.invoice_id"), "billing"))}
${trigger("visit_flow_on_payment_status", "UPDATE OF status ON payments", syncFlow(invoiceAppointment("NEW.invoice_id"), "billing"))}
${trigger(
  "visit_flow_on_refund_insert",
  "INSERT ON refunds",
  syncFlow(invoiceAppointment("(SELECT invoice_id FROM payments WHERE id = NEW.payment_id)"), "billing")
)}
${trigger(
  "visit_flow_on_refund_status",
  "UPDATE OF status ON refunds",
  syncFlow(invoiceAppointment("(SELECT invoice_id FROM payments WHERE id = NEW.payment_id)"), "billing")
)}
${trigger(
  "visit_flow_on_credit_note_status",
  "UPDATE OF document_status ON credit_notes",
  syncFlow(invoiceAppointment("NEW.invoice_id"), "billing")
)}
`;

/**
 * 040: a consultation closed as free of charge (acte gratuit) has no invoice
 * to settle, so it reaches Terminé through an explicit mark instead.
 */
const STAGE_VIEW_WITH_NO_CHARGE = STAGE_VIEW.replace(
  "WHEN a.status = 'completed' THEN CASE",
  "WHEN a.status = 'completed' THEN CASE\n      WHEN COALESCE(f.no_charge, 0) = 1 THEN 'done'"
);

export const VISIT_FLOW_NO_CHARGE_MIGRATION_SQL = `
ALTER TABLE visit_flow ADD COLUMN no_charge INTEGER NOT NULL DEFAULT 0 CHECK(no_charge IN (0, 1));
DROP VIEW visit_flow_stages;
${STAGE_VIEW_WITH_NO_CHARGE}
${trigger("visit_flow_on_no_charge", "UPDATE OF no_charge ON visit_flow", syncFlow("NEW.appointment_id", "billing"), "OLD.no_charge IS NOT NEW.no_charge")}
`;
