import { afterEach, expect, it, vi } from "vitest";
import { QUICK_ACTIONS } from "../src/lib/quick-actions";
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
it("pose toujours Clean et le chrome Liquid Glass, réglages retirés", () => {
  const { dataset } = environment();
  applyTheme({ ...DEFAULT_THEME }, false);
  expect(dataset.skin).toBe("clean");
  expect(dataset.visualStyle).toBeUndefined();
  expect(dataset.chromeStyle).toBe("liquid-glass");
  expect(dataset.headerPattern).toBe("opaline");
});
it("persiste la police, rien d'autre (pas même un ancien thème), et notifie", () => {
  const { storage, dispatchEvent } = environment();
  saveThemeConfig({ skin: "premium", cleanFont: "plex", accent: "rose" } as never);
  expect(JSON.parse(storage.get("theme-config")!)).toEqual({ cleanFont: "plex" });
  expect(dispatchEvent.mock.calls[0][0].type).toBe("baitari-theme-config-changed");
});
it("limite les raccourcis aux sept créations existantes, dans l'ordre du parcours du patient", () => {
  expect(QUICK_ACTIONS.map(({ id }) => id)).toEqual(["appointment", "patient", "consultation", "care", "document", "product", "invoice"]);
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
it("ramène une ancienne préférence Classique ou Premium sur Clean", () => {
  const { storage, dataset } = environment();
  storage.set("baitari-premium-default-v1", "true");
  storage.set("theme-config", JSON.stringify({ visualStyle: "classic", skin: "premium", density: "compact" }));
  const config = getThemeConfig();
  expect(config).toEqual({});
  applyTheme(config, false);
  expect(dataset.skin).toBe("clean");
  expect(dataset.visualStyle).toBeUndefined();
});
