import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataTable, nextSort, selectRows, toCsv, type DataColumn, type DataRow } from "@/components/ui/data-table";

interface Row extends DataRow {
  nom: string;
  age: number;
  etat: string;
}
const data: Row[] = [
  { id: "1", nom: "Rex", age: 8, etat: "Bonne santé" },
  { id: "2", nom: "Simba", age: 7, etat: "Hospitalisé" },
  { id: "3", nom: "Nala", age: 5, etat: "Bonne santé" },
  { id: "4", nom: "Écaille", age: 12, etat: "En traitement" },
  { id: "5", nom: "Milo, le gros", age: 4, etat: "Bonne santé" },
];
const columns: DataColumn<Row>[] = [
  { key: "nom", label: "Patient", sortable: true },
  { key: "age", label: "Âge", sortable: true, align: "right" },
  { key: "etat", label: "État" },
];

describe("tri, filtre, export du Data Table", () => {
  it("le clic sur un en-tête trie d'abord décroissant, puis croissant, puis revient à l'ordre des données", () => {
    expect(nextSort(null, "age")).toEqual({ key: "age", dir: "desc" });
    expect(nextSort({ key: "age", dir: "desc" }, "age")).toEqual({ key: "age", dir: "asc" });
    expect(nextSort({ key: "age", dir: "asc" }, "age")).toBeNull();
    expect(nextSort({ key: "age", dir: "asc" }, "nom")).toEqual({ key: "nom", dir: "desc" });
  });
  it("trie les nombres comme des nombres et le texte à la française (É près de E)", () => {
    expect(selectRows(data, columns, "", { key: "age", dir: "desc" }).map((r) => r.age)).toEqual([12, 8, 7, 5, 4]);
    expect(selectRows(data, columns, "", { key: "nom", dir: "asc" }).map((r) => r.nom)).toEqual(["Écaille", "Milo, le gros", "Nala", "Rex", "Simba"]);
  });
  it("le filtre cherche dans toutes les colonnes, sans tenir compte de la casse, et garde l'ordre", () => {
    expect(selectRows(data, columns, "bonne", null).map((r) => r.id)).toEqual(["1", "3", "5"]);
    expect(selectRows(data, columns, " HOSPIT ", null).map((r) => r.id)).toEqual(["2"]);
    expect(selectRows(data, columns, "12", null).map((r) => r.id)).toEqual(["4"]);
    expect(selectRows(data, columns, "zzz", null)).toEqual([]);
  });
  it("le CSV porte l'en-tête et toutes les lignes, et protège virgules et guillemets", () => {
    const csv = toCsv(columns, [...data, { id: "6", nom: 'Max "Mini"', age: 1, etat: "" }]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Patient,Âge,État");
    expect(lines[5]).toBe('"Milo, le gros",4,Bonne santé');
    expect(lines[6]).toBe('"Max ""Mini""",1,');
    expect(lines).toHaveLength(7);
  });
});

describe("rendu", () => {
  const html = renderToStaticMarkup(<DataTable columns={columns} data={data} noun={["patient", "patients"]} pageSize={3} title="Liste" selectable />);
  it("donne le titre, le nombre de lignes, le filtre et les deux boutons CSV, en français", () => {
    expect(html).toContain("Liste");
    expect(html).toContain('<span class="sr-only">5</span>');
    expect(html).toContain("patients");
    expect(html).toContain('placeholder="Filtrer les lignes"');
    expect(html).toContain('aria-label="Copier en CSV"');
    expect(html).toContain('aria-label="Télécharger en CSV"');
    expect(html).not.toMatch(/Filter rows|Copy as CSV|Previous page/);
  });
  it("pagine : trois lignes sur cinq, pied « 1–3 sur 5 » et « 1 / 2 »", () => {
    expect(html.match(/<tr/g)).toHaveLength(1 + 3);
    expect(html).toContain("1–3 sur 5");
    expect(html).toContain("1 / 2");
  });
  it("une colonne triable a son bouton, et la case de sélection générale est là", () => {
    expect(html.match(/aria-sort/g) ?? []).toHaveLength(0);
    expect(html).toContain('aria-label="Sélectionner toutes les lignes de la page"');
    expect(html).toContain('role="checkbox"');
  });
  it("sans donnée : un état vide qui le dit, aucune ligne", () => {
    const empty = renderToStaticMarkup(<DataTable columns={columns} data={[]} emptyDescription="Aucun dossier." emptyTitle="Aucun patient" title="Liste" />);
    expect(empty).toContain("Aucun patient");
    expect(empty).toContain("Aucun dossier.");
    expect(empty).toContain("0–0 sur 0");
  });
  it("n'emploie ni le thème TuffUI ni de texte sous 12 px", () => {
    expect(html).not.toContain("--brand");
    expect(html).not.toMatch(/text-\[0\.(6|7)\d*rem\]|text-\[1[01]px\]/);
  });
});
