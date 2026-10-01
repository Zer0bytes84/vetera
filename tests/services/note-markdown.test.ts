import { describe, expect, it } from "vitest";
import { noteMarkdownToHTML } from "@/lib/note-markdown";

describe("note draft formatting", () => {
  it("creates real headings even with indentation, CRLF or bold markers", () => {
    expect(noteMarkdownToHTML("  # Note\r\n  **## Vaccination**\r\n### **Suivi** ###"))
      .toBe("<h1>Note</h1>\n<h2>Vaccination</h2>\n<h3><strong>Suivi</strong></h3>");
  });
  it("keeps ordered and unordered lists separate and valid", () => {
    expect(noteMarkdownToHTML("- Premier\n- Second\n\n1. Contrôle\n2. Suivi"))
      .toBe("<ul>\n<li><p>Premier</p></li>\n<li><p>Second</p></li>\n</ul>\n<ol>\n<li><p>Contrôle</p></li>\n<li><p>Suivi</p></li>\n</ol>");
  });
  it("preserves medical comparison signs without interpreting model text as HTML", () => {
    expect(noteMarkdownToHTML("T < 38°C & **contrôle**\n<img src=x onerror=alert(1)>"))
      .toBe("<p>T &lt; 38°C &amp; <strong>contrôle</strong></p>\n<p>&lt;img src=x onerror=alert(1)&gt;</p>");
  });
  it("does not remove hashes from ordinary text", () => {
    expect(noteMarkdownToHTML("Dossier #123\n###\n###### Détails")).toBe("<p>Dossier #123</p>\n<p>###</p>\n<h3>Détails</h3>");
  });
});
