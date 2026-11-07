import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { RevenueChartWidget } from "../../src/modules/dashboard/components/revenue-chart-widget";
import type { FocusPoint } from "../../src/modules/dashboard/components/focus-trend-chart";

const points: FocusPoint[] = [
  { label: "1 oct.", long: "jeu. 1 octobre 2026", receipts: 12000, visits: 2, previousReceipts: 6000, previousVisits: 1 },
  { label: "2 oct.", long: "ven. 2 octobre 2026", receipts: 14700, visits: 4, previousReceipts: 0, previousVisits: 0 },
];
const render = (kinds = [{ key: "consultation", name: "Consultation", count: 6, share: 100 }]) =>
  renderToStaticMarkup(<RevenueChartWidget footer={<p>prévision et pied</p>} kinds={kinds} periodControl={<button>période</button>} points={points} rangeLabel="Du 1 au 2 oct. 2026" />);

it("l'en-tête : titre, contexte de la période, total des recettes de la période à droite", () => {
  const html = render();
  expect(html).toContain("Recettes &amp; activité");
  expect(html).toContain("Du 1 au 2 oct. 2026");
  expect(html).toMatch(/sr-only">26\s700\sDA</);
});
it("la vue par défaut est la courbe fusionnée : recettes et consultations", () => {
  const html = render();
  expect(html).toContain('aria-label="Courbe" aria-pressed="true"');
  expect(html).toContain("Recettes");
  expect(html).toContain("Consultations");
  // 26 700 DA contre 6 000 DA : +345 % ; 6 consultations contre 1 : +500 %.
  expect(html).toMatch(/\+345 % contre 6\s000 DA la période précédente/);
  expect(html).toContain("6 · +500 % contre 1 la période précédente");
});
it("propose courbe, barres, aires et la répartition par type d'acte, sur les mêmes données", () => {
  const html = render();
  for (const label of ["Courbe", "Barres", "Aires", "Répartition des consultations par type d’acte"]) expect(html).toContain(`aria-label="${label}"`);
  expect(html.match(/aria-pressed="false"/g)?.length).toBeGreaterThanOrEqual(3);
});
it("garde le sélecteur de période et le pied (prévision du mois, lien Finances)", () => {
  const html = render();
  expect(html).toContain("période");
  expect(html).toContain("prévision et pied");
});
it("le conteneur garde le nom accessible de l'ancien widget", () => {
  expect(render()).toContain('<section aria-label="Recettes &amp; activité"');
});
it("sans consultation dans la période, le widget s'affiche sans erreur", () => {
  expect(() => render([])).not.toThrow();
});
