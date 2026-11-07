import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { RollingNumber } from "@/components/ui/rolling-number";

it("garde le texte complet pour les lecteurs d'écran et dessine une roue par chiffre", () => {
  const html = renderToStaticMarkup(<RollingNumber value="26 700 DA" />);
  expect(html).toContain('<span class="sr-only">26 700 DA</span>');
  // 5 chiffres, des espaces et « DA » restent fixes.
  expect(html.match(/translateY\(/g)).toHaveLength(5);
  expect(html).toContain("DA".slice(0, 1));
});

it("place chaque roue sur son chiffre (translateY de -10 % par unité)", () => {
  const html = renderToStaticMarkup(<RollingNumber value="305" />);
  expect(html).toContain("translateY(-30%)");
  expect(html).toContain("translateY(0%)");
  expect(html).toContain("translateY(-50%)");
});

it("groupe les nombres à la française, et accepte un format fourni", () => {
  expect(renderToStaticMarkup(<RollingNumber value={1234} />)).toMatch(/sr-only">1\s234</);
  expect(renderToStaticMarkup(<RollingNumber format={(n) => `${n} %`} value={7} />)).toContain("sr-only\">7 %");
});

it("un texte sans chiffre ne dessine aucune roue", () => {
  const html = renderToStaticMarkup(<RollingNumber value="—" />);
  expect(html).not.toContain("translateY(");
  expect(html).toContain("—");
});
