"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon,
  Delete02Icon,
  Download01Icon,
  Login02Icon,
  Logout02Icon,
  PencilEdit01Icon,
  PlusSignIcon,
  Share08Icon,
  Shield02Icon,
  Time01Icon,
  UndoIcon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditLogRepository } from "@/data/repositories";
import type { AuditAction, AuditEntity, AuditLogEntry } from "@/types/db";
import { useNowTick } from "@/hooks/useNowTick";

const MAX_ITEMS = 6;

const ICON_BY_ACTION: Record<AuditAction, typeof CheckmarkCircle01Icon> = {
  create: PlusSignIcon,
  update: PencilEdit01Icon,
  delete: Delete02Icon,
  restore: UndoIcon,
  login: Login02Icon,
  logout: Logout02Icon,
  export: Share08Icon,
  import: Download01Icon,
  backup: Shield02Icon,
  restore_backup: UndoIcon,
};

function formatRelative(
  iso: string,
  now: Date,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  const date = new Date(iso);
  const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
  if (diffSeconds < 45) {
    return t("common.justNow", { defaultValue: "à l'instant" });
  }
  if (diffSeconds < 60 * 60) {
    const m = Math.round(diffSeconds / 60);
    return t("common.minutesAgo", { count: m, defaultValue: `il y a ${m} min` });
  }
  if (diffSeconds < 60 * 60 * 24) {
    const h = Math.round(diffSeconds / 3600);
    return t("common.hoursAgo", { count: h, defaultValue: `il y a ${h} h` });
  }
  const d = Math.round(diffSeconds / 86400);
  return t("common.daysAgo", { count: d, defaultValue: `il y a ${d} j` });
}

export function ActivityWidget() {
  const { t } = useTranslation();
  const { data, loading } = useAuditLogRepository();
  const now = useNowTick(60_000);

  const recent = useMemo(
    () =>
      data
        .slice()
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, MAX_ITEMS),
    [data]
  );

  const isEmpty = !loading && recent.length === 0;

  return (
    <Card className="@container/card h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              className="size-4 text-muted-foreground"
              icon={Time01Icon}
            />
            <CardTitle className="text-sm font-medium">
              {t("auditLog.title", { defaultValue: "Journal d'audit" })}
            </CardTitle>
          </div>
          <Badge className="text-[10px]" variant="secondary">
            {data.length}
          </Badge>
        </div>
        <CardDescription>
          {t("auditLog.subtitle", {
            defaultValue: "Activité récente sur les dossiers et la sécurité.",
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                className="flex items-center gap-3"
                key={`audit-skel-${idx}`}
              >
                <Skeleton className="size-7 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-3/5" />
                  <Skeleton className="h-2 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <p className="text-xs text-muted-foreground">
            {t("auditLog.empty", {
              defaultValue: "Aucune action enregistrée pour le moment.",
            })}
          </p>
        ) : (
          <ul className="space-y-2">
            {recent.map((entry) => (
              <ActivityRow
                entry={entry}
                key={entry.id}
                now={now}
                t={t}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

interface ActivityRowProps {
  entry: AuditLogEntry;
  now: Date;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function ActivityRow({ entry, now, t }: ActivityRowProps) {
  const Icon = ICON_BY_ACTION[entry.action] ?? CheckmarkCircle01Icon;
  const actionLabel = t(`auditLog.actions.${entry.action}`, {
    defaultValue: entry.action,
  });
  const entityLabel = t(`auditLog.entities.${entry.entity as AuditEntity}`, {
    defaultValue: entry.entity,
  });
  const userLabel = entry.userDisplayName
    ? t("auditLog.by", {
        name: entry.userDisplayName,
        defaultValue: `par ${entry.userDisplayName}`,
      })
    : t("auditLog.unknownUser", { defaultValue: "Utilisateur inconnu" });
  const entityIdLabel = entry.entityId
    ? `#${entry.entityId.slice(-6)}`
    : null;

  return (
    <li className="flex items-start gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <HugeiconsIcon className="size-3.5" icon={Icon} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">
          <span className="text-foreground">{entityLabel}</span>
          {entityIdLabel ? (
            <span className="text-muted-foreground"> {entityIdLabel}</span>
          ) : null}
          <span className="text-muted-foreground"> · {actionLabel}</span>
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {userLabel} · {formatRelative(entry.createdAt, now, t)}
        </p>
      </div>
    </li>
  );
}
