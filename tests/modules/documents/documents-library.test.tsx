import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentsLibrary } from "@/components/documents-library";
import { createSlashCommandsSuggestion, getSlashCommandItems } from "@/components/SlashCommandsExtension";
import {
  LIBRARY_FILTERS,
  MAX_FILE_BYTES,
  countByKind,
  dataUrlToBlob,
  entriesFrom,
  formatSize,
  judgeFile,
  linkTitle,
  matchesFilter,
  matchesQuery,
  normalizeLinkUrl,
  notePlainText,
  safeFileName,
  sortEntries,
} from "@/modules/documents/lib/library";
import type { LibraryItem, Note } from "@/types/db";

const note = (over: Partial<Note> = {}): Note => ({
  id: "n1", userId: "u1", title: "Compte rendu", content: "<h2>Motif</h2><p>Boiterie&nbsp;postérieure gauche</p>",
  isFavorite: false, patientId: null, createdAt: "2026-11-10T10:00:00.000Z", updatedAt: "2026-11-11T10:00:00.000Z", ...over,
});
const item = (over: Partial<LibraryItem> = {}): LibraryItem => ({
  id: "i1", userId: "u1", kind: "link", title: "Ordre des vétérinaires", url: "https://www.exemple.dz/", isFavorite: false,
  createdAt: "2026-11-09T10:00:00.000Z", updatedAt: "2026-11-09T10:00:00.000Z", ...over,
});
const folder = (id?: string | null) => (id ? "Nala" : "Cabinet");

describe("les filtres de la page Documents", () => {
  it("sont Tous, Documents, Fichiers, Images, Liens, dans cet ordre", () => {
    expect(LIBRARY_FILTERS.map((f) => f.label)).toEqual(["Tous", "Documents", "Fichiers", "Images", "Liens"]);
  });
  it("chacun ne montre que son genre, Tous montre tout", () => {
    const all = entriesFrom([note()], [item(), item({ id: "i2", kind: "file", title: "ordonnance.pdf", url: null }), item({ id: "i3", kind: "image", title: "radio.png", url: null })], folder);
    const kinds = (f: Parameters<typeof matchesFilter>[1]) => all.filter((e) => matchesFilter(e, f)).map((e) => e.kind);
    expect(kinds("all")).toHaveLength(4);
    expect(kinds("document")).toEqual(["document"]);
    expect(kinds("file")).toEqual(["file"]);
    expect(kinds("image")).toEqual(["image"]);
    expect(kinds("link")).toEqual(["link"]);
    expect(countByKind(all)).toEqual({ all: 4, document: 1, file: 1, image: 1, link: 1 });
  });
});

describe("la recherche", () => {
  it("lit le corps d'une note sans ses balises, jamais une balise", () => {
    expect(notePlainText("<h2>Motif</h2><p>Boiterie&nbsp;gauche</p>")).toBe("Motif Boiterie gauche");
    const [doc] = entriesFrom([note()], [], folder);
    expect(matchesQuery(doc, "boiterie")).toBe(true);
    expect(matchesQuery(doc, "gauche boiterie")).toBe(true);
    expect(matchesQuery(doc, "h2")).toBe(false);
    expect(matchesQuery(doc, "   ")).toBe(true);
  });
  it("trouve un lien par son adresse, un fichier par son nom, une note par son dossier", () => {
    const [doc, link, file] = entriesFrom([note({ patientId: "p1" })], [item(), item({ id: "i2", kind: "file", title: "Ordonnance Milo.pdf", url: null, mimeType: "application/pdf" })], folder);
    expect(matchesQuery(link, "exemple.dz")).toBe(true);
    expect(matchesQuery(file, "milo")).toBe(true);
    expect(matchesQuery(doc, "nala")).toBe(true);
  });
  it("une note sans titre répond à « sans titre »", () => {
    const [doc] = entriesFrom([note({ title: "" })], [], folder);
    expect(matchesQuery(doc, "sans titre")).toBe(true);
  });
});

describe("l'ordre de la liste", () => {
  it("épinglés d'abord, puis le plus récent", () => {
    const rows = sortEntries(entriesFrom(
      [note({ id: "old", updatedAt: "2026-01-01T00:00:00Z" }), note({ id: "pinned", isPinned: true, updatedAt: "2026-02-01T00:00:00Z" }), note({ id: "new", updatedAt: "2026-11-01T00:00:00Z" })],
      [item({ id: "link", updatedAt: "2026-06-01T00:00:00Z" })], folder));
    expect(rows.map((r) => r.id)).toEqual(["pinned", "new", "link", "old"]);
  });
  it("une date illisible ne casse pas le tri", () => {
    expect(() => sortEntries(entriesFrom([note({ updatedAt: "pas une date" })], [item()], folder))).not.toThrow();
  });
});

describe("l'adresse d'un lien", () => {
  it("complète un nom de site en https", () => {
    expect(normalizeLinkUrl("exemple.dz")).toBe("https://exemple.dz/");
    expect(normalizeLinkUrl("  www.exemple.dz/page?x=1 ")).toBe("https://www.exemple.dz/page?x=1");
    expect(normalizeLinkUrl("http://exemple.dz")).toBe("http://exemple.dz/");
    expect(normalizeLinkUrl("localhost:3000")).toBe("https://localhost:3000/");
  });
  it("accepte une adresse e-mail", () => {
    expect(normalizeLinkUrl("mailto:contact@exemple.dz")).toBe("mailto:contact@exemple.dz");
    expect(normalizeLinkUrl("mailto:pas-une-adresse")).toBeNull();
  });
  it("refuse tout ce qui n'est pas du web : script, données, fichier local", () => {
    for (const bad of ["javascript:alert(1)", "JAVASCRIPT:alert(1)", "javascript://%0aalert(1)", "data:text/html,<script>alert(1)</script>", "file:///etc/passwd", "vbscript:x", "ftp://exemple.dz", "blob:https://exemple.dz/x"]) {
      expect(normalizeLinkUrl(bad), bad).toBeNull();
    }
  });
  it("refuse le vide, les espaces et ce qui n'est pas un site", () => {
    for (const bad of ["", "   ", "deux mots", "https://", "juste-un-mot", "http://"]) expect(normalizeLinkUrl(bad), bad).toBeNull();
  });
  it("donne un titre lisible", () => {
    expect(linkTitle("https://www.exemple.dz/page")).toBe("exemple.dz");
    expect(linkTitle("mailto:contact@exemple.dz")).toBe("contact@exemple.dz");
  });
});

describe("les fichiers et les images", () => {
  const file = (name: string, size: number, type: string) => ({ name, size, type });
  it("garde un fichier ordinaire, reconnaît une image ajoutée comme fichier", () => {
    expect(judgeFile(file("ordonnance.pdf", 1000, "application/pdf"), "file")).toEqual({ ok: true, kind: "file" });
    expect(judgeFile(file("radio.png", 1000, "image/png"), "file")).toEqual({ ok: true, kind: "image" });
    expect(judgeFile(file("sans-type", 10, ""), "file")).toEqual({ ok: true, kind: "file" });
  });
  it("refuse un fichier vide et un fichier trop gros, en le nommant", () => {
    const empty = judgeFile(file("vide.pdf", 0, "application/pdf"), "file");
    expect(empty.ok).toBe(false);
    const big = judgeFile(file("scan.pdf", MAX_FILE_BYTES + 1, "application/pdf"), "file");
    expect(big).toMatchObject({ ok: false });
    expect(big.ok ? "" : big.reason).toMatch(/scan\.pdf.*5 Mo/);
    expect(judgeFile(file("pile.pdf", MAX_FILE_BYTES, "application/pdf"), "file").ok).toBe(true);
  });
  it("n'accepte comme image que PNG, JPEG, WebP, GIF : pas de SVG (il peut porter un script), pas un PDF", () => {
    expect(judgeFile(file("a.svg", 100, "image/svg+xml"), "image").ok).toBe(false);
    expect(judgeFile(file("a.pdf", 100, "application/pdf"), "image").ok).toBe(false);
    expect(judgeFile(file("a.jpg", 100, "image/jpeg"), "image")).toEqual({ ok: true, kind: "image" });
    expect(judgeFile(file("a.svg", 100, "image/svg+xml"), "file")).toEqual({ ok: true, kind: "file" });
  });
  it("assainit un nom de fichier", () => {
    expect(safeFileName("../../etc/passwd")).not.toMatch(/[\\/]/);
    expect(safeFileName('a:b*c?"d<e>f|g.pdf')).toBe("a_b_c__d_e_f_g.pdf");
    expect(safeFileName("...")).toBe("fichier");
    expect(safeFileName("   ")).toBe("fichier");
  });
  it("relit une donnée en fichier, et refuse ce qui n'en est pas une", () => {
    const blob = dataUrlToBlob("data:text/plain;base64,SGVsbG8=");
    expect(blob?.size).toBe(5);
    expect(blob?.type).toBe("text/plain");
    expect(dataUrlToBlob("pas une donnée")).toBeNull();
    expect(dataUrlToBlob("data:text/plain;base64,!!!")).toBeNull();
  });
  it("écrit une taille lisible", () => {
    expect(formatSize(512)).toBe("512 o");
    expect(formatSize(2048)).toBe("2 Ko");
    expect(formatSize(1.5 * 1024 * 1024)).toBe("1,5 Mo");
    expect(formatSize(null)).toBe("");
  });
});

describe("la page rendue", () => {
  const base = {
    filter: "all" as const, headerActions: null, patientActive: false, patientPicker: null, patientName: folder,
    onFilter: () => {}, onCreateDocument: () => {}, onAddFiles: () => {}, onAddLink: () => {}, onOpenDocument: () => {},
    onOpenAssistant: () => {}, onDuplicate: () => {}, onExport: () => {}, onOpenLink: () => {}, onCopyLink: () => {},
    onDownload: () => {}, onToggleFavorite: () => {}, onTogglePin: () => {}, onDelete: () => {},
  };
  it("a le titre, le petit +, la loupe et les cinq pilules, sans cadre ni bande", () => {
    const html = renderToStaticMarkup(<DocumentsLibrary {...base} entries={entriesFrom([note()], [item()], folder)} />);
    expect(html).toContain("Documents");
    expect(html).toContain('aria-label="Ajouter"');
    expect(html).toContain('aria-label="Rechercher"');
    for (const label of ["Tous", "Documents", "Fichiers", "Images", "Liens"]) expect(html).toContain(label);
    expect(html).not.toContain('data-slot="band"');
  });
  it("montre à chaque ligne son genre et son détail", () => {
    const html = renderToStaticMarkup(<DocumentsLibrary {...base} entries={entriesFrom([note()], [item(), item({ id: "i2", kind: "file", title: "ordonnance.pdf", url: null, size: 2048 })], folder)} />);
    expect(html).toContain("Document · Modifié le");
    expect(html).toContain("Lien · exemple.dz");
    expect(html).toContain("Fichier · 2 Ko");
  });
  it("vide : une phrase, sans bouton de modèle", () => {
    const html = renderToStaticMarkup(<DocumentsLibrary {...base} entries={[]} />);
    expect(html).toContain("Rien ici pour l’instant");
    expect(html).not.toMatch(/modèle/i);
  });
  it("un filtre sans élément le dit", () => {
    const html = renderToStaticMarkup(<DocumentsLibrary {...base} entries={entriesFrom([note()], [], folder)} filter="image" />);
    expect(html).toContain("Aucun image");
  });
});

describe("le menu « / » de l'éditeur", () => {
  it("ne contient plus aucun modèle de note", () => {
    const items = getSlashCommandItems(() => {});
    expect(items.some((i) => i.group === "template")).toBe(false);
  });
  it("propose des blocs d'emblée", () => {
    const first = createSlashCommandsSuggestion(() => {}).items({ query: "" }).map((i) => i.title);
    expect(first).toEqual(expect.arrayContaining(["Titre 1", "Titre 2", "Liste à puces", "Citation", "Tableau vierge"]));
  });
});
