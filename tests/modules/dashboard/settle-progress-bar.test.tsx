import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SettleProgressBar } from "../../../src/modules/dashboard/v2/settle-widgets";

describe("Barre segmentée de trésorerie Premium", () => {
  it("garde une largeur minimale pour les petits soldes jaune et bleu, avec leurs valeurs exactes", () => {
    const html = renderToStaticMarkup(<SettleProgressBar segments={[
      { value: 548400, tone: "ink", label: "Encaissé" },
      { value: 1500, tone: "amber", label: "En cours" },
      { value: 1, tone: "blue", label: "En retard" },
    ]} />);
    expect(html).toContain('data-tone="ink"');
    expect(html).toContain('data-tone="amber"');
    expect(html).toContain('data-tone="blue"');
    expect(html).toContain('data-value="1500"');
    expect(html).toContain('data-value="1"');
    expect(html.match(/min-width:6px;flex-shrink:1/g)).toHaveLength(3);
    expect(html).toContain("bg-amber-400");
    expect(html).toContain("bg-blue-400");
  });
  it("ne fabrique pas de segment pour une catégorie à zéro", () => {
    const html = renderToStaticMarkup(<SettleProgressBar segments={[
      { value: 100, tone: "ink" }, { value: 0, tone: "amber" }, { value: 0, tone: "blue" },
    ]} />);
    expect(html).toContain("width:100%");
    expect(html).not.toContain('data-tone="amber"');
    expect(html).not.toContain('data-tone="blue"');
  });
  it("reste neutre sans données au lieu de montrer une barre entièrement encaissée", () => {
    const html = renderToStaticMarkup(<SettleProgressBar segments={[
      { value: 0, tone: "ink" }, { value: 0, tone: "amber" }, { value: 0, tone: "blue" },
    ]} />);
    expect(html).toContain("Aucun montant à répartir");
    expect(html).not.toContain("data-tone");
    expect(html).not.toContain("NaN");
  });
  it("ignore les valeurs invalides ou négatives sans casser le rendu", () => {
    const html = renderToStaticMarkup(<SettleProgressBar segments={[
      { value: -10, tone: "ink" }, { value: Infinity, tone: "blue" }, { value: NaN, tone: "amber" },
    ]} />);
    expect(html).not.toContain("data-tone");
    expect(html).not.toContain("width:NaN");
    expect(html).toContain('role="img"');
  });
});
