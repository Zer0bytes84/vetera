import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { StatGrid, type Stat } from "@/components/ui/stat-grid";

const stat = (over: Partial<Stat> = {}): Stat => ({ id: "s", label: "Trésorerie", value: "26 700 DA", ...over });

it("affiche le titre, le libellé et la valeur, avec le texte complet pour les lecteurs d'écran", () => {
  const html = renderToStaticMarkup(<StatGrid data={[stat()]} subtitle="30 jours" title="Chiffres clés" />);
  expect(html).toContain("Chiffres clés");
  expect(html).toContain("30 jours");
  expect(html).toContain("Trésorerie");
  expect(html).toContain('<span class="sr-only">26 700 DA</span>');
});

it("une hausse est favorable par défaut, défavorable si une hausse est mauvaise, et le dit en toutes lettres", () => {
  const up = renderToStaticMarkup(<StatGrid data={[stat({ delta: 12.5 })]} />);
  expect(up).toContain("text-positive");
  expect(up).toContain(", favorable");
  expect(up).toContain("+12,5 %");
  const bad = renderToStaticMarkup(<StatGrid data={[stat({ delta: 12.5, higherIsBetter: false })]} />);
  expect(bad).toContain("text-negative");
  expect(bad).toContain(", défavorable");
});

it("une variation exactement nulle est « stable », neutre, sans couleur d'alerte", () => {
  const html = renderToStaticMarkup(<StatGrid data={[stat({ delta: 0 })]} />);
  expect(html).toContain("stable");
  expect(html).not.toContain("text-negative");
  expect(html).not.toContain("text-positive");
});

it("une variation minuscule reste une hausse, comme le tableau de bord l'a toujours affichée (+0,03 % = « +0 % »)", () => {
  const html = renderToStaticMarkup(<StatGrid data={[stat({ delta: 0.03 })]} />);
  expect(html).toContain("text-positive");
  expect(html).toContain("+0 %");
  expect(html).not.toContain("stable");
});

it("sans variation, aucune pastille ; un objectif donne une barre accessible en français", () => {
  expect(renderToStaticMarkup(<StatGrid data={[stat()]} />)).not.toContain("rounded-full font-medium");
  const html = renderToStaticMarkup(<StatGrid data={[stat({ goal: { ratio: 0.5, label: "Objectif 60 000 DA" } })]} />);
  expect(html).toContain('role="progressbar"');
  expect(html).toContain("50 % : Objectif 60 000 DA");
});

it("la courbe n'apparaît qu'avec au moins deux points, et peut être coupée", () => {
  expect(renderToStaticMarkup(<StatGrid data={[stat({ trend: [1, 3, 2] })]} />)).toContain("<svg");
  expect(renderToStaticMarkup(<StatGrid data={[stat({ trend: [4] })]} />)).not.toContain('class="shrink-0 overflow-visible"');
  expect(renderToStaticMarkup(<StatGrid data={[stat({ trend: [1, 3, 2] })]} sparklines={false} />)).not.toContain('class="shrink-0 overflow-visible"');
  // Courbe plate : pas de division par zéro.
  expect(renderToStaticMarkup(<StatGrid data={[stat({ trend: [5, 5, 5] })]} />)).not.toContain("NaN");
});

it("devient cliquable (bouton) seulement avec onSelect", () => {
  expect(renderToStaticMarkup(<StatGrid data={[stat()]} />)).not.toContain("<button");
  expect(renderToStaticMarkup(<StatGrid data={[stat()]} onSelect={() => {}} />)).toContain('type="button"');
});

it("tient avec zéro, un, trois statistiques sans erreur", () => {
  expect(() => renderToStaticMarkup(<StatGrid data={[]} />)).not.toThrow();
  const three = renderToStaticMarkup(<StatGrid data={[stat({ id: "a" }), stat({ id: "b" }), stat({ id: "c" })]} />);
  expect(three).toContain("@xs:grid-cols-2");
});
