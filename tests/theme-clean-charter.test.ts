import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyTheme,
  DEFAULT_THEME,
  getThemeConfig,
} from "../src/lib/theme-store";
import { classNames, hasClassName, selectorText } from "./helpers/code-text";

const SIDEBAR_MENU_BUTTON = /sidebar-menu-button"\]$/;
const TABLE_CELLS = /:is\(th, td\)/;
const ICON_STROKE_TOKEN = /stroke-width: var\(--clean-icon-stroke\)/;
const SIDEBAR_ICON_SVGS =
  /\.app-sidebar \.sidebar-nav-icon svg, \.app-sidebar \.premium-shortcut-icon\)$/;
const NAV_ICON_WIDTH =
  /sidebar-nav-icon svg[\s\S]*?width: var\(--clean-nav-icon\) !important/;
const SIDEBAR_MENU_BUTTON_SVG = /sidebar-menu-button"\] svg$/;
const ACTIVE_ITEM_SVG = /\[data-active\]:not\(\[data-active="false"\]\) svg$/;
const DISABLED_PSEUDO = /:disabled/;
const ARIA_DISABLED = /aria-disabled/;
const PAINTED_SURFACE_VALUE =
  /^#|rgb\(|color-mix|shadow|var\(--clean-surface\)/;
const DEPTH_TOKEN_NAME =
  /shadow|glass-(top|bottom|edge|rule|drop)|segment-(track|active)/;
const PURE_BLACK = /#000(000)?\b|rgb\(0 0 0/;
const DARK_SCOPED_SELECTOR = /:not\(\.dark\)|\.dark /;
const DARK_BLOCK_SELECTOR = /\.dark,$|\.dark,\s/;
const SIDEBAR_FRAME = /sidebar-wrapper"\]$|sidebar-inset"\]$/;
const HAIRLINE_SHADOW_008 = /0\.5px rgb\(0 0 0 \/ 0\.08\).*0\.04\)/;
const SHELL_SCROLL_PANEL = /shell-scroll-panel/;
const SIDEBAR_INSET = /sidebar-inset/;
const CLEAN_ROOT_TOKENS = /^:root\[data-skin="clean"\],/;
const SIDEBAR_CONTAINER_AFTER = /sidebar-container"\]::after/;
const APP_SIDEBAR_CONTAINER =
  /\.app-sidebar, \[data-slot="sidebar-container"\]/;
const INTER_OPSZ_WOFF2 = /inter-latin(-ext)?-opsz-normal\.woff2/;
const INTER_FONT_VALUE = /Inter Variable|var\(--app-font-(sans|heading)\)/;
const LEGACY_FONT = /Geist|Space Grotesk/;
const INTER_CLEAN_STACK = /^"Inter Clean", "Inter Variable"/;
const KPI_VALUE = /\.kpiValue/;
const TABLE_SELECTOR = /table/;
const HAIRLINE_SHADOW_01 = /0\.5px rgb\(0 0 0 \/ 0\.1\)/;
const TABS_TRIGGER_CHILD = /> :is\(\[data-slot="tabs-trigger"\]/;
const PRESSED_OR_CURRENT =
  /\[aria-pressed="true"\][^)]*\[aria-current="page"\]\)$/;
const MODE_TOGGLE_PSEUDO = /dashboard-mode-toggle[^,]*::(after|before)/;
const CLEAN_MODE_TOGGLE_BUTTON =
  /^:root\[data-skin="clean"\] \.dashboard-mode-toggle > button$/;
const ORANGE_TONE_SVG = /data-tone="orange"\] svg/;
const OPEN_EMERGENCIES_KPI = /data-kpi="Urgences ouvertes"\]/;
const FOLLOW_UPS_KPI = /data-kpi="Relances à prévoir"\]/;
const OVERDUE_KPI = /data-kpi="En retard"\]/;
const CLINICAL_TAB_SVG = /value="clinical"\] svg/;
const CLEAN_ROOT_IS = /^:root\[data-skin="clean"\] :is\(/;
const IS_DIRECT_CHILDREN = /\) > \*$/;
const PAGE_HEADER_ICON = /\[data-slot="page-header"\] \.premium-page-icon$/;
const HERO_TITLE = /\.heroTitle$/;
const FONT_SIZE_25PX_OR_MORE = /font-size: (2[5-9]|[3-9]\d)px/;
const CLEAN_HIDDEN_SELECTOR = /\[data-clean-hidden\]$/;
const CSS_FILE = /\.css$/;
const CLEAN_HIDDEN_ATTRIBUTE = /data-clean-hidden/;
const KPI_DELTA_CHIP = /\.kpiSub \.delta > span:not/;
const PREVIOUS_PERIOD_WORDING = /la période précédente/;
const FOCUS_PREVIOUS = /focusPrevious/;
const MINI_BARS_ELEMENT = /<MiniBars /;
const MINI_AREA_ELEMENT = /<MiniArea /;
const RUNNING_TREND = /trend: running/;
const APPOINTMENTS_TREND = /trend: trend\.appointments/;
const ACTIONS_TREND = /trend: trend\.actions/;
const RECEIVABLES_TREND = /trend: trend\.receivables/;
const OCCUPANCY_UNITS = /stay-occupancy-units > span,/;
const FINANCE_OVERVIEW = /\.finance-overview/;
const APP_HEADER = /\[data-slot="app-header"\]$/;
const CARD_MORE_LINK = /\.card \.moreLink$/;
const CARD_MORE_LINK_REVEALED = /\.card:is\(:hover, :focus-within\) \.moreLink/;
const HIDDEN_MORE_LINK_RULE = /\.moreLink[^{]*\{[^}]*opacity:\s*0[;\s]/;
const TS_FILE = /\.tsx?$/;
const THEME_OWNER_FILES =
  /lib\/theme-store\.ts$|lib\/sidebar-tone\.ts$|components\/app-theme-picker\.tsx$|components\/Parametres\.tsx$/;
const SKIN_CHECK = /dataset\.skin|data-skin|skin\s*===|"clean"/;

const CLEAN = readFileSync("src/design-system/clean.css", "utf8");
const SCOPE = ':root[data-skin="clean"]';
const DARK = ':root[data-skin="clean"].dark';
// The sidebar takes the dark set unless Appearance forces it light (data-sidebar-tone).
const SIDEBAR =
  ':root[data-skin="clean"]:where(:not([data-sidebar-tone="light"])) :is([data-slot="sidebar"], [data-sidebar="sidebar"][data-mobile="true"])';
const root = postcss.parse(CLEAN);
// Selectors are read without their layout: a formatter may split them over several lines.
root.walkRules((rule) => {
  rule.selector = selectorText(rule.selector);
});
const tokensOf = (selector: string) => {
  const found = new Map<string, string>();
  root.walkRules((rule) => {
    if (!rule.selectors.includes(selector)) {
      return;
    }
    rule.walkDecls((decl) => {
      if (decl.prop.startsWith("--clean-")) {
        found.set(decl.prop, decl.value);
      }
    });
  });
  return found;
};
const declarations = tokensOf(SCOPE);
const darkDeclarations = tokensOf(DARK);
const rulesFor = (pattern: RegExp) => {
  const found: postcss.Rule[] = [];
  root.walkRules((rule) => {
    if (pattern.test(rule.selector)) {
      found.push(rule);
    }
  });
  return found;
};
const files = (dir: string, ext: RegExp): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    // Paths are compared to forward-slash literals: normalise the separators join() produces on Windows.
    return statSync(path).isDirectory()
      ? files(path, ext)
      : ext.test(name)
        ? [path.replace(/\\/g, "/")]
        : [];
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
    const nav = rulesFor(SIDEBAR_MENU_BUTTON).flatMap((rule) => rule.nodes);
    expect(
      nav.some(
        (n) => n.type === "decl" && n.prop === "height" && n.value === "30px"
      )
    ).toBe(true);
    const table = rulesFor(TABLE_CELLS).flatMap((rule) => rule.nodes);
    expect(
      table.some(
        (n) =>
          n.type === "decl" &&
          n.prop === "height" &&
          n.value.includes("--clean-row-table")
      )
    ).toBe(true);
  });

  it("dessine les icônes de navigation en trait de 1,5 et 16 px", () => {
    expect(declarations.get("--clean-icon-stroke")).toBe("1.5px");
    expect(declarations.get("--clean-nav-icon")).toBe("16px");
    expect(CLEAN).toMatch(ICON_STROKE_TOKEN);
    // premium-sidebar.css pins the sidebar strokes at 1 !important; Clean must answer in kind.
    const pinned = rulesFor(SIDEBAR_ICON_SVGS).flatMap((rule) => rule.nodes);
    // The declaration that wins: the last stroke-width of the rule.
    const strokes = pinned.filter(
      (n): n is postcss.Declaration =>
        n.type === "decl" && n.prop === "stroke-width"
    );
    expect(strokes.at(-1)?.value).toBe("var(--clean-icon-stroke)");
    expect(strokes.at(-1)?.important).toBe(true);
    expect(CLEAN).toMatch(NAV_ICON_WIDTH);
  });

  it("donne aux icônes de navigation au repos le gris de leur libellé, l'actif en gris fort", () => {
    const rest = rulesFor(SIDEBAR_MENU_BUTTON_SVG).flatMap(
      (rule) => rule.nodes
    );
    expect(
      rest.some(
        (n) =>
          n.type === "decl" &&
          n.prop === "color" &&
          n.value === "var(--clean-ink)"
      )
    ).toBe(true);
    const active = rulesFor(ACTIVE_ITEM_SVG).flatMap((rule) => rule.nodes);
    expect(
      active.some(
        (n) =>
          n.type === "decl" &&
          n.prop === "color" &&
          n.value === "var(--clean-ink-strong)"
      )
    ).toBe(true);
  });

  it("trace les masques de substitution au même trait de 1,5", () => {
    const masks = [...declarations.entries()].filter(
      ([name]) =>
        name.startsWith("--clean-icon-") && name !== "--clean-icon-stroke"
    );
    expect(masks.length).toBeGreaterThan(0);
    for (const [name, value] of masks) {
      expect(value, name).toContain("stroke-width='1.5'");
    }
  });

  it("réserve le quatrième gris au texte et aux icônes désactivés", () => {
    const uses = CLEAN.split("var(--clean-ink-disabled)").length - 1;
    expect(uses).toBe(2);
    for (const rule of rulesFor(DISABLED_PSEUDO)) {
      expect(rule.selector).toMatch(ARIA_DISABLED);
    }
  });
});

describe("thème Clean : déclinaison sombre", () => {
  it("redéfinit chaque jeton de couleur avec le même nom, et rien d'autre", () => {
    const colours = [...declarations.keys()].filter(
      (name) =>
        PAINTED_SURFACE_VALUE.test(declarations.get(name)!) ||
        DEPTH_TOKEN_NAME.test(name)
    );
    for (const name of darkDeclarations.keys()) {
      expect(declarations.has(name)).toBe(true);
    }
    for (const name of colours) {
      expect(darkDeclarations.has(name), name).toBe(true);
    }
    for (const name of [
      "--clean-control",
      "--clean-row-table",
      "--clean-nav-item",
      "--clean-font-ui",
      "--clean-sheet-radius",
    ]) {
      expect(darkDeclarations.has(name)).toBe(false);
    }
  });

  it("garde des noirs teintés, sans noir pur ni ombre portée", () => {
    for (const [name, value] of darkDeclarations) {
      expect(value, name).not.toMatch(PURE_BLACK);
    }
    expect(darkDeclarations.get("--clean-frame")).toBe("#0c0d0f");
    expect(darkDeclarations.get("--clean-sheet")).toBe("#111214");
    expect(darkDeclarations.get("--clean-surface")).toBe("#171719");
    expect(darkDeclarations.get("--clean-ink-strong")).toBe("#f3f3f5");
  });

  it("aucune règle ne vise un seul mode : clair et sombre partagent le traitement", () => {
    const modeOnly: string[] = [];
    root.walkRules((rule) => {
      for (const selector of rule.selectors) {
        if (DARK_SCOPED_SELECTOR.test(selector)) {
          modeOnly.push(selector);
        }
      }
    });
    expect(modeOnly).toEqual([]);
  });
});

describe("thème Clean : sidebar sombre dans les deux déclinaisons", () => {
  const darkBlock = rulesFor(DARK_BLOCK_SELECTOR).find(
    (rule) =>
      rule.selectors.includes(DARK) &&
      rule.toString().includes("--clean-frame: #0c0d0f")
  );

  it("reçoit le bloc de jetons de Clean sombre, à deux exceptions près scopées à la sidebar", () => {
    expect(darkBlock?.selectors).toEqual([DARK, SIDEBAR]);
    const sidebarOnly = new Map<string, string>();
    root.walkRules((rule) => {
      if (rule.selectors.length === 1 && rule.selectors[0] === SIDEBAR) {
        rule.walkDecls((decl) => {
          if (decl.prop.startsWith("--")) {
            sidebarOnly.set(decl.prop, decl.value);
          }
        });
      }
    });
    // Exception sanctionnée (Catalyst, validée à l'œil le 2026-11-11) : la
    // sidebar seule approfondit son cadre en zinc-950 et son encre forte en
    // blanc pur ; aucun autre jeton ne lui est propre.
    expect([...sidebarOnly.keys()].sort()).toEqual([
      "--clean-frame",
      "--clean-ink-strong",
    ]);
    expect(sidebarOnly.get("--clean-frame")).toBe("#09090b");
    expect(sidebarOnly.get("--clean-ink-strong")).toBe("#ffffff");
  });

  it("fait pointer les jetons de Premium et de navigation vers Clean, dans la sidebar aussi", () => {
    const mapping = root.nodes.find(
      (node): node is postcss.Rule =>
        node.type === "rule" &&
        node.selectors.includes(SCOPE) &&
        node.selectors.includes(DARK) &&
        node.selectors.includes(SIDEBAR)
    );
    const text = mapping?.toString() ?? "";
    for (const token of [
      "--nav-ink",
      "--nav-text",
      "--nav-muted",
      "--nav-bg",
      "--nav-hover",
      "--sidebar",
      "--ink",
      "--primary",
      "--ring",
    ]) {
      expect(text, token).toMatch(
        new RegExp(`\\n\\s*${token}: var\\(--clean-`)
      );
    }
  });

  it("garde l'accent, l'anneau de focus et les teintes des pastilles du sombre", () => {
    expect(darkDeclarations.get("--clean-accent")).toBe("#3b1fe5");
    expect(darkDeclarations.get("--clean-ring")).toBe("#ffffff");
    expect(declarations.get("--clean-accent")).toBe("#191919");
    expect(declarations.get("--clean-ring")).toBe("#191919");
    expect(darkBlock?.toString()).toContain("--premium-blue: #88b3ef");
    expect(
      rulesFor(
        new RegExp(`^${SIDEBAR.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)
      ).some((rule) => rule.toString().includes("color-scheme: dark"))
    ).toBe(true);
  });

  it("prolonge la sidebar dans le cadre autour de la feuille, du même gris qu'en sombre", () => {
    expect(declarations.get("--clean-chrome")).toBe(
      darkDeclarations.get("--clean-frame")
    );
    expect(darkDeclarations.get("--clean-chrome")).toBe("var(--clean-frame)");
    const frame = rulesFor(SIDEBAR_FRAME)
      .map((rule) => rule.toString())
      .join("");
    expect(frame).toContain("var(--clean-chrome)");
    expect(frame).not.toContain("background: var(--clean-frame)");
  });
});

describe("thème Clean : feuille posée sur le cadre", () => {
  it("décolle la feuille de 8 px, coins de 12 px, ombre presque invisible", () => {
    expect(declarations.get("--clean-sheet-inset")).toBe("8px");
    expect(declarations.get("--clean-sheet-radius")).toBe("12px");
    expect(declarations.get("--clean-card-radius")).toBe("10px");
    expect(declarations.get("--clean-sheet-shadow")).toMatch(
      HAIRLINE_SHADOW_008
    );
    const panel = rulesFor(SHELL_SCROLL_PANEL)
      .map((rule) => rule.toString())
      .join("");
    expect(panel).toContain("var(--clean-sheet-radius)");
    expect(panel).toContain("var(--clean-sheet-shadow)");
    const inset = rulesFor(SIDEBAR_INSET)
      .map((rule) => rule.toString())
      .join("");
    expect(inset).toContain("var(--clean-sheet-inset)");
  });

  it("peint la bande au-dessus de l'en-tête du gris du cadre, malgré l'utilitaire en couche", () => {
    const layered: string[] = [];
    root.walkAtRules("layer", (layer) => {
      layer.walkRules(SIDEBAR_INSET, (rule) => {
        layered.push(rule.toString());
      });
    });
    expect(
      layered.some((rule) =>
        rule.includes("background: var(--clean-chrome) !important")
      )
    ).toBe(true);
  });

  it("aligne les champs de page sur les 32 px des contrôles voisins", () => {
    const tokens = rulesFor(CLEAN_ROOT_TOKENS)
      .map((rule) => rule.toString())
      .join("");
    expect(tokens).toContain("--field-height: var(--clean-control)");
  });

  it("pose la navigation sur le cadre, sans séparateur ni boîte", () => {
    const sidebar = rulesFor(SIDEBAR_CONTAINER_AFTER);
    expect(
      sidebar.some((rule) => rule.toString().includes("display: none"))
    ).toBe(true);
    expect(rulesFor(APP_SIDEBAR_CONTAINER)[0].toString()).toContain(
      "var(--clean-frame)"
    );
  });

  it("charge Inter avec son axe optique sous un nom propre à Clean", () => {
    const faces: string[] = [];
    root.walkAtRules("font-face", (rule) => {
      faces.push(rule.toString());
    });
    expect(faces).toHaveLength(2);
    for (const face of faces) {
      expect(face).toContain('font-family: "Inter Clean"');
      expect(face).toMatch(INTER_OPSZ_WOFF2);
    }
  });
});

describe("polices par thème", () => {
  const base = postcss.parse(
    readFileSync("src/design-system/premium.css", "utf8")
  );
  const baseTokens = new Map<string, string>();
  base.walkRules(':root[data-skin="clean"]', (rule) =>
    rule.walkDecls((decl) => baseTokens.set(decl.prop, decl.value))
  );
  const cleanTokens = new Map<string, string>();
  root.walkRules((rule) => {
    if (!(rule.selectors.includes(SCOPE) && rule.selectors.includes(DARK))) {
      return;
    }
    rule.walkDecls((decl) =>
      cleanTokens.set(
        decl.prop,
        `${decl.value}${decl.important ? " !important" : ""}`
      )
    );
  });

  it("met Inter Variable dans les jetons de base, Geist n'y est plus la police par défaut", () => {
    for (const token of [
      "--app-font-sans",
      "--app-font-heading",
      "--app-font-display",
      "--font-sans",
      "--font-heading",
    ]) {
      expect(baseTokens.get(token), token).toMatch(INTER_FONT_VALUE);
      expect(baseTokens.get(token), token).not.toMatch(LEGACY_FONT);
    }
  });

  it("passe Clean sur Inter pour l'interface, le corps et les titres", () => {
    expect(declarations.get("--clean-font-ui")).toMatch(INTER_CLEAN_STACK);
    expect(declarations.get("--clean-font-heading")).toBe(
      "var(--clean-font-ui)"
    );
    for (const token of ["--app-font-sans", "--font-sans"]) {
      expect(cleanTokens.get(token)).toBe("var(--clean-font-ui) !important");
    }
    for (const token of [
      "--app-font-heading",
      "--app-font-display",
      "--font-heading",
    ]) {
      expect(cleanTokens.get(token)).toBe(
        "var(--clean-font-heading) !important"
      );
    }
  });

  it("resserre l'interlettrage des titres et aligne les chiffres", () => {
    expect(declarations.get("--clean-tracking-title")).toBe("-0.022em");
    expect(declarations.get("--clean-tracking-heading")).toBe("-0.015em");
    const tabular = rulesFor(KPI_VALUE);
    expect(
      tabular.some(
        (rule) =>
          TABLE_SELECTOR.test(rule.selector) &&
          rule.toString().includes("tabular-nums")
      )
    ).toBe(true);
  });
});

describe("thème Clean : interrupteurs segmentés", () => {
  const FAMILY =
    ':is([data-tabs-style="segmented"], .dashboard-mode-toggle, .flow-density, .stock-view-toggle)';

  it("pose la piste, l'item de 28 px et l'ombre de la vue choisie", () => {
    expect(declarations.get("--clean-segment-track")).toBe("#ededee");
    expect(declarations.get("--clean-segment-item")).toBe("28px");
    expect(declarations.get("--clean-segment-radius")).toBe("6px");
    expect(declarations.get("--clean-segment-active-shadow")).toMatch(
      HAIRLINE_SHADOW_01
    );
  });

  it("donne le même traitement à toutes les familles, à la hauteur des contrôles voisins", () => {
    const track = rulesFor(
      new RegExp(`${FAMILY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)
    );
    expect(track).toHaveLength(1);
    const base = track
      .find((rule) => rule.toString().includes("--clean-segment-track"))!
      .toString();
    expect(base).toContain("height: var(--clean-control)");
    const item = rulesFor(TABS_TRIGGER_CHILD).filter((rule) =>
      rule.selector.includes(".flow-density")
    );
    expect(
      item.some((rule) =>
        rule.toString().includes("height: var(--clean-segment-item)")
      )
    ).toBe(true);
    const chosen = rulesFor(PRESSED_OR_CURRENT);
    expect(chosen).toHaveLength(1);
    expect(chosen[0].toString()).toContain(
      "var(--clean-segment-active-shadow)"
    );
    expect(chosen[0].toString()).not.toContain("font-weight");
  });

  it("montre la vue du tableau de bord en icônes seules, items carrés, sans texte ajouté", () => {
    expect(rulesFor(MODE_TOGGLE_PSEUDO)).toHaveLength(0);
    const items = rulesFor(CLEAN_MODE_TOGGLE_BUTTON);
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
    [ORANGE_TONE_SVG, "syringe"],
    [OPEN_EMERGENCIES_KPI, "siren"],
    [FOLLOW_UPS_KPI, "calendar-clock"],
    [OVERDUE_KPI, "clock-alert"],
    [CLINICAL_TAB_SVG, "calendar-heart"],
  ];

  it("liste chaque substitution, une icône Lucide par sens, et rien d'autre", () => {
    const icons = [...declarations.keys()].filter(
      (name) =>
        name.startsWith("--clean-icon-") && name !== "--clean-icon-stroke"
    );
    expect(icons.sort()).toEqual(
      SUBSTITUTIONS.map(([, icon]) => `--clean-icon-${icon}`).sort()
    );
    for (const [target, icon] of SUBSTITUTIONS) {
      const rule = rulesFor(target).find((found) =>
        found.toString().includes(`var(--clean-icon-${icon})`)
      );
      expect(rule, icon).toBeDefined();
    }
  });

  it("dessine la substitution à la place de l'icône d'origine, dans sa couleur et sa boîte", () => {
    const paint = rulesFor(CLEAN_ROOT_IS).find((rule) =>
      rule.toString().includes("mask: var(--clean-icon)")
    );
    expect(paint?.toString()).toContain("background: currentColor");
    expect(
      rulesFor(IS_DIRECT_CHILDREN).some((rule) =>
        rule.toString().includes("display: none")
      )
    ).toBe(true);
  });

  it("pose l'icône de page sur la ligne du titre", () => {
    const tile = rulesFor(PAGE_HEADER_ICON)
      .map((rule) => rule.toString())
      .join("");
    expect(tile).toContain("height: 28px");
  });
});

describe("thème Clean : titre d'accueil", () => {
  it("reste au plafond de 24 px, en graisse 500 pour compenser l'œil d'Inter", () => {
    const hero = rulesFor(HERO_TITLE)
      .map((rule) => rule.toString())
      .join("");
    expect(hero).toContain("font-size: 24px !important");
    expect(hero).toContain("font-weight: 500 !important");
    expect(hero).not.toMatch(FONT_SIZE_25PX_OR_MORE);
  });
});

describe("thème Clean : widgets", () => {
  const INDEX = readFileSync("src/index.css", "utf8");

  it("seul Clean masque ce qu'il remplace, et plus aucun élément n'est réservé à une peau", () => {
    expect(INDEX).not.toContain("data-clean-only");
    expect(
      rulesFor(CLEAN_HIDDEN_SELECTOR).some((rule) =>
        rule.toString().includes("display: none !important")
      )
    ).toBe(true);
    const elsewhere = files("src", CSS_FILE)
      .filter((file) => !file.endsWith("clean.css"))
      .filter((file) =>
        CLEAN_HIDDEN_ATTRIBUTE.test(readFileSync(file, "utf8"))
      );
    expect(elsewhere).toEqual([]);
  });

  it("porte la comparaison sous le chiffre et la période précédente en pointillé", () => {
    const chip = rulesFor(KPI_DELTA_CHIP)
      .map((rule) => rule.toString())
      .join("");
    expect(chip).toContain("border-radius: 999px");
    // 31 October: the chart draws one series at a time, as the reference does;
    // the previous period is read in its readout, never as a second line.
    const chart = readFileSync(
      "src/modules/dashboard/components/focus-trend-chart.tsx",
      "utf8"
    );
    expect(chart).toMatch(PREVIOUS_PERIOD_WORDING);
    expect(chart).not.toMatch(FOCUS_PREVIOUS);
  });

  it("donne à chaque carte de la première rangée sa propre courbe, jamais la même forme deux fois", () => {
    const source = readFileSync(
      "src/modules/dashboard/components/premium-analytics.tsx",
      "utf8"
    );
    // 31 October: Trésorerie and Consultations drew the same cumulative area (Clean), and three cards the same
    // bars (Premium). Since the Stat Grid: a curve only where a card has its own series, never a copy.
    expect(source).toContain("<StatGrid");
    expect(source).not.toMatch(MINI_BARS_ELEMENT);
    expect(source).not.toMatch(MINI_AREA_ELEMENT);
    const figures = readFileSync(
      "src/modules/dashboard/model/key-figures.ts",
      "utf8"
    );
    // Four different series, one per card: receipts as a running total, appointments and actions as a count
    // per day, what is still to collect as its level at each date.
    expect(figures).toMatch(RUNNING_TREND);
    expect(figures).toMatch(APPOINTMENTS_TREND);
    expect(figures).toMatch(ACTIONS_TREND);
    expect(figures).toMatch(RECEIVABLES_TREND);
    expect(figures.match(/trend:/g)).toHaveLength(4);
    // One template on rows of fixed height, so label, figure with its curve, badge, line and goal bar fall on
    // the same lines from one card to the next, whatever the text.
    const card = readFileSync("src/components/ui/stat-grid.tsx", "utf8");
    // The figure's row: these classes and possibly more.
    expect(
      classNames(card).some((found) =>
        ["flex", "h-6", "items-center", "gap-2"].every((name) =>
          found.has(name)
        )
      )
    ).toBe(true);
    expect(
      hasClassName(card, "flex h-8 items-center justify-between gap-3"),
      "flex h-8 items-center justify-between gap-3"
    ).toBe(true);
    expect(
      hasClassName(card, "flex h-5 items-center"),
      "flex h-5 items-center"
    ).toBe(true);
    expect(
      hasClassName(
        card,
        "h-4 truncate text-xs leading-4 text-muted-foreground"
      ),
      "h-4 truncate text-xs leading-4 text-muted-foreground"
    ).toBe(true);
    expect(card).toContain("mt-auto");
  });

  it("dessine la capacité en unités avec les jetons Clean, et laisse la vue d'ensemble des finances à la carte de graphique commune", () => {
    const units = rulesFor(OCCUPANCY_UNITS)
      .map((rule) => rule.toString())
      .join("");
    expect(units).toContain("var(--clean-segment-track)");
    // The overview is the shared chart card (grey band, white panel) and carries no Clean-only rule of its own.
    expect(rulesFor(FINANCE_OVERVIEW)).toHaveLength(0);
  });
});

describe("thème Clean : en-tête en verre", () => {
  it("floute l'en-tête au défilement avec un seul jeton", () => {
    expect(declarations.get("--clean-glass-blur")).toBe("20px");
    const header = rulesFor(APP_HEADER)
      .map((rule) => rule.toString())
      .join("");
    expect(header).toContain("blur(var(--clean-glass-blur))");
  });
});

describe("thème Clean : commandes de widget au survol", () => {
  it("masque les liens de carte au repos et les révèle au survol ou au focus, pointeur fin seulement", () => {
    const hidden = rulesFor(CARD_MORE_LINK);
    expect(hidden).toHaveLength(1);
    expect(hidden[0].toString()).toContain("opacity: 0");
    expect((hidden[0].parent as postcss.AtRule).params).toBe(
      "(hover: hover) and (pointer: fine)"
    );
    const shown = rulesFor(CARD_MORE_LINK_REVEALED);
    expect(shown).toHaveLength(1);
    expect(shown[0].toString()).toContain("opacity: 1");
  });

  it("ne masque les liens de carte dans aucun autre thème", () => {
    const elsewhere = files("src", CSS_FILE)
      .filter((file) => !file.endsWith("clean.css"))
      .filter((file) => HIDDEN_MORE_LINK_RULE.test(readFileSync(file, "utf8")));
    expect(elsewhere).toEqual([]);
  });
});

describe("thème Clean : pureté", () => {
  it("ne touche Premium ni en clair ni en sombre : chaque règle est sous la portée Clean", () => {
    const loose: string[] = [];
    root.walkRules((rule) => {
      for (const selector of rule.selectors) {
        if (!selector.trim().startsWith(SCOPE)) {
          loose.push(selector);
        }
      }
    });
    expect(loose).toEqual([]);
  });

  it("ne forke aucun composant : aucun code ne teste le thème Clean", () => {
    const forks = files("src", TS_FILE)
      .filter((file) => !THEME_OWNER_FILES.test(file))
      .filter((file) => SKIN_CHECK.test(readFileSync(file, "utf8")));
    expect(forks).toEqual([]);
  });
});

describe("thème Clean : réglage et défaut", () => {
  function environment() {
    const storage = new Map<string, string>();
    const dataset: Record<string, string> = {};
    vi.stubGlobal("document", {
      documentElement: { dataset, style: { setProperty: () => undefined } },
    });
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    vi.stubGlobal("window", { dispatchEvent: () => true });
    return { storage, dataset };
  }

  it("Clean et Inter par défaut sur une installation neuve, rien d'enregistré", () => {
    const { storage } = environment();
    expect(getThemeConfig()).toEqual({});
    // Nothing is stored for the mode: the provider's default (light) applies.
    expect(storage.get("theme")).toBeUndefined();
    expect(storage.has("theme-config")).toBe(false);
  });

  it("une installation existante garde son mode sombre", () => {
    const { storage } = environment();
    storage.set("baitari-premium-default-v1", "true");
    storage.set("theme-config", JSON.stringify({ density: "compact" }));
    // The removed density setting is dropped; no skin is stored any more.
    expect(getThemeConfig()).toEqual({});
    expect(storage.get("theme")).toBe("dark");
  });

  it("une installation existante sans configuration enregistrée garde aussi son mode sombre", () => {
    const { storage } = environment();
    storage.set("baitari-premium-default-v1", "true");
    expect(getThemeConfig()).toEqual({});
    expect(storage.get("theme")).toBe("dark");
  });

  it("n'écrase aucun choix déjà enregistré", () => {
    const { storage } = environment();
    storage.set("baitari-premium-default-v1", "true");
    storage.set(
      "theme-config",
      JSON.stringify({ ...DEFAULT_THEME, cleanFont: "geist" })
    );
    storage.set("theme", "light");
    expect(getThemeConfig()).toEqual({ cleanFont: "geist" });
    expect(storage.get("theme")).toBe("light");
  });

  it("ne fige qu'une fois : un réglage fait ensuite sur une installation neuve reste intact", () => {
    const { storage } = environment();
    getThemeConfig();
    storage.set(
      "theme-config",
      JSON.stringify({ ...DEFAULT_THEME, cleanFont: "plex" })
    );
    expect(getThemeConfig()).toEqual({ cleanFont: "plex" });
    expect(storage.get("theme")).toBeUndefined();
  });

  it("pose Clean sur la racine, quoi que la configuration contienne", () => {
    const { dataset } = environment();
    applyTheme({ ...DEFAULT_THEME }, false);
    expect(dataset.skin).toBe("clean");
    applyTheme({ ...DEFAULT_THEME, skin: "premium" } as never, true);
    expect(dataset.skin).toBe("clean");
    expect(dataset.visualStyle).toBeUndefined();
  });
});
