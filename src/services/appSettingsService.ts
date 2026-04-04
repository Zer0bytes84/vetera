/**
 * App Settings Service
 * Manages application-level settings stored in SQLite
 * Used for license info, setup status, etc.
 */

import { getBrowserSetting, getBrowserTable, isTauriRuntime, setBrowserSetting } from "./browser-store"
import { getDatabase } from './sqlite/database';

// Ensure app_settings table exists (run on first access)
let tableCreated = false;

async function ensureTable(): Promise<void> {
    if (tableCreated) return;

    const db = await getDatabase();
    await db.execute(`
        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    tableCreated = true;
}

/**
 * Get a setting value
 */
export async function getSetting(key: string): Promise<string | null> {
    if (!isTauriRuntime()) {
        return getBrowserSetting(key);
    }

    await ensureTable();
    const db = await getDatabase();
    const result = await db.select<{ value: string }[]>(
        'SELECT value FROM app_settings WHERE key = ?',
        [key]
    );
    return result.length > 0 ? result[0].value : null;
}

/**
 * Set a setting value
 */
export async function setSetting(key: string, value: string): Promise<void> {
    if (!isTauriRuntime()) {
        setBrowserSetting(key, value);
        return;
    }

    await ensureTable();
    const db = await getDatabase();
    await db.execute(
        `INSERT INTO app_settings (key, value, updated_at) 
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
        [key, value]
    );
}

/**
 * Check if app setup is complete
 * Also checks if users exist (for backup restore scenarios)
 */
export async function isSetupComplete(): Promise<boolean> {
    // First check the setting
    const value = await getSetting('setup_complete');
    if (value === 'true') {
        return true;
    }

    // Fallback: check if any users exist in the database
    // This handles the case where a backup is restored that has users
    // but doesn't have the app_settings table populated
    try {
        if (!isTauriRuntime()) {
            const users = getBrowserTable<{ id: string }>("users");
            if (users.length > 0) {
                await setSetting('setup_complete', 'true');
                return true;
            }

            return false;
        }

        const db = await getDatabase();
        const users = await db.select<{ count: number }[]>(
            'SELECT COUNT(*) as count FROM users'
        );
        if (users.length > 0 && users[0].count > 0) {
            // Users exist, mark setup as complete and return true
            await setSetting('setup_complete', 'true');
            return true;
        }
    } catch (err) {
        console.error('[AppSettings] Error checking users:', err);
    }

    return false;
}

/**
 * Mark setup as complete
 */
export async function markSetupComplete(): Promise<void> {
    await setSetting('setup_complete', 'true');
}

/**
 * Get stored license info
 */
export async function getLicenseInfo(): Promise<{ key: string; email: string; activatedAt: string } | null> {
    const key = await getSetting('license_key');
    const email = await getSetting('license_email');
    const activatedAt = await getSetting('license_activated_at');

    if (!key || !email) return null;

    return { key, email, activatedAt: activatedAt || '' };
}

/**
 * Store license info
 */
export async function saveLicenseInfo(key: string, email: string): Promise<void> {
    await setSetting('license_key', key);
    await setSetting('license_email', email);
    await setSetting('license_activated_at', new Date().toISOString());
}
