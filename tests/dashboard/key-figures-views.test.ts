import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const source = readFileSync("src/modules/dashboard/components/premium-analytics.tsx", "utf8");

it("les deux vues de la rangée « Chiffres clés » portent des noms français", () => {
  expect(source).toContain('"Indicateurs" : "Mini-graphiques"');
  // Le texte visible des boutons n'est plus « KPI » ni « Sparklines » (les identifiants du code, eux, restent).
  expect(source).not.toMatch(/>\s*\{view === "kpi" \? "KPI"/);
  expect(source).not.toMatch(/"Sparklines"\s*}/);
});

it("la vue Indicateurs montre les barres d'objectif, la vue Mini-graphiques les courbes, jamais les deux", () => {
  expect(source).toContain('goals={keyView === "kpi"}');
  expect(source).toContain('sparklines={keyView === "sparklines"}');
});

it("le widget ouvre sur les mini-graphiques, comme la rangée l'a toujours montrée", () => {
  expect(source).toContain('useState<"kpi" | "sparklines">("sparklines")');
});
