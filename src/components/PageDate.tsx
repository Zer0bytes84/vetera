import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

/** Shared local date above workspace titles, refreshed when the day changes. */
export function PageDate() {
  const { i18n } = useTranslation();
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const midnight = new Date(today);
    midnight.setHours(24, 0, 0, 0);
    const timer = window.setTimeout(() => setToday(new Date()), Math.max(1000, midnight.getTime() - Date.now()));
    const refresh = () => {
      if (document.visibilityState === "visible") setToday(new Date());
    };
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [today]);

  const label = new Intl.DateTimeFormat(i18n.language || "fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(today);
  const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <time data-slot="page-date" dateTime={localDate} className="block text-xs capitalize leading-4 text-muted-foreground">
      {label}
    </time>
  );
}
