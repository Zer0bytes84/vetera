import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type DataColumn,
  type DataRow,
  DataTable,
} from "@/components/ui/data-table";
import { SkeletonRegion } from "@/components/ui/loading-skeleton";
import { readRememberedRows, rememberRows } from "@/hooks/useRememberedRows";

/*
 * Listes, tableaux et fiches en lecture (25 novembre 2026) : la place que la liste a prise la dernière fois, au reflet,
 * jamais un compte, un zéro ou un état vide avant que les lignes soient lues.
 */

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
});
afterEach(() => {
  // @ts-expect-error the test's own storage goes away with it
  delete globalThis.localStorage;
});

type Row = DataRow & { name: string; amount: number };
const columns: DataColumn<Row>[] = [
  { key: "name", label: "Nom" },
  { key: "amount", label: "Montant", align: "right" },
];

describe("mémoire de la place d'une liste", () => {
  it("rend la valeur par défaut tant que rien n'est retenu, puis ce qui a été retenu", () => {
    expect(readRememberedRows("patients", { rows: 5, rowHeight: 64 })).toEqual({
      rows: 5,
      rowHeight: 64,
    });
    rememberRows("patients", { rows: 7, rowHeight: 44.5, columns: [120, 80] });
    expect(readRememberedRows("patients", { rows: 5, rowHeight: 64 })).toEqual({
      rows: 7,
      rowHeight: 44.5,
      columns: [120, 80],
    });
  });

  it("retient aussi une liste vide (0 ligne, la hauteur de l'état vide)", () => {
    rememberRows("factures", { rows: 0, rowHeight: 122 });
    expect(readRememberedRows("factures", { rows: 5, rowHeight: 44 })).toEqual({
      rows: 0,
      rowHeight: 122,
      columns: undefined,
    });
  });

  it("ignore une entrée abîmée", () => {
    store.set("vetera:skeleton-rows:x", "{pas du json");
    expect(readRememberedRows("x", { rows: 3, rowHeight: 40 })).toEqual({
      rows: 3,
      rowHeight: 40,
    });
    store.set(
      "vetera:skeleton-rows:y",
      JSON.stringify({ rows: -2, rowHeight: 40 })
    );
    expect(readRememberedRows("y", { rows: 3, rowHeight: 40 })).toEqual({
      rows: 3,
      rowHeight: 40,
    });
  });
});

describe("tableau en lecture", () => {
  it("garde le cadre et l'en-tête, sans compte, sans état vide, autant de lignes que la dernière fois", () => {
    rememberRows("essai", { rows: 3, rowHeight: 50, columns: [300, 120] });
    const html = renderToStaticMarkup(
      <DataTable
        columns={columns}
        data={[]}
        emptyTitle="Aucune facture"
        loading
        noun={["facture", "factures"]}
        skeletonKey="essai"
        title="Registre"
      />
    );
    expect(html).toContain("Registre");
    expect(html).toContain("Montant");
    expect(html).not.toContain("Aucune facture");
    expect(html).not.toContain("0 facture");
    expect(html).not.toContain("sur 0");
    expect(html).toContain('aria-busy="true"');
    expect(
      html.match(/<tr aria-hidden="true"[^>]*style="height:50px"/g)
    ).toHaveLength(3);
    // The head keeps the widths it had, so it does not move when the rows arrive.
    expect(html).toContain("width:300px");
  });

  it("une liste vide la dernière fois : la place de l'état vide, sans ses mots", () => {
    rememberRows("vide", { rows: 0, rowHeight: 122 });
    const html = renderToStaticMarkup(
      <DataTable
        columns={columns}
        data={[]}
        emptyTitle="Aucune facture"
        loading
        skeletonKey="vide"
        title="Registre"
      />
    );
    expect(html).toMatch(
      /<tr aria-hidden="true" style="height:122px"><td colSpan="2"><\/td><\/tr>/
    );
    expect(html).not.toContain("Aucune facture");
  });

  it("réservé tout de suite mais pas encore dessiné : une lecture rapide ne montre aucun reflet", () => {
    const html = renderToStaticMarkup(
      <DataTable
        columns={columns}
        data={[]}
        loading
        loadingRevealed={false}
        title="Registre"
      />
    );
    expect(html).toMatch(/<tbody class="invisible">/);
  });

  it("une fois lu, le tableau est celui d'avant", () => {
    const html = renderToStaticMarkup(
      <DataTable
        columns={columns}
        data={[{ id: "1", name: "Rex", amount: 12 }]}
        title="Registre"
      />
    );
    expect(html).not.toContain("aria-busy");
    expect(html).toContain("Rex");
    expect(html).toContain("1–1 sur 1");
  });
});

describe("région en lecture", () => {
  it("prend la hauteur retenue, nommée et occupée, sans son contenu", () => {
    rememberRows("soins", { rows: 1, rowHeight: 151 });
    const html = renderToStaticMarkup(
      <SkeletonRegion
        busy
        fallbackHeight={160}
        label="Chargement des soins"
        memoryKey="soins"
      >
        <p>Aucun soin pour cette date</p>
      </SkeletonRegion>
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Chargement des soins"');
    expect(html).toContain("height:151px");
    expect(html).not.toContain("Aucun soin");
  });

  it("vide la dernière fois : rien n'est dessiné ni réservé", () => {
    rememberRows("flux", { rows: 1, rowHeight: 0 });
    const html = renderToStaticMarkup(
      <SkeletonRegion
        busy
        fallbackHeight={120}
        label="Chargement"
        memoryKey="flux"
      >
        x
      </SkeletonRegion>
    );
    expect(html).toBe('<div data-skeleton-region="flux" hidden=""></div>');
  });

  it("lue, elle montre son contenu", () => {
    const html = renderToStaticMarkup(
      <SkeletonRegion
        busy={false}
        fallbackHeight={120}
        label="Chargement"
        memoryKey="z"
      >
        <p>contenu</p>
      </SkeletonRegion>
    );
    expect(html).toBe('<div data-skeleton-region="z"><p>contenu</p></div>');
  });
});
