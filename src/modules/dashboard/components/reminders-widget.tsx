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
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <HugeiconsIcon
            icon={NotificationIcon}
            size={16}
            strokeWidth={1.75}
          />
          {t("reminders.widget.title", { defaultValue: "Rappels à venir" })}
        </CardTitle>
        <Badge variant="secondary" className="text-[10px]">
          {upcoming.length}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {upcoming.length === 0 ? (
          <p className="text-xs text-muted-foreground/80">
            {t("reminders.widget.empty", {
              defaultValue:
                "Aucun rappel à venir. Les rendez-vous programmés apparaîtront ici 15 min avant l'heure.",
            })}
          </p>
        ) : (
          upcoming.map((reminder) => {
            const target = new Date(reminder.scheduledFor);
            const patientName =
              patientsById.get(reminder.appointmentId)?.name ?? "Patient local";
            return (
              <div
                className="flex items-center justify-between rounded-md border border-border/50 bg-background/60 px-3 py-2 text-xs"
                key={reminder.id}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <HugeiconsIcon
                    icon={Clock01Icon}
                    size={14}
                    strokeWidth={1.75}
                    className="text-muted-foreground"
                  />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{patientName}</p>
                    <p className="text-[10px] text-muted-foreground/80">
                      {formatRelativeTime(target, now)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    onClick={() => remindersStore.snooze(reminder.id, 10)}
                    size="sm"
                    variant="ghost"
                  >
                    {t("reminders.widget.snooze", {
                      defaultValue: "+10 min",
                    })}
                  </Button>
                  <Button
                    onClick={() => remindersStore.dismiss(reminder.id)}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      size={14}
                      strokeWidth={1.75}
                    />
                  </Button>
                </div>
              </div>
            );
          })
        )}
        <p className="text-[10px] text-muted-foreground/70 pt-1 flex items-center gap-1">
          <HugeiconsIcon icon={Calendar01Icon} size={11} strokeWidth={1.75} />
          {t("reminders.widget.help", {
            defaultValue:
              "Rappels générés automatiquement : 15, 30, 60 et 1440 min avant.",
          })}
        </p>
      </CardContent>
    </Card>
  );
}
