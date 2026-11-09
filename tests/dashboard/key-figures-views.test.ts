import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const source = readFileSync("src/modules/dashboard/components/premium-analytics.tsx", "utf8");

it("les deux vues de la rangée « Chiffres clés » portent des noms français", () => {
  // Deux icônes (jauge, courbe) : le nom français est l'étiquette annoncée et l'infobulle.
  expect(source).toContain('label: "Indicateurs"');
  expect(source).toContain('label: "Mini-graphiques"');
  expect(source).toContain("aria-label={label}");
  // Le nom des vues n'est plus « KPI » ni « Sparklines » (les identifiants du code, eux, restent).
  expect(source).not.toMatch(/label: "KPI"/);
  expect(source).not.toMatch(/"Sparklines"\s*}/);
});

it("la vue Indicateurs montre les barres d'objectif, la vue Mini-graphiques les courbes, jamais les deux", () => {
  expect(source).toContain('goals={keyView === "kpi"}');
  expect(source).toContain('sparklines={keyView === "sparklines"}');
});

it("le widget ouvre sur les indicateurs (les barres d'objectif), pas sur les mini-graphiques", () => {
  expect(source).toContain('useState<"kpi" | "sparklines">("kpi")');
});
