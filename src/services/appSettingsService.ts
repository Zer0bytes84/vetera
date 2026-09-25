/**
 * App Settings Service
 * Manages application-level settings stored in SQLite
 * Used for license info, setup status, etc.
 */

import {
  getBrowserSetting,
  getBrowserTable,
  isTauriRuntime,
  setBrowserSetting,
} from "./browser-store";
import { runDbOperation, runDbRead } from "./sqlite/database";

// Ensure app_settings table exists (run on first access)
let tableCreated = false;
let tableCreationPromise: Promise<void> | null = null;

async function ensureTable(): Promise<void> {
  if (tableCreated) {
    return;
  }

  if (!tableCreationPromise) {
    tableCreationPromise = runDbOperation((db) =>
      db.execute(`
          CREATE TABLE IF NOT EXISTS app_settings (
              key TEXT PRIMARY KEY,
              value TEXT,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
      `)
    )
      .then(() => {
        tableCreated = true;
      })
      .finally(() => {
        tableCreationPromise = null;
      });
  }

  await tableCreationPromise;
}

/**
 * Get a setting value
 */
export async function getSetting(key: string): Promise<string | null> {
  if (!isTauriRuntime()) {
    return getBrowserSetting(key);
  }

  await ensureTable();
  const result = await runDbRead((db) =>
    db.select<{ value: string }[]>(
      "SELECT value FROM app_settings WHERE key = ?",
      [key]
    )
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
  await runDbOperation((db) =>
    db.execute(
      `INSERT INTO app_settings (key, value, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      [key, value]
    )
  );
}

/**
 * Check if app setup is complete
 * Also checks if users exist (for backup restore scenarios)
 */
export async function isSetupComplete(): Promise<boolean> {
  // First check the setting
  const value = await getSetting("setup_complete");
  if (value === "true") {
    return true;
  }

  // Fallback: check if any users exist in the database
  // This handles the case where a backup is restored that has users
  // but doesn't have the app_settings table populated
  try {
    if (!isTauriRuntime()) {
      const users = getBrowserTable<{ id: string }>("users");
      if (users.length > 0) {
        await setSetting("setup_complete", "true");
        return true;
      }

      return false;
    }

    const users = await runDbRead((db) =>
      db.select<{ count: number }[]>("SELECT COUNT(*) as count FROM users")
    );
    if (users.length > 0 && users[0].count > 0) {
      // Users exist, mark setup as complete and return true
      await setSetting("setup_complete", "true");
      return true;
    }
  } catch (err) {
    console.error("[AppSettings] Error checking users:", err);
  }

  return false;
}

/**
 * Mark setup as complete
 */
export async function markSetupComplete(): Promise<void> {
  await setSetting("setup_complete", "true");
}

/**
 * Get stored license info
 */
export interface StoredLicense {
  activationToken: string;
  key: string;
  email: string;
  activatedAt: string;
  lastSeen?: number;
  denied?: string;
}

export async function getLicenseInfo(): Promise<StoredLicense | null> {
  const current = await getSetting("license_credentials_v2");
  if (current) {
    const parsed = JSON.parse(current) as StoredLicense;
    if (
      !parsed ||
      typeof parsed.email !== "string" ||
      typeof parsed.activationToken !== "string"
    )
      throw new Error("Activation locale endommagée.");
    return parsed;
  }
  const [key, email, token, activatedAt] = await Promise.all([
    getSetting("license_key"),
    getSetting("license_email"),
    getSetting("license_activation_token"),
    getSetting("license_activated_at"),
  ]);
  return key && email
    ? {
        key,
        email,
        activationToken: token || "",
        activatedAt: activatedAt || "",
      }
    : null;
}

export async function saveLicenseState(state: StoredLicense): Promise<void> {
  await setSetting("license_credentials_v2", JSON.stringify(state));
}

// Kept for callers migrating from the old setup flow. The lease must already
// have been cryptographically verified before it is saved here.
export async function saveLicenseInfo(
  key: string,
  email: string,
  activationToken = ""
): Promise<void> {
  await saveLicenseState({
    key,
    email,
    activationToken,
    activatedAt: new Date().toISOString(),
    lastSeen: Date.now(),
  });
}
