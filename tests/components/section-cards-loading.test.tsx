import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SectionCards, type SectionCardItem } from "@/components/section-cards";

/**
 * The first band of every page while its figures are read (24 November 2026): the skeleton, never a figure, as many
 * cards as will come, and the same rows (no badge row on a band without badges).
 */
const items: SectionCardItem[] = [
  { title: "Patients actifs", value: 0, badge: "Aucun", detailRow: "0 foyer" },
  { title: "Suivi clinique", value: 0, detailRow: "0 sous traitement" },
  { title: "Rendez-vous à venir", value: 0, detailRow: "Aucun" },
];

describe("bande de chiffres en lecture", () => {
  it("une région status nommée et occupée, sans aucune valeur ni ligne", () => {
    const html = renderToStaticMarkup(<SectionCards items={items} loading subtitle="Dossiers" title="Chiffres clés" />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Chargement : Chiffres clés"');
    expect(html).not.toContain('data-slot="stat-value"');
    expect(html).not.toContain("0 foyer");
    // One placeholder per card that will come, each hidden from assistive tech.
    expect(html.match(/data-slot="panel" aria-hidden="true"/g)).toHaveLength(items.length);
    // Reserved at once but not yet drawn: a read that ends within 150 ms never shows the sheen.
    expect(html).toMatch(/class="[^"]*loading-skeleton invisible/);
  });

  it("garde l'en-tête et ses actions pendant la lecture", () => {
    const html = renderToStaticMarkup(
      <SectionCards actions={<button type="button">Nouveau patient</button>} items={items} loading title="Chiffres clés" />,
    );
    expect(html).toContain("Chiffres clés");
    expect(html).toContain("Nouveau patient");
  });

  it("sans badge, le squelette n'en dessine pas non plus : même hauteur que les cartes", () => {
    const loading = renderToStaticMarkup(<SectionCards badges={false} items={items} loading />);
    expect(loading).not.toContain("h-5");
    const withBadges = renderToStaticMarkup(<SectionCards items={items} loading />);
    expect(withBadges.match(/flex h-5 items-center/g)).toHaveLength(items.length);
  });

  it("lu : les cartes et leurs valeurs, plus de marque d'occupation", () => {
    const html = renderToStaticMarkup(<SectionCards items={items} title="Chiffres clés" />);
    expect(html).not.toContain('aria-busy="true"');
    expect(html.match(/data-slot="stat-value"/g)).toHaveLength(items.length);
    expect(html).toContain("0 foyer");
  });
});
