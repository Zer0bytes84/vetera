import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ProgressBar, SegmentedBar } from "@/components/ui/progress-bar";

it("expose une barre de progression accessible, avec son nom et sa valeur", () => {
  const html = renderToStaticMarkup(<ProgressBar label="Objectif" value={30} max={120} />);
  expect(html).toContain('role="progressbar"');
  expect(html).toContain('aria-label="Objectif"');
  expect(html).toContain('aria-valuenow="30"');
  expect(html).toContain('aria-valuetext="25%"');
});

it("borne la valeur entre 0 et le maximum, même hors limites", () => {
  expect(renderToStaticMarkup(<ProgressBar label="a" value={500} max={100} />)).toContain("inset(0 0% 0 0");
  expect(renderToStaticMarkup(<ProgressBar label="a" value={-20} max={100} />)).toContain("inset(0 100% 0 0");
  expect(renderToStaticMarkup(<ProgressBar label="a" value={5} max={0} />)).toContain("progressbar");
});

it("un niveau (quota, budget) prend le rôle « meter » et la teinte demandée", () => {
  const html = renderToStaticMarkup(<ProgressBar kind="meter" label="Quota" tone="positive" value={1} max={1} />);
  expect(html).toContain('role="meter"');
  expect(html).toContain("bg-positive");
});

it("les segments se lisent en français", () => {
  const html = renderToStaticMarkup(
    <SegmentedBar label="Répartition" max={10000} segments={[{ id: "a", value: 2500, label: "Soins", color: "red" }]} />,
  );
  expect(html).toContain("Soins 2");
  expect(html).not.toContain("2,500");
});
