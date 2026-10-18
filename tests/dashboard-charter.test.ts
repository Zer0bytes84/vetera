import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The dashboard takes every colour from the charter tokens (premium.css), so
 * light, dark and the accent follow it. No hex, rgb() or Tailwind palette
 * colour may be written in the files below.
 */
const CSS_FILES = [
  "src/modules/dashboard/components/premium-analytics.css",
  "src/modules/dashboard/components/clinical/clinical-workspace.css",
  "src/modules/dashboard/v2/kpi-mini-chart.css",
];
const TSX_FILES = [
  "src/modules/dashboard/components/premium-analytics.tsx",
  "src/modules/dashboard/components/dashboard-mode-toggle.tsx",
  "src/modules/dashboard/components/dashboard-layout-manager.tsx",
  "src/modules/dashboard/components/clinical/actions-module.tsx",
  "src/modules/dashboard/components/clinical/shared.tsx",
  "src/modules/dashboard/components/clinical/cash-module.tsx",
  "src/modules/dashboard/components/clinical/day-module.tsx",
  "src/modules/dashboard/components/clinical/patients-module.tsx",
  "src/modules/dashboard/components/clinical/trends-module.tsx",
];

const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "");

describe("dashboard uses the charter tokens", () => {
  it.each(CSS_FILES)("%s has no hard-coded colour", (file) => {
    const css = stripComments(readFileSync(file, "utf8"));
    expect(css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(/g) ?? []).toEqual([]);
  });

  it.each(TSX_FILES)("%s has no palette colour or literal", (file) => {
    const tsx = readFileSync(file, "utf8");
    const palette =
      /\b(?:bg|text|border|ring|outline|from|to|fill|stroke|shadow)-(?:white|black|zinc|slate|gray|neutral|stone|sky|blue|emerald|green|rose|red|amber|orange|yellow|violet|purple|cyan|teal|indigo|pink)(?:-\d{2,3})?(?:\/[\d.[\]]+)?\b/g;
    expect(tsx.match(palette) ?? []).toEqual([]);
    expect(tsx.match(/["'`]#[0-9a-fA-F]{3,8}["'`]/g) ?? []).toEqual([]);
  });
});
