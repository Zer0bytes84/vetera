import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CardsSkeleton, MessageSkeleton } from "@/components/ui/loading-skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { announce } from "@/lib/announce";

/** The stat card and the Loading Skeleton, redrawn by hand after the UI SDK bench (19 November 2026). */
describe("carte de chiffre", () => {
  it("un groupe nommé par son libellé, la valeur et son unité, le ton métier", () => {
    const html = renderToStaticMarkup(<StatCard label="Dépensé" tone="negative" unit="DA" value="3 200" />);
    const labelId = /id="([^"]+)"/.exec(html)![1];
    expect(html).toContain(`role="group"`);
    expect(html).toContain(`aria-labelledby="${labelId}"`);
    expect(html).toContain(">Dépensé</p>");
    expect(html).toContain('data-tone="negative"');
    expect(html).toContain('<span class="stat-card-unit">DA</span>');
  });

  it("une variation est dite en mots, sa flèche est cachée", () => {
    const html = renderToStaticMarkup(<StatCard delta={{ spoken: "en hausse de 12,4 % sur octobre", text: "+12,4 %", trend: "up" }} label="Encaissé" value="20 500" />);
    // Said as text read by assistive tech (an aria-label on a generic span is not read): the visible sign is hidden.
    expect(html).toContain('<span class="sr-only">en hausse de 12,4 % sur octobre</span>');
    expect(html).toContain('<span aria-hidden="true">+12,4 %</span>');
    expect(html).not.toContain("aria-label=");
    expect(html).toContain('data-trend="up"');
    expect(html).toMatch(/<svg aria-hidden="true"/);
  });
});

describe("Loading Skeleton", () => {
  it.each([
    ["Message", <MessageSkeleton key="m" label="Lecture des données du cabinet…" />],
    ["Cards", <CardsSkeleton key="c" label="Chargement des chiffres…" />],
  ])("%s : une région status nommée, occupée, ses formes cachées, l'effet reflet", (_, element) => {
    const html = renderToStaticMarkup(element);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toMatch(/aria-label="(Lecture des données du cabinet…|Chargement des chiffres…)"/);
    const shapes = html.match(/data-slot="loading-skeleton-shape"/g)!.length;
    expect(html.match(/<span aria-hidden="true" class="loading-skeleton-shape/g)!.length).toBe(shapes);
  });

  it("le contenu arrivé remplace le squelette, sans nom ni marque d'occupation", () => {
    const html = renderToStaticMarkup(<CardsSkeleton busy={false} label="Chargement des chiffres…"><p>Chiffres</p></CardsSkeleton>);
    expect(html).toContain("<p>Chiffres</p>");
    expect(html).toContain('aria-busy="false"');
    expect(html).not.toContain("aria-label=");
    expect(html).not.toContain("loading-skeleton-shape");
  });

  it("Cards tient la place d'autant de cartes qu'il en viendra", () => {
    expect(renderToStaticMarkup(<CardsSkeleton count={3} label="x" />).match(/class="loading-skeleton-card"/g)).toHaveLength(3);
  });
});

describe("la région d'annonce partagée", () => {
  it("créée une fois, polie, vidée puis écrite, pour qu'une même phrase soit relue", () => {
    const nodes: Record<string, { id: string; textContent: string; attrs: Record<string, string>; className: string; setAttribute: (k: string, v: string) => void }> = {};
    const frames: (() => void)[] = [];
    const doc = {
      getElementById: (id: string) => nodes[id] ?? null,
      createElement: () => {
        const node = { id: "", textContent: "", attrs: {} as Record<string, string>, className: "", setAttribute(k: string, v: string) { this.attrs[k] = v; } };
        return node;
      },
      body: { append: (node: { id: string }) => { nodes[node.id] = node as never; } },
      defaultView: { requestAnimationFrame: (callback: () => void) => frames.push(callback) },
    } as unknown as Document;
    announce("Réponse affichée", doc);
    announce("Réponse affichée", doc);
    expect(Object.keys(nodes)).toEqual(["app-announcer"]);
    const region = nodes["app-announcer"];
    expect(region.attrs["aria-live"]).toBe("polite");
    expect(region.textContent).toBe("");
    for (const frame of frames) frame();
    expect(region.textContent).toBe("Réponse affichée");
  });
});

import { StatGrid } from "@/components/ui/stat-grid";

describe("Chiffres clés pendant leur lecture (StatGrid)", () => {
  const data = [
    { id: "cash", label: "Trésorerie", value: "0 DA", hint: "Solde net : 0 DA" },
    { id: "visits", label: "Rendez-vous", value: "0", hint: "0 honoré", goal: { ratio: 0, label: "0 sur 10" } },
  ];
  it("aucune valeur n'est montrée avant d'être connue : des cartes de squelette, une région status nommée et occupée", () => {
    const html = renderToStaticMarkup(<StatGrid data={data} goals loading loadingLabel="Chargement des chiffres clés" title="Chiffres clés" />);
    expect(html).not.toContain('data-slot="stat-value"');
    expect(html).not.toContain("0 DA");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Chargement des chiffres clés"');
    expect(html.match(/loading-skeleton-shape/g)!.length).toBeGreaterThan(8);
    expect(html).toContain(">Chiffres clés<");
  });
  it("tant que le délai n'est pas passé, les cartes de squelette tiennent la place sans se montrer", () => {
    expect(renderToStaticMarkup(<StatGrid data={data} loading loadingRevealed={false} />)).toContain("invisible");
  });
  it("une fois lues, les valeurs reviennent, sans région de chargement", () => {
    const html = renderToStaticMarkup(<StatGrid data={data} />);
    expect(html.match(/data-slot="stat-value"/g)).toHaveLength(2);
    expect(html).not.toContain('role="status"');
  });
});
