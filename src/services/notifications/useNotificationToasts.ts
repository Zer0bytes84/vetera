import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type {
  NotificationItem,
  NotificationSeverity,
} from "@/services/notifications/types";
import { useNotificationCenter } from "@/services/notifications/useNotificationCenter";
import type { View } from "@/types";

const TOAST_DEDUPE_WINDOW_MS = 90_000;
const POLL_INTERVAL_MS = 5000;

const SEVERITY_DESCRIPTION_CLASS: Record<NotificationSeverity, string> = {
  critical: "text-rose-700 dark:text-rose-300/90",
  warn: "text-amber-700 dark:text-amber-300/90",
  info: "text-sky-700 dark:text-sky-300/90",
};

function toastNotification(
  item: NotificationItem,
  onNavigate: (view: View) => void,
  onNavigateToPatient: ((patientId: string) => void) | undefined,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  const actionLabel = t("notifications.toast.open", {
    defaultValue: "Ouvrir",
  });
  const description = item.description ?? item.hint ?? "";

  const handleAction = () => {
    if (item.target.view === "patient_detail") {
      onNavigateToPatient?.(item.target.patientId);
      return;
    }
    onNavigate(item.target.view);
  };

  const options: Parameters<typeof toast>[1] = {
    description,
    descriptionClassName: SEVERITY_DESCRIPTION_CLASS[item.severity],
    duration: item.severity === "critical" ? 8000 : 5000,
    action: {
      label: actionLabel,
      onClick: handleAction,
    },
  };

  if (item.severity === "critical") {
    toast.error(item.title, options);
  } else if (item.severity === "warn") {
    toast.warning(item.title, options);
  } else {
    toast.message(item.title, options);
  }
}

export function useNotificationToasts(
  onNavigate: (view: View) => void,
  onNavigateToPatient?: (patientId: string) => void
) {
  const { t } = useTranslation();
  const { items } = useNotificationCenter();
  const lastToastedAt = useRef<Map<string, number>>(new Map());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      // Don't toast notifications that existed at mount; only new ones that
      // appear after the user is in the app.
      const now = Date.now();
      for (const item of items) {
        lastToastedAt.current.set(item.id, now);
      }
      return;
    }

    const now = Date.now();
    for (const item of items) {
      if (item.isRead) {
        continue;
      }
      const last = lastToastedAt.current.get(item.id) ?? 0;
      if (now - last < TOAST_DEDUPE_WINDOW_MS) {
        continue;
      }
      lastToastedAt.current.set(item.id, now);
      toastNotification(item, onNavigate, onNavigateToPatient, t);
    }
  }, [items, onNavigate, onNavigateToPatient, t]);

  // Light periodic GC for the dedupe map so it doesn't grow unbounded.
  useEffect(() => {
    const handle = window.setInterval(() => {
      const now = Date.now();
      for (const [key, ts] of lastToastedAt.current) {
        if (now - ts > TOAST_DEDUPE_WINDOW_MS * 4) {
          lastToastedAt.current.delete(key);
        }
      }
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(handle);
  }, []);
}
