"use client";

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
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import { useNowTick } from "@/hooks/useNowTick";
import type { AuditAction, AuditEntity, AuditLogEntry } from "@/types/db";

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
    return t("common.minutesAgo", {
      count: m,
      defaultValue: `il y a ${m} min`,
    });
  }
  if (diffSeconds < 60 * 60 * 24) {
    const h = Math.round(diffSeconds / 3600);
    return t("common.hoursAgo", { count: h, defaultValue: `il y a ${h} h` });
  }
  const d = Math.round(diffSeconds / 86_400);
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
    <Card className="@container/card group relative h-full overflow-hidden border-zinc-200/50 bg-white/40 shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md dark:border-zinc-800/50 dark:bg-zinc-950/40">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-0 mix-blend-overlay transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 via-transparent to-transparent" />
      </div>

      <CardHeader className="relative z-10 border-border/40 border-b pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <HugeiconsIcon
                className="size-4"
                icon={Time01Icon}
                strokeWidth={2}
              />
            </div>
            <CardTitle className="font-semibold text-sm tracking-tight">
              {t("auditLog.title", { defaultValue: "Journal d'audit" })}
            </CardTitle>
          </div>
          <Badge
            className="border-purple-500/20 bg-background/50 text-[10px] text-purple-600 backdrop-blur-sm dark:text-purple-400"
            variant="outline"
          >
            {data.length} logs
          </Badge>
        </div>
        <CardDescription className="pt-1 text-xs">
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
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900">
              <HugeiconsIcon
                className="text-zinc-400"
                icon={Time01Icon}
                size={20}
              />
            </div>
            <p className="max-w-[200px] font-medium text-muted-foreground/80 text-xs">
              {t("auditLog.empty", {
                defaultValue: "Aucune action enregistrée pour le moment.",
              })}
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {recent.map((entry) => (
              <ActivityRow entry={entry} key={entry.id} now={now} t={t} />
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
  const entityIdLabel = entry.entityId ? `#${entry.entityId.slice(-6)}` : null;

  return (
    <li className="group/item relative flex items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-all duration-300 hover:border-zinc-200/50 hover:bg-white/60 hover:shadow-sm dark:hover:border-zinc-800/50 dark:hover:bg-zinc-900/40">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-100/80 text-zinc-500 transition-colors group-hover/item:bg-purple-100 group-hover/item:text-purple-600 dark:bg-zinc-800/80 dark:group-hover/item:bg-purple-900/30 dark:group-hover/item:text-purple-400">
        <HugeiconsIcon className="size-4" icon={Icon} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-xs tracking-tight">
          <span className="text-foreground/90">{entityLabel}</span>
          {entityIdLabel ? (
            <span className="text-muted-foreground/60"> {entityIdLabel}</span>
          ) : null}
          <span className="text-purple-600/80 dark:text-purple-400/80">
            {" "}
            · {actionLabel}
          </span>
        </p>
        <p className="mt-0.5 truncate font-medium text-[11px] text-muted-foreground/70">
          {userLabel} · {formatRelative(entry.createdAt, now, t)}
        </p>
      </div>
    </li>
  );
}
