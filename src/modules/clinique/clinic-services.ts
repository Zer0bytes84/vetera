import { useSyncExternalStore } from "react";
import { getSetting, setSetting } from "@/services/appSettingsService";

/**
 * What the practice offers. A simple practice only sees what it uses: when
 * hospitalization is switched off in Paramètres > Mon cabinet, its entry leaves
 * the navigation, the Soins page and the command palette. Nothing is deleted:
 * existing stays stay in the database and come back with the switch.
 */
export const HOSPITALIZATION_SETTING_KEY = "clinic.hospitalization_enabled";
const CHANGE_EVENT = "vetera:clinic-services-changed";

export type ClinicTab = "soins" | "hospitalisation";

/** On unless the stored value says "false": practices that never opened the setting keep everything. */
export function parseHospitalizationEnabled(stored: string | null | undefined): boolean {
  return stored !== "false";
}

/** The one masking rule, for any list of clinic entries (sub-pages or direct sidebar entries). */
export function isClinicTabVisible(tab: ClinicTab, hospitalizationEnabled: boolean): boolean {
  return tab !== "hospitalisation" || hospitalizationEnabled;
}

/** A section asked for from outside falls back to Soins when its own is switched off. */
export function resolveClinicTab(tab: string | null | undefined, hospitalizationEnabled: boolean): ClinicTab {
  return tab === "hospitalisation" && hospitalizationEnabled ? "hospitalisation" : "soins";
}

let enabled = true;
let loaded: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

function load() {
  loaded ??= getSetting(HOSPITALIZATION_SETTING_KEY)
    .then((stored) => {
      enabled = parseHospitalizationEnabled(stored);
      emit();
    })
    .catch(() => {
      // Unreadable setting: keep everything visible and retry on the next subscription.
      loaded = null;
    });
  return loaded;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void load();
  const onChange = (event: Event) => {
    enabled = (event as CustomEvent<boolean>).detail;
    emit();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    listeners.delete(listener);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Whether the practice offers hospitalization (true until the stored setting says otherwise). */
export function useHospitalizationEnabled(): boolean {
  return useSyncExternalStore(subscribe, () => enabled, () => true);
}

/** Stores the choice, then tells every mounted reader. Throws when the write fails: the caller reports it. */
export async function saveHospitalizationEnabled(next: boolean): Promise<void> {
  await setSetting(HOSPITALIZATION_SETTING_KEY, next ? "true" : "false");
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));
}
