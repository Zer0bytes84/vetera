import { readFile } from "node:fs/promises";
import { afterEach, expect, it, vi } from "vitest";
import { DEFAULT_INVOICE_SETTINGS } from "@/services/invoiceSettingsService";
import { buildManagedDocumentPdf, documentPdfFilename, exportManagedDocument, pdfBytes, printManagedDocument } from "@/modules/documents/lib/managed-document-pdf";
import type { PatientDocument } from "@/modules/documents/document-domain";

afterEach(() => vi.unstubAllGlobals());
it("produit des pages A4 avec police locale intégrée et pied clinique sans couper un texte long", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const name = url.includes("Bold") ? "LiberationSans-Bold.ttf" : "LiberationSans-Regular.ttf";
    const font = await readFile(`node_modules/pdfjs-dist/standard_fonts/${name}`);
    return { ok: true, arrayBuffer: async () => font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength) };
  }));
  const pdf = await buildManagedDocumentPdf({ title: "Compte-rendu de Rex", content: "Observations : température 38,5 °C, évaluation à contrôler.\n".repeat(140), clinic: { ...DEFAULT_INVOICE_SETTINGS, name: "Cabinet de test", address: "Rue des Oliviers", footer: "Signature et mentions cliniques conservées." } });
  expect(pdf.getNumberOfPages()).toBeGreaterThan(2);
  expect(pdf.internal.pageSize.getWidth()).toBeCloseTo(210);
  expect(pdf.internal.pageSize.getHeight()).toBeCloseTo(297);
  const data = pdfBytes(pdf.output("datauristring"));
  expect(new TextDecoder().decode(data.slice(0, 8))).toMatch(/^%PDF-1\./);
  expect(pdf.getFontList().BaitariDocument).toEqual(expect.arrayContaining(["normal", "bold"]));
});
it("nomme le PDF avec type, patient et date sans caractères de chemin", () => {
  expect(documentPdfFilename({ kind: "prescription", patientName: "Réx / ../ clinique", createdAt: "2026-10-17T12:00:00Z" })).toBe("Ordonnance_Rex_clinique_2026-10-17.pdf");
  const original = process.env.TZ; process.env.TZ = "America/Toronto";
  try { expect(documentPdfFilename({ kind: "report", patientName: "Rex", createdAt: "2026-10-18T00:30:00Z" })).toBe("Compte_rendu_Rex_2026-10-17.pdf"); }
  finally { if (original) process.env.TZ = original; else delete process.env.TZ; }
});
it("bloque export et impression d’un brouillon ou document annulé avant toute ouverture système", async () => {
  for (const status of ["brouillon", "annule"] as const) {
    await expect(exportManagedDocument({ status } as PatientDocument)).rejects.toThrow("Finalisez");
    await expect(printManagedDocument({ status } as PatientDocument)).rejects.toThrow("finalisé");
  }
  expect(() => pdfBytes("https://example.invalid/document.pdf")).toThrow("illisible");
});
