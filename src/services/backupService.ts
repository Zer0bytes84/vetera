/**
 * Backup service for Luma Vet
 * Handles automatic and manual backup/restore of SQLite database
 * 
 * Uses Tauri 2.0 plugin-fs with BaseDirectory for proper permissions
 */

import { appDataDir, join } from '@tauri-apps/api/path';
import {
    exists,
    mkdir,
    copyFile,
    remove,
    readTextFile,
    writeTextFile,
    BaseDirectory
} from '@tauri-apps/plugin-fs';
import { save } from '@tauri-apps/plugin-dialog';
import { isTauriRuntime } from "./browser-store";

const DB_FILENAME = 'supervet.db';
const BACKUP_DIR = 'backups';
const MAX_BACKUPS = 5;
const METADATA_FILE = 'backup_metadata.json';

interface BackupMetadata {
    lastBackup: string | null;
    appVersion: string | null;
    backups: BackupInfo[];
}

export interface BackupInfo {
    filename: string;
    date: string;
    version: string;
    size: number;
}

/**
 * Ensure backup directory exists
 */
async function ensureBackupDir(): Promise<void> {
    if (!isTauriRuntime()) {
        return;
    }

    try {
        const backupDirExists = await exists(BACKUP_DIR, { baseDir: BaseDirectory.AppData });
        if (!backupDirExists) {
            await mkdir(BACKUP_DIR, { recursive: true, baseDir: BaseDirectory.AppData });
            console.log('[Backup] Created backup directory');
        }
    } catch (error) {
        console.error('[Backup] Error ensuring backup directory:', error);
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
            backups: []
        };
    }

    try {
        await ensureBackupDir();
        const metadataPath = `${BACKUP_DIR}/${METADATA_FILE}`;

        const metaExists = await exists(metadataPath, { baseDir: BaseDirectory.AppData });
        if (metaExists) {
            const content = await readTextFile(metadataPath, { baseDir: BaseDirectory.AppData });
            return JSON.parse(content);
        }
    } catch (error) {
        console.error('[Backup] Error loading metadata:', error);
    }

    return {
        lastBackup: null,
        appVersion: null,
        backups: []
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
        const metadataPath = `${BACKUP_DIR}/${METADATA_FILE}`;
        await writeTextFile(metadataPath, JSON.stringify(metadata, null, 2), { baseDir: BaseDirectory.AppData });
    } catch (error) {
        console.error('[Backup] Error saving metadata:', error);
        throw error;
    }
}

/**
 * Get current app version
 */
export function getAppVersion(): string {
    // @ts-ignore - Set by Vite/build process
    return import.meta.env.VITE_APP_VERSION || '1.4.0';
}

/**
 * Create a backup of the database
 */
export async function createBackup(reason: string = 'manual'): Promise<BackupInfo | null> {
    if (!isTauriRuntime()) {
        console.info('[Backup] Backup skipped outside Tauri runtime');
        return null;
    }

    try {
        console.log('[Backup] Starting backup creation...');

        // Ensure backup directory exists
        await ensureBackupDir();

        // Check if database exists
        const dbExists = await exists(DB_FILENAME, { baseDir: BaseDirectory.AppData });
        if (!dbExists) {
            console.warn('[Backup] Database does not exist yet, skipping backup');
            return null;
        }

        // Generate backup filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const version = getAppVersion();
        const backupFilename = `backup_${timestamp}_v${version}_${reason}.db`;
        const backupPath = `${BACKUP_DIR}/${backupFilename}`;

        console.log('[Backup] Copying database to:', backupPath);

        // Copy database to backup location using absolute paths
        const appData = await appDataDir();
        const srcPath = await join(appData, DB_FILENAME);
        const destPath = await join(appData, BACKUP_DIR, backupFilename);

        await copyFile(srcPath, destPath);

        // Update metadata
        const metadata = await loadMetadata();
        const backupInfo: BackupInfo = {
            filename: backupFilename,
            date: new Date().toISOString(),
            version: version,
            size: 0
        };

        metadata.backups.unshift(backupInfo);
        metadata.lastBackup = backupInfo.date;
        metadata.appVersion = version;

        // Rotate old backups (keep only MAX_BACKUPS)
        if (metadata.backups.length > MAX_BACKUPS) {
            const toDelete = metadata.backups.splice(MAX_BACKUPS);
            for (const old of toDelete) {
                try {
                    const oldPath = `${BACKUP_DIR}/${old.filename}`;
                    await remove(oldPath, { baseDir: BaseDirectory.AppData });
                    console.log('[Backup] Deleted old backup:', old.filename);
                } catch (e) {
                    console.warn('[Backup] Could not delete old backup:', old.filename);
                }
            }
        }

        await saveMetadata(metadata);
        console.log('[Backup] Created backup:', backupFilename);

        return backupInfo;
    } catch (error) {
        console.error('[Backup] Error creating backup:', error);
        throw error;
    }
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
        console.error('[Backup] Error listing backups:', error);
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
 * Restore database from a backup
 */
export async function restoreBackup(filename: string): Promise<boolean> {
    if (!isTauriRuntime()) {
        console.info('[Backup] Restore unavailable outside Tauri runtime');
        return false;
    }

    console.log('[Backup] Starting restore:', filename);

    try {
        const appData = await appDataDir();
        console.log('[Backup] App data dir:', appData);

        const backupPath = await join(appData, BACKUP_DIR, filename);
        const dbPath = await join(appData, DB_FILENAME);

        console.log('[Backup] Backup path:', backupPath);
        console.log('[Backup] DB path:', dbPath);

        // Check if backup exists
        const backupExistsCheck = `${BACKUP_DIR}/${filename}`;
        const backupExists = await exists(backupExistsCheck, { baseDir: BaseDirectory.AppData });
        console.log('[Backup] Backup exists:', backupExists);

        if (!backupExists) {
            console.error('[Backup] Backup file does not exist:', filename);
            throw new Error('Fichier de sauvegarde introuvable');
        }

        // Skip pre-restore backup to avoid complications
        // Just do the restore directly
        console.log('[Backup] Copying backup to database...');
        await copyFile(backupPath, dbPath);

        console.log('[Backup] Restore completed successfully!');
        return true;
    } catch (error) {
        console.error('[Backup] Error restoring backup:', error);
        throw error; // Re-throw so the UI can show the error
    }
}

/**
 * Export database to user-chosen location
 */
export async function exportDatabase(): Promise<boolean> {
    if (!isTauriRuntime()) {
        console.info('[Backup] Export unavailable outside Tauri runtime');
        return false;
    }

    try {
        // Check if database exists
        const dbExists = await exists(DB_FILENAME, { baseDir: BaseDirectory.AppData });
        if (!dbExists) {
            console.error('[Backup] No database to export');
            return false;
        }

        // Open save dialog
        const timestamp = new Date().toISOString().split('T')[0];
        const savePath = await save({
            defaultPath: `luma-vet-backup_${timestamp}.db`,
            filters: [{ name: 'SQLite Database', extensions: ['db'] }]
        });

        if (!savePath) {
            console.log('[Backup] Export cancelled by user');
            return false;
        }

        // Copy to chosen location
        const appData = await appDataDir();
        const dbPath = await join(appData, DB_FILENAME);
        await copyFile(dbPath, savePath);

        console.log('[Backup] Exported database to:', savePath);
        return true;
    } catch (error) {
        console.error('[Backup] Error exporting database:', error);
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
            console.log(`[Backup] Version change detected: ${metadata.appVersion} -> ${currentVersion}`);
            await createBackup('auto-upgrade');
            return true;
        }

        // Update stored version if first run
        if (!metadata.appVersion) {
            metadata.appVersion = currentVersion;
            await saveMetadata(metadata);
        }

        return false;
    } catch (error) {
        console.error('[Backup] Error in auto-backup check:', error);
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
        const backupPath = `${BACKUP_DIR}/${filename}`;
        await remove(backupPath, { baseDir: BaseDirectory.AppData });

        // Update metadata
        const metadata = await loadMetadata();
        metadata.backups = metadata.backups.filter(b => b.filename !== filename);
        await saveMetadata(metadata);

        console.log('[Backup] Deleted backup:', filename);
        return true;
    } catch (error) {
        console.error('[Backup] Error deleting backup:', error);
        return false;
    }
}
