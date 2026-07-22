import {
  Calendar01Icon,
  CalendarCheckIn01Icon,
  Cancel01Icon,
  InjectionIcon,
  Notification01Icon,
  PackageIcon,
  StethoscopeIcon,
  Task01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { type FocusEntityKind, useFocus } from "@/contexts/focus-provider";
import { cn } from "@/lib/utils";
import {
  NOTIFICATION_SOURCE_ACCENT,
  type NotificationItem,
  type NotificationSeverity,
  type NotificationSource,
  type NotificationTarget,
} from "@/services/notifications/types";
import { useNotificationCenter } from "@/services/notifications/useNotificationCenter";
import type { View } from "@/types";

const NOTIFICATION_FILTERS = ["all", "unread", "critical"] as const;
type NotificationFilter = (typeof NOTIFICATION_FILTERS)[number];

const SOURCE_ICON: Record<NotificationSource, IconSvgElement> = {
  appointment: Calendar01Icon,
  reminder: CalendarCheckIn01Icon,
  postop: StethoscopeIcon,
  task: Task01Icon,
  stock: PackageIcon,
  soap: Task01Icon,
  automation: InjectionIcon,
  audit: Notification01Icon,
};

const SEVERITY_RING_CLASS: Record<NotificationSeverity, string> = {
  critical: "ring-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  warn: "ring-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  info: "ring-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300",
};

const SEVERITY_DOT_CLASS: Record<NotificationSeverity, string> = {
  critical: "bg-rose-500",
  warn: "bg-amber-500",
  info: "bg-sky-500",
};

function targetEntityKind(target: NotificationTarget): FocusEntityKind | null {
  if (target.view === "patient_detail" || target.view === "clinique") {
    return "patient";
  }
  if (target.view === "agenda") {
    return "appointment";
  }
  if (target.view === "taches") {
    return "task";
  }
  if (target.view === "stock") {
    return "product";
  }
  return null;
}

function targetEntityId(target: NotificationTarget): string | null {
  if (target.view === "patient_detail") {
    return target.patientId;
  }
  if (target.view === "agenda") {
    return target.appointmentId ?? null;
  }
  if (target.view === "taches") {
    return target.taskId ?? null;
  }
  if (target.view === "stock") {
    return target.productId ?? null;
  }
  if (target.view === "clinique") {
    return target.patientId ?? null;
  }
  return null;
}

interface NotificationItemRowProps {
  item: NotificationItem;
  onActivate: (item: NotificationItem) => void;
  onDismiss: (item: NotificationItem) => void;
  onToggleRead: (item: NotificationItem) => void;
}

function NotificationItemRow({
  item,
  onActivate,
  onDismiss,
  onToggleRead,
}: NotificationItemRowProps) {
  const Icon = SOURCE_ICON[item.source];
  const accent = NOTIFICATION_SOURCE_ACCENT[item.source];

  return (
    <li>
      <div
        className={cn(
          "group/row relative flex items-stretch overflow-hidden rounded-xl border transition-all duration-300",
          item.isRead
            ? "border-transparent bg-transparent hover:bg-muted/50"
            : "border-primary/10 bg-primary/[0.03] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] hover:border-primary/20 hover:bg-primary/[0.06]"
        )}
      >
        <button
          aria-label={item.clickHint}
          className="flex min-w-0 flex-1 cursor-pointer items-start gap-3.5 px-3.5 py-3 text-left transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset active:scale-[0.98]"
          onClick={() => onActivate(item)}
          type="button"
        >
          <div className="relative mt-0.5 flex shrink-0 items-center justify-center">
            <span
              aria-hidden="true"
              className={cn(
                "flex size-8 items-center justify-center rounded-full shadow-sm ring-1",
                SEVERITY_RING_CLASS[item.severity]
              )}
            >
              <HugeiconsIcon className="size-4" icon={Icon} strokeWidth={1.5} />
            </span>
            {item.isRead ? null : (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background",
                  SEVERITY_DOT_CLASS[item.severity]
                )}
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "truncate font-semibold text-[13px] tracking-tight",
                  item.isRead ? "text-foreground/70" : "text-foreground"
                )}
              >
                {item.title}
              </span>
              <span className="ml-auto inline-flex shrink-0 items-center rounded-full bg-foreground/5 px-2 py-0.5 font-medium text-[9px] text-foreground/60 uppercase tracking-widest">
                {accent.label}
              </span>
            </div>

            <span
              className={cn(
                "mt-1 line-clamp-2 block text-[12px] leading-relaxed",
                item.isRead
                  ? "text-muted-foreground/70"
                  : "text-muted-foreground/90"
              )}
            >
              {item.description}
            </span>

            <div
              className={cn(
                "mt-2.5 flex items-center gap-1.5 font-semibold text-[10px] uppercase tracking-wider transition-all duration-300",
                item.isRead
                  ? "text-muted-foreground/40"
                  : "text-primary/70 group-hover/row:text-primary"
              )}
            >
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 transition-colors",
                  !item.isRead && "bg-primary/10 group-hover/row:bg-primary/15"
                )}
              >
                {item.clickHint}
              </span>
              <span
                aria-hidden="true"
                className="transition-transform group-hover/row:translate-x-1"
              >
                →
              </span>
            </div>
          </div>
        </button>

        {/* Floating actions container */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 transition-opacity duration-300 group-hover/row:opacity-100">
          <div className="flex items-center gap-0.5 rounded-lg border border-foreground/5 bg-background/80 p-0.5 shadow-sm backdrop-blur-md">
            <button
              aria-label={item.isRead ? "Marquer non lu" : "Marquer lu"}
              className="flex size-7 cursor-pointer items-center justify-center rounded-md text-foreground/50 transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none"
              onClick={(e) => {
                e.stopPropagation();
                onToggleRead(item);
              }}
              type="button"
            >
              <HugeiconsIcon
                className="size-3.5"
                icon={Tick01Icon}
                strokeWidth={item.isRead ? 1.5 : 2}
              />
            </button>
            <button
              aria-label="Ignorer"
              className="flex size-7 cursor-pointer items-center justify-center rounded-md text-foreground/50 transition-colors hover:bg-rose-500/15 hover:text-rose-600 focus-visible:outline-none"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(item);
              }}
              type="button"
            >
              <HugeiconsIcon
                className="size-3.5"
                icon={Cancel01Icon}
                strokeWidth={2}
              />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

export interface NotificationCenterProps {
  onNavigate: (view: View) => void;
  onNavigateToPatient?: (patientId: string) => void;
}

export function NotificationCenter({
  onNavigate,
  onNavigateToPatient,
}: NotificationCenterProps) {
  const { t } = useTranslation();
  const { requestFocus } = useFocus();
  const {
    items,
    unreadCount,
    criticalCount,
    isLoading,
    markRead,
    markUnread,
    dismiss,
    markAllRead,
  } = useNotificationCenter();

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const filteredItems = useMemo(() => {
    if (filter === "unread") {
      return items.filter((i) => !i.isRead);
    }
    if (filter === "critical") {
      return items.filter((i) => i.severity === "critical");
    }
    return items;
  }, [filter, items]);

  // Top 3 most important = critical first, then unread warn
  const topItems = useMemo(
    () => items.filter((i) => !i.isRead).slice(0, 3),
    [items]
  );

  const handleActivate = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await markRead(item.id);
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }
    }
    const focusKind = targetEntityKind(item.target);
    const focusId = targetEntityId(item.target);
    if (focusKind && focusId) {
      requestFocus(focusKind, focusId);
    }
    if (item.target.view === "patient_detail") {
      onNavigateToPatient?.(item.target.patientId);
    } else {
      onNavigate(item.target.view);
    }
    setOpen(false);
  };

  const handleDismiss = (item: NotificationItem) => {
    void dismiss(item.id);
  };

  const handleToggleRead = (item: NotificationItem) => {
    if (item.isRead) {
      void markUnread(item.id);
    } else {
      void markRead(item.id);
    }
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            aria-label={t("notifications.open", {
              defaultValue: "Notifications",
            })}
            className="relative size-9 rounded-full"
            size="icon"
            variant="outline"
          />
        }
      >
        <HugeiconsIcon
          className="size-5"
          icon={Notification01Icon}
          strokeWidth={1.5}
        />
        {unreadCount > 0 ? (
          <span
            aria-label={`${unreadCount} non lues`}
            className={cn(
              "absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 font-semibold text-[10px] text-white ring-2 ring-background",
              criticalCount > 0 ? "bg-rose-500" : "bg-amber-500"
            )}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[400px] gap-0 p-0"
        sideOffset={8}
      >
        <div className="flex items-center justify-between gap-2 border-foreground/10 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-sm">
              {t("notifications.title", { defaultValue: "Notifications" })}
            </p>
            <p className="text-muted-foreground text-xs">
              {criticalCount > 0
                ? `${criticalCount} critique${criticalCount > 1 ? "s" : ""} à traiter · ${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
                : unreadCount > 0
                  ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
                  : "Tout est sous contrôle"}
            </p>
          </div>
          {unreadCount > 0 ? (
            <Button
              className="h-7 shrink-0 rounded-md px-2 text-[11px]"
              onClick={() => markAllRead()}
              size="sm"
              variant="ghost"
            >
              <HugeiconsIcon
                className="size-3.5"
                icon={Tick01Icon}
                strokeWidth={2}
              />
              Tout lire
            </Button>
          ) : null}
        </div>

        {topItems.length > 0 ? (
          <div className="border-foreground/5 border-b bg-gradient-to-b from-muted/30 to-background/50 px-4 py-3">
            <p className="font-semibold text-[10px] text-primary uppercase tracking-wider">
              Priorité absolue
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {topItems.map((item) => {
                const Icon = SOURCE_ICON[item.source];
                const accent = NOTIFICATION_SOURCE_ACCENT[item.source];
                return (
                  <li key={item.id}>
                    <button
                      className="group/quick relative flex w-full cursor-pointer items-start gap-3 rounded-xl bg-background px-3 py-2.5 text-left shadow-sm ring-1 ring-foreground/5 transition-all duration-200 hover:bg-muted/30 hover:ring-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]"
                      onClick={() => handleActivate(item)}
                      type="button"
                    >
                      <div className="relative mt-0.5 flex shrink-0 items-center justify-center">
                        <span
                          className={cn(
                            "flex size-7 items-center justify-center rounded-full shadow-sm ring-1",
                            SEVERITY_RING_CLASS[item.severity]
                          )}
                        >
                          <HugeiconsIcon
                            className="size-3.5"
                            icon={Icon}
                            strokeWidth={1.5}
                          />
                        </span>
                        {item.isRead ? null : (
                          <span
                            aria-hidden="true"
                            className={cn(
                              "absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background",
                              SEVERITY_DOT_CLASS[item.severity]
                            )}
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-semibold text-[12px] text-foreground tracking-tight">
                            {item.title}
                          </span>
                          <span className="ml-auto shrink-0 rounded-full bg-foreground/5 px-1.5 py-0.5 font-medium text-[8.5px] text-foreground/60 uppercase tracking-widest">
                            {accent.label}
                          </span>
                        </div>
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/90">
                          {item.description}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div className="flex items-center gap-1 border-foreground/10 border-b bg-muted/20 px-3 py-1.5">
          {NOTIFICATION_FILTERS.map((option) => {
            const active = filter === option;
            const label =
              option === "all"
                ? "Toutes"
                : option === "unread"
                  ? `Non lues${unreadCount > 0 ? ` (${unreadCount})` : ""}`
                  : `Critiques${criticalCount > 0 ? ` (${criticalCount})` : ""}`;
            return (
              <button
                aria-pressed={active}
                className={cn(
                  "cursor-pointer rounded-full px-2.5 py-1 font-medium text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                )}
                key={option}
                onClick={() => setFilter(option)}
                type="button"
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2">
          {isLoading ? (
            <div className="px-3 py-8 text-center text-muted-foreground text-xs">
              Chargement…
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <HugeiconsIcon
                className="mx-auto mb-2 size-7 text-muted-foreground/50"
                icon={Notification01Icon}
                strokeWidth={1.5}
              />
              <p className="font-medium text-foreground text-sm">
                {filter === "unread"
                  ? "Rien de non lu"
                  : filter === "critical"
                    ? "Aucune critique"
                    : "Aucune notification"}
              </p>
              <p className="mt-1 text-muted-foreground text-xs">
                {filter === "all"
                  ? "Tout est calme pour le moment."
                  : "Changez de filtre pour voir les autres."}
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {filteredItems.map((item) => (
                <NotificationItemRow
                  item={item}
                  key={item.id}
                  onActivate={handleActivate}
                  onDismiss={handleDismiss}
                  onToggleRead={handleToggleRead}
                />
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
