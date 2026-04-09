/**
 * Backup service for bAItari
 * Handles automatic and manual backup/restore of SQLite database
 *
 * Uses Tauri 2.0 plugin-fs with absolute paths for proper file operations
 */

import { appDataDir, join } from "@tauri-apps/api/path"
import {
  exists,
  mkdir,
  copyFile,
  remove,
  readFile,
  readTextFile,
  writeFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs"
import { save, open } from "@tauri-apps/plugin-dialog"
import { isTauriRuntime } from "./browser-store"
import { closeDatabaseConnection, getDatabase } from "./sqlite/database"

const DB_FILENAME = "baitari.db"
const WAL_FILENAME = "baitari.db-wal"
const SHM_FILENAME = "baitari.db-shm"
const BACKUP_DIR_NAME = "backups"
const MAX_BACKUPS = 5
const METADATA_FILE = "backup_metadata.json"

interface BackupMetadata {
  lastBackup: string | null
  appVersion: string | null
  backups: BackupInfo[]
}

export interface BackupInfo {
  filename: string
  date: string
  version: string
  size: number
}

async function getAppDataPath(): Promise<string> {
  return await appDataDir()
}

async function getBackupDirPath(): Promise<string> {
  const appData = await getAppDataPath()
  return await join(appData, BACKUP_DIR_NAME)
}

async function joinPath(...parts: string[]): Promise<string> {
  return await join(...parts)
}

/**
 * Ensure backup directory exists
 */
async function ensureBackupDir(): Promise<void> {
  if (!isTauriRuntime()) {
    return
  }

  try {
    const backupDir = await getBackupDirPath()
    const backupDirExists = await exists(backupDir)
    if (!backupDirExists) {
      await mkdir(backupDir, { recursive: true })
      console.log("[Backup] Created backup directory:", backupDir)
    }
  } catch (error) {
    console.error("[Backup] Error ensuring backup directory:", error)
    throw error
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
    }
  }

  try {
    await ensureBackupDir()
    const backupDir = await getBackupDirPath()
    const metadataPath = await joinPath(backupDir, METADATA_FILE)

    const metaExists = await exists(metadataPath)
    if (metaExists) {
      const content = await readTextFile(metadataPath)
      return JSON.parse(content)
    }
  } catch (error) {
    console.error("[Backup] Error loading metadata:", error)
  }

  return {
    lastBackup: null,
    appVersion: null,
    backups: [],
  }
}

/**
 * Save backup metadata
 */
async function saveMetadata(metadata: BackupMetadata): Promise<void> {
  if (!isTauriRuntime()) {
    return
  }

  try {
    await ensureBackupDir()
    const backupDir = await getBackupDirPath()
    const metadataPath = await joinPath(backupDir, METADATA_FILE)
    await writeTextFile(metadataPath, JSON.stringify(metadata, null, 2))
  } catch (error) {
    console.error("[Backup] Error saving metadata:", error)
    throw error
  }
}

/**
 * Get current app version
 */
export function getAppVersion(): string {
  // @ts-ignore - Set by Vite/build process
  return import.meta.env.VITE_APP_VERSION || "1.4.0"
}

/**
 * Checkpoint WAL to flush pending writes into the main DB file
 */
async function checkpointWal(): Promise<void> {
  try {
    const db = await getDatabase()
    await db.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    console.log("[Backup] WAL checkpoint completed")
  } catch (e) {
    console.warn("[Backup] WAL checkpoint failed (non-critical):", e)
  }
}

function hasSqliteHeader(bytes: Uint8Array): boolean {
  if (bytes.length < 16) {
    return false
  }

  const header = new TextDecoder().decode(bytes.slice(0, 16))
  return header === "SQLite format 3\u0000"
}

async function prepareForDatabaseReplacement(): Promise<{
  appData: string
  dbPath: string
  liveWalPath: string
  liveShmPath: string
}> {
  const appData = await getAppDataPath()
  const dbPath = await joinPath(appData, DB_FILENAME)
  const liveWalPath = await joinPath(appData, WAL_FILENAME)
  const liveShmPath = await joinPath(appData, SHM_FILENAME)

  await checkpointWal()
  await closeDatabaseConnection()

  const walExists = await exists(liveWalPath)
  const shmExists = await exists(liveShmPath)

  if (walExists) {
    await remove(liveWalPath)
    console.log("[Backup] Removed stale WAL file before database replacement")
  }

  if (shmExists) {
    await remove(liveShmPath)
    console.log("[Backup] Removed stale SHM file before database replacement")
  }

  return { appData, dbPath, liveWalPath, liveShmPath }
}

async function replaceDatabaseFile(
  sourcePath: string,
  destinationPath: string
): Promise<void> {
  const destinationExists = await exists(destinationPath)
  if (destinationExists) {
    await remove(destinationPath)
  }

  await copyFile(sourcePath, destinationPath)
}

/**
 * Create a backup of the database
 */
export async function createBackup(
  reason: string = "manual"
): Promise<BackupInfo | null> {
  if (!isTauriRuntime()) {
    console.info("[Backup] Backup skipped outside Tauri runtime")
    return null
  }

  try {
    console.log("[Backup] Starting backup creation...")

    // Ensure backup directory exists
    await ensureBackupDir()

    const appData = await getAppDataPath()
    const backupDir = await getBackupDirPath()
    const dbPath = await joinPath(appData, DB_FILENAME)

    // Check if database exists
    const dbExists = await exists(dbPath)
    if (!dbExists) {
      console.warn("[Backup] Database does not exist yet, skipping backup")
      return null
    }

    // Checkpoint WAL to ensure all writes are in the main DB file
    await checkpointWal()

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const version = getAppVersion()
    const backupFilename = `backup_${timestamp}_v${version}_${reason}.db`
    const backupDestPath = await joinPath(backupDir, backupFilename)

    console.log("[Backup] Copying database from:", dbPath)
    console.log("[Backup] Copying database to:", backupDestPath)

    // Copy database file
    await copyFile(dbPath, backupDestPath)

    // Also copy WAL and SHM files if they exist
    const walSrcPath = await joinPath(appData, WAL_FILENAME)
    const shmSrcPath = await joinPath(appData, SHM_FILENAME)
    const walDestPath = await joinPath(backupDir, `${backupFilename}-wal`)
    const shmDestPath = await joinPath(backupDir, `${backupFilename}-shm`)

    const walExists = await exists(walSrcPath)
    const shmExists = await exists(shmSrcPath)

    if (walExists) {
      await copyFile(walSrcPath, walDestPath)
      console.log("[Backup] Copied WAL file")
    }
    if (shmExists) {
      await copyFile(shmSrcPath, shmDestPath)
      console.log("[Backup] Copied SHM file")
    }

    // Update metadata
    const metadata = await loadMetadata()
    const backupInfo: BackupInfo = {
      filename: backupFilename,
      date: new Date().toISOString(),
      version: version,
      size: 0,
    }

    metadata.backups.unshift(backupInfo)
    metadata.lastBackup = backupInfo.date
    metadata.appVersion = version

    // Rotate old backups (keep only MAX_BACKUPS)
    if (metadata.backups.length > MAX_BACKUPS) {
      const toDelete = metadata.backups.splice(MAX_BACKUPS)
      for (const old of toDelete) {
        try {
          const oldPath = await joinPath(backupDir, old.filename)
          await remove(oldPath)
          console.log("[Backup] Deleted old backup:", old.filename)
        } catch (e) {
          console.warn("[Backup] Could not delete old backup:", old.filename)
        }
      }
    }

    await saveMetadata(metadata)
    console.log("[Backup] Created backup:", backupFilename)

    return backupInfo
  } catch (error) {
    console.error("[Backup] Error creating backup:", error)
    throw error
  }
}

/**
 * List all available backups
 */
export async function listBackups(): Promise<BackupInfo[]> {
  if (!isTauriRuntime()) {
    return []
  }

  try {
    const metadata = await loadMetadata()
    return metadata.backups
  } catch (error) {
    console.error("[Backup] Error listing backups:", error)
    return []
  }
}

/**
 * Get last backup date
 */
export async function getLastBackupDate(): Promise<string | null> {
  const metadata = await loadMetadata()
  return metadata.lastBackup
}

/**
 * Restore database from a backup
 */
export async function restoreBackup(filename: string): Promise<boolean> {
  if (!isTauriRuntime()) {
    console.info("[Backup] Restore unavailable outside Tauri runtime")
    return false
  }

  console.log("[Backup] Starting restore:", filename)

  try {
    const appData = await getAppDataPath()
    const backupDir = await getBackupDirPath()
    const backupPath = await joinPath(backupDir, filename)
    const dbPath = await joinPath(appData, DB_FILENAME)

    console.log("[Backup] Backup path:", backupPath)
    console.log("[Backup] DB path:", dbPath)

    // Check if backup exists
    const backupExists = await exists(backupPath)
    console.log("[Backup] Backup exists:", backupExists)

    if (!backupExists) {
      console.error("[Backup] Backup file does not exist:", filename)
      throw new Error("Fichier de sauvegarde introuvable")
    }

    // Checkpoint WAL before restore to avoid conflicts
    await checkpointWal()

    // Do the restore
    console.log("[Backup] Copying backup to database...")
    await copyFile(backupPath, dbPath)

    // Also restore WAL and SHM files if they exist in the backup
    const backupWalPath = await joinPath(backupDir, `${filename}-wal`)
    const backupShmPath = await joinPath(backupDir, `${filename}-shm`)
    const liveWalPath = await joinPath(appData, WAL_FILENAME)
    const liveShmPath = await joinPath(appData, SHM_FILENAME)

    const backupWalExists = await exists(backupWalPath)
    const backupShmExists = await exists(backupShmPath)

    if (backupWalExists) {
      await copyFile(backupWalPath, liveWalPath)
      console.log("[Backup] Restored WAL file")
    }
    if (backupShmExists) {
      await copyFile(backupShmPath, liveShmPath)
      console.log("[Backup] Restored SHM file")
    }

    console.log("[Backup] Restore completed successfully!")
    return true
  } catch (error) {
    console.error("[Backup] Error restoring backup:", error)
    throw error
  }
}

/**
 * Export database to user-chosen location
 */
export async function exportDatabase(): Promise<boolean> {
  if (!isTauriRuntime()) {
    console.info("[Backup] Export unavailable outside Tauri runtime")
    return false
  }

  try {
    const appData = await getAppDataPath()
    const dbPath = await joinPath(appData, DB_FILENAME)

    // Check if database exists
    const dbExists = await exists(dbPath)
    if (!dbExists) {
      console.error("[Backup] No database to export")
      return false
    }

    // Checkpoint WAL before export
    await checkpointWal()

    // Open save dialog
    const timestamp = new Date().toISOString().split("T")[0]
    const savePath = await save({
      defaultPath: `baitari-backup_${timestamp}.db`,
      filters: [{ name: "SQLite Database", extensions: ["db"] }],
    })

    if (!savePath) {
      console.log("[Backup] Export cancelled by user")
      return false
    }

    // Copy to chosen location
    await copyFile(dbPath, savePath)

    console.log("[Backup] Exported database to:", savePath)
    return true
  } catch (error) {
    console.error("[Backup] Error exporting database:", error)
    return false
  }
}

/**
 * Check if backup is needed (version change detection)
 */
export async function checkAutoBackup(): Promise<boolean> {
  if (!isTauriRuntime()) {
    return false
  }

  try {
    const currentVersion = getAppVersion()
    const metadata = await loadMetadata()

    // If this is a new version, create an auto-backup
    if (metadata.appVersion && metadata.appVersion !== currentVersion) {
      console.log(
        `[Backup] Version change detected: ${metadata.appVersion} -> ${currentVersion}`
      )
      await createBackup("auto-upgrade")
      return true
    }

    // Update stored version if first run
    if (!metadata.appVersion) {
      metadata.appVersion = currentVersion
      await saveMetadata(metadata)
    }

    return false
  } catch (error) {
    console.error("[Backup] Error in auto-backup check:", error)
    return false
  }
}

/**
 * Delete a specific backup
 */
export async function deleteBackup(filename: string): Promise<boolean> {
  if (!isTauriRuntime()) {
    return false
  }

  try {
    const backupDir = await getBackupDirPath()
    const backupPath = await joinPath(backupDir, filename)
    await remove(backupPath)

    // Update metadata
    const metadata = await loadMetadata()
    metadata.backups = metadata.backups.filter((b) => b.filename !== filename)
    await saveMetadata(metadata)

    console.log("[Backup] Deleted backup:", filename)
    return true
  } catch (error) {
    console.error("[Backup] Error deleting backup:", error)
    return false
  }
}

/**
 * Import a database file from user's filesystem
 * Copies the selected .db file into the app's data directory
 */
export async function importDatabase(): Promise<boolean> {
  if (!isTauriRuntime()) {
    console.info("[Backup] Import unavailable outside Tauri runtime")
    return false
  }

  try {
    // Open file picker
    const filePath = await open({
      multiple: false,
      filters: [
        { name: "SQLite Database", extensions: ["db", "sqlite", "sqlite3"] },
      ],
    })

    if (!filePath || Array.isArray(filePath)) {
      console.log("[Backup] Import cancelled by user")
      return false
    }

    const bytes = await readFile(filePath)
    if (!hasSqliteHeader(bytes)) {
      throw new Error("Le fichier sélectionné n'est pas une base SQLite valide")
    }

    await createBackup("pre-import")
    const { dbPath } = await prepareForDatabaseReplacement()

    // Replace the live database with the selected SQLite file.
    console.log("[Backup] Importing database from:", filePath)
    await replaceDatabaseFile(filePath, dbPath)

    console.log("[Backup] Database imported successfully from:", filePath)
    return true
  } catch (error) {
    console.error("[Backup] Error importing database:", error)
    throw error instanceof Error
      ? error
      : new Error("Impossible d'importer cette sauvegarde")
  }
}

/**
 * Import a database from a File selected via a native file input fallback.
 */
export async function importDatabaseFromFile(file: File): Promise<boolean> {
  if (!isTauriRuntime()) {
    console.info("[Backup] Import unavailable outside Tauri runtime")
    return false
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!hasSqliteHeader(bytes)) {
      throw new Error(
        "Le fichier sélectionné n'est pas une base SQLite compatible"
      )
    }

    await createBackup("pre-import")
    const { dbPath } = await prepareForDatabaseReplacement()
    await writeFile(dbPath, bytes)

    console.log("[Backup] Database imported successfully from File:", file.name)
    return true
  } catch (error) {
    console.error("[Backup] Error importing database from File:", error)
    throw error instanceof Error
      ? error
      : new Error("Impossible d'importer cette sauvegarde")
  }
}
