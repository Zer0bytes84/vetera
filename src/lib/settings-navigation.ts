/**
 * Which section of Paramètres opens, and how another part of the app asks for one (the account menu's « Mon cabinet »).
 * The request waits in the session until Paramètres mounts, and is also announced for the case where it is already open.
 */
export const SETTINGS_TABS = [
  "profil",
  "securite",
  "mon-cabinet",
  "cabinet",
  "salles",
  "apparence",
  "ia",
  "rappels-medicaux",
  "modeles-documents",
  "sauvegarde",
  "reseau",
  "apropos",
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

export const SETTINGS_SECTION_KEY = "baitari:pending-settings-section";
export const SETTINGS_SECTION_EVENT = "baitari:open-settings-section";

export function isSettingsTab(value: unknown): value is SettingsTab {
  return typeof value === "string" && (SETTINGS_TABS as readonly string[]).includes(value);
}

/** Ask Paramètres to open `section`; the caller still navigates to the page. */
export function requestSettingsSection(section: SettingsTab): void {
  try {
    window.sessionStorage.setItem(SETTINGS_SECTION_KEY, section);
  } catch {
    // Private mode without storage: the event below still reaches an open page.
  }
  window.dispatchEvent(new CustomEvent(SETTINGS_SECTION_EVENT, { detail: section }));
}
