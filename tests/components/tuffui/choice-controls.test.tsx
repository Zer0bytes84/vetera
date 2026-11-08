import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Switch } from "@/components/ui/choice-controls";

it("l'interrupteur annonce son état et passe ses attributs au bouton (id, aria-label, disabled)", () => {
  const on = renderToStaticMarkup(<Switch aria-label="Donner vie" checked id="x" onCheckedChange={() => undefined} />);
  expect(on).toContain('role="switch"');
  expect(on).toContain('aria-checked="true"');
  expect(on).toContain('id="x"');
  expect(on).toContain('aria-label="Donner vie"');
  const off = renderToStaticMarkup(<Switch checked={false} disabled onCheckedChange={() => undefined} />);
  expect(off).toContain('aria-checked="false"');
  expect(off).toContain("disabled");
});

it("l'interrupteur n'utilise que des classes de la charte : aucun jeton TuffUI hors des nôtres", () => {
  const html = renderToStaticMarkup(<Switch checked label="Oui" onCheckedChange={() => undefined} />);
  expect(html).toContain("Oui");
  expect(html).not.toMatch(/text-\[0\.6875rem\]/);
});
