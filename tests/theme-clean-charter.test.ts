import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyTheme, DEFAULT_THEME, getThemeConfig } from "../src/lib/theme-store";
import {
  APP_THEMES,
  appThemeSettings,
  currentAppTheme,
  DEFAULT_SKIN,
  normalizeSkin,
} from "../src/lib/theme-skin";

const CLEAN = readFileSync("src/design-system/clean.css", "utf8");
const SCOPE = ':root[data-skin="clean"]';
const DARK = ':root[data-skin="clean"].dark';
// The sidebar takes the dark set unless Appearance forces it light (data-sidebar-tone).
const SIDEBAR = ':root[data-skin="clean"]:where(:not([data-sidebar-tone="light"])) :is([data-slot="sidebar"], [data-sidebar="sidebar"][data-mobile="true"])';
const root = postcss.parse(CLEAN);
const tokensOf = (selector: string) => {
  const found = new Map<string, string>();
  root.walkRules((rule) => {
    if (!rule.selectors.includes(selector)) return;
    rule.walkDecls((decl) => { if (decl.prop.startsWith("--clean-")) found.set(decl.prop, decl.value); });
  });
  return found;
};
const declarations = tokensOf(SCOPE);
const darkDeclarations = tokensOf(DARK);
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

describe("thème Clean : déclinaison sombre", () => {
  it("redéfinit chaque jeton de couleur avec le même nom, et rien d'autre", () => {
    const colours = [...declarations.keys()].filter((name) => /^#|rgb\(|color-mix|shadow|var\(--clean-surface\)/.test(declarations.get(name)!) || /shadow|glass-(top|bottom|edge|rule|drop)|segment-(track|active)/.test(name));
    for (const name of darkDeclarations.keys()) expect(declarations.has(name)).toBe(true);
    for (const name of colours) expect(darkDeclarations.has(name), name).toBe(true);
    for (const name of ["--clean-control", "--clean-row-table", "--clean-nav-item", "--clean-font-ui", "--clean-sheet-radius"]) {
      expect(darkDeclarations.has(name)).toBe(false);
    }
  });

  it("garde des noirs teintés, sans noir pur ni ombre portée", () => {
    for (const [name, value] of darkDeclarations) {
      expect(value, name).not.toMatch(/#000(000)?\b|rgb\(0 0 0/);
    }
    expect(darkDeclarations.get("--clean-frame")).toBe("#0c0d0f");
    expect(darkDeclarations.get("--clean-sheet")).toBe("#111214");
    expect(darkDeclarations.get("--clean-surface")).toBe("#171719");
    expect(darkDeclarations.get("--clean-ink-strong")).toBe("#f3f3f5");
  });

  it("aucune règle ne vise un seul mode : clair et sombre partagent le traitement", () => {
    const modeOnly: string[] = [];
    root.walkRules((rule) => {
      for (const selector of rule.selectors) if (/:not\(\.dark\)|\.dark /.test(selector)) modeOnly.push(selector);
    });
    expect(modeOnly).toEqual([]);
  });
});

describe("thème Clean : sidebar sombre dans les deux déclinaisons", () => {
  const darkBlock = rulesFor(/\.dark,$|\.dark,\s/).find((rule) => rule.selectors.includes(DARK) && rule.toString().includes("--clean-frame: #0c0d0f"));

  it("reçoit exactement le bloc de jetons de Clean sombre, sans palette à elle", () => {
    expect(darkBlock?.selectors).toEqual([DARK, SIDEBAR]);
    const sidebarOnly: string[] = [];
    root.walkRules((rule) => {
      if (rule.selectors.length === 1 && rule.selectors[0] === SIDEBAR) {
        rule.walkDecls((decl) => { if (decl.prop.startsWith("--")) sidebarOnly.push(decl.prop); });
      }
    });
    expect(sidebarOnly).toEqual([]);
  });

  it("fait pointer les jetons de Premium et de navigation vers Clean, dans la sidebar aussi", () => {
    const mapping = root.nodes.find((node): node is postcss.Rule => node.type === "rule" && node.selectors.includes(SCOPE) && node.selectors.includes(DARK) && node.selectors.includes(SIDEBAR));
    const text = mapping?.toString() ?? "";
    for (const token of ["--nav-ink", "--nav-text", "--nav-muted", "--nav-bg", "--nav-hover", "--sidebar", "--ink", "--primary", "--ring"]) {
      expect(text, token).toMatch(new RegExp(`\\n\\s*${token}: var\\(--clean-`));
    }
  });

  it("garde l'accent, l'anneau de focus et les teintes des pastilles du sombre", () => {
    expect(darkDeclarations.get("--clean-accent")).toBe("#3b1fe5");
    expect(darkDeclarations.get("--clean-ring")).toBe("#ffffff");
    expect(declarations.get("--clean-accent")).toBe("#191919");
    expect(declarations.get("--clean-ring")).toBe("#191919");
    expect(darkBlock?.toString()).toContain("--premium-blue: #88b3ef");
    expect(rulesFor(new RegExp(`^${SIDEBAR.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)).some((rule) => rule.toString().includes("color-scheme: dark"))).toBe(true);
  });

  it("prolonge la sidebar dans le cadre autour de la feuille, du même gris qu'en sombre", () => {
    expect(declarations.get("--clean-chrome")).toBe(darkDeclarations.get("--clean-frame"));
    expect(darkDeclarations.get("--clean-chrome")).toBe("var(--clean-frame)");
    const frame = rulesFor(/sidebar-wrapper"\]$|sidebar-inset"\]$/).map((rule) => rule.toString()).join("");
    expect(frame).toContain("var(--clean-chrome)");
    expect(frame).not.toContain("background: var(--clean-frame)");
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

  it("peint la bande au-dessus de l'en-tête du gris du cadre, malgré l'utilitaire en couche", () => {
    const layered: string[] = [];
    root.walkAtRules("layer", (layer) => {
      layer.walkRules(/sidebar-inset/, (rule) => { layered.push(rule.toString()); });
    });
    expect(layered.some((rule) => rule.includes("background: var(--clean-chrome) !important"))).toBe(true);
  });

  it("aligne les champs de page sur les 32 px des contrôles voisins", () => {
    const tokens = rulesFor(/^:root\[data-skin="clean"\],/).map((rule) => rule.toString()).join("");
    expect(tokens).toContain("--field-height: var(--clean-control)");
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
  root.walkRules((rule) => {
    if (!rule.selectors.includes(SCOPE) || !rule.selectors.includes(DARK)) return;
    rule.walkDecls((decl) => cleanTokens.set(decl.prop, `${decl.value}${decl.important ? " !important" : ""}`));
  });

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

describe("thème Clean : interrupteurs segmentés", () => {
  const FAMILY = ':is([data-tabs-style="segmented"], .dashboard-mode-toggle, .flow-density, .settings-segmented, .stock-view-toggle)';

  it("pose la piste, l'item de 28 px et l'ombre de la vue choisie", () => {
    expect(declarations.get("--clean-segment-track")).toBe("#ededee");
    expect(declarations.get("--clean-segment-item")).toBe("28px");
    expect(declarations.get("--clean-segment-radius")).toBe("6px");
    expect(declarations.get("--clean-segment-active-shadow")).toMatch(/0\.5px rgb\(0 0 0 \/ 0\.1\)/);
  });

  it("donne le même traitement à toutes les familles, à la hauteur des contrôles voisins", () => {
    const track = rulesFor(new RegExp(`${FAMILY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    expect(track).toHaveLength(1);
    const base = track.find((rule) => rule.toString().includes("--clean-segment-track"))!.toString();
    expect(base).toContain("height: var(--clean-control)");
    const item = rulesFor(/> :is\(\[data-slot="tabs-trigger"\]/).filter((rule) => rule.selector.includes(".flow-density"));
    expect(item.some((rule) => rule.toString().includes("height: var(--clean-segment-item)"))).toBe(true);
    const chosen = rulesFor(/\[aria-pressed="true"\][^)]*\.settings-segmented-active\)$/);
    expect(chosen).toHaveLength(1);
    expect(chosen[0].toString()).toContain("var(--clean-segment-active-shadow)");
    expect(chosen[0].toString()).not.toContain("font-weight");
  });

  it("nomme la vue du tableau de bord avec son libellé existant, jamais un texte écrit en dur", () => {
    const named = rulesFor(/dashboard-mode-toggle > button\[aria-pressed="true"\]::after/);
    expect(named).toHaveLength(1);
    expect(named[0].toString()).toContain("content: attr(aria-label)");
    root.walkDecls("content", (decl) => {
      expect(decl.value === '""' || decl.value.startsWith("attr(")).toBe(true);
    });
  });
});

describe("thème Clean : icônes", () => {
  const SUBSTITUTIONS: [target: RegExp, icon: string][] = [
    [/aria-label="Patients"\] svg/, "paw-print"],
    [/data-tone="orange"\] svg/, "syringe"],
    [/data-kpi="Urgences ouvertes"\]/, "siren"],
    [/data-kpi="Relances à prévoir"\]/, "calendar-clock"],
    [/data-kpi="En retard"\]/, "clock-alert"],
    [/value="clinical"\] svg/, "calendar-heart"],
  ];

  it("liste chaque substitution, une icône Lucide par sens, et rien d'autre", () => {
    const icons = [...declarations.keys()].filter((name) => name.startsWith("--clean-icon-") && name !== "--clean-icon-stroke");
    expect(icons.sort()).toEqual(SUBSTITUTIONS.map(([, icon]) => `--clean-icon-${icon}`).sort());
    for (const [target, icon] of SUBSTITUTIONS) {
      const rule = rulesFor(target).find((found) => found.toString().includes(`var(--clean-icon-${icon})`));
      expect(rule, icon).toBeDefined();
    }
  });

  it("dessine la substitution à la place de l'icône d'origine, dans sa couleur et sa boîte", () => {
    const paint = rulesFor(/^:root\[data-skin="clean"\] :is\(/).find((rule) => rule.toString().includes("mask: var(--clean-icon)"));
    expect(paint?.toString()).toContain("background: currentColor");
    expect(rulesFor(/\) > \*$/).some((rule) => rule.toString().includes("display: none"))).toBe(true);
  });

  it("pose l'icône de page sur la ligne du titre, avec ou sans date au-dessus", () => {
    const tile = rulesFor(/\[data-slot="page-header"\] \.premium-page-icon$/).map((rule) => rule.toString()).join("");
    expect(tile).toContain("height: 28px");
    expect(rulesFor(/:has\(\.page-header-kicker\) \.premium-page-icon$/)).toHaveLength(1);
  });
});

describe("thème Clean : titre d'accueil", () => {
  it("reste au plafond de 24 px, en graisse 500 pour compenser l'œil d'Inter", () => {
    const hero = rulesFor(/\.heroTitle$/).map((rule) => rule.toString()).join("");
    expect(hero).toContain("font-size: 24px !important");
    expect(hero).toContain("font-weight: 500 !important");
    expect(hero).not.toMatch(/font-size: (2[5-9]|[3-9]\d)px/);
  });
});

describe("thème Clean : widgets", () => {
  const INDEX = readFileSync("src/index.css", "utf8");

  it("masque partout ailleurs les éléments propres à Clean, et seulement Clean masque ce qu'il remplace", () => {
    expect(INDEX).toContain(':root:not([data-skin="clean"]) [data-clean-only] { display: none !important; }');
    expect(rulesFor(/\[data-clean-hidden\]$/).some((rule) => rule.toString().includes("display: none !important"))).toBe(true);
    const elsewhere = files("src", /\.css$/)
      .filter((file) => !file.endsWith("clean.css"))
      .filter((file) => /data-clean-hidden/.test(readFileSync(file, "utf8")));
    expect(elsewhere).toEqual([]);
  });

  it("porte la comparaison sous le chiffre et la période précédente en pointillé", () => {
    const chip = rulesFor(/\.kpiSub \.delta > span:not/).map((rule) => rule.toString()).join("");
    expect(chip).toContain("border-radius: 999px");
    expect(rulesFor(/\.chartLinePrevious$/)[0]?.toString()).toMatch(/stroke-dasharray/);
  });

  it("varie la première rangée : une aire pour la trésorerie, les barres pour un seul indicateur, la même ligne de base", () => {
    const source = readFileSync("src/modules/dashboard/components/premium-analytics.tsx", "utf8");
    expect(source.match(/<MiniArea /g)).toHaveLength(1);
    expect(source.match(/<MiniBars [^>]*cleanHidden/g)).toHaveLength(2);
    expect(source.match(/<MiniBars /g)).toHaveLength(3);
    const row = rulesFor(/\.kpis \.kpiValueRow$/)[0]?.toString() ?? "";
    expect(row).toContain("height: 32px");
    expect(rulesFor(/\.kpis \.kpi > \.kpiValue$/)[0]?.toString()).toContain("height: 32px");
  });

  it("dessine la capacité en unités et la vue d'ensemble des finances avec les jetons Clean", () => {
    const units = rulesFor(/stay-occupancy-units > span,/).map((rule) => rule.toString()).join("");
    expect(units).toContain("var(--clean-segment-track)");
    expect(rulesFor(/\.finance-overview$/)[0]?.toString()).toContain("var(--clean-card-radius)");
  });
});

describe("thème Clean : en-tête en verre", () => {
  it("floute l'en-tête au défilement avec un seul jeton", () => {
    expect(declarations.get("--clean-glass-blur")).toBe("20px");
    const header = rulesFor(/\[data-slot="app-header"\]$/).map((rule) => rule.toString()).join("");
    expect(header).toContain("blur(var(--clean-glass-blur))");
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
      .filter((file) => !/lib\/theme-(skin|store)\.ts$|lib\/sidebar-tone\.ts$|components\/app-theme-picker\.tsx$|components\/Parametres\.tsx$/.test(file))
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

  it("présente les quatre combinaisons et leurs réglages", () => {
    expect(APP_THEMES.map((theme) => theme.label)).toEqual(["Premium clair", "Premium sombre", "Clean clair", "Clean sombre"]);
    expect(currentAppTheme("clean", false)).toBe("clean-light");
    expect(currentAppTheme("clean", true)).toBe("clean-dark");
    expect(currentAppTheme("premium", false)).toBe("premium-light");
    expect(currentAppTheme("premium", true)).toBe("premium-dark");
    expect(appThemeSettings("clean-dark")).toEqual({ skin: "clean", mode: "dark" });
    expect(appThemeSettings("clean-light")).toEqual({ skin: "clean", mode: "light" });
    expect(appThemeSettings("premium-dark")).toEqual({ skin: "premium", mode: "dark" });
    expect(appThemeSettings("premium-light")).toEqual({ skin: "premium", mode: "light" });
  });
});
