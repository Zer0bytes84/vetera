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
  it("pose le cadre, la feuille, le filet, le survol et les quatre gris", () => {
    expect(declarations.get("--clean-frame")).toBe("#ededee");
    expect(declarations.get("--clean-sheet")).toBe("#fafafa");
    expect(declarations.get("--clean-surface")).toBe("#ffffff");
    expect(declarations.get("--clean-line")).toBe("#e6e6e8");
    expect(declarations.get("--clean-hover")).toBe("#f0f0f1");
    expect(declarations.get("--clean-ink-strong")).toBe("#292929");
    expect(declarations.get("--clean-ink")).toBe("#5d5d5d");
    expect(declarations.get("--clean-ink-quiet")).toBe("#7f7f7f");
    expect(declarations.get("--clean-ink-disabled")).toBe("#a6a6a6");
  });

  it("fixe les hauteurs : 40 px en listes, 32 px en tableaux et contrôles, 28 px dans la sidebar", () => {
    expect(declarations.get("--clean-row-list")).toBe("40px");
    expect(declarations.get("--clean-row-table")).toBe("32px");
    expect(declarations.get("--clean-control")).toBe("32px");
    expect(declarations.get("--clean-nav-item")).toBe("28px");
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

describe("thème Clean : feuille posée sur le cadre", () => {
  it("décolle la feuille de 8 px, coins de 12 px, ombre presque invisible", () => {
    expect(declarations.get("--clean-sheet-inset")).toBe("8px");
    expect(declarations.get("--clean-sheet-radius")).toBe("12px");
    expect(declarations.get("--clean-card-radius")).toBe("10px");
    expect(declarations.get("--clean-sheet-shadow")).toMatch(/0\.5px rgb\(0 0 0 \/ 0\.08\).*0\.04\)/);
    const panel = rulesFor(/shell-scroll-panel/).map((rule) => rule.toString()).join("");
    expect(panel).toContain("var(--clean-sheet-radius)");
    expect(panel).toContain("var(--clean-sheet-shadow)");
    const inset = rulesFor(/sidebar-inset/).map((rule) => rule.toString()).join("");
    expect(inset).toContain("var(--clean-sheet-inset)");
  });

  it("pose la navigation sur le cadre, sans séparateur ni boîte", () => {
    const sidebar = rulesFor(/sidebar-container"\]::after/);
    expect(sidebar.some((rule) => rule.toString().includes("display: none"))).toBe(true);
    expect(rulesFor(/\.app-sidebar, \[data-slot="sidebar-container"\]/)[0].toString()).toContain("var(--clean-frame)");
  });

  it("charge Inter avec son axe optique sous un nom propre à Clean", () => {
    const faces: string[] = [];
    root.walkAtRules("font-face", (rule) => { faces.push(rule.toString()); });
    expect(faces).toHaveLength(2);
    for (const face of faces) {
      expect(face).toContain('font-family: "Inter Clean"');
      expect(face).toMatch(/inter-latin(-ext)?-opsz-normal\.woff2/);
    }
  });
});

describe("polices par thème", () => {
  const premium = postcss.parse(readFileSync("src/design-system/premium.css", "utf8"));
  const premiumTokens = new Map<string, string>();
  premium.walkRules(':root[data-visual-style="premium"]', (rule) =>
    rule.walkDecls((decl) => premiumTokens.set(decl.prop, decl.value))
  );
  const cleanTokens = new Map<string, string>();
  root.walkRules(SCOPE, (rule) =>
    rule.walkDecls((decl) => cleanTokens.set(decl.prop, `${decl.value}${decl.important ? " !important" : ""}`))
  );

  it("garde Geist et Space Grotesk comme règle de Premium", () => {
    expect(premiumTokens.get("--app-font-sans")).toMatch(/^"Geist Variable"/);
    expect(premiumTokens.get("--app-font-heading")).toMatch(/^"Space Grotesk Variable"/);
  });

  it("passe Clean sur Inter pour l'interface, le corps et les titres", () => {
    expect(declarations.get("--clean-font-ui")).toMatch(/^"Inter Clean", "Inter Variable"/);
    expect(declarations.get("--clean-font-heading")).toBe("var(--clean-font-ui)");
    for (const token of ["--app-font-sans", "--font-sans"]) {
      expect(cleanTokens.get(token)).toBe("var(--clean-font-ui) !important");
    }
    for (const token of ["--app-font-heading", "--app-font-display", "--font-heading"]) {
      expect(cleanTokens.get(token)).toBe("var(--clean-font-heading) !important");
    }
  });

  it("resserre l'interlettrage des titres et aligne les chiffres", () => {
    expect(declarations.get("--clean-tracking-title")).toBe("-0.022em");
    expect(declarations.get("--clean-tracking-heading")).toBe("-0.015em");
    const tabular = rulesFor(/\.kpiValue/);
    expect(tabular.some((rule) => /table/.test(rule.selector) && rule.toString().includes("tabular-nums"))).toBe(true);
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
