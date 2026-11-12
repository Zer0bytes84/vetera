import { afterEach, describe, expect, it, vi } from "vitest";
import { applyTheme, getThemeConfig, normalizeCleanFont, saveThemeConfig } from "../src/lib/theme-store";

// Premium removal (11 November 2026, docs/recus/2026-11-11-suppression-premium/):
// a stored theme-config that still says "premium" must fall back to Clean on
// the first launch, keep everything else, and never throw. The red team's
// attacks on that promise are the second half of this file.
afterEach(() => vi.unstubAllGlobals());

function install(stored: Record<string, string>, options: { throwing?: boolean } = {}) {
  const storage = new Map(Object.entries(stored));
  const values = new Map<string, string>();
  const dataset: Record<string, string> = {};
  const boom = () => { throw new Error("storage unavailable"); };
  vi.stubGlobal("document", { documentElement: { dataset, style: { setProperty: (key: string, value: string) => values.set(key, value) } } });
  vi.stubGlobal("localStorage", options.throwing
    ? { getItem: boom, setItem: boom, removeItem: boom }
    : { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
  vi.stubGlobal("window", { dispatchEvent: () => true });
  return { storage, values, dataset };
}

/** Everything the update must leave alone, next to the theme-config it rewrites. */
const NEIGHBOURS = {
  theme: "dark",
  "baitari-sidebar-tone": JSON.stringify({ "user-1": "dark" }),
  layout_collapsible_v7: "offcanvas",
  "dashboard-layout": JSON.stringify({ rows: ["a", "b"] }),
};

describe("migration : Premium retombe sur Clean au premier lancement", () => {
  it("skin premium + police Geist + barre sombre donne Clean + Geist + barre sombre, sans erreur", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warnings = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { storage, dataset } = install({
      "baitari-premium-default-v1": "true",
      "baitari-clean-default-v1": "true",
      "baitari-clean-default-v2": "true",
      "theme-config": JSON.stringify({ skin: "premium", cleanFont: "geist" }),
      ...NEIGHBOURS,
    });
    const config = getThemeConfig();
    expect(config).toEqual({ cleanFont: "geist" });
    applyTheme(config, true);
    expect(dataset).toMatchObject({ skin: "clean", cleanFont: "geist" });
    expect(dataset.visualStyle).toBeUndefined();
    expect(JSON.parse(storage.get("theme-config")!)).toEqual({ cleanFont: "geist" });
    for (const [key, value] of Object.entries(NEIGHBOURS)) expect(storage.get(key), key).toBe(value);
    expect(errors).not.toHaveBeenCalled();
    expect(warnings).not.toHaveBeenCalled();
  });

  it("un testeur Premium sans police enregistrée retombe sur Inter", () => {
    const { dataset } = install({ "baitari-clean-default-v1": "true", "theme-config": JSON.stringify({ skin: "premium" }), theme: "light" });
    applyTheme(getThemeConfig(), false);
    expect(dataset).toMatchObject({ skin: "clean", cleanFont: "inter" });
  });

  it("une réinitialisation (rien d'enregistré) donne Inter et ne crée aucune préférence", () => {
    const { storage, dataset } = install({});
    const config = getThemeConfig();
    applyTheme(config, false);
    expect(dataset).toMatchObject({ skin: "clean", cleanFont: "inter" });
    expect(storage.has("theme-config")).toBe(false);
    expect(storage.has("theme")).toBe(false);
    expect(storage.get("baitari-clean-only-v1")).toBe("true");
  });

  it("garde une installation d'avant le défaut clair en mode sombre, une seule fois", () => {
    const { storage } = install({ "baitari-premium-default-v1": "true", "theme-config": JSON.stringify({ skin: "premium" }) });
    getThemeConfig();
    expect(storage.get("theme")).toBe("dark");
    storage.delete("theme");
    getThemeConfig();
    expect(storage.has("theme")).toBe(false);
  });
});

describe("équipe rouge : tenter de faire échouer le retour sur Clean", () => {
  it("attaque 1 : ancien réglage « premium » retapé à la main après la migration", () => {
    const { storage, dataset } = install({ "baitari-clean-only-v1": "true", "theme-config": '{"skin":"premium","cleanFont":"plex"}' });
    const config = getThemeConfig();
    expect(config).toEqual({ cleanFont: "plex" });
    expect(storage.get("theme-config")).toBe('{"cleanFont":"plex"}');
    applyTheme({ ...config, skin: "premium" } as never, false);
    expect(dataset.skin).toBe("clean");
  });

  it.each([
    ["JSON invalide", "{oops"],
    ["chaîne vide", ""],
    ["null", "null"],
    ["tableau", '["premium"]'],
    ["chaîne JSON", '"premium"'],
    ["nombre", "42"],
    ["skin d'un autre type", '{"skin":{"x":1},"cleanFont":7}'],
    ["casse inattendue", '{"skin":"PREMIUM"}'],
    ["clés inconnues", '{"visualStyle":"premium","skin":"neon","accent":"rose"}'],
    ["__proto__ piégé", '{"__proto__":{"skin":"premium","cleanFont":"geist"}}'],
  ])("attaque 2 : préférence corrompue ou inconnue (%s) donne des défauts sans erreur", (_name, raw) => {
    const { dataset } = install({ "baitari-clean-only-v1": "true", "theme-config": raw });
    expect(() => getThemeConfig()).not.toThrow();
    const config = getThemeConfig();
    expect(config.cleanFont).toBeUndefined();
    expect(Object.keys(config)).not.toContain("skin");
    applyTheme(config, false);
    expect(dataset).toMatchObject({ skin: "clean", cleanFont: "inter" });
  });

  it.each(["constructor", "toString", "__proto__", "hasOwnProperty"])("attaque 3 : la police « %s » (nom hérité du prototype) n'est pas une police", (name) => {
    expect(normalizeCleanFont(name)).toBe("inter");
    const { dataset } = install({ "baitari-clean-only-v1": "true", "theme-config": JSON.stringify({ cleanFont: name }) });
    expect(getThemeConfig()).toEqual({});
    applyTheme(getThemeConfig(), false);
    expect(dataset.cleanFont).toBe("inter");
  });

  it("attaque 4 : la bascule clair/sombre répétée ne dérive pas", () => {
    const { dataset, values } = install({ "theme-config": '{"cleanFont":"plex"}' });
    const config = getThemeConfig();
    for (let i = 0; i < 200; i++) applyTheme(config, i % 2 === 1);
    expect(dataset).toMatchObject({ skin: "clean", cleanFont: "plex", chromeStyle: "liquid-glass", headerPattern: "opaline" });
    expect(Object.keys(dataset).sort()).toEqual(["chromeStyle", "cleanFont", "headerPattern", "skin"]);
    expect(values.get("--primary")).toBe("#3b1fe5"); // the last call, i = 199, is dark
    expect(getThemeConfig()).toEqual({ cleanFont: "plex" });
  });

  it("attaque 5 : premier lancement sans aucune préférence, deux fois de suite", () => {
    const { storage } = install({});
    expect(getThemeConfig()).toEqual({});
    const afterFirst = new Map(storage);
    expect(getThemeConfig()).toEqual({});
    expect(storage).toEqual(afterFirst);
  });

  it("attaque 6 : stockage indisponible (mode privé, quota) : défauts, aucune exception", () => {
    install({}, { throwing: true });
    expect(() => getThemeConfig()).not.toThrow();
    expect(getThemeConfig()).toEqual({});
  });

  it("attaque 7 : enregistrer une configuration qui contient encore skin ne le réécrit jamais", () => {
    const { storage } = install({});
    saveThemeConfig({ skin: "premium", cleanFont: "geist" } as never);
    expect(JSON.parse(storage.get("theme-config")!)).toEqual({ cleanFont: "geist" });
  });

  it("attaque 8 : un ancien marqueur Premium seul ne ressuscite rien", () => {
    const { storage, dataset } = install({ "baitari-premium-default-v1": "true", "baitari-clean-default-v1": "true", "baitari-clean-default-v2": "true", theme: "light" });
    const config = getThemeConfig();
    applyTheme(config, false);
    expect(config).toEqual({});
    expect(dataset.skin).toBe("clean");
    expect(storage.get("theme")).toBe("light");
    expect(storage.has("theme-config")).toBe(false);
  });
});
