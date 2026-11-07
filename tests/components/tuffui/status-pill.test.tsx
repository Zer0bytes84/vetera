import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ArrowUpRight, CircleCheck } from "lucide-react";
import { StatusPill, Tag } from "@/components/ui/status-pill";

it("chaque tonalité prend la couleur de l'app (vert, rose, ambre, bleu) et garde son texte", () => {
  for (const [tone, cls] of [["positive", "text-positive"], ["negative", "text-negative"], ["warning", "text-warning"], ["brand", "text-brand"]] as const) {
    const html = renderToStaticMarkup(<StatusPill tone={tone}>Texte {tone}</StatusPill>);
    expect(html).toContain(cls);
    expect(html).toContain(`Texte ${tone}`);
  }
});

it("une icône du jeu de pastilles pleines est dessinée en forme pleine, jamais en trait", () => {
  const html = renderToStaticMarkup(<StatusPill icon={CircleCheck} tone="positive">Réglé</StatusPill>);
  expect(html).toContain('viewBox="0 0 16 16"');
  expect(html).toContain("<mask");
});

it("une autre icône est un trait de lucide, plus épais en mode « bold »", () => {
  const html = renderToStaticMarkup(<StatusPill icon={ArrowUpRight} iconWeight="bold" tone="positive">+3 %</StatusPill>);
  expect(html).toContain('stroke-width="2.5"');
  expect(html).toContain('aria-hidden="true"');
});

it("la petite taille reste dans l'échelle de texte de la charte (12 px)", () => {
  const html = renderToStaticMarkup(<StatusPill size="sm">x</StatusPill>);
  expect(html).toContain("text-xs");
  expect(html).not.toMatch(/text-\[0\.6875rem\]/);
  expect(renderToStaticMarkup(<Tag>id</Tag>)).toContain("font-mono");
});
