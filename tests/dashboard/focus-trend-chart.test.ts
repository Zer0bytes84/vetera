import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { FocusTrendChart, scaleTop, seriesChange } from "../../src/modules/dashboard/components/focus-trend-chart";

describe("graphique fusionné recettes et consultations", () => {
  it("donne cinq pas égaux jusqu'à un sommet rond, même pour une série vide ou minuscule", () => {
    expect(scaleTop(0)).toEqual({ top: 5, ticks: [0, 1, 2, 3, 4, 5] });
    expect(scaleTop(1).top).toBe(5);
    const big = scaleTop(26_700);
    expect(big.ticks).toHaveLength(6);
    expect(big.top).toBeGreaterThanOrEqual(26_700);
    expect(big.ticks[5]).toBe(big.top);
  });
  it("calcule la variation seulement s'il y a une période précédente non nulle", () => {
    expect(seriesChange(150, 100, true)).toBe(50);
    expect(seriesChange(50, 100, true)).toBe(-50);
    expect(seriesChange(5, 0, true)).toBeNull();
    expect(seriesChange(5, 4, false)).toBeNull();
  });
  it("affiche les deux chiffres de tête sans bouton de bascule, et reste vide sans erreur sans données", () => {
    const html = renderToStaticMarkup(createElement(FocusTrendChart, { points: [] }));
    expect(html).toContain("Recettes encaissées");
    expect(html).toContain("Consultations");
    expect(html).not.toContain("Série affichée");
    expect(html).not.toContain("aria-pressed");
  });
  it("totalise les deux séries et compare chacune à sa période précédente", () => {
    const points = [
      { label: "1 oct.", long: "1 octobre", receipts: 100, visits: 1, previousReceipts: 50, previousVisits: 2 },
      { label: "2 oct.", long: "2 octobre", receipts: 300, visits: 3, previousReceipts: 50, previousVisits: 2 },
    ];
    const html = renderToStaticMarkup(createElement(FocusTrendChart, { points }));
    // Recettes : 400 contre 100 ; consultations : 4 contre 4.
    expect(html).toContain("<b>+300 %</b>");
    expect(html).toContain("<b>0 %</b>");
    expect(html).toContain("contre 100 DA la période précédente");
    expect(html).toContain("contre 4 la période précédente");
  });
});
