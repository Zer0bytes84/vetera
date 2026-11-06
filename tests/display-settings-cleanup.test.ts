import { afterEach, describe, expect, it, vi } from "vitest";
import { applyTheme, getThemeConfig, REMOVED_DISPLAY_KEYS } from "../src/lib/theme-store";

// Removal of the decorative display settings (5 November 2026,
// docs/recus/2026-11-05/nettoyage-parametres/): an install that stored values
// for them must fall back to the defaults on first launch, without error, and
// keep the preferences that remain (theme, type set, mode).
afterEach(() => vi.unstubAllGlobals());

function install(stored: Record<string, string>) {
  const storage = new Map(Object.entries(stored));
  const values = new Map<string, string>();
  const dataset: Record<string, string> = {};
  vi.stubGlobal("document", { documentElement: { dataset, style: { setProperty: (key: string, value: string) => values.set(key, value) } } });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  vi.stubGlobal("window", { dispatchEvent: () => true });
  return { storage, values, dataset };
}

/** A tester's storage before the update: every removed setting off its default. */
const TESTER = {
  "baitari-premium-default-v1": "true",
  "baitari-clean-default-v1": "true",
  "baitari-crm-geist-trial-v1": "true",
  "baitari-neutral-controls-v1": "true",
  "baitari-blue-system-polish-v1": "true",
  "baitari_original_header_restored_v2": "true",
  theme: "dark",
  "theme-config": JSON.stringify({
    visualStyle: "classic",
    skin: "clean",
    cleanFont: "plex",
    chromeStyle: "classic",
    accent: "rose",
    radius: "xl",
    density: "compact",
    font: "geist",
    headerPattern: "tide",
    sidebarStyle: "floating",
  }),
  layout_variant_v8: "inset",
  sidebar_glass_contrast_v1: "15",
  layout_collapsible_v7: "offcanvas",
  "baitari-sidebar-tone": JSON.stringify({ "user-1": "light" }),
};

describe("paramètres d'affichage retirés : migration", () => {
  it("retombe sur le défaut et garde le thème, la police, le mode et le repli de la barre", () => {
    const { storage, values, dataset } = install(TESTER);
    const config = getThemeConfig();
    expect(config).toEqual({ skin: "clean", cleanFont: "plex" });
    expect(JSON.parse(storage.get("theme-config")!)).toEqual({ skin: "clean", cleanFont: "plex" });
    for (const key of REMOVED_DISPLAY_KEYS) expect(storage.has(key), key).toBe(false);
    // Kept: the mode, the collapse behaviour, the sidebar tone, the migration markers.
    expect(storage.get("theme")).toBe("dark");
    expect(storage.get("baitari-sidebar-tone")).toBe(JSON.stringify({ "user-1": "light" }));
    expect(storage.get("layout_collapsible_v7")).toBe("offcanvas");
    expect(storage.get("baitari-clean-default-v1")).toBe("true");

    applyTheme(config, true);
    expect(dataset).toMatchObject({ visualStyle: "premium", skin: "clean", chromeStyle: "liquid-glass", cleanFont: "plex", headerPattern: "opaline" });
    expect(dataset.radius).toBeUndefined();
    expect(dataset.density).toBeUndefined();
    expect(values.get("--radius")).toBe("0.5rem");
    expect(values.get("--primary")).toBe("#3b1fe5");
  });

  it("est idempotente : une seconde lecture ne change plus rien", () => {
    const { storage } = install(TESTER);
    getThemeConfig();
    const after = new Map(storage);
    expect(getThemeConfig()).toEqual({ skin: "clean", cleanFont: "plex" });
    expect(storage).toEqual(after);
  });

  it("supporte une configuration illisible ou des valeurs inconnues sans erreur", () => {
    const broken = install({ "baitari-premium-default-v1": "true", "baitari-clean-default-v1": "true", "theme-config": "{oops" });
    expect(() => getThemeConfig()).not.toThrow();
    expect(getThemeConfig()).toEqual({});
    expect(broken.storage.get("theme-config")).toBe("{oops");
    vi.unstubAllGlobals();
    install({ "baitari-premium-default-v1": "true", "baitari-clean-default-v1": "true", "theme-config": JSON.stringify({ skin: "neon", cleanFont: "comic", accent: 42 }) });
    expect(getThemeConfig()).toEqual({});
  });

  it("une installation neuve reste sans valeur enregistrée : Clean et Geist par défaut", () => {
    const { storage, dataset } = install({});
    const config = getThemeConfig();
    expect(config).toEqual({});
    expect(storage.has("theme-config")).toBe(false);
    applyTheme(config, false);
    expect(dataset).toMatchObject({ skin: "clean", cleanFont: "geist" });
  });

  it("ne laisse plus aucune trace des réglages retirés dans le code", async () => {
    const { readFileSync, existsSync } = await import("node:fs");
    // The light sidebar and its setting were restored the same evening: they stay.
    expect(existsSync("src/lib/sidebar-tone.ts")).toBe(true);
    expect(existsSync("src/components/ThemeSelector.tsx")).toBe(false);
    const settings = readFileSync("src/components/Parametres.tsx", "utf8");
    for (const gone of ["Couleur d’accent", "Liquid Glass", "Style Premium", "Présentation de la barre latérale", "Contraste du verre"]) {
      expect(settings, gone).not.toContain(gone);
    }
    const css = ["src/index.css", "src/design-system/premium.css", "src/design-system/clean.css", "src/modules/shell/premium-sidebar.css"].map((file) => readFileSync(file, "utf8")).join("\n");
    expect(settings).toContain("Teinte de la barre latérale");
    expect(css).toContain('[data-sidebar-tone="light"]');
    expect(css).not.toMatch(/data-variant="(glass|minimal|inset|floating)"|data-header-pattern="(aurora|tide|spectrum|topography|quiet)"|data-density="/);
  });
});
