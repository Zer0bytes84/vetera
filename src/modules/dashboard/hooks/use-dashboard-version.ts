import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { getSetting, setSetting } from "@/services/appSettingsService";
export type DashboardVersion = "clinical" | "classic";
const KEY = "dashboard.version";
const listeners = new Set<() => void>();
let revision = 0;
const read = (): DashboardVersion =>
  localStorage.getItem(KEY) === "clinical" ? "clinical" : "classic";
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
function publish(version: DashboardVersion) {
  localStorage.setItem(KEY, version);
  listeners.forEach((listener) => listener());
}
export function useDashboardVersion() {
  const version = useSyncExternalStore(
    subscribe,
    read,
    () => "classic" as const
  );
  useEffect(() => {
    let active = true;
    const initialRevision = revision;
    void getSetting(KEY)
      .then((value) => {
        if (
          active &&
          initialRevision === revision &&
          (value === "clinical" || value === "classic")
        )
          publish(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  const setVersion = async (next: DashboardVersion) => {
    const previous = read();
    const request = ++revision;
    publish(next);
    try {
      await setSetting(KEY, next);
    } catch {
      if (request === revision) publish(previous);
      toast.error("Le choix du tableau de bord n’a pas été enregistré.", {
        action: {
          label: "Réessayer",
          onClick: () => {
            void setVersion(next);
          },
        },
      });
    }
  };
  return { version, setVersion };
}
