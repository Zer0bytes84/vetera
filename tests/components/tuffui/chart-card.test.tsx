import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartCard, fiveSteps, type ChartSeries } from "@/components/ui/chart-card";

const receipts: ChartSeries = { id: "r", label: "Recettes", values: [0, 3700, 7700], axis: "right", color: "var(--chart-blue)", format: (v) => `${v / 1000} k`, valueFormat: (v) => `${v} DA` };
const visits: ChartSeries = { id: "v", label: "Consultations", values: [0, 1, 3], axis: "left", color: "var(--chart-teal)", markers: true, detail: "4 · +100 %", valueFormat: (v) => `${v} consultation` };
const base = { data: { labels: ["1 oct.", "2 oct.", "3 oct."], series: [receipts, visits] }, title: "Recettes & activité" };

afterEach(() => vi.restoreAllMocks());

describe("cinq pas égaux, sur deux échelles qui partagent une grille", () => {
  it("monte à un sommet rond, jamais sous 5, même sans donnée", () => {
    expect(fiveSteps(0)).toEqual({ top: 5, ticks: [0, 1, 2, 3, 4, 5] });
    const big = fiveSteps(7700);
    expect(big.ticks).toHaveLength(6);
    expect(big.top).toBeGreaterThanOrEqual(7700);
    expect(big.ticks[5]).toBe(big.top);
    expect(fiveSteps(-3).top).toBe(5);
  });
});

describe("carte graphique", () => {
  it("l'en-tête porte l'icône, le titre, le contexte et la grande valeur à droite", () => {
    const html = renderToStaticMarkup(<ChartCard {...base} subtitle="Du 9 oct. au 7 nov. 2026" total="26 700 DA" type="line" />);
    expect(html).toContain("Recettes &amp; activité");
    expect(html).toContain("Du 9 oct. au 7 nov. 2026");
    expect(html).toContain('<span class="sr-only">26 700 DA</span>');
    expect(html).toContain("text-[1.5rem]");
    expect(html).toContain("bg-[var(--card-band)]");
  });
  it("la légende donne le détail de chaque série et laisse masquer l'une d'elles", () => {
    const html = renderToStaticMarkup(<ChartCard {...base} type="line" />);
    expect(html).toContain('aria-label="Séries"');
    expect(html).toContain("4 · +100 %");
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);
  });
  it("deux échelles : graduations de droite (en k) et de gauche, sur six lignes de grille", () => {
    const html = renderToStaticMarkup(<ChartCard {...base} type="line" />);
    expect(html).toContain('text-anchor="start"');
    expect(html).toContain("color-mix(in oklab, var(--chart-teal) 60%, var(--foreground))");
    expect((html.match(/stroke-dasharray="3 4"/g) ?? []).length).toBe(5);
  });
  it("le repère par jour n'est dessiné que sur la série qui le demande", () => {
    const html = renderToStaticMarkup(<ChartCard {...base} type="line" />);
    expect((html.match(/<circle/g) ?? []).length).toBe(3);
  });
  it("le tableau d'accessibilité est dans un <section>, jamais sous un <div> (la feuille de base viderait le panneau)", () => {
    const html = renderToStaticMarkup(<ChartCard {...base} type="line" />);
    expect(html).toContain('<section class="sr-only"><table');
    expect(html).not.toMatch(/<div[^>]*>\s*<table/);
    expect(html).toContain("<th scope=\"col\">Date</th>");
  });
  it("le tableau donne chaque point avec le titre long et la valeur formatée", () => {
    const html = renderToStaticMarkup(<ChartCard {...base} tooltipTitles={["mar. 1", "mer. 2", "jeu. 3"]} type="line" />);
    expect(html).toContain('<th scope="row">mer. 2</th>');
    expect(html).toContain("3700 DA");
    expect(html).toContain("3 consultation");
  });
  it("chaque type de graphique se dessine : courbe, barres, aires, répartition", () => {
    expect(renderToStaticMarkup(<ChartCard {...base} type="bar" />)).toContain("<rect");
    expect(renderToStaticMarkup(<ChartCard {...base} type="area" />)).toContain("-fill-");
    const donut = renderToStaticMarkup(
      <ChartCard data={{ labels: ["P"], series: [{ id: "a", label: "Consultation", values: [3], color: "red" }, { id: "b", label: "Vaccin", values: [1], color: "blue" }] }} donutLabel="Consultations" title="t" type="donut" />,
    );
    expect(donut).toContain("Consultations");
    expect(donut.match(/<circle/g)).toHaveLength(2);
    expect(donut).toContain("Total");
  });
  it("deux étiquettes identiques (« 12 oct. » à un an d'écart) ne produisent aucun avertissement de clé", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    renderToStaticMarkup(<ChartCard data={{ labels: ["12 oct.", "12 oct."], series: [{ id: "a", label: "A", values: [1, 2] }] }} title="t" type="bar" />);
    renderToStaticMarkup(<ChartCard data={{ labels: ["12 oct.", "12 oct."], series: [{ id: "a", label: "A", values: [1, 2] }] }} title="t" type="line" />);
    expect(errors).not.toHaveBeenCalled();
  });
  it("tient sans point, sans série, avec une série plate, et ne produit ni NaN ni Infinity", () => {
    for (const data of [{ labels: [], series: [] }, { labels: ["a"], series: [{ id: "a", label: "A", values: [0] }] }, { labels: ["a", "b"], series: [{ id: "a", label: "A", values: [5, 5] }] }]) {
      for (const type of ["bar", "line", "area", "donut"] as const) {
        const html = renderToStaticMarkup(<ChartCard data={data} title="t" type={type} />);
        expect(html).not.toMatch(/NaN|Infinity/);
      }
    }
  });
  it("le texte est en français et jamais sous 12 px", () => {
    const html = renderToStaticMarkup(<ChartCard {...base} type="line" />);
    expect(html).toContain("Flèches gauche et droite");
    expect(html).not.toContain("Use arrow keys");
    expect(html).not.toMatch(/font-size="(?:[0-9]|1[01])"/);
  });
  it("la barre d'outils et le pied s'affichent dans le panneau", () => {
    const html = renderToStaticMarkup(<ChartCard {...base} footer={<p>pied</p>} toolbar={<button>outil</button>} type="line" />);
    expect(html).toContain("outil");
    expect(html).toContain("pied");
  });
});
