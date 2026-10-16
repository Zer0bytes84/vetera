import { afterEach, expect, it, vi } from "vitest";
import { normalizeVisualStyle, PREMIUM_SHORTCUTS } from "../src/lib/visual-style";
import { applyTheme, DEFAULT_THEME, getThemeConfig, saveThemeConfig } from "../src/lib/theme-store";
afterEach(() => vi.unstubAllGlobals());
function environment() {
  const values = new Map<string, string>();
  const storage = new Map<string, string>();
  vi.stubGlobal("document", { documentElement: { dataset: {}, style: { setProperty: (key: string, value: string) => values.set(key, value) } } });
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
  const dispatchEvent = vi.fn();
  vi.stubGlobal("window", { dispatchEvent });
  return { values, storage, dispatchEvent };
}
it("utilise Premium par défaut sans écraser un choix Classique explicite", () => {
  environment();
  for (const value of [undefined, null, "", "unknown"]) expect(normalizeVisualStyle(value)).toBe("premium");
  expect(getThemeConfig().visualStyle).toBe("premium");
  expect(normalizeVisualStyle("premium")).toBe("premium");
  expect(normalizeVisualStyle("classic")).toBe("classic");
});
it("persiste le choix et notifie sans modifier les autres préférences", () => {
  const { dispatchEvent } = environment();
  const config = { ...DEFAULT_THEME, visualStyle: "premium" as const, headerPattern: "tide" as const };
  saveThemeConfig(config);
  expect(getThemeConfig().visualStyle).toBe("premium");
  expect(dispatchEvent.mock.calls[0][0].type).toBe("baitari-theme-config-changed");
  saveThemeConfig({ ...config, visualStyle: "classic" });
  expect(getThemeConfig().visualStyle).toBe("classic");
});
it("revient exactement aux variables Classique après Premium en clair et sombre", () => {
  const { values } = environment();
  for (const dark of [false, true]) {
    const classic = { ...DEFAULT_THEME, visualStyle: "classic" as const };
    applyTheme(classic, dark);
    const before = new Map(values);
    applyTheme({ ...DEFAULT_THEME, visualStyle: "premium" }, dark);
    expect(document.documentElement.dataset.visualStyle).toBe("premium");
    expect(values.get("--primary")).not.toBe(before.get("--primary"));
    applyTheme(classic, dark);
    expect(document.documentElement.dataset.visualStyle).toBe("classic");
    expect(values).toEqual(before);
  }
});
it("limite les presets aux quatre parcours existants", () => {
  expect(PREMIUM_SHORTCUTS.map(({ id }) => id)).toEqual(["appointment", "consultation", "patient", "care"]);
});
it("conserve les actions noires en clair et bleu-violet en sombre en Premium", () => {
  const { values } = environment();
  for (const accent of ["blue", "violet", "noir"] as const) {
    for (const dark of [false, true]) {
      applyTheme({ ...DEFAULT_THEME, accent, visualStyle: "premium" }, dark);
      expect(values.get("--primary")).toBe(dark ? "#3b1fe5" : "#191919");
      expect(values.get("--btn-primary-bg")).toBe(dark ? "#3b1fe5" : "#191919");
      expect(values.get("--primary-foreground")).toBe("#ffffff");
      expect(values.get("--btn-primary-hover")).toBe(dark ? "#4b33f0" : "#000000");
    }
  }
});

it("migre une ancienne préférence Classique vers Premium une seule fois", () => {
  const { storage } = environment();
  storage.set("theme-config", JSON.stringify({ ...DEFAULT_THEME, visualStyle: "classic", density: "compact" }));
  for (const key of ["baitari-crm-geist-trial-v1", "baitari_original_header_restored_v2", "baitari-neutral-controls-v1", "baitari-blue-system-polish-v1"]) storage.set(key, "true");
  expect(getThemeConfig()).toMatchObject({ visualStyle: "premium", density: "compact" });
  expect(JSON.parse(storage.get("theme-config")!).visualStyle).toBe("premium");
  saveThemeConfig({ ...getThemeConfig(), visualStyle: "classic" });
  expect(getThemeConfig().visualStyle).toBe("classic");
});
it("respecte aussi un choix Classique explicite enregistré avant la première lecture", () => {
  environment();
  saveThemeConfig({ ...DEFAULT_THEME, visualStyle: "classic" });
  expect(getThemeConfig().visualStyle).toBe("classic");
});
