// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sanitizeNoteHtml } from "@/lib/sanitize-html";
import { NOTE_PAYLOADS } from "./note-payloads";

describe("sanitizeNoteHtml sans DOM : le filtre refuse tout au lieu de laisser passer", () => {
  it("n'a pas de window dans cet environnement", () => {
    expect(typeof window).toBe("undefined");
  });

  it("rend le HTML échappé, jamais interprété", () => {
    expect(sanitizeNoteHtml('<img src=x onerror="alert(1)">')).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
    );
  });

  it("aucune charge utile ne sort avec une balise", () => {
    for (const { name, html } of NOTE_PAYLOADS) {
      expect(sanitizeNoteHtml(html), name).not.toContain("<");
    }
  });

  it("le texte sans balise passe encore", () => {
    expect(sanitizeNoteHtml("Bilan du jour")).toBe("Bilan du jour");
  });
});
