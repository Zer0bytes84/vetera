import type { AuditLogEntry } from "@/types/db";

interface AuditUser {
  displayName: string | null;
  email: string | null;
  id: string;
}

/**
 * Helper hors-React pour les contextes (AuthContext login/logout).
 * Écriture directe dans `audit_log` sans passer par `useSQLite` (qui
 * nécessite un context React).
 */
async function writeAuditEntry(
  entry: Omit<AuditLogEntry, "id" | "createdAt">
): Promise<void> {
  try {
    const { getDatabase, generateId } = await import(
      "@/services/sqlite/database"
    );
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO audit_log
        (id, action, entity, entity_id, user_id, user_display_name, payload, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        generateId(),
        entry.action,
        entry.entity,
        entry.entityId ?? null,
        entry.userId ?? null,
        entry.userDisplayName ?? null,
        entry.payload ?? null,
        entry.metadata ?? null,
      ]
    );
  } catch (error) {
    console.warn("[audit] writeAuditEntry failed", error);
  }
}

export async function auditLogin(user: AuditUser): Promise<void> {
  await writeAuditEntry({
    action: "login",
    entity: "session",
    entityId: user.id,
    userId: user.id,
    userDisplayName: user.displayName ?? user.email ?? null,
  });
}

export async function auditLogout(user: AuditUser): Promise<void> {
  await writeAuditEntry({
    action: "logout",
    entity: "session",
    entityId: user.id,
    userId: user.id,
    userDisplayName: user.displayName ?? user.email ?? null,
  });
}
