import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

/**
 * Initialise la connexion SQLite
 */
async function getDatabase(): Promise<Database> {
    if (!db) {
        db = await Database.load('sqlite:supervet.db');
    }
    return db;
}

/**
 * Test d'écriture dans SQLite via Tauri
 * @param message Message à enregistrer
 * @returns Message de confirmation
 */
export async function writeSQLiteTest(message: string): Promise<string> {
    try {
        const database = await getDatabase();

        // Créer la table si elle n'existe pas
        await database.execute(`
      CREATE TABLE IF NOT EXISTS test_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Insérer le message
        await database.execute(
            'INSERT INTO test_messages (message) VALUES (?)',
            [message]
        );

        return 'Message enregistré avec succès dans SQLite!';
    } catch (error) {
        console.error('Erreur SQLite:', error);
        throw new Error(`Erreur d'écriture: ${error}`);
    }
}

/**
 * Test de lecture depuis SQLite via Tauri
 * @returns Liste des messages enregistrés (max 10)
 */
export async function readSQLiteTest(): Promise<string[]> {
    try {
        const database = await getDatabase();

        const results = await database.select<{ message: string }[]>(
            'SELECT message FROM test_messages ORDER BY created_at DESC LIMIT 10'
        );

        return results.map(row => row.message);
    } catch (error) {
        console.error('Erreur lecture SQLite:', error);
        return [];
    }
}

/**
 * Commande greet de test
 */
export async function greet(name: string): Promise<string> {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke('greet', { name });
}
