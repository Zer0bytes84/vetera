import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HexDensity, type HexCell } from "@/components/ui/hex-density";

const cell = (id: string, col: number, row: number, count: number): HexCell => ({ id, col, row, count, level: Math.min(count, 4), label: id, title: `Jour ${id}`, detail: `${count} rendez-vous` });
const cells = [cell("1", 0, 0, 0), cell("2", 1, 0, 3), cell("3", 0, 1, 1)];
const base = { cells, cols: 2, rows: 2, summary: "4 rendez-vous", title: "Activité de la clinique", subtitle: "Rendez-vous par jour" };

describe("hexagones de la clinique", () => {
  const html = renderToStaticMarkup(<HexDensity {...base} />);
  it("dessine un hexagone par cellule, vides comprises, sous le titre et le sous-titre", () => {
    expect(html.match(/data-level=/g)).toHaveLength(3);
    expect(html).toContain("Activité de la clinique");
    expect(html).toContain("Rendez-vous par jour");
    expect(html).toContain("bg-[var(--card-band)]");
  });
  it("la pastille de pied compte les jours remplis et le pic, en français", () => {
    expect(html).toContain("jours");
    expect(html).toMatch(/2<\/?[^>]*>?\s*jours|2 jours/);
    expect(html).toContain("Moins");
    expect(html).toContain("Plus");
  });
  it("ne montre plus de compteur à droite de l'en-tête et n'emploie ni le thème TuffUI ni l'anglais", () => {
    expect(html).not.toContain("Densest");
    expect(html).not.toContain("Fewer");
    expect(html).not.toContain("--brand");
    expect(html).toContain("var(--tone-blue)");
  });
  it("sans rendez-vous : cellules vides, pic à 0, pas de bandeau", () => {
    const empty = renderToStaticMarkup(<HexDensity {...base} cells={cells.map((c) => ({ ...c, count: 0, level: 0 }))} />);
    expect(empty).toContain("0 jours");
    expect(empty).not.toContain("Jour le plus chargé");
  });
});
