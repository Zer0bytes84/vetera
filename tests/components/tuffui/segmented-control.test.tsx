import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Segmented } from "@/components/ui/segmented-control";

const options = [
  { value: "a", label: "Icônes" },
  { value: "b", label: "Masquée" },
  { value: "c", label: "Jamais", disabled: true },
];

it("le groupe est un radiogroup nommé et seule l'option choisie est dans l'ordre de tabulation", () => {
  const html = renderToStaticMarkup(<Segmented label="Réduction de la barre latérale" onValueChange={() => undefined} options={options} value="b" />);
  expect(html).toContain('role="radiogroup"');
  expect(html).toContain('aria-label="Réduction de la barre latérale"');
  expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
  expect(html).toMatch(/data-value="b"[^>]*>|aria-checked="true"[^>]*data-value="b"/);
  expect(html.match(/tabindex="0"/g)).toHaveLength(1);
});

it("une option désactivée l'est vraiment", () => {
  const html = renderToStaticMarkup(<Segmented label="x" options={options} value="a" />);
  expect(html).toMatch(/data-value="c"[^>]*disabled|disabled[^>]*data-value="c"/);
});
