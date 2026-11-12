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
    // Paths are compared to forward-slash literals: normalise the separators join() produces on Windows.
    return statSync(path).isDirectory() ? files(path, ext) : ext.test(name) ? [path.replace(/\\/g, "/")] : [];
  });

afterEach(() => vi.unstubAllGlobals());

describe("thème Clean : jetons", () => {
  it("pose le cadre, la feuille, le filet, le survol et les quatre gris", () => {
    expect(declarations.get("--clean-frame")).toBe("#ededee");
    expect(declarations.get("--clean-sheet")).toBe("#ffffff");
    expect(declarations.get("--clean-surface")).toBe("#ffffff");
    expect(declarations.get("--clean-line")).toBe("#e6e6e8");
    expect(declarations.get("--clean-hover")).toBe("#f0f0f1");
    expect(declarations.get("--clean-ink-strong")).toBe("#292929");
    expect(declarations.get("--clean-ink")).toBe("#5d5d5d");
    expect(declarations.get("--clean-ink-quiet")).toBe("#737373");
    expect(declarations.get("--clean-ink-disabled")).toBe("#a6a6a6");
  });

  it("fixe les hauteurs : 40 px en listes, 32 px en tableaux et contrôles, 30 px pour les boutons de la sidebar", () => {
    expect(declarations.get("--clean-row-list")).toBe("40px");
    expect(declarations.get("--clean-row-table")).toBe("32px");
    expect(declarations.get("--clean-control")).toBe("32px");
    expect(declarations.get("--clean-nav-item")).toBe("34px");
    // The token stays at 34 px for the subpage links and the Premium rows; the
    // menu buttons themselves were tightened to a fixed 30 px, validated by eye.
    const nav = rulesFor(/sidebar-menu-button"\]$/).flatMap((rule) => rule.nodes);
    expect(nav.some((n) => n.type === "decl" && n.prop === "height" && n.value === "30px")).toBe(true);
    const table = rulesFor(/:is\(th, td\)/).flatMap((rule) => rule.nodes);
    expect(table.some((n) => n.type === "decl" && n.prop === "height" && n.value.includes("--clean-row-table"))).toBe(true);
  });

  it("dessine les icônes de navigation en trait de 1,5 et 16 px", () => {
    expect(declarations.get("--clean-icon-stroke")).toBe("1.5px");
    expect(declarations.get("--clean-nav-icon")).toBe("16px");
    expect(CLEAN).toMatch(/stroke-width: var\(--clean-icon-stroke\)/);
    // premium-sidebar.css pins the sidebar strokes at 1 !important; Clean must answer in kind.
    expect(CLEAN).toMatch(/\.app-sidebar \.sidebar-nav-icon svg, \.app-sidebar \.premium-shortcut-icon\) \{ stroke-width: var\(--clean-icon-stroke\) !important; \}/);
    expect(CLEAN).toMatch(/sidebar-nav-icon svg[\s\S]*?width: var\(--clean-nav-icon\) !important/);
  });

  it("donne aux icônes de navigation au repos le gris de leur libellé, l'actif en gris fort", () => {
    const rest = rulesFor(/sidebar-menu-button"\] svg$/).flatMap((rule) => rule.nodes);
    expect(rest.some((n) => n.type === "decl" && n.prop === "color" && n.value === "var(--clean-ink)")).toBe(true);
    const active = rulesFor(/\[data-active\]:not\(\[data-active="false"\]\) svg$/).flatMap((rule) => rule.nodes);
    expect(active.some((n) => n.type === "decl" && n.prop === "color" && n.value === "var(--clean-ink-strong)")).toBe(true);
  });

  it("trace les masques de substitution au même trait de 1,5", () => {
    const masks = [...declarations.entries()].filter(([name]) => name.startsWith("--clean-icon-") && name !== "--clean-icon-stroke");
    expect(masks.length).toBeGreaterThan(0);
    for (const [name, value] of masks) expect(value, name).toContain("stroke-width='1.5'");
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

  it("reçoit le bloc de jetons de Clean sombre, à deux exceptions près scopées à la sidebar", () => {
    expect(darkBlock?.selectors).toEqual([DARK, SIDEBAR]);
    const sidebarOnly = new Map<string, string>();
    root.walkRules((rule) => {
      if (rule.selectors.length === 1 && rule.selectors[0] === SIDEBAR) {
        rule.walkDecls((decl) => { if (decl.prop.startsWith("--")) sidebarOnly.set(decl.prop, decl.value); });
      }
    });
    // Exception sanctionnée (Catalyst, validée à l'œil le 2026-11-11) : la
    // sidebar seule approfondit son cadre en zinc-950 et son encre forte en
    // blanc pur ; aucun autre jeton ne lui est propre.
    expect([...sidebarOnly.keys()].sort()).toEqual(["--clean-frame", "--clean-ink-strong"]);
    expect(sidebarOnly.get("--clean-frame")).toBe("#09090b");
    expect(sidebarOnly.get("--clean-ink-strong")).toBe("#ffffff");
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
  const FAMILY = ':is([data-tabs-style="segmented"], .dashboard-mode-toggle, .flow-density, .stock-view-toggle)';

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
    const chosen = rulesFor(/\[aria-pressed="true"\][^)]*\[aria-current="page"\]\)$/);
    expect(chosen).toHaveLength(1);
    expect(chosen[0].toString()).toContain("var(--clean-segment-active-shadow)");
    expect(chosen[0].toString()).not.toContain("font-weight");
  });

  it("montre la vue du tableau de bord en icônes seules, items carrés, sans texte ajouté", () => {
    expect(rulesFor(/dashboard-mode-toggle[^,]*::(after|before)/)).toHaveLength(0);
    const items = rulesFor(/^:root\[data-skin="clean"\] \.dashboard-mode-toggle > button$/);
    expect(items).toHaveLength(1);
    expect(items[0].toString()).toContain("width: var(--clean-segment-item)");
    expect(items[0].toString()).toContain("padding-inline: 0");
    root.walkDecls("content", (decl) => {
      expect(decl.value === '""' || decl.value.startsWith("attr(")).toBe(true);
    });
  });
});

describe("thème Clean : icônes", () => {
  const SUBSTITUTIONS: [target: RegExp, icon: string][] = [
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

  it("pose l'icône de page sur la ligne du titre", () => {
    const tile = rulesFor(/\[data-slot="page-header"\] \.premium-page-icon$/).map((rule) => rule.toString()).join("");
    expect(tile).toContain("height: 28px");
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
    // 31 October: the chart draws one series at a time, as the reference does;
    // the previous period is read in its readout, never as a second line.
    const chart = readFileSync("src/modules/dashboard/components/focus-trend-chart.tsx", "utf8");
    expect(chart).toMatch(/la période précédente/);
    expect(chart).not.toMatch(/focusPrevious/);
  });

  it("donne à chaque carte de la première rangée sa propre courbe, jamais la même forme deux fois", () => {
    const source = readFileSync("src/modules/dashboard/components/premium-analytics.tsx", "utf8");
    // 31 October: Trésorerie and Consultations drew the same cumulative area (Clean), and three cards the same
    // bars (Premium). Since the Stat Grid: a curve only where a card has its own series, never a copy.
    expect(source).toContain("<StatGrid");
    expect(source).not.toMatch(/<MiniBars /);
    expect(source).not.toMatch(/<MiniArea /);
    const figures = readFileSync("src/modules/dashboard/model/key-figures.ts", "utf8");
    // Four different series, one per card: receipts as a running total, appointments and actions as a count
    // per day, what is still to collect as its level at each date.
    expect(figures).toMatch(/trend: running/);
    expect(figures).toMatch(/trend: trend\.appointments/);
    expect(figures).toMatch(/trend: trend\.actions/);
    expect(figures).toMatch(/trend: trend\.receivables/);
    expect(figures.match(/trend:/g)).toHaveLength(4);
    // One template on rows of fixed height, so label, figure with its curve, badge, line and goal bar fall on
    // the same lines from one card to the next, whatever the text.
    const card = readFileSync("src/components/ui/stat-grid.tsx", "utf8");
    expect(card).toContain('className="flex h-6 items-center gap-2');
    expect(card).toContain('className="flex h-8 items-center justify-between gap-3"');
    expect(card).toContain('className="flex h-5 items-center"');
    expect(card).toContain('className="h-4 truncate text-xs leading-4 text-muted-foreground"');
    expect(card).toContain("mt-auto");
  });

  it("dessine la capacité en unités avec les jetons Clean, et laisse la vue d'ensemble des finances à la carte de graphique commune", () => {
    const units = rulesFor(/stay-occupancy-units > span,/).map((rule) => rule.toString()).join("");
    expect(units).toContain("var(--clean-segment-track)");
    // The overview is the shared chart card (grey band, white panel) and carries no Clean-only rule of its own.
    expect(rulesFor(/\.finance-overview/)).toHaveLength(0);
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
    vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
    vi.stubGlobal("window", { dispatchEvent: () => true });
    return { storage, dataset };
  }

  it("Clean par défaut sur une installation neuve, un seul réglage décide du défaut", () => {
    const { storage } = environment();
    expect(DEFAULT_SKIN).toBe("clean");
    expect(normalizeSkin(undefined)).toBe(DEFAULT_SKIN);
    expect(normalizeSkin("premium")).toBe("premium");
    expect(getThemeConfig().skin).toBeUndefined();
    expect(normalizeSkin(getThemeConfig().skin)).toBe("clean");
    // Nothing is stored for the mode: the provider's default (light) applies.
    expect(storage.get("theme")).toBeUndefined();
  });

  it("une installation existante passe à Clean et garde son mode sombre", () => {
    const { storage } = environment();
    storage.set("baitari-premium-default-v1", "true");
    storage.set("theme-config", JSON.stringify({ density: "compact" }));
    // The removed density setting is dropped; the skin is migrated to Clean.
    expect(getThemeConfig()).toEqual({ skin: "clean" });
    expect(storage.get("theme")).toBe("dark");
  });

  it("une installation existante sans configuration enregistrée passe aussi à Clean", () => {
    const { storage } = environment();
    storage.set("baitari-premium-default-v1", "true");
    expect(getThemeConfig().skin).toBe("clean");
    expect(storage.get("theme")).toBe("dark");
  });

  it("n'écrase aucun choix déjà enregistré", () => {
    const { storage } = environment();
    storage.set("baitari-premium-default-v1", "true");
    storage.set("theme-config", JSON.stringify({ ...DEFAULT_THEME, skin: "clean" }));
    storage.set("theme", "light");
    expect(getThemeConfig().skin).toBe("clean");
    expect(storage.get("theme")).toBe("light");
  });

  it("ne fige qu'une fois : un réglage fait ensuite sur une installation neuve reste à Clean", () => {
    const { storage } = environment();
    getThemeConfig();
    storage.set("theme-config", JSON.stringify({ ...DEFAULT_THEME, accent: "rose" }));
    expect(normalizeSkin(getThemeConfig().skin)).toBe("clean");
    expect(storage.get("theme")).toBeUndefined();
  });

  it("pose la peau sur la racine, toujours sur le style Premium", () => {
    const { dataset } = environment();
    applyTheme({ ...DEFAULT_THEME, skin: "clean" }, false);
    expect(dataset.skin).toBe("clean");
    expect(dataset.visualStyle).toBe("premium");
    applyTheme({ ...DEFAULT_THEME, skin: "premium" }, false);
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
