import { readFileSync } from "node:fs";
import postcss from "postcss";
import { describe, expect, it } from "vitest";
import { CLEAN_FONT_SETS, normalizeCleanFont } from "../src/lib/theme-store";

// Finish of 5 November 2026 (docs/recus/2026-11-05/finition-espacements/):
// one spacing scale, one radius scale, measured on the running app. These
// tests keep the finishing block on its scales and the type sets Clean-only.
const CLEAN = readFileSync("src/design-system/clean.css", "utf8");
const MARK = "Finish of 5 November 2026";
const FINISH = postcss.parse(CLEAN.slice(CLEAN.lastIndexOf("/*", CLEAN.indexOf(MARK))));
const SPACE = new Set([0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48]);
const RADIUS = new Set([4, 6, 8, 10, 12]);
const pixels = (value: string) => [...value.matchAll(/(-?\d+(?:\.\d+)?)px/g)].map((match) => Math.abs(Number(match[1])));

describe("thème Clean : finition mesurée", () => {
  it("existe et reste sous la portée Clean", () => {
    expect(CLEAN).toContain(MARK);
    FINISH.walkRules((rule) => {
      for (const selector of rule.selectors) expect(selector.trim().startsWith(':root[data-skin="clean"]'), selector).toBe(true);
    });
  });

  it("ne pose aucun espacement hors de l'échelle 2 4 6 8 12 16 20 24 32 40 48", () => {
    const off: string[] = [];
    FINISH.walkDecls(/^(padding|margin|gap|row-gap|column-gap)/, (decl) => {
      for (const px of pixels(decl.value)) if (!SPACE.has(px)) off.push(`${decl.prop}: ${decl.value}`);
    });
    expect(off).toEqual([]);
  });

  it("ne pose aucun rayon hors de l'échelle 4 6 8 10 12", () => {
    const off: string[] = [];
    FINISH.walkDecls("border-radius", (decl) => {
      for (const px of pixels(decl.value)) if (!RADIUS.has(px)) off.push(decl.value);
    });
    expect(off).toEqual([]);
  });

  it("passe devant tabs.css pour les pistes segmentées (32 px, éléments 28 px)", () => {
    const tabs = readFileSync("src/design-system/tabs.css", "utf8");
    expect(tabs).toContain(':root:root:root [data-tabs-style="segmented"]');
    const track = FINISH.nodes.find(
      (node): node is postcss.Rule => node.type === "rule" && node.selector.endsWith('[data-skin][data-skin] [data-tabs-style="segmented"]'),
    );
    expect(track?.toString()).toContain("var(--clean-control)");
  });

  it("donne au gris discret un contraste AA sur la feuille (#737373 sur #fafafa)", () => {
    expect(CLEAN).toMatch(/--clean-ink-quiet: #737373;/);
  });
});

describe("thème Clean : jeux de polices", () => {
  it("garde Inter par défaut et ignore une valeur inconnue", () => {
    expect(normalizeCleanFont(undefined)).toBe("inter");
    expect(normalizeCleanFont("comic")).toBe("inter");
    expect(Object.keys(CLEAN_FONT_SETS)).toEqual(["inter", "geist", "plex", "signature"]);
    const store = readFileSync("src/lib/theme-store.ts", "utf8");
    expect(store).toContain("root.dataset.cleanFont = normalizeCleanFont(config.cleanFont);");
  });

  it("ne déclare les jeux que sous la portée Clean, et jamais pour Inter", () => {
    const sets = postcss.parse(CLEAN);
    const selectors: string[] = [];
    sets.walkRules(/data-clean-font/, (rule) => selectors.push(...rule.selectors));
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) {
      expect(selector.startsWith(':root[data-skin="clean"]')).toBe(true);
      expect(selector).not.toContain('"inter"');
    }
  });

  it("n'appelle aucun service de polices en ligne", () => {
    const index = readFileSync("src/index.css", "utf8");
    expect(`${index}\n${CLEAN}`).not.toMatch(/fonts\.googleapis|fonts\.gstatic|use\.typekit|https?:\/\/[^)"']*\.woff2?/);
    expect(index).toContain('@import "@fontsource-variable/geist-mono"');
    expect(index).toContain('@import "@fontsource-variable/ibm-plex-sans"');
  });
});
