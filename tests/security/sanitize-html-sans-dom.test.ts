// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
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

  describe("avec un window incomplet (simulation partielle)", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.resetModules();
    });

    it("le module se charge sans lever et le filtre refuse tout", async () => {
      vi.resetModules();
      vi.stubGlobal("window", {});
      const partial = await import("@/lib/sanitize-html");
      expect(partial.sanitizeNoteHtml('<img src=x onerror="alert(1)">')).toBe(
        "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
      );
      expect(partial.sanitizeNoteHtml("Bilan du jour")).toBe("Bilan du jour");
    });

    it("un window avec un document sans élément est refusé de la même façon", async () => {
      vi.resetModules();
      vi.stubGlobal("window", { document: { nodeType: 9 } });
      const partial = await import("@/lib/sanitize-html");
      expect(partial.sanitizeNoteHtml("<p>x</p>")).not.toContain("<");
    });
  });
});
