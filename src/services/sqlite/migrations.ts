import { CLINICAL_STOCK_MIGRATION_SQL } from "@/modules/stock/clinical-stock-migration";
import { TASK_REMINDER_TYPES_MIGRATION_SQL } from "@/modules/patient-reminders/task-types-migration";
import { PATIENT_REMINDERS_MIGRATION_SQL } from "@/modules/patient-reminders/migration";
import { STAYS_MIGRATION_SQL } from "@/modules/hospitalizations/stays/migration";
import { CARE_TASKS_MIGRATION_SQL } from "@/modules/care-tasks/migration";
import { CARE_COMPLETION_ROLLBACK_MIGRATION_SQL } from "@/modules/care-tasks/completion-rollback-migration";
import {
  MIGRATION_001_SQL,
  MIGRATION_002_SQL,
  MIGRATION_003_SQL,
  MIGRATION_004_SQL,
  MIGRATION_005_SQL,
  MIGRATION_006_SQL,
  MIGRATION_007_SQL,
  MIGRATION_008_SQL,
  MIGRATION_009_SQL,
  MIGRATION_010_SQL,
  MIGRATION_011_SQL,
  MIGRATION_012_SQL,
  MIGRATION_013_SQL,
  MIGRATION_014_SQL,
  MIGRATION_015_SQL,
  MIGRATION_016_SQL,
  MIGRATION_017_SQL,
  MIGRATION_018_SQL,
  MIGRATION_019_SQL,
  MIGRATION_020_SQL,
  MIGRATION_021_SQL,
  MIGRATION_022_SQL,
  MIGRATION_023_SQL,
} from "./schema";

export interface SqliteMigration {
  disableForeignKeys?: boolean;
  name: string;
  /** An additive repair may already be present on newer installations. */
  skipIfColumnExists?: { table: string; column: string };
  sql: string;
  version: string;
}

export const SQLITE_MIGRATIONS: readonly SqliteMigration[] = [
  { version: "001", name: "initial-schema", sql: MIGRATION_001_SQL },
  {
    version: "002",
    name: "consultation-documents",
    sql: MIGRATION_002_SQL,
  },
  { version: "003", name: "automations", sql: MIGRATION_003_SQL },
  { version: "004", name: "clinical-tracking", sql: MIGRATION_004_SQL },
  { version: "005", name: "consultation-soap", sql: MIGRATION_005_SQL },
  { version: "006", name: "prescriptions", sql: MIGRATION_006_SQL },
  {
    version: "007",
    name: "hospitalization-anesthesia",
    sql: MIGRATION_007_SQL,
  },
  {
    version: "008",
    name: "agenda-recurrence-reminders",
    sql: MIGRATION_008_SQL,
  },
  { version: "009", name: "audit-log", sql: MIGRATION_009_SQL },
  { version: "010", name: "clinical-indexes", sql: MIGRATION_010_SQL },
  { version: "011", name: "notification-state", sql: MIGRATION_011_SQL },
  {
    version: "012",
    name: "notification-state-identifier",
    sql: MIGRATION_012_SQL,
  },
  {
    version: "013",
    name: "appointment-clinical-workflow",
    sql: MIGRATION_013_SQL,
    disableForeignKeys: true,
  },
  {
    version: "014",
    name: "owner-contact-preferences",
    sql: MIGRATION_014_SQL,
  },
  {
    version: "015",
    name: "billing-accounting-foundation",
    sql: MIGRATION_015_SQL,
  },
  {
    version: "016",
    name: "billing-idempotency-credit-note-safeguards",
    sql: MIGRATION_016_SQL,
  },
  {
    version: "017",
    name: "stock-movements",
    sql: MIGRATION_017_SQL,
  },
  { version: "018", name: "patient-linked-notes", sql: MIGRATION_018_SQL },
  {
    version: "019",
    name: "clinical-document-templates",
    sql: MIGRATION_019_SQL,
  },
  { version: "020", name: "patient-identification", sql: MIGRATION_020_SQL },
  {
    version: "021",
    name: "appointment-vet-restrict",
    sql: MIGRATION_021_SQL,
    disableForeignKeys: true,
  },
  {
    version: "022",
    name: "patient-isolated-embeddings",
    sql: MIGRATION_022_SQL,
  },
  {
    version: "023",
    name: "section-embeddings-float32",
    sql: MIGRATION_023_SQL,
  },
  { version: "024", name: "daily-care-tasks", sql: CARE_TASKS_MIGRATION_SQL },
  { version: "025", name: "hospitalisation-stays", sql: STAYS_MIGRATION_SQL },
  { version: "026", name: "patient-reminders", sql: PATIENT_REMINDERS_MIGRATION_SQL },
  { version: "027", name: "task-reminder-types", sql: TASK_REMINDER_TYPES_MIGRATION_SQL },
  { version: "028", name: "clinical-stock-consumption", sql: CLINICAL_STOCK_MIGRATION_SQL },
  { version: "029", name: "clinical-stock-dispensing", sql: DISPENSING_MIGRATION_SQL },
  { version: "030", name: "stock-movement-identity-snapshots", sql: MOVEMENT_SNAPSHOT_MIGRATION_SQL },
  { version: "031", name: "stock-lots-and-receipts", sql: STOCK_LOTS_MIGRATION_SQL },
  { version: "032", name: "stock-purchasing", sql: PURCHASING_MIGRATION_SQL },
  { version: "033", name: "stock-barcodes-and-transfers", sql: STOCK_OPERATIONS_MIGRATION_SQL },
  {
    version: "034",
    name: "repair-product-archival-column",
    skipIfColumnExists: { table: "products", column: "archived_at" },
    sql: "ALTER TABLE products ADD COLUMN archived_at TEXT;",
  },
  { version: "035", name: "care-completion-rollback", sql: CARE_COMPLETION_ROLLBACK_MIGRATION_SQL },
] as const;
import { DISPENSING_MIGRATION_SQL } from "@/modules/stock/dispensing-migration";
import { MOVEMENT_SNAPSHOT_MIGRATION_SQL } from "@/modules/stock/movement-snapshot-migration";
import { STOCK_LOTS_MIGRATION_SQL } from "@/modules/stock/stock-lots-migration";
import { PURCHASING_MIGRATION_SQL } from "@/modules/stock/purchasing-migration";
import { STOCK_OPERATIONS_MIGRATION_SQL } from "@/modules/stock/stock-operations-migration";
