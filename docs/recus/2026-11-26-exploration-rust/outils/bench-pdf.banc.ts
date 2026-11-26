// Banc de génération PDF (pas un test produit) : chronomètre buildPatientRecordPdf et buildInvoicePdf
// sur un gros dossier. Nommé .banc.ts pour rester hors de npm test. Lancer depuis la racine :
// BANC_PDF_OUT=pdf.json npx vitest run --config docs/recus/2026-11-26-exploration-rust/outils/vitest.banc.config.ts
// Le décor (moteur PDF.js de Node, polices locales) est repris tel quel de tests/modules/patients/patient-record-pdf.test.ts.
import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { afterEach, beforeEach, it, vi } from "vitest";
import { buildPatientRecordPdf } from "@/modules/patients/export/patient-record-pdf";
import type {
  PatientRecordSnapshot,
  PatientRecordSource,
} from "@/modules/patients/export/patient-record-types";
import { DEFAULT_INVOICE_SETTINGS } from "@/services/invoiceSettingsService";

const LIBERATION_SANS_FONT = /LiberationSans-(Regular|Bold)\.ttf/;

// The production fallback uses the browser's canvas and app-local worker/font
// URLs. This test runs the same PDF.js renderer with its native Node canvas and
// filesystem resources, so annotation appearance is exercised without a DOM.
vi.mock("pdfjs-dist", async () => {
  const actual = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return {
    ...actual,
    getDocument: (options: Record<string, unknown>) =>
      actual.getDocument({
        ...options,
        standardFontDataUrl: `${resolve("node_modules/pdfjs-dist/standard_fonts")}/`,
        cMapUrl: `${resolve("node_modules/pdfjs-dist/cmaps")}/`,
        wasmUrl: `${resolve("node_modules/pdfjs-dist/wasm")}/`,
      }),
  };
});
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", async () => {
  const { pathToFileURL } = await import("node:url");
  return {
    default: pathToFileURL(
      resolve("node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")
    ).href,
  };
});

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (!LIBERATION_SANS_FONT.test(url)) {
        throw new Error(`Unexpected resource: ${url}`);
      }
      const font = await readFile(
        resolve(
          "node_modules/pdfjs-dist/standard_fonts",
          url.includes("Bold")
            ? "LiberationSans-Bold.ttf"
            : "LiberationSans-Regular.ttf"
        )
      );
      return {
        ok: true,
        arrayBuffer: async () =>
          font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength),
      };
    })
  );
});
afterEach(() => vi.unstubAllGlobals());

import { buildInvoicePdf } from "@/lib/invoice-pdf";

const WORDS = "boiterie vomissements prurit otite dermatite toux fièvre abattement méloxicam amoxicilline radiographie échographie créatinine arthrose contrôle".split(" ");
const phrase = (n: number, seed: number) => Array.from({ length: n }, (_, i) => WORDS[(i * 7 + seed) % WORDS.length]).join(" ");
const time = async (label: string, fn: () => Promise<unknown> | unknown, runs = 3) => {
  const ms: number[] = [];
  let last: unknown;
  for (let i = 0; i < runs; i++) { const t = performance.now(); last = await fn(); ms.push(performance.now() - t); }
  ms.sort((a, b) => a - b);
  return { label, medianMs: Math.round(ms[Math.floor(runs / 2)]), runs, last };
};
async function attachment(pages: number) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) pdf.addPage([595.28, 841.89]).drawText("PIECE " + (i + 1), { x: 24, y: 44, size: 14, font });
  return pdf.save();
}

it("banc PDF", { timeout: 600_000 }, async () => {
  const results = [];
  for (const consultations of [10, 200]) {
    const blocks = Array.from({ length: consultations }, (_, i) => ({ kind: "text" as const, title: "Consultation du " + (i + 1) + "/03/2025", meta: "Dr Test", text: ["Motif : " + phrase(20, i), "Examen : " + phrase(60, i + 1), "Diagnostic : " + phrase(25, i + 2), "Plan : " + phrase(40, i + 3)].join("\n") }));
    const r = await time("dossier " + consultations + " consultations", () => buildPatientRecordPdf({
      patientId: "patient-1", patientName: "Rex", requestedBy: "vet-1", generatedAt: "2026-10-17T12:00:00Z", exportDay: "2026-10-17", filename: "Dossier_Rex.pdf",
      options: { period: null, sections: { identity: true, consultations: true, documents: true, reminders: true, notes: true }, includeAttachments: false },
      clinic: { ...DEFAULT_INVOICE_SETTINGS, name: "Clinique des Oliviers" }, cover: { species: "Chien", breed: "Croisé", ownerName: "Nadia" },
      sections: [{ id: "identity", title: "Identité", blocks: [{ kind: "text", text: "Chien croisé, 24 kg." }] }, { id: "consultations", title: "Consultations", blocks }],
    }));
    const pdf = r.last as { bytes?: Uint8Array; pages?: number };
    results.push({ label: r.label, medianMs: r.medianMs, pages: pdf.pages, kB: pdf.bytes ? Math.round(pdf.bytes.length / 1000) : undefined });
  }
  const src = await attachment(40);
  const withSrc = await time("dossier 10 consultations + pièce jointe de 40 pages", () => buildPatientRecordPdf({
    patientId: "patient-1", patientName: "Rex", requestedBy: "vet-1", generatedAt: "2026-10-17T12:00:00Z", exportDay: "2026-10-17", filename: "Dossier_Rex.pdf",
    options: { period: null, sections: { identity: true, consultations: true, documents: true, reminders: true, notes: true }, includeAttachments: true },
    clinic: { ...DEFAULT_INVOICE_SETTINGS, name: "Clinique des Oliviers" }, cover: {},
    sections: [{ id: "identity", title: "Identité", blocks: [{ kind: "text", text: "Chien croisé." }] }, { id: "attachments", title: "Pièces", blocks: [{ kind: "source", source: { id: "s1", patientId: "patient-1", title: "Examen", fileName: "examen.pdf", mimeType: "application/pdf", dataUrl: "data:application/pdf;base64," + Buffer.from(src).toString("base64"), createdAt: "2026-10-16", origin: "import" } }] }],
  }));
  const p2 = withSrc.last as { bytes?: Uint8Array; pages?: number };
  results.push({ label: withSrc.label, medianMs: withSrc.medianMs, pages: p2.pages, kB: p2.bytes ? Math.round(p2.bytes.length / 1000) : undefined });
  for (const lines of [1, 60]) {
    const items = Array.from({ length: lines }, (_, i) => ({ description: "Acte " + i + " " + phrase(6, i), amount: 150_000 }));
    const total = lines * 150_000;
    const r = await time("facture " + lines + " ligne(s)", () => buildInvoicePdf({ number: "2026-001", date: new Date("2026-09-29T12:00:00Z"), patientName: "Milo", ownerName: "Nadia", items, totalAmount: total, paidAmount: 0, balanceAmount: total }, { ...DEFAULT_INVOICE_SETTINGS, name: "Cabinet" }).output("arraybuffer"), 5);
    results.push({ label: r.label, medianMs: r.medianMs });
  }
  const { writeFileSync } = await import("node:fs");
  writeFileSync(process.env.BANC_PDF_OUT ?? "/dev/stdout", JSON.stringify(results, null, 1));
});
