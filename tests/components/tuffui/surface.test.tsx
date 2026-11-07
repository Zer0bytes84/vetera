import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Calendar } from "lucide-react";
import { IconTile, Inset, Panel, Shell, ShellHeader } from "@/components/ui/surface";

it("Shell, Panel et Inset s'emboîtent : bande grise de la Chart Card, panneau de l'app", () => {
  const html = renderToStaticMarkup(
    <Shell>
      <Panel>
        <Inset>contenu</Inset>
      </Panel>
    </Shell>,
  );
  expect(html).toContain("bg-[var(--card-band)]");
  expect(html).toContain("bg-[var(--card-inset)]");
  expect(html).not.toContain("surface-inset");
  expect(html).toContain("contenu");
});

it("ShellHeader rend le titre, le sous-titre, l'icône lucide et la partie droite", () => {
  const html = renderToStaticMarkup(
    <ShellHeader aside={<span>droite</span>} icon={Calendar} subtitle="Sous-titre" title="Titre" />,
  );
  expect(html).toContain("<h3");
  expect(html).toContain("Titre");
  expect(html).toContain("Sous-titre");
  expect(html).toContain("droite");
  expect(html).toContain("<svg");
});

it("IconTile accepte des enfants à la place d'une icône", () => {
  expect(renderToStaticMarkup(<IconTile>★</IconTile>)).toContain("★");
});
