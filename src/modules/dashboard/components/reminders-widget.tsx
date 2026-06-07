"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  NotificationIcon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePatientsRepository,
  useRemindersRepository,
} from "@/data/repositories";

const MAX_ITEMS = 5;

function formatRelativeTime(target: Date, now: Date): string {
  const diffMinutes = Math.round((target.getTime() - now.getTime()) / 60_000);
  if (diffMinutes <= 0) {
    return "Maintenant";
  }
  if (diffMinutes < 60) {
    return `dans ${diffMinutes} min`;
  }
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours < 24) {
    return minutes === 0 ? `dans ${hours} h` : `dans ${hours} h ${minutes}`;
  }
  const days = Math.floor(hours / 24);
  return `dans ${days} j`;
}

interface RemindersWidgetProps {
  now?: Date;
}

export function RemindersWidget({ now = new Date() }: RemindersWidgetProps) {
  const { t } = useTranslation();
  const remindersStore = useRemindersRepository();
  const { data: patients } = usePatientsRepository();

  const patientsById = useMemo(() => {
    const map = new Map<string, { name: string }>();
    for (const patient of patients) {
      map.set(patient.id, { name: patient.name });
    }
    return map;
  }, [patients]);

  const upcoming = useMemo(
    () => remindersStore.upcoming(240).slice(0, MAX_ITEMS),
    // We deliberately depend on the data array length + identity to recompute
    // when reminders change, but we always read `now` for relative formatting.
    [remindersStore, remindersStore.data, now]
  );

  if (remindersStore.loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <HugeiconsIcon
              icon={NotificationIcon}
              size={16}
              strokeWidth={1.75}
            />
            {t("reminders.widget.title", { defaultValue: "Rappels à venir" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton className="h-12 w-full" key={idx} />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full relative overflow-hidden group border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 mix-blend-overlay">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent" />
      </div>

      <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground/90">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <HugeiconsIcon
              icon={NotificationIcon}
              size={16}
              strokeWidth={2}
            />
          </div>
          {t("reminders.widget.title", { defaultValue: "Rappels à venir" })}
        </CardTitle>
        <Badge variant="outline" className="text-[10px] bg-background/50 backdrop-blur-sm border-blue-500/20 text-blue-600 dark:text-blue-400">
          {upcoming.length} actifs
        </Badge>
      </CardHeader>

      <CardContent className="relative z-10 space-y-3">
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 mb-3">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} className="text-zinc-400" />
            </div>
            <p className="text-xs font-medium text-muted-foreground/80 max-w-[200px]">
              {t("reminders.widget.empty", {
                defaultValue: "Aucun rappel à venir.",
              })}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((reminder) => {
              const target = new Date(reminder.scheduledFor);
              const patientName =
                patientsById.get(reminder.appointmentId)?.name ?? "Patient local";
              return (
                <div
                  className="group/item relative flex items-center justify-between rounded-xl border border-transparent bg-white/60 dark:bg-zinc-900/40 p-3 text-xs transition-all duration-300 hover:border-blue-500/20 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 hover:shadow-sm"
                  key={reminder.id}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 transition-colors group-hover/item:bg-blue-100 dark:group-hover/item:bg-blue-900/30 group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400">
                      <HugeiconsIcon
                        icon={Clock01Icon}
                        size={14}
                        strokeWidth={2}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold tracking-tight text-foreground/90 truncate">{patientName}</p>
                      <p className="text-[11px] font-medium text-blue-600/80 dark:text-blue-400/80">
                        {formatRelativeTime(target, now)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity duration-200 group-hover/item:opacity-100">
                    <Button
                      onClick={() => remindersStore.snooze(reminder.id, 10)}
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[10px] hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/40 dark:hover:text-blue-300"
                    >
                      {t("reminders.widget.snooze", {
                        defaultValue: "+10 min",
                      })}
                    </Button>
                    <Button
                      onClick={() => remindersStore.dismiss(reminder.id)}
                      size="icon-sm"
                      variant="ghost"
                      className="h-7 w-7 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-400"
                    >
                      <HugeiconsIcon
                        icon={CheckmarkCircle01Icon}
                        size={14}
                        strokeWidth={2}
                      />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[10px] font-medium text-muted-foreground/60 pt-2 flex items-center justify-center gap-1.5 border-t border-border/40 mt-4">
          <HugeiconsIcon icon={Calendar01Icon} size={12} strokeWidth={1.5} />
          {t("reminders.widget.help", {
            defaultValue: "Rappels générés 15, 30, 60 et 1440 min avant.",
          })}
        </p>
      </CardContent>
    </Card>
  );
}
