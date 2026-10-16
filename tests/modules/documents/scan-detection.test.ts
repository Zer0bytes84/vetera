import { describe, expect, it } from "vitest";
import { needsPageOcr } from "../../../src/modules/documents/lib/document-reading";
describe("Détection des pages scannées", () => {
  it("lit les scans sans texte et les scans avec un en-tête numérique", () => {
    expect(needsPageOcr("",true)).toBe(true);
    expect(needsPageOcr("Laboratoire vétérinaire — Résultats du patient",true)).toBe(true);
  });
  it("préserve le texte numérique exploitable sans OCR inutile", () => {
    expect(needsPageOcr("Document vétérinaire sans image",false)).toBe(false);
    expect(needsPageOcr("Analyse clinique complète. ".repeat(20),true)).toBe(false);
  });
});
