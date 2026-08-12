import Database from "@tauri-apps/plugin-sql";
import { runSqliteMigrations } from "./migration-runner";
import { SQLITE_MIGRATIONS } from "./migrations";

let db: Database | null = null;
let dbInitPromise: Promise<Database> | null = null;

// ====================================================================================
// Serialized SQLite write queue + retry helper
// ------------------------------------------------------------------------------------
// Writes and transactions go through `runDbOperation` (or `runDbTransaction`).
// Read-only work goes through `runDbRead`, allowing independent widgets to
// load concurrently while WAL keeps writes safe.
// ====================================================================================

let sqliteOperationQueue: Promise<unknown> = Promise.resolve();

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return JSON.stringify(error);
};

const isDatabaseLockedError = (error: unknown): boolean => {
  if (!error) {
    return false;
  }
  const message = getErrorMessage(error);
  const lower = message.toLowerCase();
  return (
    lower.includes("database is locked") ||
    lower.includes("code: 5") ||
    lower.includes("(code 5)") ||
    lower.includes("database table is locked")
  );
};

const isRecoverableConnectionError = (error: unknown): boolean => {
  if (!error) {
    return false;
  }

  const message = getErrorMessage(error);
  const lower = message.toLowerCase();

  // Retrying malformed SQL or a schema mismatch only repeats the same error.
  if (
    lower.includes("no such column") ||
    lower.includes("no such table") ||
    lower.includes("syntax error") ||
    lower.includes("constraint failed") ||
    lower.includes("datatype mismatch")
  ) {
    return false;
  }

  return (
    lower.includes("connection is closed") ||
    lower.includes("database is closed") ||
    lower.includes("not connected") ||
    lower.includes("connection pool") ||
    lower.includes("failed to load database")
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
 * Réservé aux écritures et aux séquences qui doivent rester ordonnées.
 */
export function runDbOperation<T>(
  operation: (database: Database) => Promise<T>
): Promise<T> {
  const job = sqliteOperationQueue.then(async () => {
    let database = await getDatabase();
    try {
      return await withLockRetry(() => operation(database));
    } catch (error) {
      if (!isRecoverableConnectionError(error)) {
        throw error;
      }

      // Si on a une erreur fatale (ex: connexion perdue après la mise en veille du Mac),
      // on force la réinitialisation de la connexion pour les prochaines requêtes.
      console.warn(
        "[DB] Fatal SQLite error encountered, dropping connection cache.",
        error
      );
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
 * Executes a read without blocking the write queue. On a lost connection, the
 * operation falls back to the serialized path so only one reconnect occurs.
 */
export async function runDbRead<T>(
  operation: (database: Database) => Promise<T>
): Promise<T> {
  const database = await getDatabase();

  try {
    return await withLockRetry(() => operation(database));
  } catch (error) {
    if (!isRecoverableConnectionError(error)) {
      throw error;
    }

    return runDbOperation(operation);
  }
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
      const appliedMigrations = await runSqliteMigrations(
        loadedDb,
        SQLITE_MIGRATIONS
      );
      if (appliedMigrations.length > 0) {
        console.log("[DB] Applied migrations:", appliedMigrations.join(", "));
      }
      await applyDatabaseSafetyPragmas(loadedDb);
      db = loadedDb;

      // Integrity repair is defensive maintenance, not a prerequisite for
      // rendering the first screen. Running it after exposing the connection
      // prevents an old/large database from holding the whole WebView on a
      // blank bootstrap screen, especially on slower Windows machines.
      void repairRelationalIntegrity(loadedDb);

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

async function repairRelationalIntegrity(database: Database): Promise<void> {
  try {
    const [counters] = await database.select<
      Array<{
        mismatchedAppointmentOwner: number;
        orphanAppointments: number;
        orphanConsultationDocuments: number;
        orphanNotes: number;
        orphanPatients: number;
        orphanSessions: number;
        orphanTasksAssigned: number;
        orphanTasksPatient: number;
      }>
    >(`SELECT
      (SELECT COUNT(*) FROM patients p
       LEFT JOIN owners o ON o.id = p.owner_id
       WHERE o.id IS NULL) AS orphanPatients,
      (SELECT COUNT(*) FROM appointments a
       LEFT JOIN patients p ON p.id = a.patient_id
       LEFT JOIN owners o ON o.id = a.owner_id
       LEFT JOIN users u ON u.id = a.vet_id
       WHERE p.id IS NULL OR o.id IS NULL OR u.id IS NULL) AS orphanAppointments,
      (SELECT COUNT(*) FROM sessions s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE u.id IS NULL) AS orphanSessions,
      (SELECT COUNT(*) FROM notes n
       LEFT JOIN users u ON u.id = n.user_id
       WHERE u.id IS NULL) AS orphanNotes,
      (SELECT COUNT(*) FROM tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       WHERE t.assigned_to IS NOT NULL AND u.id IS NULL) AS orphanTasksAssigned,
      (SELECT COUNT(*) FROM tasks t
       LEFT JOIN patients p ON p.id = t.patient_id
       WHERE t.patient_id IS NOT NULL AND p.id IS NULL) AS orphanTasksPatient,
      (SELECT COUNT(*) FROM consultation_documents d
       LEFT JOIN appointments a ON a.id = d.appointment_id
       LEFT JOIN patients p ON p.id = d.patient_id
       WHERE a.id IS NULL OR p.id IS NULL) AS orphanConsultationDocuments,
      (SELECT COUNT(*) FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       WHERE a.owner_id != p.owner_id) AS mismatchedAppointmentOwner`);

    const orphanCounters = counters ?? {
      orphanPatients: 0,
      orphanAppointments: 0,
      orphanSessions: 0,
      orphanNotes: 0,
      orphanTasksAssigned: 0,
      orphanTasksPatient: 0,
      orphanConsultationDocuments: 0,
      mismatchedAppointmentOwner: 0,
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
