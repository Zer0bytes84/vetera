import { useCallback } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useAuditLogRepository } from "@/data/repositories";
import type { AuditLogEntry } from "@/types/db";

interface AuditUser {
  id: string;
  displayName: string | null;
  email: string | null;
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

/**
 * Hook public pour tracer des actions sensibles depuis n'importe quel
 * composant sans avoir à injecter l'utilisateur courant à la main.
 *
 *   const audit = useAudit();
 *   await audit.log({ action: "create", entity: "patient", entityId });
 */
export function useAudit() {
  const repo = useAuditLogRepository();
  const { currentUser } = useAuth();

  const log = useCallback(
    async (entry: {
      action: AuditLogEntry["action"];
      entity: AuditLogEntry["entity"];
      entityId?: string | null;
      payload?: Record<string, unknown> | null;
      metadata?: Record<string, unknown> | null;
    }) => {
      try {
        await repo.log({
          ...entry,
          userId: currentUser?.id ?? null,
          userDisplayName: currentUser?.displayName ?? currentUser?.email ?? null,
        });
      } catch (error) {
        // L'audit ne doit jamais casser l'action métier : on log en console
        // seulement pour aider au debug sans bloquer le flow utilisateur.
        console.warn("[audit] log failed", error);
      }
    },
    [repo, currentUser?.id, currentUser?.displayName, currentUser?.email]
  );

  return {
    log,
    recent: repo.recent,
    forEntity: repo.forEntity,
  };
}
