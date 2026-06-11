import Database from "@tauri-apps/plugin-sql";
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
} from "./schema";

let db: Database | null = null;
let dbInitPromise: Promise<Database> | null = null;

// ====================================================================================
// Serialized SQLite operation queue + retry helper
// ------------------------------------------------------------------------------------
// All SQLite access in the application must go through `runDbOperation` (or
// `runDbTransaction`). Tauri's SQL plugin opens a single connection to the
// database and SQLite uses file-level write locks; if two writes are issued
// concurrently the second one fails immediately with `code: 5 - database is
// locked`. Serializing them in a global FIFO queue guarantees that no two
// statements ever overlap, while the retry logic absorbs the rare lock that
// can still happen because of background WAL checkpoints.
// ====================================================================================

let sqliteOperationQueue: Promise<unknown> = Promise.resolve();

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const isDatabaseLockedError = (error: unknown): boolean => {
  if (!error) {
    return false;
  }
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);
  const lower = message.toLowerCase();
  return (
    lower.includes("database is locked") ||
    lower.includes("code: 5") ||
    lower.includes("(code 5)") ||
    lower.includes("database table is locked")
  );
};

async function withLockRetry<T>(operation: () => Promise<T>): Promise<T> {
  const delays = [80, 160, 320, 640, 1000];
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isDatabaseLockedError(error) || attempt === delays.length) {
        throw error;
      }
      await sleep(delays[attempt]);
    }
  }

  throw lastError;
}

/**
 * Exécute une opération SQLite de manière sérialisée et tolérante aux verrous.
 * Toutes les écritures et lectures concurrentes doivent passer par cette fonction.
 */
export function runDbOperation<T>(
  operation: (database: Database) => Promise<T>
): Promise<T> {
  const job = sqliteOperationQueue.then(async () => {
    let database = await getDatabase();
    try {
      return await withLockRetry(() => operation(database));
    } catch (error) {
      // Si on a une erreur fatale (ex: connexion perdue après la mise en veille du Mac),
      // on force la réinitialisation de la connexion pour les prochaines requêtes.
      console.warn("[DB] Fatal SQLite error encountered, dropping connection cache.", error);
      await closeDatabaseConnection();
      
      // On tente de recharger la base une fois immédiatement
      database = await getDatabase();
      return await withLockRetry(() => operation(database));
    }
  });

  // Évite que la chaîne de la queue se "bloque" sur un rejet précédent.
  sqliteOperationQueue = job.catch(() => undefined);

  return job;
}

/**
 * Exécute une suite d'opérations dans une transaction SQLite sérialisée.
 * Tolère les verrous de la base et garantit un ROLLBACK en cas d'erreur.
 */
export function runDbTransaction<T>(
  operation: (database: Database) => Promise<T>,
  mode: "DEFERRED" | "IMMEDIATE" | "EXCLUSIVE" = "IMMEDIATE"
): Promise<T> {
  return runDbOperation(async (database) => {
    await database.execute(`BEGIN ${mode} TRANSACTION`);
    try {
      const result = await operation(database);
      await database.execute("COMMIT");
      return result;
    } catch (error) {
      try {
        await database.execute("ROLLBACK");
      } catch {
        // no-op
      }
      throw error;
    }
  });
}

import { appDataDir, join } from "@tauri-apps/api/path";

/**
 * Obtient ou crée la connexion à la base de données SQLite
 */
export async function getDatabase(): Promise<Database> {
  if (db) {
    return db;
  }

  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      console.log("[DB] Loading database...");
      
      const loadedDb = await Database.load("sqlite:baitari.db");
      await runMigrations(loadedDb);
      await applyDatabaseSafetyPragmas(loadedDb);
      await repairRelationalIntegrity(loadedDb);
      db = loadedDb;
      return loadedDb;
    })().finally(() => {
      dbInitPromise = null;
    });
  }

  return dbInitPromise;
}

/**
 * Ferme explicitement la connexion SQLite en cours.
 * Utile avant de remplacer physiquement le fichier de base.
 */
export async function closeDatabaseConnection(): Promise<boolean> {
  dbInitPromise = null;
  if (!db) {
    return true;
  }

  try {
    const connection = db;
    db = null;
    return await connection.close();
  } catch (error) {
    console.error("[DB] Failed to close database connection:", error);
    db = null;
    return false;
  }
}

/**
 * Exécute les migrations SQL au démarrage
 */
async function runMigrations(database: Database): Promise<void> {
  try {
    console.log("[DB] Starting migrations...");
    // Créer table de migrations si n'existe pas
    await database.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Vérifier quelle migration a été appliquée
    const applied = await database.select<{ version: string }[]>(
      "SELECT version FROM migrations ORDER BY version DESC LIMIT 1"
    );

    const lastVersion = applied.length > 0 ? applied[0].version : "000";
    console.log("[DB] Last applied migration:", lastVersion);

    // Migration 001: Schéma initial
    if (lastVersion < "001") {
      console.log("[DB] Applying migration 001...");

      const statements = parseSqlStatements(MIGRATION_001_SQL);

      console.log("[DB] Executing", statements.length, "SQL statements...");

      let successCount = 0;
      for (const statement of statements) {
        if (statement.length > 0) {
          try {
            await database.execute(statement);
            successCount++;
          } catch (err: any) {
            console.error(
              "[DB] Error executing statement:",
              statement.substring(0, 150)
            );
            console.error("[DB] Error details:", err);
            throw new Error(
              `Migration failed at statement ${successCount + 1}: ${err.message}`
            );
          }
        }
      }

      console.log("[DB] Successfully executed", successCount, "statements");

      await database.execute("INSERT INTO migrations (version) VALUES (?)", [
        "001",
      ]);

      console.log("[DB] Migration 001 applied successfully");
    } else {
      console.log("[DB] Database up to date");
    }

    if (lastVersion < "002") {
      console.log("[DB] Applying migration 002...");

      const migrationStatements = parseSqlStatements(MIGRATION_002_SQL);

      for (const statement of migrationStatements) {
        await database.execute(statement);
      }

      await database.execute("INSERT INTO migrations (version) VALUES (?)", [
        "002",
      ]);
      console.log("[DB] Migration 002 applied successfully");
    }
    if (lastVersion < "003") {
      console.log("[DB] Applying migration 003...");

      const migrationStatements = parseSqlStatements(MIGRATION_003_SQL);

      for (const statement of migrationStatements) {
        await database.execute(statement);
      }

      await database.execute("INSERT INTO migrations (version) VALUES (?)", [
        "003",
      ]);
      console.log("[DB] Migration 003 applied successfully");
    }

    if (lastVersion < "004") {
      console.log("[DB] Applying migration 004...");

      const migrationStatements = parseSqlStatements(MIGRATION_004_SQL);

      for (const statement of migrationStatements) {
        await database.execute(statement);
      }

      await database.execute("INSERT INTO migrations (version) VALUES (?)", [
        "004",
      ]);
      console.log("[DB] Migration 004 applied successfully");
    }

    if (lastVersion < "005") {
      console.log("[DB] Applying migration 005...");

      const migrationStatements = parseSqlStatements(MIGRATION_005_SQL);

      for (const statement of migrationStatements) {
        await database.execute(statement);
      }

      await database.execute("INSERT INTO migrations (version) VALUES (?)", [
        "005",
      ]);
      console.log("[DB] Migration 005 applied successfully");
    }

    if (lastVersion < "006") {
      console.log("[DB] Applying migration 006...");

      const migrationStatements = parseSqlStatements(MIGRATION_006_SQL);

      for (const statement of migrationStatements) {
        await database.execute(statement);
      }

      await database.execute("INSERT INTO migrations (version) VALUES (?)", [
        "006",
      ]);
      console.log("[DB] Migration 006 applied successfully");
    }

    if (lastVersion < "007") {
      console.log("[DB] Applying migration 007...");

      const migrationStatements = parseSqlStatements(MIGRATION_007_SQL);

      for (const statement of migrationStatements) {
        await database.execute(statement);
      }

      await database.execute("INSERT INTO migrations (version) VALUES (?)", [
        "007",
      ]);
      console.log("[DB] Migration 007 applied successfully");
    }

    if (lastVersion < "008") {
      console.log("[DB] Applying migration 008...");

      const migrationStatements = parseSqlStatements(MIGRATION_008_SQL);

      for (const statement of migrationStatements) {
        await database.execute(statement);
      }

      await database.execute("INSERT INTO migrations (version) VALUES (?)", [
        "008",
      ]);
      console.log("[DB] Migration 008 applied successfully");
    }

    if (lastVersion < "009") {
      console.log("[DB] Applying migration 009...");

      const migrationStatements = parseSqlStatements(MIGRATION_009_SQL);

      for (const statement of migrationStatements) {
        await database.execute(statement);
      }

      await database.execute("INSERT INTO migrations (version) VALUES (?)", [
        "009",
      ]);
      console.log("[DB] Migration 009 applied successfully");
    }

    if (lastVersion < "010") {
      console.log("[DB] Applying migration 010...");

      const migrationStatements = parseSqlStatements(MIGRATION_010_SQL);

      for (const statement of migrationStatements) {
        await database.execute(statement);
      }

      await database.execute("INSERT INTO migrations (version) VALUES (?)", [
        "010",
      ]);
      console.log("[DB] Migration 010 applied successfully");
    }

    if (lastVersion < "011") {
      console.log("[DB] Applying migration 011...");

      const migrationStatements = parseSqlStatements(MIGRATION_011_SQL);

      for (const statement of migrationStatements) {
        await database.execute(statement);
      }

      await database.execute("INSERT INTO migrations (version) VALUES (?)", [
        "011",
      ]);
      console.log("[DB] Migration 011 applied successfully");
    }

    if (lastVersion < "012") {
      console.log("[DB] Applying migration 012...");

      const migrationStatements = parseSqlStatements(MIGRATION_012_SQL);

      for (const statement of migrationStatements) {
        await database.execute(statement);
      }

      await database.execute("INSERT INTO migrations (version) VALUES (?)", [
        "012",
      ]);
      console.log("[DB] Migration 012 applied successfully");
    }
  } catch (error) {
    console.error("[DB] Migration error:", error);
    throw error;
  }
}

function parseSqlStatements(sql: string): string[] {
  const lines = sql.split("\n");
  let currentStatement = "";
  const statements: string[] = [];
  let inTrigger = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("--") || trimmed.length === 0) {
      continue;
    }

    if (trimmed.toUpperCase().startsWith("CREATE TRIGGER")) {
      inTrigger = true;
    }

    currentStatement += line + "\n";

    if (trimmed.endsWith(";")) {
      if (inTrigger) {
        if (trimmed.toUpperCase() === "END;") {
          statements.push(currentStatement.trim());
          currentStatement = "";
          inTrigger = false;
        }
      } else {
        statements.push(currentStatement.trim());
        currentStatement = "";
      }
    }
  }

  return statements;
}

async function applyDatabaseSafetyPragmas(database: Database): Promise<void> {
  try {
    await database.execute("PRAGMA foreign_keys = ON");
    await database.execute("PRAGMA journal_mode = WAL");
    await database.execute("PRAGMA synchronous = NORMAL");
    await database.execute("PRAGMA busy_timeout = 10000");
  } catch (error) {
    console.error("[DB] Failed to apply safety pragmas:", error);
  }
}

async function countRows(database: Database, query: string): Promise<number> {
  const result = await database.select<{ count: number }[]>(query);
  return Number(result?.[0]?.count ?? 0);
}

async function repairRelationalIntegrity(database: Database): Promise<void> {
  try {
    const orphanCounters = {
      orphanPatients: await countRows(
        database,
        `SELECT COUNT(*) as count FROM patients p
                 LEFT JOIN owners o ON o.id = p.owner_id
                 WHERE o.id IS NULL`
      ),
      orphanAppointments: await countRows(
        database,
        `SELECT COUNT(*) as count FROM appointments a
                 LEFT JOIN patients p ON p.id = a.patient_id
                 LEFT JOIN owners o ON o.id = a.owner_id
                 LEFT JOIN users u ON u.id = a.vet_id
                 WHERE p.id IS NULL OR o.id IS NULL OR u.id IS NULL`
      ),
      orphanSessions: await countRows(
        database,
        `SELECT COUNT(*) as count FROM sessions s
                 LEFT JOIN users u ON u.id = s.user_id
                 WHERE u.id IS NULL`
      ),
      orphanNotes: await countRows(
        database,
        `SELECT COUNT(*) as count FROM notes n
                 LEFT JOIN users u ON u.id = n.user_id
                 WHERE u.id IS NULL`
      ),
      orphanTasksAssigned: await countRows(
        database,
        `SELECT COUNT(*) as count FROM tasks t
                 LEFT JOIN users u ON u.id = t.assigned_to
                 WHERE t.assigned_to IS NOT NULL AND u.id IS NULL`
      ),
      orphanTasksPatient: await countRows(
        database,
        `SELECT COUNT(*) as count FROM tasks t
                 LEFT JOIN patients p ON p.id = t.patient_id
                 WHERE t.patient_id IS NOT NULL AND p.id IS NULL`
      ),
      orphanConsultationDocuments: await countRows(
        database,
        `SELECT COUNT(*) as count FROM consultation_documents d
                 LEFT JOIN appointments a ON a.id = d.appointment_id
                 LEFT JOIN patients p ON p.id = d.patient_id
                 WHERE a.id IS NULL OR p.id IS NULL`
      ),
      mismatchedAppointmentOwner: await countRows(
        database,
        `SELECT COUNT(*) as count
                 FROM appointments a
                 JOIN patients p ON p.id = a.patient_id
                 WHERE a.owner_id != p.owner_id`
      ),
    };

    if (Object.values(orphanCounters).every((value) => value === 0)) {
      return;
    }

    console.warn("[DB] Data integrity issues detected:", orphanCounters);

    // Keep appointments coherent with patient owner.
    await database.execute(
      `UPDATE appointments
             SET owner_id = (
               SELECT p.owner_id FROM patients p WHERE p.id = appointments.patient_id
             )
             WHERE patient_id IN (SELECT id FROM patients)
               AND owner_id != (
                 SELECT p.owner_id FROM patients p WHERE p.id = appointments.patient_id
               )`
    );

    // Delete records that cannot be recovered safely.
    await database.execute(
      `DELETE FROM appointments
             WHERE patient_id NOT IN (SELECT id FROM patients)
                OR owner_id NOT IN (SELECT id FROM owners)
                OR vet_id NOT IN (SELECT id FROM users)`
    );
    await database.execute(
      `DELETE FROM patients
             WHERE owner_id NOT IN (SELECT id FROM owners)`
    );
    await database.execute(
      `DELETE FROM sessions
             WHERE user_id NOT IN (SELECT id FROM users)`
    );
    await database.execute(
      `DELETE FROM notes
             WHERE user_id NOT IN (SELECT id FROM users)`
    );

    // For tasks we can preserve rows and just clear broken links.
    await database.execute(
      `UPDATE tasks
             SET assigned_to = NULL
             WHERE assigned_to IS NOT NULL
               AND assigned_to NOT IN (SELECT id FROM users)`
    );
    await database.execute(
      `UPDATE tasks
             SET patient_id = NULL
             WHERE patient_id IS NOT NULL
               AND patient_id NOT IN (SELECT id FROM patients)`
    );

    await database.execute(
      `DELETE FROM consultation_documents
             WHERE appointment_id NOT IN (SELECT id FROM appointments)
                OR patient_id NOT IN (SELECT id FROM patients)`
    );

    console.log("[DB] Relational integrity repair completed.");
  } catch (error) {
    console.error("[DB] Relational integrity repair failed:", error);
  }
}

/**
 * Génère un ID unique (UUID v4 simplifié)
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Convertit une date ISO en timestamp SQLite
 */
export function toSQLiteTimestamp(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().replace("T", " ").substring(0, 19);
}

/**
 * Parse un timestamp SQLite en Date
 */
export function fromSQLiteTimestamp(timestamp: string): Date {
  return new Date(timestamp);
}
