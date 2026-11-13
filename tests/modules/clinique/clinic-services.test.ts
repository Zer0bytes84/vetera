import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const stored = new Map<string, string>();
vi.mock("@/services/appSettingsService", () => ({
  getSetting: vi.fn(async (key: string) => stored.get(key) ?? null),
  setSetting: vi.fn(async (key: string, value: string) => void stored.set(key, value)),
}));

import {
  HOSPITALIZATION_SETTING_KEY,
  isClinicTabVisible,
  parseHospitalizationEnabled,
  resolveClinicTab,
  saveHospitalizationEnabled,
} from "../../../src/modules/clinique/clinic-services";

describe("réglage « Mon cabinet propose l’hospitalisation »", () => {
  beforeEach(() => stored.clear());

  it("est activé par défaut : un cabinet qui n’a jamais ouvert le réglage garde tout", () => {
    expect(parseHospitalizationEnabled(null)).toBe(true);
    expect(parseHospitalizationEnabled(undefined)).toBe(true);
    expect(parseHospitalizationEnabled("")).toBe(true);
    expect(parseHospitalizationEnabled("true")).toBe(true);
    expect(parseHospitalizationEnabled("false")).toBe(false);
  });

  it("ne masque que l’hospitalisation, jamais les soins", () => {
    expect(isClinicTabVisible("soins", true)).toBe(true);
    expect(isClinicTabVisible("soins", false)).toBe(true);
    expect(isClinicTabVisible("hospitalisation", true)).toBe(true);
    expect(isClinicTabVisible("hospitalisation", false)).toBe(false);
  });

  it("ramène vers Soins une section demandée de l’extérieur quand l’hospitalisation est décochée", () => {
    expect(resolveClinicTab("hospitalisation", true)).toBe("hospitalisation");
    expect(resolveClinicTab("hospitalisation", false)).toBe("soins");
    expect(resolveClinicTab("soins", false)).toBe("soins");
    expect(resolveClinicTab(null, true)).toBe("soins");
    expect(resolveClinicTab("inconnu", true)).toBe("soins");
  });

  it("enregistre le choix et prévient les lecteurs montés", async () => {
    const heard: boolean[] = [];
    const target = new EventTarget();
    vi.stubGlobal("window", target);
    vi.stubGlobal("CustomEvent", class<T> extends Event { detail: T; constructor(type: string, init: { detail: T }) { super(type); this.detail = init.detail; } });
    target.addEventListener("vetera:clinic-services-changed", (event) => heard.push((event as CustomEvent<boolean>).detail));
    await saveHospitalizationEnabled(false);
    expect(stored.get(HOSPITALIZATION_SETTING_KEY)).toBe("false");
    await saveHospitalizationEnabled(true);
    expect(stored.get(HOSPITALIZATION_SETTING_KEY)).toBe("true");
    expect(heard).toEqual([false, true]);
    vi.unstubAllGlobals();
  });

  it("applique la même règle à la navigation, à la page Soins et à la palette", () => {
    const sidebar = readFileSync("src/components/app-sidebar.tsx", "utf8");
    expect(sidebar).toContain("isClinicTabVisible(entry.tab, hospitalizationEnabled)");
    const workspace = readFileSync("src/modules/clinique/pages/clinical-workspace.tsx", "utf8");
    expect(workspace).toContain("resolveClinicTab(tab, hospitalizationEnabled)");
    expect(workspace).toContain("const sectionTabs = hospitalizationEnabled ? tabsList : null;");
    const palette = readFileSync("src/components/CommandPalette.tsx", "utf8");
    expect(palette).toMatch(/\{hospitalizationEnabled && \(<CommandItem[\s\S]{0,400}newHospitalization/);
  });
});
