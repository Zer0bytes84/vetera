import { readFileSync } from "node:fs";
import postcss from "postcss";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applySidebarTone,
  forcedSidebarTone,
  getSidebarTone,
  saveSidebarTone,
  SIDEBAR_TONES,
} from "../src/lib/sidebar-tone";

const GUARD = ':where(:not([data-sidebar-tone="light"]))';
const css = (path: string) => postcss.parse(readFileSync(path, "utf8"));
const selectors = (path: string) => {
  const found: string[] = [];
  css(path).walkRules((rule) => { found.push(...rule.selectors); });
  return found;
};

const storage = new Map<string, string>();
beforeEach(() => {
  storage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  vi.stubGlobal("window", { dispatchEvent: () => true });
});
afterEach(() => vi.unstubAllGlobals());

describe("barre latérale : réglage par utilisateur", () => {
  it("offre Automatique, Claire et Sombre, Automatique par défaut", () => {
    expect(SIDEBAR_TONES.map((tone) => tone.label)).toEqual(["Automatique", "Claire", "Sombre"]);
    expect(getSidebarTone("u1")).toBe("auto");
    expect(getSidebarTone(undefined)).toBe("auto");
  });

  it("garde le choix de chaque utilisateur séparément", () => {
    saveSidebarTone("u1", "dark");
    saveSidebarTone("u2", "light");
    expect(getSidebarTone("u1")).toBe("dark");
    expect(getSidebarTone("u2")).toBe("light");
    saveSidebarTone("u1", "auto");
    expect(getSidebarTone("u1")).toBe("auto");
    expect(getSidebarTone("u2")).toBe("light");
  });

  it("ne force que le choix qui diffère de la barre du thème (sombre, en clair comme en sombre)", () => {
    expect(forcedSidebarTone("auto")).toBeNull();
    expect(forcedSidebarTone("dark")).toBeNull();
    expect(forcedSidebarTone("light")).toBe("light");
  });

  it("Automatique ne laisse aucune marque sur la racine", () => {
    const dataset: Record<string, string> = { skin: "clean", sidebarTone: "dark" };
    const removed: string[] = [];
    vi.stubGlobal("document", {
      documentElement: { dataset, classList: { contains: () => false } },
      getElementById: () => ({ remove: () => removed.push("style") }),
    });
    applySidebarTone("auto");
    expect(dataset.sidebarTone).toBeUndefined();
    expect(removed).toEqual(["style"]);
  });
});

describe("barre latérale : charte", () => {
  it("la variante Tailwind dark s'arrête à une barre forcée claire, sans changer de spécificité", () => {
    const index = readFileSync("src/index.css", "utf8");
    expect(index).toMatch(/@custom-variant dark \(&:is\(\.dark \*\):where\(:not\(\[data-sidebar-tone="light"\]/);
  });

  it("chaque règle .dark de la barre latérale porte la garde", () => {
    const sidebarish = /sidebar|nav-link|apple-sidebar-glow/;
    const unguarded = selectors("src/index.css")
      .filter((selector) => /^\.dark[\s:]/.test(selector) && sidebarish.test(selector))
      // ".dark *" (scrollbars) keeps its universal subject and excludes the light sidebar instead.
      .filter((selector) => !selector.startsWith(`.dark${GUARD}`) && !selector.startsWith('.dark *:where(:not([data-sidebar-tone="light"]'));
    expect(unguarded).toEqual([]);
  });

  it("les règles de barre latérale du mode sombre ont la garde et la variante forcée", () => {
    for (const path of ["src/design-system/premium.css", "src/modules/shell/premium-sidebar.css"]) {
      const darkSidebar = selectors(path).filter((selector) =>
        /^:root\.dark\[data-skin="clean"\]/.test(selector) && /sidebar|nav-link/.test(selector)
        // The active-pill rules scoped to a light-pinned bar are the light case itself, not dark rules leaking onto it.
        // The light scope is looked for outside the guard, which names it too.
        && !selector.replaceAll(GUARD, "").includes('[data-sidebar-tone="light"]'));
      expect(darkSidebar.length).toBeGreaterThan(0);
      for (const selector of darkSidebar) {
        expect(selector).toContain(GUARD);
        const forced = selector.replace(`:root.dark[data-skin="clean"]${GUARD}`, ':root[data-skin="clean"] .dark');
        expect(selectors(path)).toContain(forced);
      }
    }
  });

  it("Clean garde ses blocs de barre latérale et fait suivre le chrome", () => {
    const clean = selectors("src/design-system/clean.css");
    const sidebar = clean.filter((selector) => selector.includes('[data-sidebar="sidebar"][data-mobile="true"]'));
    expect(sidebar.length).toBe(5);
    for (const selector of sidebar) expect(selector.startsWith(`:root[data-skin="clean"]${GUARD}`)).toBe(true);
    let chrome = "";
    css("src/design-system/clean.css").walkRules((rule) => {
      if (rule.selector === ':root[data-skin="clean"][data-sidebar-tone="light"][data-sidebar-tone]') {
        rule.walkDecls("--clean-chrome", (decl) => { chrome = decl.value; });
      }
    });
    expect(chrome).toBe("#ededee");
  });
});
