import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentsTable, noteMatches, notePlainText } from "@/components/documents-table";
import { createSlashCommandsSuggestion, getSlashCommandItems } from "@/components/SlashCommandsExtension";
import type { Note } from "@/types/db";

const note = (over: Partial<Note> = {}): Note => ({
  id: "n1",
  userId: "u1",
  title: "Compte rendu",
  content: "<h2>Motif</h2><p>Boiterie&nbsp;postérieure gauche</p>",
  isFavorite: false,
  patientId: null,
  createdAt: "2026-11-10T10:00:00.000Z",
  updatedAt: "2026-11-11T10:00:00.000Z",
  ...over,
});

describe("la recherche de la bibliothèque Documents", () => {
  it("lit le corps de la note sans ses balises", () => {
    expect(notePlainText("<h2>Motif</h2><p>Boiterie&nbsp;gauche</p>")).toBe("Motif Boiterie gauche");
  });
  it("trouve un mot du corps, du titre ou du dossier", () => {
    expect(noteMatches(note(), "Cabinet", "boiterie")).toBe(true);
    expect(noteMatches(note(), "Cabinet", "compte")).toBe(true);
    expect(noteMatches(note(), "Nala", "nala")).toBe(true);
  });
  it("exige tous les mots, dans n'importe quel ordre", () => {
    expect(noteMatches(note(), "Cabinet", "gauche boiterie")).toBe(true);
    expect(noteMatches(note(), "Cabinet", "gauche absent")).toBe(false);
  });
  it("ne trouve jamais une balise HTML", () => {
    expect(noteMatches(note(), "Cabinet", "h2")).toBe(false);
  });
  it("une note sans titre répond à « Sans titre »", () => {
    expect(noteMatches(note({ title: "" }), "Cabinet", "sans titre")).toBe(true);
  });
  it("une recherche vide garde tout", () => {
    expect(noteMatches(note(), "Cabinet", "   ")).toBe(true);
  });
});

describe("la liste Documents", () => {
  const props = {
    filter: "all" as const,
    filters: null,
    patientName: (id?: string | null) => (id ? "Nala" : "Cabinet"),
    onCreate: () => {},
    onFilter: () => {},
    onOpen: () => {},
    onOpenAssistant: () => {},
    onToggleFavorite: () => {},
    onTogglePin: () => {},
    onDuplicate: () => {},
    onExport: () => {},
    onDelete: () => {},
  };
  it("montre un « + » unique pour créer, la recherche et les quatre pilules", () => {
    const html = renderToStaticMarkup(<DocumentsTable {...props} notes={[note()]} />);
    expect(html).toContain('aria-label="Nouveau document"');
    expect(html).toContain("Rechercher un document");
    for (const label of ["Tous", "Récents", "Favoris", "Épinglés"]) expect(html).toContain(label);
    expect(html).toContain("Cabinet · Modifié le");
  });
  it("sans document, propose d'en écrire un", () => {
    const html = renderToStaticMarkup(<DocumentsTable {...props} notes={[]} />);
    expect(html).toContain("Rien ici pour l’instant");
  });
  it("ne propose aucun modèle ni suivi imposé", () => {
    const html = renderToStaticMarkup(<DocumentsTable {...props} notes={[note({ patientId: "p1" })]} />);
    expect(html).not.toMatch(/modèle|Nouveau suivi clinique/i);
  });
});

describe("le menu « / » de l'éditeur", () => {
  const items = getSlashCommandItems(() => {});
  it("ne contient plus aucun modèle de note", () => {
    expect(items.some((item) => item.group === "template")).toBe(false);
    expect(items.some((item) => /Note de consultation|Suivi clinique|Consignes de sortie/.test(item.title))).toBe(false);
  });
  it("propose des blocs d'emblée", () => {
    const first = createSlashCommandsSuggestion(() => {}).items({ query: "" }).map((item) => item.title);
    expect(first).toEqual(expect.arrayContaining(["Titre 1", "Titre 2", "Liste à puces", "Citation", "Tableau vierge"]));
  });
});
