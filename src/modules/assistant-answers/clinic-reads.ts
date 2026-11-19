/**
 * What the Données tab reads, and how: every table it answers from, in ONE snapshot, through the read port
 * (read-port.ts). It reads the same statements and maps the rows the same way as the stores (`tableReadSql`,
 * `mapTableRow`, `selectInvoices`), so the answers do not change; what changes is the door.
 *
 * Proof of no write, kept with the data: SQLite's `total_changes()` for this connection is read at the start and at the
 * end of the snapshot. If it moved, or a statement was refused, nothing is answered.
 * In the browser (no SQLite), the tables are copies of the browser store: nothing that could write is reached.
 */

import { mapTableRow, tableReadSql } from "@/hooks/useSQLite";
import { selectInvoices } from "@/services/billingService";
import { getBrowserTable, isTauriRuntime, type BrowserTableName } from "@/services/browser-store";
import { runDbRead } from "@/services/sqlite/database";
import type { Invoice } from "@/types/db";
import { guardReadConnection, type ReadConnection, type ReadCounter } from "./read-port";
import type { ClinicData } from "./types";

export const CLINIC_TABLES = ["patients", "owners", "appointments", "tasks", "transactions", "vaccinations", "products"] as const;
type ClinicTable = (typeof CLINIC_TABLES)[number];

/** How the data was read: shown under each answer. */
export type ReadReceipt = {
  /** « sqlite » on the desktop, « navigateur » in a browser. */
  via: "sqlite" | "navigateur";
  /** Statements that went through the port (selects and the snapshot's BEGIN/COMMIT). */
  statements: number;
  /** Changes made by this connection during the read: always 0, or the read is rejected. */
  changes: number;
  rows: number;
  at: string;
};

export class ReadIntegrityError extends Error {
  constructor(changes: number) {
    super(`La base a changé pendant la lecture (${changes} modification${changes > 1 ? "s" : ""}) : je ne réponds pas sur une lecture incohérente.`);
    this.name = "ReadIntegrityError";
  }
}

type RunRead = <T>(operation: (db: ReadConnection) => Promise<T>) => Promise<T>;

/** Reads every table of the catalogue through the guarded connection, in one snapshot. */
export async function readClinicTables(connection: ReadConnection, counter: ReadCounter) {
  // A retried read (a locked base, a reopened connection) counts its own statements only.
  counter.statements = 0;
  const db = guardReadConnection(connection, counter);
  await db.execute("BEGIN DEFERRED TRANSACTION");
  try {
    const [{ changes: before }] = await db.select<{ changes: number }[]>("SELECT total_changes() AS changes");
    const tables = {} as Record<ClinicTable, Record<string, unknown>[]>;
    for (const table of CLINIC_TABLES) {
      const rows = await db.select<Record<string, unknown>[]>(tableReadSql(table));
      tables[table] = (rows ?? []).map((row) => mapTableRow(table, row));
    }
    const invoices = await selectInvoices(db, { documentStatus: "issued" });
    const [{ changes: after }] = await db.select<{ changes: number }[]>("SELECT total_changes() AS changes");
    await db.execute("COMMIT");
    return { tables, invoices, changes: Number(after) - Number(before) };
  } catch (error) {
    await db.execute("ROLLBACK").catch(() => undefined);
    throw error;
  }
}

export async function readClinicData(options: { runRead?: RunRead; browser?: boolean; now?: Date } = {}): Promise<{ data: ClinicData; receipt: ReadReceipt }> {
  const at = (options.now ?? new Date()).toISOString();
  const browser = options.browser ?? !isTauriRuntime();
  if (browser) {
    const tables = Object.fromEntries(CLINIC_TABLES.map((table) => [table, structuredClone(getBrowserTable(table as BrowserTableName))])) as unknown as Record<ClinicTable, unknown[]>;
    const rows = CLINIC_TABLES.reduce((sum, table) => sum + tables[table].length, 0);
    return { data: { ...(tables as unknown as Omit<ClinicData, "invoices">), invoices: [] }, receipt: { via: "navigateur", statements: 0, changes: 0, rows, at } };
  }
  const counter: ReadCounter = { statements: 0 };
  const run: RunRead = options.runRead ?? ((operation) => runDbRead((db) => operation(db as unknown as ReadConnection)));
  const { tables, invoices, changes } = await run((db) => readClinicTables(db, counter));
  if (changes !== 0) throw new ReadIntegrityError(changes);
  const rows = CLINIC_TABLES.reduce((sum, table) => sum + tables[table].length, 0) + invoices.length;
  return {
    data: { ...(tables as unknown as Omit<ClinicData, "invoices">), invoices: invoices as Invoice[] },
    receipt: { via: "sqlite", statements: counter.statements, changes, rows, at },
  };
}
