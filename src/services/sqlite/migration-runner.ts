import type { SqliteMigration } from "./migrations";

export interface MigrationDatabase {
  execute(query: string, bindValues?: unknown[]): Promise<unknown>;
  select<T>(query: string, bindValues?: unknown[]): Promise<T>;
}

interface MigrationRow {
  version: string;
}

export class MigrationError extends Error {
  readonly cause: unknown;
  readonly version: string;

  constructor(version: string, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(`Migration ${version} failed: ${detail}`);
    this.name = "MigrationError";
    this.version = version;
    this.cause = cause;
  }
}

export function parseSqlStatements(sql: string): string[] {
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

    currentStatement += `${line}\n`;

    if (!trimmed.endsWith(";")) {
      continue;
    }

    if (inTrigger && trimmed.toUpperCase() !== "END;") {
      continue;
    }

    statements.push(currentStatement.trim());
    currentStatement = "";
    inTrigger = false;
  }

  if (currentStatement.trim().length > 0) {
    throw new Error("Migration SQL ends with an incomplete statement");
  }

  return statements;
}

function validateMigrationRegistry(migrations: readonly SqliteMigration[]): void {
  const versions = new Set<string>();
  let previousVersion = -1;

  for (const migration of migrations) {
    if (!/^\d{3}$/.test(migration.version)) {
      throw new Error(`Invalid migration version: ${migration.version}`);
    }
    if (versions.has(migration.version)) {
      throw new Error(`Duplicate migration version: ${migration.version}`);
    }

    const numericVersion = Number(migration.version);
    if (numericVersion <= previousVersion) {
      throw new Error("Migrations must be ordered by ascending version");
    }

    versions.add(migration.version);
    previousVersion = numericVersion;
  }
}

export async function runSqliteMigrations(
  database: MigrationDatabase,
  migrations: readonly SqliteMigration[]
): Promise<string[]> {
  validateMigrationRegistry(migrations);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT UNIQUE NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const appliedRows = await database.select<MigrationRow[]>(
    "SELECT version FROM migrations ORDER BY version ASC"
  );
  const knownVersions = new Set(migrations.map(({ version }) => version));
  const futureVersions = appliedRows
    .map(({ version }) => version)
    .filter((version) => !knownVersions.has(version));

  if (futureVersions.length > 0) {
    throw new Error(
      `Database schema is newer than this application (${futureVersions.join(", ")})`
    );
  }

  const appliedVersions = new Set(appliedRows.map(({ version }) => version));
  const newlyApplied: string[] = [];

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) {
      continue;
    }

    const statements = parseSqlStatements(migration.sql);
    let foreignKeysWereEnabled = false;

    if (migration.disableForeignKeys) {
      const foreignKeyRows = await database.select<Array<{ foreign_keys: number }>>(
        "PRAGMA foreign_keys"
      );
      foreignKeysWereEnabled = Number(foreignKeyRows[0]?.foreign_keys ?? 0) === 1;
      await database.execute("PRAGMA foreign_keys = OFF");
    }

    await database.execute("BEGIN IMMEDIATE TRANSACTION");

    try {
      for (const statement of statements) {
        await database.execute(statement);
      }

      if (migration.disableForeignKeys) {
        const violations = await database.select<unknown[]>("PRAGMA foreign_key_check");
        if (violations.length > 0) {
          throw new Error(
            `Foreign key check failed with ${violations.length} violation(s)`
          );
        }
      }

      await database.execute("INSERT INTO migrations (version) VALUES (?)", [
        migration.version,
      ]);
      await database.execute(
        `PRAGMA user_version = ${Number(migration.version)}`
      );
      await database.execute("COMMIT");
      if (migration.disableForeignKeys && foreignKeysWereEnabled) {
        await database.execute("PRAGMA foreign_keys = ON");
      }
      appliedVersions.add(migration.version);
      newlyApplied.push(migration.version);
    } catch (error) {
      try {
        await database.execute("ROLLBACK");
      } catch {
        // Preserve the original migration error.
      }
      if (migration.disableForeignKeys && foreignKeysWereEnabled) {
        try {
          await database.execute("PRAGMA foreign_keys = ON");
        } catch {
          // Preserve the original migration error.
        }
      }
      throw new MigrationError(migration.version, error);
    }
  }

  return newlyApplied;
}
