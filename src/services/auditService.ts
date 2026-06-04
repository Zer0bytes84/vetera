import { useCallback } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useAuditLogRepository } from "@/data/repositories";
import type { AuditLogEntry } from "@/types/db";

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
