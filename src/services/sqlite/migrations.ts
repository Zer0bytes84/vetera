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
} from "./schema";

export interface SqliteMigration {
  disableForeignKeys?: boolean;
  name: string;
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
] as const;
