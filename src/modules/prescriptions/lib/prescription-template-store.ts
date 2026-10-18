import { getSetting, setSetting } from "@/services/appSettingsService";

import { parseTemplates, type PrescriptionTemplate } from "./prescription-templates";

/** Clé locale (table app_settings, SQLite ou stockage navigateur). */
export const PRESCRIPTION_TEMPLATES_KEY = "prescription_templates_v1";

export async function loadPrescriptionTemplates(): Promise<PrescriptionTemplate[]> {
  return parseTemplates(await getSetting(PRESCRIPTION_TEMPLATES_KEY));
}

export async function savePrescriptionTemplates(
  templates: readonly PrescriptionTemplate[]
): Promise<void> {
  await setSetting(PRESCRIPTION_TEMPLATES_KEY, JSON.stringify(templates));
}
