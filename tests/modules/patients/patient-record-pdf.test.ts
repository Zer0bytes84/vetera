import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { degrees, PDFDocument, PDFName, rgb, StandardFonts } from "pdf-lib";
import { getDocument, type PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { buildPatientRecordPdf } from "@/modules/patients/export/patient-record-pdf";
import { DEFAULT_INVOICE_SETTINGS } from "@/services/invoiceSettingsService";
import type { PatientRecordSnapshot, PatientRecordSource } from "@/modules/patients/export/patient-record-types";

// The production fallback uses the browser's canvas and app-local worker/font
// URLs. This test runs the same PDF.js renderer with its native Node canvas and
// filesystem resources, so annotation appearance is exercised without a DOM.
vi.mock("pdfjs-dist", async () => {
  const actual = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return {
    ...actual,
    getDocument: (options: Record<string, unknown>) => actual.getDocument({
      ...options,
      standardFontDataUrl: resolve("node_modules/pdfjs-dist/standard_fonts") + "/",
      cMapUrl: resolve("node_modules/pdfjs-dist/cmaps") + "/",
      wasmUrl: resolve("node_modules/pdfjs-dist/wasm") + "/",
    }),
  };
});
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", async () => {
  const { pathToFileURL } = await import("node:url");
  return { default: pathToFileURL(resolve("node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")).href };
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (!/LiberationSans-(Regular|Bold)\.ttf/.test(url)) throw new Error(`Unexpected resource: ${url}`);
    const font = await readFile(resolve("node_modules/pdfjs-dist/standard_fonts", url.includes("Bold") ? "LiberationSans-Bold.ttf" : "LiberationSans-Regular.ttf"));
    return { ok: true, arrayBuffer: async () => font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength) };
  }));
});
afterEach(() => vi.unstubAllGlobals());

function snapshot(overrides: Partial<PatientRecordSnapshot> = {}): PatientRecordSnapshot {
  return {
    patientId: "patient-1", patientName: "Éloïse Œdipe", requestedBy: "vet-1",
    generatedAt: "2026-10-17T12:00:00Z", exportDay: "2026-10-17", filename: "Dossier_Éloïse_2026-10-17.pdf",
    options: { period: null, sections: { identity: true, consultations: true, documents: true, reminders: true, notes: true }, includeAttachments: true },
    clinic: { ...DEFAULT_INVOICE_SETTINGS, name: "Clinique des Oliviers", footer: "Mentions cliniques configurées. Équipe vétérinaire." },
    cover: { species: "Chat", breed: "Européen", ownerName: "Zoé Noël" },
    sections: [{ id: "identity", title: "Identité du patient", blocks: [{ kind: "text", text: "Évaluation : température 38,5 °C ; poids 4,2 kg. Cœur régulier." }] }],
    ...overrides,
  };
}

async function withPdf<T>(bytes: Uint8Array, run: (pdf: PDFDocumentProxy) => Promise<T>): Promise<T> {
  const task = getDocument({ data: bytes.slice(), standardFontDataUrl: resolve("node_modules/pdfjs-dist/standard_fonts") + "/" });
  try { return await run(await task.promise); }
  finally { await task.destroy(); }
}

async function textPages(bytes: Uint8Array): Promise<string[]> {
  return withPdf(bytes, async (pdf) => {
    const result: string[] = [];
    for (let index = 1; index <= pdf.numPages; index++) {
      const page = await pdf.getPage(index);
      const content = await page.getTextContent();
      result.push(content.items.map((item) => "str" in item ? item.str : "").join(" "));
      page.cleanup();
    }
    return result;
  });
}

function dataUrl(bytes: Uint8Array, mime = "application/pdf"): string {
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}

async function receipt(name: string, bytes: Uint8Array): Promise<void> {
  const destination = process.env.BAITARI_PDF_RECEIPTS;
  if (!destination) return;
  await mkdir(destination, { recursive: true });
  await writeFile(resolve(destination, name), bytes);
}

function source(bytes: Uint8Array, overrides: Partial<PatientRecordSource> = {}): PatientRecordSource {
  return { id: "source-1", patientId: "patient-1", title: "Examen original", fileName: "examen.pdf", mimeType: "application/pdf", dataUrl: dataUrl(bytes, overrides.mimeType || "application/pdf"), createdAt: "2026-10-16", origin: "import", ...overrides };
}

async function originalPdf(count = 1, rotation = 0) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < count; index++) {
    const page = pdf.addPage(index % 2 ? [841.89, 595.28] : [595.28, 841.89]);
    if (rotation) page.setRotation(degrees(rotation));
    page.drawText(`ORIGINAL SOURCE ${index + 1}`, { x: 24, y: 44, size: 14, font });
    page.drawRectangle({ x: 2, y: 2, width: page.getWidth() - 4, height: page.getHeight() - 4, borderColor: rgb(0, 0.6, 0.2), borderWidth: 2 });
  }
  return pdf.save();
}

it("produit un vrai dossier A4 Unicode avec identité, période et mentions répétées sur chaque page", async () => {
  const input = snapshot({ options: { ...snapshot().options, period: { from: "2026-01-01", to: "2026-10-17" } } });
  const unchanged = JSON.stringify(input);
  const result = await buildPatientRecordPdf(input);
  const pages = await textPages(result.bytes);
  expect(pages).toHaveLength(result.pageCount);
  expect(pages[0]).toContain("Zoé Noël");
  expect(pages[0]).toContain("Européen");
  expect(pages[0]).toContain("01/01/2026 au 17/10/2026 inclus");
  expect(pages.join(" ")).toContain("Cœur régulier");
  pages.forEach((page, index) => {
    expect(page).toContain("Éloïse Œdipe");
    expect(page).toContain("Clinique des Oliviers");
    expect(page).toContain(`Page ${index + 1} / ${result.pageCount}`);
    expect(page).toContain("Document généré par Baitari");
    expect(page).toContain("Mentions cliniques configurées");
    expect(page).toContain("Généré le 17/10/2026");
  });
  const parsed = await PDFDocument.load(result.bytes);
  parsed.getPages().forEach((page) => {
    expect(page.getWidth()).toBeCloseTo(595.28, 1);
    expect(page.getHeight()).toBeCloseTo(841.89, 1);
  });
  expect(JSON.stringify(input)).toBe(unchanged);
  expect(result).toMatchObject({ filename: input.filename, requestedBy: "vet-1", patientId: "patient-1", generatedAt: input.generatedAt });
  await receipt("dossier-garde.pdf", result.bytes);
});

it("scinde une ligne de tableau extrême, répète ses colonnes et conserve les cellules sans empiéter sur les marges", async () => {
  const rows = Array.from({ length: 85 }, (_, index) => [String(index), `Observation_${index} : peau, cœur et démarche.`, `Dose_${index} 0,25 mL`]);
  rows.splice(3, 0, ["Ligne étendue", Array.from({ length: 180 }, (_, index) => `LongueObservation${index}`).join("\n"), "Fin de ligne longue"]);
  const result = await buildPatientRecordPdf(snapshot({ sections: [{ id: "consultations", title: "Consultations", blocks: [{ kind: "table", columns: ["Date clinique", "Observations enregistrées", "Dose conservée"], widths: [18, 58, 24], rows }] }] }));
  const pages = await textPages(result.bytes);
  expect(pages.length).toBeGreaterThan(5);
  pages.slice(1).forEach((page) => expect(page).toContain("Observations enregistrées"));
  const text = pages.join(" ");
  expect(text).toContain("LongueObservation179");
  expect(text).toContain("Fin de ligne longue");
  expect(text).toContain("Dose_84 0,25 mL");
  await withPdf(result.bytes, async (pdf) => {
    for (let index = 2; index <= pdf.numPages; index++) {
      const content = await (await pdf.getPage(index)).getTextContent();
      for (const item of content.items) if ("str" in item && /LongueObservation|Observation_|Dose_/.test(item.str)) {
        // PDF coordinates increase from the bottom. Reserved header/footer
        // strips are checked on actual emitted text, not layout internals.
        expect(item.transform[5]).toBeGreaterThan(105);
        expect(item.transform[5]).toBeLessThan(735);
      }
    }
  });
  await receipt("dossier-tableau.pdf", result.bytes);
});

it("conserve le texte original des PDF portrait, paysage et tournés puis place les annexes après les notes", async () => {
  const originals = await originalPdf(2, 90);
  const before = Buffer.from(originals);
  const input = snapshot({ sections: [
    { id: "attachments", title: "Annexes", blocks: [{ kind: "source", source: source(originals) }] },
    { id: "notes", title: "Notes libres", blocks: [{ kind: "text", text: "NOTE CLINIQUE LIBRE" }] },
    { id: "documents", title: "Documents générés", blocks: [{ kind: "source", source: source(await originalPdf(), { id: "generated-1", origin: "generated", title: "Compte rendu finalisé", fileName: "compte-rendu.pdf", dataUrl: dataUrl(await originalPdf()).replace(";base64,", ";filename=generated.pdf;base64,") }) }] },
  ] });
  const result = await buildPatientRecordPdf(input);
  const pages = await textPages(result.bytes);
  const notePage = pages.findIndex((page) => page.includes("NOTE CLINIQUE LIBRE"));
  const generatedPage = pages.findIndex((page) => page.includes("Pièce originale") && page.includes("compte-rendu.pdf"));
  const annexPage = pages.findIndex((page) => page.includes("Pièce originale") && page.includes("examen.pdf"));
  expect(generatedPage).toBeGreaterThan(0);
  expect(generatedPage).toBeLessThan(notePage);
  expect(annexPage).toBeGreaterThan(notePage);
  expect(pages[annexPage]).toContain("ORIGINAL SOURCE 1");
  expect(pages[annexPage + 1]).toContain("ORIGINAL SOURCE 2");
  expect(Buffer.from(originals)).toEqual(before);
  await receipt("dossier-annexes.pdf", result.bytes);
});

it("décrit chaque page d’une annexe de plus de vingt pages et restitue réellement la boucle d’événements", async () => {
  let timerRan = false;
  setTimeout(() => { timerRan = true; }, 0);
  const progress = vi.fn();
  const result = await buildPatientRecordPdf(snapshot({ sections: [{ id: "attachments", title: "Annexes", blocks: [{ kind: "source", source: source(await originalPdf(23)) }] }] }), { onProgress: progress });
  expect(timerRan).toBe(true);
  expect(result.pageCount).toBe(25);
  const calls = progress.mock.calls.map(([value]) => value);
  expect(calls.filter((value) => value.stage === "attachments")).toHaveLength(23);
  expect(calls.some((value) => value.label.includes("23 / 23"))).toBe(true);
  expect(calls.some((value) => value.total === 25 && value.current === 25)).toBe(true);
  const pages = await textPages(result.bytes);
  expect(pages.at(-1)).toContain("ORIGINAL SOURCE 23");
  expect(pages.at(-1)).toContain("Page 25 / 25");
});

it("annule pendant une préparation volumineuse sans rendre un faux succès", async () => {
  const controller = new AbortController();
  const progress = vi.fn((value) => { if (value.pages >= 5) controller.abort(); });
  const yieldToMain = vi.fn(async () => new Promise<void>((resolve) => setTimeout(resolve, 0)));
  await expect(buildPatientRecordPdf(snapshot({ sections: [{ id: "attachments", title: "Annexes", blocks: [{ kind: "source", source: source(await originalPdf(24)) }] }] }), { signal: controller.signal, onProgress: progress, yieldToMain })).rejects.toMatchObject({ name: "AbortError" });
  expect(yieldToMain).toHaveBeenCalled();
  expect(progress.mock.calls.some(([value]) => value.stage === "finalizing")).toBe(false);
});

it("refuse une pièce corrompue, distante ou d’un autre patient en identifiant l’erreur", async () => {
  for (const attachment of [
    source(new TextEncoder().encode("Ce fichier n’est pas un PDF"), { fileName: "illisible.pdf" }),
    source(new Uint8Array(), { fileName: "distant.pdf", dataUrl: "https://example.invalid/file.pdf" }),
  ]) {
    await expect(buildPatientRecordPdf(snapshot({ sections: [{ id: "attachments", title: "Annexes", blocks: [{ kind: "source", source: attachment }] }] }))).rejects.toThrow(attachment.fileName);
  }
  await expect(buildPatientRecordPdf(snapshot({ sections: [{ id: "attachments", title: "Annexes", blocks: [{ kind: "source", source: source(await originalPdf(), { patientId: "patient-2" }) }] }] }))).rejects.toThrow("n’appartient pas au patient");
});

it("omet les sections vides, refuse un dossier sans contenu et un logo distant", async () => {
  const result = await buildPatientRecordPdf(snapshot({ sections: [
    { id: "identity", title: "Identité du patient", blocks: [{ kind: "text", text: "Identité réelle" }] },
    { id: "reminders", title: "Rappels médicaux absents", blocks: [{ kind: "table", columns: ["Date"], rows: [] }] },
  ] }));
  expect((await textPages(result.bytes)).join(" ")).not.toContain("Rappels médicaux absents");
  await expect(buildPatientRecordPdf(snapshot({ sections: [] }))).rejects.toThrow("aucune donnée exportable");
  await expect(buildPatientRecordPdf(snapshot({ clinic: { ...snapshot().clinic, logoDataUrl: "https://example.invalid/logo.png" } }))).rejects.toThrow("logo");
});

it("conserve les titres et dates des blocs sans corps, y compris deux préfaces documentaires", async () => {
  const original = await originalPdf();
  const result = await buildPatientRecordPdf(snapshot({ sections: [
    { id: "consultations", title: "Consultations", blocks: [{ kind: "text", title: "Consultation enregistrée", meta: "16/10/2026 · Dr Zoé", text: "" }] },
    { id: "documents", title: "Documents générés", blocks: [
      { kind: "text", title: "Préface du premier document", meta: "15/10/2026 · Version 1", text: "" },
      { kind: "source", source: source(original, { origin: "generated", fileName: "premier.pdf" }) },
      { kind: "text", title: "Préface du second document", meta: "16/10/2026 · Version 2", text: "" },
      { kind: "source", source: source(original, { id: "second", origin: "generated", fileName: "second.pdf" }) },
    ] },
  ] }));
  const text = (await textPages(result.bytes)).join(" ");
  for (const value of ["Consultation enregistrée", "16/10/2026 · Dr Zoé", "Préface du premier document", "15/10/2026 · Version 1", "Préface du second document", "16/10/2026 · Version 2", "premier.pdf", "second.pdf"])
    expect(text).toContain(value);
});

it("refuse explicitement une note adhésive visible sans apparence PDF au lieu de l’omettre", async () => {
  const { createCanvas } = await import("@napi-rs/canvas");
  const annotated = await PDFDocument.create(), page = annotated.addPage([400, 300]);
  const annotation = annotated.context.obj({ Type: "Annot", Subtype: "Text", Rect: [30, 30, 60, 60], Contents: "Note clinique à préserver", F: 4 });
  page.node.set(PDFName.of("Annots"), annotated.context.obj([annotated.context.register(annotation)]));
  vi.stubGlobal("window", { location: new URL("http://localhost:5180/"), document: { createElement: () => createCanvas(1, 1) } });
  await expect(buildPatientRecordPdf(snapshot({ sections: [{ id: "attachments", title: "Annexes", blocks: [{ kind: "source", source: source(await annotated.save(), { fileName: "annotation-sans-ap.pdf" }) }] }] }))).rejects.toThrow("annotation-sans-ap.pdf » n’a pas pu être intégrée : L’apparence visible d’une annotation");
});

it("intègre une image entière avec son rapport de proportions et les annotations visibles d’un formulaire", async () => {
  const { createCanvas } = await import("@napi-rs/canvas");
  const image = createCanvas(600, 120), context = image.getContext("2d");
  context.fillStyle = "#00aa00"; context.fillRect(0, 0, 600, 120);
  context.fillStyle = "#ff0000"; context.fillRect(0, 0, 10, 120); context.fillRect(590, 0, 10, 120);
  const formPdf = await PDFDocument.create(), formPage = formPdf.addPage([400, 300]);
  const field = formPdf.getForm().createTextField("Valeur clinique");
  field.setText("VALEUR VISIBLE");
  field.addToPage(formPage, { x: 40, y: 80, width: 300, height: 90, backgroundColor: rgb(1, 0, 0), textColor: rgb(0, 0, 0), borderWidth: 1 });
  // The fallback must use the same complete MediaBox as vector sources,
  // including content outside an existing narrow CropBox.
  formPage.setCropBox(80, 100, 180, 60);
  vi.stubGlobal("window", {
    location: new URL("http://localhost:5180/"), document: { createElement: () => createCanvas(1, 1) },
    requestAnimationFrame: (callback: () => void) => setTimeout(callback, 0),
    cancelAnimationFrame: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
  });
  const result = await buildPatientRecordPdf(snapshot({ sections: [{ id: "attachments", title: "Annexes", blocks: [
    { kind: "source", source: source(new Uint8Array(image.toBuffer("image/png")), { mimeType: "image/png", fileName: "panorama.png" }) },
    { kind: "source", source: source(await formPdf.save(), { id: "formulaire", fileName: "formulaire.pdf" }) },
  ] }] }));
  const pages = await textPages(result.bytes);
  expect(pages).toHaveLength(4);
  await withPdf(result.bytes, async (pdf) => {
    const render = async (number: number) => {
      const page = await pdf.getPage(number), viewport = page.getViewport({ scale: 1 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      await page.render({ canvas: canvas as unknown as HTMLCanvasElement, viewport }).promise;
      return canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
    };
    const panorama = await render(3);
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0, redLeft = false, redRight = false;
    for (let y = 0; y < panorama.height; y++) for (let x = 0; x < panorama.width; x++) {
      const offset = (y * panorama.width + x) * 4;
      if (panorama.data[offset + 1] > 100 && panorama.data[offset] < 50 && panorama.data[offset + 2] < 50) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      if (panorama.data[offset] > 200 && panorama.data[offset + 1] < 50) { if (x < 100) redLeft = true; if (x > 490) redRight = true; }
    }
    // Green occupies 580/120 of the image; both red end strips remain visible.
    expect((maxX - minX + 1) / (maxY - minY + 1)).toBeCloseTo(580 / 120, 1);
    expect(redLeft && redRight).toBe(true);
    const formImage = await render(4);
    let redPixels = 0, redMinX = Infinity, redMaxX = 0, redMinY = Infinity, redMaxY = 0;
    for (let y = 0; y < formImage.height; y++) for (let x = 0; x < formImage.width; x++) {
      const index = (y * formImage.width + x) * 4;
      if (formImage.data[index] > 200 && formImage.data[index + 1] < 50 && formImage.data[index + 2] < 50) {
        redPixels++;
        redMinX = Math.min(redMinX, x); redMaxX = Math.max(redMaxX, x);
        redMinY = Math.min(redMinY, y); redMaxY = Math.max(redMaxY, y);
      }
    }
    expect(redPixels).toBeGreaterThan(10_000);
    expect((redMaxX - redMinX + 1) / (redMaxY - redMinY + 1)).toBeCloseTo(300 / 90, 1);
  });
  await receipt("dossier-images-formulaire.pdf", result.bytes);
}, 20_000);
