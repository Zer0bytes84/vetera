import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Les fichiers qui écrivent du HTML dans la page, un par un, avec ce qui les rend sûrs. Un nouveau doit être revu et ajouté ici. */
const REVIEWED = {
  "src/components/NotesPro.tsx":
    "dangerouslySetInnerHTML : le HTML d'une note passe par sanitizeNoteHtml",
  "src/components/ui/chart.tsx":
    "dangerouslySetInnerHTML : feuille de style produite par chartColorCss (valeurs validées)",
  "src/lib/sanitize-html.ts":
    "innerHTML : relecture du fragment déjà filtré par DOMPurify",
  "src/modules/patient-reminders/patient-reminders-panel.tsx":
    "srcdoc : HTML d'impression dont chaque champ est échappé (callsPrintHtml)",
  "src/modules/documents/components/consultation-documents-assistant.tsx":
    "DOMParser : document inerte, seul le texte est lu",
  "src/components/Editor.tsx":
    "DOMParser : document inerte, seul le texte est lu",
} as const;

const SINK =
  /dangerouslySetInnerHTML|\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|\.srcdoc\b|createContextualFragment|new DOMParser|document\.write\(/;
const SOURCE_FILE = /\.(?:ts|tsx)$/;
const TEST_FILE = /\.test\./;
const PREVIEW_HTML = /__html: previewHtml\b/;
const RAW_CONTENT_HTML = /__html: content\b/;
const PREVIEW_MEMO =
  /previewHtml = useMemo\(\(\) => sanitizeNoteHtml\(content\)/;

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      sources(path, out);
    } else if (SOURCE_FILE.test(name) && !TEST_FILE.test(name)) {
      out.push(path);
    }
  }
  return out;
}

describe("les écritures de HTML dans la page", () => {
  it("sont toutes dans la liste des fichiers revus : un nouveau point d'écriture se signale ici", () => {
    const found = sources("src")
      .filter((path) => SINK.test(readFileSync(path, "utf8")))
      .sort();
    expect(found).toEqual(Object.keys(REVIEWED).sort());
  });

  it("l'aperçu d'une note n'injecte que le HTML filtré", () => {
    const source = readFileSync("src/components/NotesPro.tsx", "utf8");
    expect(source).toContain(
      'import { sanitizeNoteHtml } from "@/lib/sanitize-html"'
    );
    expect(source).toMatch(PREVIEW_HTML);
    expect(source).not.toMatch(RAW_CONTENT_HTML);
    expect(source).toMatch(PREVIEW_MEMO);
  });

  it("le dépôt des notes filtre à la lecture et à l'écriture", () => {
    const source = readFileSync("src/data/repositories/index.ts", "utf8");
    const repository = source.slice(
      source.indexOf("export function useNotesRepository"),
      source.indexOf("export function useLibraryItemsRepository")
    );
    expect(repository).toContain("notesStore.data.map(withSanitizedContent)");
    for (const call of [
      "notesStore.add(withSanitizedContent(item))",
      "notesStore.update(id, withSanitizedContent(updates))",
      "notesStore.set(id, withSanitizedContent(item))",
    ]) {
      expect(repository).toContain(call);
    }
  });
});
