/**
 * Lightweight backup scheduler.
 *
 * Runs `createBackup(reason, passphrase?)` on a fixed interval (daily or
 * weekly). Uses `setInterval` instead of a worker so the schedule lives
 * inside the React tree and is cancelled when the user logs out or quits.
 *
 * Settings are persisted in `app_settings` (key: `backup_scheduler`) so
 * the schedule survives an app restart.
 */

import { createBackup, getLastBackupDate, listBackups } from "./backupService";
import { getSetting, setSetting } from "./appSettingsService";

export type BackupFrequency = "off" | "daily" | "weekly";

export interface BackupSchedulerSettings {
  frequency: BackupFrequency;
  passphrase: string | null;
  lastRunAt: string | null;
}

const SETTINGS_KEY = "backup_scheduler";
const DEFAULT_SETTINGS: BackupSchedulerSettings = {
  frequency: "off",
  passphrase: null,
  lastRunAt: null,
};

let timerHandle: number | null = null;
let cachedSettings: BackupSchedulerSettings = DEFAULT_SETTINGS;

const DAILY_MS = 24 * 60 * 60 * 1000;
const WEEKLY_MS = 7 * 24 * 60 * 60 * 1000;

export async function loadSchedulerSettings(): Promise<BackupSchedulerSettings> {
  try {
    const raw = await getSetting(SETTINGS_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }
    const parsed = JSON.parse(raw) as Partial<BackupSchedulerSettings>;
    return {
      frequency: parsed.frequency ?? "off",
      passphrase: parsed.passphrase ?? null,
      lastRunAt: parsed.lastRunAt ?? null,
    };
  } catch (e) {
    console.warn("[BackupScheduler] Could not load settings:", e);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSchedulerSettings(
  settings: BackupSchedulerSettings
): Promise<void> {
  cachedSettings = settings;
  try {
    await setSetting(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("[BackupScheduler] Could not save settings:", e);
    throw e;
  }
}

export function getCachedSettings(): BackupSchedulerSettings {
  return cachedSettings;
}

function computeNextDelay(settings: BackupSchedulerSettings): number | null {
  if (settings.frequency === "off") {
    return null;
  }
  const interval = settings.frequency === "daily" ? DAILY_MS : WEEKLY_MS;
  if (!settings.lastRunAt) {
    // First run after a short warmup so the user can boot the app.
    return 60 * 1000;
  }
  const elapsed = Date.now() - new Date(settings.lastRunAt).getTime();
  return Math.max(30 * 1000, interval - elapsed);
}

/**
 * Start (or restart) the scheduler with the given settings. Cancels any
 * previous schedule. Safe to call multiple times.
 */
export async function startScheduler(
  settings: BackupSchedulerSettings
): Promise<void> {
  stopScheduler();
  await saveSchedulerSettings(settings);
  const delay = computeNextDelay(settings);
  if (delay == null) {
    return;
  }
  // setInterval cannot be cancelled in a browser-free way, so we manually
  // schedule the next run from a setTimeout chain.
  scheduleNextRun(delay);
}

function scheduleNextRun(delay: number): void {
  if (timerHandle != null) {
    window.clearTimeout(timerHandle);
  }
  timerHandle = window.setTimeout(async () => {
    try {
      const current = getCachedSettings();
      if (current.frequency === "off") {
        timerHandle = null;
        return;
      }
      const result = await createBackup("scheduled", current.passphrase ?? undefined);
      if (result) {
        await saveSchedulerSettings({
          ...current,
          lastRunAt: new Date().toISOString(),
        });
        console.log(
          "[BackupScheduler] Scheduled backup created:",
          result.filename
        );
      }
      const nextDelay = computeNextDelay(getCachedSettings());
      if (nextDelay != null) {
        scheduleNextRun(nextDelay);
      } else {
        timerHandle = null;
      }
    } catch (e) {
      console.error("[BackupScheduler] Scheduled run failed:", e);
      // Try again in 5 minutes to avoid busy looping on persistent errors.
      scheduleNextRun(5 * 60 * 1000);
    }
  }, delay);
}

export function stopScheduler(): void {
  if (timerHandle != null) {
    window.clearTimeout(timerHandle);
    timerHandle = null;
  }
}

export interface SchedulerStatus {
  settings: BackupSchedulerSettings;
  isRunning: boolean;
  lastBackupAt: string | null;
  backupCount: number;
}

export async function getSchedulerStatus(): Promise<SchedulerStatus> {
  const settings = await loadSchedulerSettings();
  const lastBackupAt = await getLastBackupDate();
  const backups = await listBackups();
  return {
    settings,
    isRunning: settings.frequency !== "off" && timerHandle != null,
    lastBackupAt,
    backupCount: backups.length,
  };
}

/**
 * Bootstrap hook for the app shell. Loads persisted settings, applies the
 * schedule if one is configured, and runs an immediate catch-up backup if
 * the configured interval has elapsed since `lastBackupAt`.
 */
export async function bootstrapScheduler(): Promise<void> {
  const settings = await loadSchedulerSettings();
  cachedSettings = settings;
  if (settings.frequency === "off") {
    return;
  }
  const lastBackupAt = await getLastBackupDate();
  const reference = lastBackupAt ?? settings.lastRunAt;
  const interval =
    settings.frequency === "daily" ? DAILY_MS : WEEKLY_MS;
  if (reference) {
    const elapsed = Date.now() - new Date(reference).getTime();
    if (elapsed >= interval) {
      // Catch-up: run immediately on app boot.
      scheduleNextRun(2_000);
      return;
    }
  }
  const delay = computeNextDelay(settings);
  if (delay != null) {
    scheduleNextRun(delay);
  }
}
