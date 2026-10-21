import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyTheme, DEFAULT_THEME, getThemeConfig } from "../src/lib/theme-store";
import {
  appThemeSettings,
  currentAppTheme,
  DEFAULT_SKIN,
  normalizeSkin,
} from "../src/lib/theme-skin";

const CLEAN = readFileSync("src/design-system/clean.css", "utf8");
const SCOPE = ':root[data-skin="clean"]:not(.dark)';
const root = postcss.parse(CLEAN);
const declarations = new Map<string, string>();
root.walkDecls((decl) => {
  if (decl.prop.startsWith("--clean-")) declarations.set(decl.prop, decl.value);
});
const rulesFor = (pattern: RegExp) => {
  const found: postcss.Rule[] = [];
  root.walkRules((rule) => {
    if (pattern.test(rule.selector)) found.push(rule);
  });
  return found;
};
const files = (dir: string, ext: RegExp): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path, ext) : ext.test(name) ? [path] : [];
  });

afterEach(() => vi.unstubAllGlobals());

describe("thème Clean : jetons", () => {
  it("pose la feuille, le filet, le survol et les quatre gris", () => {
    expect(declarations.get("--clean-sheet")).toBe("#fafafa");
    expect(declarations.get("--clean-line")).toBe("#ebebeb");
    expect(declarations.get("--clean-hover")).toBe("#f0f0f0");
    expect(declarations.get("--clean-ink-strong")).toBe("#292929");
    expect(declarations.get("--clean-ink")).toBe("#5d5d5d");
    expect(declarations.get("--clean-ink-quiet")).toBe("#7f7f7f");
    expect(declarations.get("--clean-ink-disabled")).toBe("#a6a6a6");
  });

  it("fixe les hauteurs : 40 px en listes, 32 px en tableaux, 30 px dans la sidebar", () => {
    expect(declarations.get("--clean-row-list")).toBe("40px");
    expect(declarations.get("--clean-row-table")).toBe("32px");
    expect(declarations.get("--clean-nav-item")).toBe("30px");
    const nav = rulesFor(/sidebar-menu-button"\]$/).flatMap((rule) => rule.nodes);
    expect(nav.some((n) => n.type === "decl" && n.prop === "height" && n.value.includes("--clean-nav-item"))).toBe(true);
    const table = rulesFor(/:is\(th, td\)/).flatMap((rule) => rule.nodes);
    expect(table.some((n) => n.type === "decl" && n.prop === "height" && n.value.includes("--clean-row-table"))).toBe(true);
  });

  it("dessine les icônes de navigation en trait de 1 px et 16 px", () => {
    expect(declarations.get("--clean-icon-stroke")).toBe("1px");
    expect(declarations.get("--clean-nav-icon")).toBe("16px");
    expect(CLEAN).toMatch(/stroke-width: var\(--clean-icon-stroke\)/);
    expect(CLEAN).toMatch(/sidebar-nav-icon svg[\s\S]*?width: var\(--clean-nav-icon\) !important/);
  });

  it("réserve le quatrième gris au texte et aux icônes désactivés", () => {
    const uses = CLEAN.split("var(--clean-ink-disabled)").length - 1;
    expect(uses).toBe(2);
    for (const rule of rulesFor(/:disabled/)) {
      expect(rule.selector).toMatch(/aria-disabled/);
    }
  });
});

describe("thème Clean : commandes de widget au survol", () => {
  it("masque les liens de carte au repos et les révèle au survol ou au focus, pointeur fin seulement", () => {
    const hidden = rulesFor(/\.card \.moreLink$/);
    expect(hidden).toHaveLength(1);
    expect(hidden[0].toString()).toContain("opacity: 0");
    expect((hidden[0].parent as postcss.AtRule).params).toBe("(hover: hover) and (pointer: fine)");
    const shown = rulesFor(/\.card:is\(:hover, :focus-within\) \.moreLink/);
    expect(shown).toHaveLength(1);
    expect(shown[0].toString()).toContain("opacity: 1");
  });

  it("ne masque les liens de carte dans aucun autre thème", () => {
    const elsewhere = files("src", /\.css$/)
      .filter((file) => !file.endsWith("clean.css"))
      .filter((file) => /\.moreLink[^{]*\{[^}]*opacity:\s*0[;\s]/.test(readFileSync(file, "utf8")));
    expect(elsewhere).toEqual([]);
  });
});

describe("thème Clean : pureté", () => {
  it("ne touche Premium ni en clair ni en sombre : chaque règle est sous la portée Clean", () => {
    const loose: string[] = [];
    root.walkRules((rule) => {
      for (const selector of rule.selectors) {
        if (!selector.trim().startsWith(SCOPE)) loose.push(selector);
      }
    });
    expect(loose).toEqual([]);
  });

  it("ne forke aucun composant : aucun code ne teste le thème Clean", () => {
    const forks = files("src", /\.tsx?$/)
      .filter((file) => !/lib\/theme-(skin|store)\.ts$|components\/app-theme-picker\.tsx$|components\/Parametres\.tsx$/.test(file))
      .filter((file) => /dataset\.skin|data-skin|skin\s*===|"clean"/.test(readFileSync(file, "utf8")));
    expect(forks).toEqual([]);
  });
});

describe("thème Clean : réglage et défaut", () => {
  function environment() {
    const storage = new Map<string, string>();
    const dataset: Record<string, string> = {};
    vi.stubGlobal("document", { documentElement: { dataset, style: { setProperty: () => undefined } } });
    vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
    vi.stubGlobal("window", { dispatchEvent: () => true });
    return { storage, dataset };
  }

  it("garde Premium par défaut, un seul réglage décide du défaut", () => {
    environment();
    expect(DEFAULT_SKIN).toBe("premium");
    expect(normalizeSkin(undefined)).toBe(DEFAULT_SKIN);
    expect(normalizeSkin("clean")).toBe("clean");
    expect(getThemeConfig().skin).toBeUndefined();
  });

  it("pose la peau sur la racine, et jamais en Classique", () => {
    const { dataset } = environment();
    applyTheme({ ...DEFAULT_THEME, skin: "clean" }, false);
    expect(dataset.skin).toBe("clean");
    applyTheme({ ...DEFAULT_THEME, visualStyle: "classic", skin: "clean" }, false);
    expect(dataset.skin).toBe("premium");
  });

  it("distingue les trois thèmes et leurs réglages", () => {
    expect(currentAppTheme("clean", false)).toBe("clean");
    expect(currentAppTheme("clean", true)).toBe("premium-dark");
    expect(currentAppTheme("premium", false)).toBe("premium-light");
    expect(appThemeSettings("clean")).toEqual({ skin: "clean", mode: "light" });
    expect(appThemeSettings("premium-dark")).toEqual({ skin: "premium", mode: "dark" });
    expect(appThemeSettings("premium-light")).toEqual({ skin: "premium", mode: "light" });
  });
});
