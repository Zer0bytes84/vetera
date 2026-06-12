/**
 * Backup service for bAItari
 * Handles automatic and manual backup/restore of SQLite database
 *
 * Uses Tauri 2.0 plugin-fs with absolute paths for proper file operations
 *
 * S7.1 hardening:
 * - Optional AES-256-GCM encryption with PBKDF2-derived key (WebCrypto)
 * - SHA-256 integrity hash baked into the container
 * - Retention policy (count + max age in days)
 * - Lightweight scheduler (setInterval-based) for daily/weekly auto-backups
 */

import { appDataDir, join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  exists,
  mkdir,
  readFile,
  readTextFile,
  remove,
  writeFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import {
  decryptPayload,
  encryptPayload,
  isEncryptedContainer,
  parseContainer,
  serializeContainer,
  serializePlaintext,
} from "./backupCrypto";
import { isTauriRuntime } from "./browser-store";
import { closeDatabaseConnection, runDbOperation } from "./sqlite/database";

const DB_FILENAME = "baitari.db";
const WAL_FILENAME = "baitari.db-wal";
const SHM_FILENAME = "baitari.db-shm";
const BACKUP_DIR_NAME = "backups";
const MAX_BACKUPS = 5;
const MAX_BACKUP_AGE_DAYS = 60;
const METADATA_FILE = "backup_metadata.json";

interface BackupMetadata {
  appVersion: string | null;
  backups: BackupInfo[];
  lastBackup: string | null;
}

export interface BackupInfo {
  date: string;
  encrypted: boolean;
  filename: string;
  integrity: "verified" | "unknown" | "failed";
  reason: string;
  size: number;
  version: string;
}

async function getAppDataPath(): Promise<string> {
  return await appDataDir();
}

async function getBackupDirPath(): Promise<string> {
  const appData = await getAppDataPath();
  return await join(appData, BACKUP_DIR_NAME);
}

async function joinPath(...parts: string[]): Promise<string> {
  return await join(...parts);
}

/**
 * Ensure backup directory exists
 */
async function ensureBackupDir(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  try {
    const backupDir = await getBackupDirPath();
    const backupDirExists = await exists(backupDir);
    if (!backupDirExists) {
      await mkdir(backupDir, { recursive: true });
      console.log("[Backup] Created backup directory:", backupDir);
    }
  } catch (error) {
    console.error("[Backup] Error ensuring backup directory:", error);
    throw error;
  }
}

/**
 * Load backup metadata
 */
async function loadMetadata(): Promise<BackupMetadata> {
  if (!isTauriRuntime()) {
    return {
      lastBackup: null,
      appVersion: null,
      backups: [],
    };
  }

  try {
    await ensureBackupDir();
    const backupDir = await getBackupDirPath();
    const metadataPath = await joinPath(backupDir, METADATA_FILE);

    const metaExists = await exists(metadataPath);
    if (metaExists) {
      const content = await readTextFile(metadataPath);
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("[Backup] Error loading metadata:", error);
  }

  return {
    lastBackup: null,
    appVersion: null,
    backups: [],
  };
}

/**
 * Save backup metadata
 */
async function saveMetadata(metadata: BackupMetadata): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  try {
    await ensureBackupDir();
    const backupDir = await getBackupDirPath();
    const metadataPath = await joinPath(backupDir, METADATA_FILE);
    await writeTextFile(metadataPath, JSON.stringify(metadata, null, 2));
  } catch (error) {
    console.error("[Backup] Error saving metadata:", error);
    throw error;
  }
}

/**
 * Get current app version
 */
export function getAppVersion(): string {
  return import.meta.env.VITE_APP_VERSION || "1.4.0";
}

/**
 * Checkpoint WAL to flush pending writes into the main DB file without blocking
 */
async function checkpointWal(): Promise<void> {
  try {
    // Use PASSIVE instead of TRUNCATE to avoid deadlocking if there are active readers/statements
    await runDbOperation((db) => db.execute("PRAGMA wal_checkpoint(PASSIVE)"));
    console.log("[Backup] WAL checkpoint completed");
  } catch (e) {
    console.warn("[Backup] WAL checkpoint failed (non-critical):", e);
  }
}

function hasSqliteHeader(bytes: Uint8Array): boolean {
  if (bytes.length < 16) {
    return false;
  }

  const header = new TextDecoder().decode(bytes.slice(0, 16));
  return header === "SQLite format 3\u0000";
}

async function prepareForDatabaseReplacement(): Promise<{
  appData: string;
  dbPath: string;
  liveWalPath: string;
  liveShmPath: string;
}> {
  const appData = await getAppDataPath();
  const dbPath = await joinPath(appData, DB_FILENAME);
  const liveWalPath = await joinPath(appData, WAL_FILENAME);
  const liveShmPath = await joinPath(appData, SHM_FILENAME);

  await checkpointWal();
  await closeDatabaseConnection();

  const walExists = await exists(liveWalPath);
  const shmExists = await exists(liveShmPath);

  if (walExists) {
    await remove(liveWalPath);
    console.log("[Backup] Removed stale WAL file before database replacement");
  }

  if (shmExists) {
    await remove(liveShmPath);
    console.log("[Backup] Removed stale SHM file before database replacement");
  }

  return { appData, dbPath, liveWalPath, liveShmPath };
}

async function replaceDatabaseFile(
  sourceBytes: Uint8Array,
  destinationPath: string
): Promise<void> {
  const destinationExists = await exists(destinationPath);
  if (destinationExists) {
    await remove(destinationPath);
  }
  await writeFile(destinationPath, sourceBytes);
}

/**
 * Create a backup of the database
 * @param reason   Tag for traceability (manual / auto-upgrade / pre-import / scheduled).
 * @param passphrase Optional AES-256-GCM passphrase. When provided, the
 *                   backup file is encrypted with PBKDF2-derived key + SHA-256
 *                   integrity hash.
 */
export async function createBackup(
  reason = "manual",
  passphrase?: string
): Promise<BackupInfo | null> {
  if (!isTauriRuntime()) {
    console.info("[Backup] Backup skipped outside Tauri runtime");
    return null;
  }

  try {
    console.log("[Backup] Starting backup creation...");

    // Ensure backup directory exists
    await ensureBackupDir();

    const appData = await getAppDataPath();
    const backupDir = await getBackupDirPath();
    const dbPath = await joinPath(appData, DB_FILENAME);

    // Check if database exists
    const dbExists = await exists(dbPath);
    if (!dbExists) {
      console.warn("[Backup] Database does not exist yet, skipping backup");
      return null;
    }

    // Checkpoint WAL to ensure all writes are in the main DB file
    await checkpointWal();

    // Read the database as bytes
    const plaintext = await readFile(dbPath);

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const version = getAppVersion();
    const encrypted = typeof passphrase === "string" && passphrase.length > 0;
    const extension = encrypted ? "bdb" : "db";
    const backupFilename = `backup_${timestamp}_v${version}_${reason}${
      encrypted ? "_enc" : ""
    }.${extension}`;
    const backupDestPath = await joinPath(backupDir, backupFilename);

    // Encrypt or pass through
    const payload = encrypted
      ? serializeContainer(await encryptPayload(plaintext, passphrase))
      : serializePlaintext(plaintext);

    await writeFile(backupDestPath, payload);
    console.log(
      "[Backup] Wrote",
      encrypted ? "encrypted" : "plaintext",
      "backup to:",
      backupDestPath
    );

    // Update metadata
    const metadata = await loadMetadata();
    const backupInfo: BackupInfo = {
      filename: backupFilename,
      date: new Date().toISOString(),
      version,
      size: payload.byteLength,
      encrypted,
      reason,
      integrity: "verified",
    };

    metadata.backups.unshift(backupInfo);
    metadata.lastBackup = backupInfo.date;
    metadata.appVersion = version;

    // Apply retention policy (count + max age)
    await applyRetention(metadata, backupDir);

    await saveMetadata(metadata);
    console.log("[Backup] Created backup:", backupFilename);

    return backupInfo;
  } catch (error) {
    console.error("[Backup] Error creating backup:", error);
    throw error;
  }
}

/**
 * Apply the retention policy: keep at most MAX_BACKUPS items, and prune
 * any backup older than MAX_BACKUP_AGE_DAYS. Returns the new metadata list.
 */
async function applyRetention(
  metadata: BackupMetadata,
  backupDir: string
): Promise<void> {
  const now = Date.now();
  const ageMs = MAX_BACKUP_AGE_DAYS * 24 * 60 * 60 * 1000;
  const survivors: BackupInfo[] = [];
  for (let i = 0; i < metadata.backups.length; i += 1) {
    const entry = metadata.backups[i];
    const age = now - new Date(entry.date).getTime();
    if (age > ageMs) {
      try {
        await remove(await joinPath(backupDir, entry.filename));
        console.log("[Backup] Pruned aged backup:", entry.filename);
      } catch (e) {
        console.warn(
          "[Backup] Could not prune aged backup:",
          entry.filename,
          e
        );
        survivors.push(entry);
      }
      continue;
    }
    if (survivors.length >= MAX_BACKUPS) {
      try {
        await remove(await joinPath(backupDir, entry.filename));
        console.log("[Backup] Pruned excess backup:", entry.filename);
      } catch (e) {
        console.warn(
          "[Backup] Could not prune excess backup:",
          entry.filename,
          e
        );
        survivors.push(entry);
      }
      continue;
    }
    survivors.push(entry);
  }
  metadata.backups = survivors;
}

/**
 * List all available backups
 */
export async function listBackups(): Promise<BackupInfo[]> {
  if (!isTauriRuntime()) {
    return [];
  }

  try {
    const metadata = await loadMetadata();
    return metadata.backups;
  } catch (error) {
    console.error("[Backup] Error listing backups:", error);
    return [];
  }
}

/**
 * Get last backup date
 */
export async function getLastBackupDate(): Promise<string | null> {
  const metadata = await loadMetadata();
  return metadata.lastBackup;
}

/**
 * Restore database from a backup.
 * @param filename  Backup file inside the managed backup directory.
 * @param passphrase Required when the backup is encrypted. The integrity
 *                   hash is verified and AES-GCM auth tag is checked.
 */
export async function restoreBackup(
  filename: string,
  passphrase?: string
): Promise<boolean> {
  if (!isTauriRuntime()) {
    console.info("[Backup] Restore unavailable outside Tauri runtime");
    return false;
  }

  console.log("[Backup] Starting restore:", filename);

  try {
    const appData = await getAppDataPath();
    const backupDir = await getBackupDirPath();
    const backupPath = await joinPath(backupDir, filename);
    const dbPath = await joinPath(appData, DB_FILENAME);

    // Check if backup exists
    const backupExists = await exists(backupPath);
    if (!backupExists) {
      throw new Error("Fichier de sauvegarde introuvable");
    }

    const bytes = await readFile(backupPath);
    const encrypted = isEncryptedContainer(bytes);
    let plaintext: Uint8Array;

    if (encrypted) {
      if (!passphrase) {
        throw new Error(
          "Cette sauvegarde est chiffrée — le mot de passe est requis pour la restaurer."
        );
      }
      const container = parseContainer(bytes);
      plaintext = await decryptPayload(container, passphrase);
    } else {
      // Either a legacy raw .db file, or a plaintext bdb container.
      if (bytes.length > 12 && bytes[0] === 0x42 && bytes[1] === 0x41) {
        // New container format with FLAG_ENCRYPTED = 0
        const parsed = parseContainer(bytes);
        plaintext = parsed.rawPayload;
      } else {
        plaintext = bytes;
      }
    }

    if (!hasSqliteHeader(plaintext)) {
      throw new Error("Le fichier déchiffré n'est pas une base SQLite valide.");
    }

    // Checkpoint WAL before restore to avoid conflicts
    await checkpointWal();

    console.log("[Backup] Writing restored database to:", dbPath);
    await writeFile(dbPath, plaintext);

    console.log("[Backup] Restore completed successfully!");
    return true;
  } catch (error) {
    console.error("[Backup] Error restoring backup:", error);
    throw error;
  }
}

/**
 * Export database to user-chosen location.
 * @param passphrase Optional AES-256-GCM passphrase. When provided, the
 *                   exported file uses the encrypted container layout.
 */
export async function exportDatabase(passphrase?: string): Promise<boolean> {
  if (!isTauriRuntime()) {
    console.info("[Backup] Export unavailable outside Tauri runtime");
    return false;
  }

  try {
    const appData = await getAppDataPath();
    const dbPath = await joinPath(appData, DB_FILENAME);

    // Check if database exists
    const dbExists = await exists(dbPath);
    if (!dbExists) {
      console.error("[Backup] No database to export");
      return false;
    }

    // Checkpoint WAL before export
    await checkpointWal();

    const plaintext = await readFile(dbPath);
    const encrypted = typeof passphrase === "string" && passphrase.length > 0;
    const payload = encrypted
      ? serializeContainer(await encryptPayload(plaintext, passphrase))
      : serializePlaintext(plaintext);

    // Open save dialog
    const timestamp = new Date().toISOString().split("T")[0];
    const defaultName = encrypted
      ? `baitari-backup_${timestamp}.bdb`
      : `baitari-backup_${timestamp}.db`;
    const savePath = await save({
      defaultPath: defaultName,
      filters: [
        {
          name: encrypted ? "bAItari Encrypted Backup" : "SQLite Database",
          extensions: [encrypted ? "bdb" : "db"],
        },
      ],
    });

    if (!savePath) {
      console.log("[Backup] Export cancelled by user");
      return false;
    }

    // Write payload to chosen location
    await writeFile(savePath, payload);

    console.log(
      "[Backup] Exported",
      encrypted ? "encrypted" : "plaintext",
      "database to:",
      savePath
    );
    return true;
  } catch (error) {
    console.error("[Backup] Error exporting database:", error);
    return false;
  }
}

/**
 * Check if backup is needed (version change detection)
 */
export async function checkAutoBackup(): Promise<boolean> {
  if (!isTauriRuntime()) {
    return false;
  }

  try {
    const currentVersion = getAppVersion();
    const metadata = await loadMetadata();

    // If this is a new version, create an auto-backup
    if (metadata.appVersion && metadata.appVersion !== currentVersion) {
      console.log(
        `[Backup] Version change detected: ${metadata.appVersion} -> ${currentVersion}`
      );
      await createBackup("auto-upgrade");
      return true;
    }

    // Update stored version if first run
    if (!metadata.appVersion) {
      metadata.appVersion = currentVersion;
      await saveMetadata(metadata);
    }

    return false;
  } catch (error) {
    console.error("[Backup] Error in auto-backup check:", error);
    return false;
  }
}

/**
 * Delete a specific backup
 */
export async function deleteBackup(filename: string): Promise<boolean> {
  if (!isTauriRuntime()) {
    return false;
  }

  try {
    const backupDir = await getBackupDirPath();
    const backupPath = await joinPath(backupDir, filename);
    await remove(backupPath);

    // Update metadata
    const metadata = await loadMetadata();
    metadata.backups = metadata.backups.filter((b) => b.filename !== filename);
    await saveMetadata(metadata);

    console.log("[Backup] Deleted backup:", filename);
    return true;
  } catch (error) {
    console.error("[Backup] Error deleting backup:", error);
    return false;
  }
}

/**
 * Import a database file from user's filesystem.
 * Supports both raw SQLite (.db / .sqlite) and encrypted .bdb containers.
 * @param passphrase Required when importing an encrypted .bdb backup.
 */
export async function importDatabase(passphrase?: string): Promise<boolean> {
  if (!isTauriRuntime()) {
    console.info("[Backup] Import unavailable outside Tauri runtime");
    return false;
  }

  try {
    // Open file picker
    const filePath = await open({
      multiple: false,
      filters: [
        {
          name: "bAItari Backup",
          extensions: ["db", "sqlite", "sqlite3", "bdb"],
        },
      ],
    });

    if (!filePath || Array.isArray(filePath)) {
      console.log("[Backup] Import cancelled by user");
      return false;
    }

    const bytes = await readFile(filePath);
    const plaintext = await decodeBackupBytes(bytes, passphrase);

    await createBackup("pre-import");
    const { dbPath } = await prepareForDatabaseReplacement();

    // Replace the live database with the decoded SQLite file.
    console.log("[Backup] Importing database from:", filePath);
    await replaceDatabaseFile(plaintext, dbPath);

    console.log("[Backup] Database imported successfully from:", filePath);
    return true;
  } catch (error) {
    console.error("[Backup] Error importing database:", error);
    throw error instanceof Error
      ? error
      : new Error("Impossible d'importer cette sauvegarde");
  }
}

/**
 * Import a database from a File selected via a native file input fallback.
 */
export async function importDatabaseFromFile(
  file: File,
  passphrase?: string
): Promise<boolean> {
  if (!isTauriRuntime()) {
    console.info("[Backup] Import unavailable outside Tauri runtime");
    return false;
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const plaintext = await decodeBackupBytes(bytes, passphrase);

    await createBackup("pre-import");
    const { dbPath } = await prepareForDatabaseReplacement();
    await writeFile(dbPath, plaintext);

    console.log(
      "[Backup] Database imported successfully from File:",
      file.name
    );
    return true;
  } catch (error) {
    console.error("[Backup] Error importing database from File:", error);
    throw error instanceof Error
      ? error
      : new Error("Impossible d'importer cette sauvegarde");
  }
}

/**
 * Decode backup bytes: detect encrypted container, decrypt if needed, fall
 * back to a raw SQLite blob. Throws on integrity / format failure.
 */
async function decodeBackupBytes(
  bytes: Uint8Array,
  passphrase?: string
): Promise<Uint8Array> {
  if (isEncryptedContainer(bytes)) {
    if (!passphrase) {
      throw new Error(
        "Cette sauvegarde est chiffrée — le mot de passe est requis."
      );
    }
    const container = parseContainer(bytes);
    return decryptPayload(container, passphrase);
  }
  if (bytes.length > 12 && bytes[0] === 0x42 && bytes[1] === 0x41) {
    const parsed = parseContainer(bytes);
    return parsed.rawPayload;
  }
  if (!hasSqliteHeader(bytes)) {
    throw new Error("Le fichier sélectionné n'est pas une base SQLite valide");
  }
  return bytes;
}
