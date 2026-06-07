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
    <Card className="@container/card h-full relative overflow-hidden group border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 mix-blend-overlay">
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 via-transparent to-transparent" />
      </div>

      <CardHeader className="relative z-10 pb-4 border-b border-border/40">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <HugeiconsIcon
                className="size-4"
                icon={Time01Icon}
                strokeWidth={2}
              />
            </div>
            <CardTitle className="text-sm font-semibold tracking-tight">
              {t("auditLog.title", { defaultValue: "Journal d'audit" })}
            </CardTitle>
          </div>
          <Badge className="text-[10px] bg-background/50 backdrop-blur-sm border-purple-500/20 text-purple-600 dark:text-purple-400" variant="outline">
            {data.length} logs
          </Badge>
        </div>
        <CardDescription className="text-xs pt-1">
          {t("auditLog.subtitle", {
            defaultValue: "Activité récente sur les dossiers et la sécurité.",
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="relative z-10 pt-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                className="flex items-center gap-3"
                key={`audit-skel-${idx}`}
              >
                <Skeleton className="size-8 rounded-full bg-zinc-200/50 dark:bg-zinc-800/50" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-3/5 bg-zinc-200/50 dark:bg-zinc-800/50" />
                  <Skeleton className="h-2 w-1/3 bg-zinc-200/50 dark:bg-zinc-800/50" />
                </div>
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 mb-3">
              <HugeiconsIcon icon={Time01Icon} size={20} className="text-zinc-400" />
            </div>
            <p className="text-xs font-medium text-muted-foreground/80 max-w-[200px]">
              {t("auditLog.empty", {
                defaultValue: "Aucune action enregistrée pour le moment.",
              })}
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
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
    <li className="group/item relative flex items-start gap-3 rounded-xl px-3 py-2.5 transition-all duration-300 hover:bg-white/60 dark:hover:bg-zinc-900/40 hover:shadow-sm border border-transparent hover:border-zinc-200/50 dark:hover:border-zinc-800/50">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-500 transition-colors group-hover/item:bg-purple-100 dark:group-hover/item:bg-purple-900/30 group-hover/item:text-purple-600 dark:group-hover/item:text-purple-400">
        <HugeiconsIcon className="size-4" icon={Icon} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold tracking-tight">
          <span className="text-foreground/90">{entityLabel}</span>
          {entityIdLabel ? (
            <span className="text-muted-foreground/60"> {entityIdLabel}</span>
          ) : null}
          <span className="text-purple-600/80 dark:text-purple-400/80"> · {actionLabel}</span>
        </p>
        <p className="truncate text-[11px] font-medium text-muted-foreground/70 mt-0.5">
          {userLabel} · {formatRelative(entry.createdAt, now, t)}
        </p>
      </div>
    </li>
  );
}
