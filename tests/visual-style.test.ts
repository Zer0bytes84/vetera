import { afterEach, expect, it, vi } from "vitest";
import { PREMIUM_SHORTCUTS } from "../src/lib/visual-style";
import { applyTheme, DEFAULT_THEME, getThemeConfig, saveThemeConfig } from "../src/lib/theme-store";
afterEach(() => vi.unstubAllGlobals());
function environment() {
  const values = new Map<string, string>();
  const storage = new Map<string, string>();
  const dataset: Record<string, string> = {};
  vi.stubGlobal("document", { documentElement: { dataset, style: { setProperty: (key: string, value: string) => values.set(key, value) } } });
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
  const dispatchEvent = vi.fn();
  vi.stubGlobal("window", { dispatchEvent });
  return { values, storage, dataset, dispatchEvent };
}
it("pose toujours le style Premium et le chrome Liquid Glass, réglages retirés", () => {
  const { dataset } = environment();
  applyTheme({ ...DEFAULT_THEME }, false);
  expect(dataset.visualStyle).toBe("premium");
  expect(dataset.chromeStyle).toBe("liquid-glass");
  expect(dataset.headerPattern).toBe("opaline");
});
it("persiste le thème et la police, rien d'autre, et notifie", () => {
  const { storage, dispatchEvent } = environment();
  saveThemeConfig({ skin: "clean", cleanFont: "plex", accent: "rose" } as never);
  expect(JSON.parse(storage.get("theme-config")!)).toEqual({ skin: "clean", cleanFont: "plex" });
  expect(dispatchEvent.mock.calls[0][0].type).toBe("baitari-theme-config-changed");
});
it("limite les presets aux quatre parcours existants", () => {
  expect(PREMIUM_SHORTCUTS.map(({ id }) => id)).toEqual(["appointment", "consultation", "patient", "care"]);
});
it("conserve les actions noires en clair et bleu-violet en sombre", () => {
  const { values } = environment();
  for (const dark of [false, true]) {
    applyTheme({ ...DEFAULT_THEME }, dark);
    expect(values.get("--primary")).toBe(dark ? "#3b1fe5" : "#191919");
    expect(values.get("--btn-primary-bg")).toBe(dark ? "#3b1fe5" : "#191919");
    expect(values.get("--primary-foreground")).toBe("#ffffff");
    expect(values.get("--btn-primary-hover")).toBe(dark ? "#4b33f0" : "#000000");
    expect(values.get("--radius")).toBe("0.5rem");
  }
});
it("ramène une ancienne préférence Classique sur Premium", () => {
  const { storage, dataset } = environment();
  storage.set("baitari-premium-default-v1", "true");
  storage.set("theme-config", JSON.stringify({ visualStyle: "classic", skin: "premium", density: "compact" }));
  const config = getThemeConfig();
  expect(config).toEqual({ skin: "premium" });
  applyTheme(config, false);
  expect(dataset.visualStyle).toBe("premium");
});
