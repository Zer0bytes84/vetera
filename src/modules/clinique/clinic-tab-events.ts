/** The workspace reports its shown section, so the sidebar can mark it. */
export const CLINIC_TAB_EVENT = "vetera:clinic-tab";
/** Asks a mounted workspace to show a section. */
export const CLINIC_TAB_OPEN_EVENT = "vetera:open-clinic-tab";
/** A section to show once the workspace mounts (read once, then cleared). */
export const CLINIC_TAB_PENDING_KEY = "vetera:pending-clinic-tab";

export function takePendingClinicTab(): string | null {
  try {
    const tab = sessionStorage.getItem(CLINIC_TAB_PENDING_KEY);
    if (tab) sessionStorage.removeItem(CLINIC_TAB_PENDING_KEY);
    return tab;
  } catch {
    return null;
  }
}
