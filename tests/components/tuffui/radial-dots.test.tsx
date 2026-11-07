import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { dotsFor, dotsPer, RadialDots } from "@/components/ui/radial-dots";

const series = [
  { id: "a", label: "Terminés", values: [2, 0, 1], color: "var(--tone-blue)" },
  { id: "b", label: "À venir", values: [1, 0, 0], color: "var(--foreground)" },
];
const base = { labels: ["Lun", "Mar", "Mer"], series, title: "Cette semaine", center: { value: "4", caption: "consultations" } };

describe("points exacts", () => {
  it("un point par rendez-vous tant que le plus chargé n'en a pas plus de 24", () => {
    expect(dotsPer(0)).toBe(1);
    expect(dotsPer(24)).toBe(1);
    expect(dotsPer(25)).toBe(2);
    expect(dotsPer(100)).toBe(5);
  });
  it("un secteur qui a quelque chose a toujours un point, un secteur vide aucun", () => {
    expect(dotsFor(0, 5)).toBe(0);
    expect(dotsFor(1, 5)).toBe(1);
    expect(dotsFor(7, 1)).toBe(7);
    expect(dotsFor(10, 5)).toBe(2);
  });
});

describe("cercle de points", () => {
  const html = renderToStaticMarkup(<RadialDots {...base} />);
  it("compte un point par rendez-vous et le chiffre de la semaine est au centre", () => {
    expect(html.match(/data-dot=/g)).toHaveLength(4);
    expect(html).toContain(">4<");
    expect(html).toContain("consultations");
  });
  it("la légende donne le total de chaque état, sans mention « 1 point = » quand c'est exact", () => {
    expect(html).toMatch(/Terminés<[^>]*>\s*3/);
    expect(html).not.toContain("1 point =");
  });
  it("au-delà de 24, dit combien vaut un point", () => {
    const big = renderToStaticMarkup(<RadialDots {...base} series={[{ ...series[0], values: [50, 0, 0] }]} />);
    expect(big).toContain("1 point = 3 rendez-vous");
  });
  it("aucun thème TuffUI ni anglais", () => {
    expect(html).not.toContain("--brand");
    expect(html).not.toMatch(/Use arrow keys/);
  });
});
