import Database from '@tauri-apps/plugin-sql';
import { MIGRATION_001_SQL } from './schema';

let db: Database | null = null;

/**
 * Obtient ou crée la connexion à la base de données SQLite
 */
export async function getDatabase(): Promise<Database> {
    if (!db) {
        console.log('[DB] Loading database...');
        db = await Database.load('sqlite:supervet.db');
        await runMigrations(db);
        await applyDatabaseSafetyPragmas(db);
        await repairRelationalIntegrity(db);
    }
    return db;
}

/**
 * Exécute les migrations SQL au démarrage
 */
async function runMigrations(database: Database): Promise<void> {
    try {
        console.log('[DB] Starting migrations...');
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
            'SELECT version FROM migrations ORDER BY version DESC LIMIT 1'
        );

        const lastVersion = applied.length > 0 ? applied[0].version : '000';
        console.log('[DB] Last applied migration:', lastVersion);

        // Migration 001: Schéma initial
        if (lastVersion < '001') {
            console.log('[DB] Applying migration 001...');

            // Split SQL more carefully to handle triggers and multi-line statements
            const lines = MIGRATION_001_SQL.split('\n');
            let currentStatement = '';
            const statements: string[] = [];
            let inTrigger = false;

            for (const line of lines) {
                const trimmed = line.trim();

                // Skip comments
                if (trimmed.startsWith('--') || trimmed.length === 0) {
                    continue;
                }

                // Track when we're inside a trigger
                if (trimmed.toUpperCase().startsWith('CREATE TRIGGER')) {
                    inTrigger = true;
                }

                currentStatement += line + '\n';

                // End of statement
                if (trimmed.endsWith(';')) {
                    // For triggers, wait for END;
                    if (inTrigger) {
                        if (trimmed.toUpperCase() === 'END;') {
                            statements.push(currentStatement.trim());
                            currentStatement = '';
                            inTrigger = false;
                        }
                    } else {
                        // Regular statement
                        statements.push(currentStatement.trim());
                        currentStatement = '';
                    }
                }
            }

            console.log('[DB] Executing', statements.length, 'SQL statements...');

            let successCount = 0;
            for (const statement of statements) {
                if (statement.length > 0) {
                    try {
                        await database.execute(statement);
                        successCount++;
                    } catch (err: any) {
                        console.error('[DB] Error executing statement:', statement.substring(0, 150));
                        console.error('[DB] Error details:', err);
                        throw new Error(`Migration failed at statement ${successCount + 1}: ${err.message}`);
                    }
                }
            }

            console.log('[DB] Successfully executed', successCount, 'statements');

            await database.execute(
                'INSERT INTO migrations (version) VALUES (?)',
                ['001']
            );

            console.log('[DB] Migration 001 applied successfully');
        } else {
            console.log('[DB] Database up to date');
        }
    } catch (error) {
        console.error('[DB] Migration error:', error);
        throw error;
    }
}

async function applyDatabaseSafetyPragmas(database: Database): Promise<void> {
    try {
        await database.execute('PRAGMA foreign_keys = ON');
        await database.execute('PRAGMA journal_mode = WAL');
        await database.execute('PRAGMA synchronous = NORMAL');
    } catch (error) {
        console.error('[DB] Failed to apply safety pragmas:', error);
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

        console.warn('[DB] Data integrity issues detected:', orphanCounters);

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

        console.log('[DB] Relational integrity repair completed.');
    } catch (error) {
        console.error('[DB] Relational integrity repair failed:', error);
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
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Parse un timestamp SQLite en Date
 */
export function fromSQLiteTimestamp(timestamp: string): Date {
    return new Date(timestamp);
}
