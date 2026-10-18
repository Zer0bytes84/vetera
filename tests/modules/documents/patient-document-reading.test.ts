import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentAttachment, PatientDocument } from "../../../src/modules/documents/document-domain";
import { readPatientDocument, preparePatientAttachment, SCANNED_DOCUMENT_MESSAGE } from "../../../src/modules/documents/lib/patient-document-reading";
import { parseDocumentAnswer } from "../../../src/modules/documents/lib/document-reading";
import { filterPatientDocuments } from "../../../src/modules/documents/lib/filter-patient-documents";
import { managedDocumentSearchChunks } from "../../../src/modules/consultations/local-ai/embedding-index";

const pdfFixture = vi.hoisted(() => ({
  pageCount: 1, text: "Prescription du patient Rex. Amoxicilline 50 mg matin et soir pendant 5 jours.", image: false,
  destroyed: vi.fn(async () => {}), readImage: vi.fn(async () => ({ name: "photo.png", pages: [{ number: 1, text: "Résultat relu sur image", method: "ocr" as const }] })),
}));
vi.mock("../../../src/modules/documents/lib/read-local-document", () => ({ readLocalDocument: pdfFixture.readImage }));
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "/assets/pdf.worker.local.mjs" }));
vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  OPS: { paintImageXObject: 1, paintInlineImageXObject: 2, paintImageMaskXObject: 3 },
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({ get numPages() { return pdfFixture.pageCount; }, getPage: async () => ({
      getTextContent: async () => ({ items: [{ str: pdfFixture.text, hasEOL: true }] }),
      getOperatorList: async () => ({ fnArray: pdfFixture.image ? [1] : [] }), cleanup() {},
    }) }), destroy: pdfFixture.destroyed,
  })),
}));

function document(overrides: Partial<PatientDocument> = {}): PatientDocument {
  return { id: "document-rex", patientId: "rex", patientName: "Rex", kind: "prescription", title: "Ordonnance Rex", content: "Amoxicilline 50 mg matin et soir pendant 5 jours.", status: "finalise", attachment: null, updatedAt: "2026-10-17T09:00:00Z", createdAt: "2026-10-17T09:00:00Z", authorName: "Dr Karim", ...overrides } as PatientDocument;
}
function attachment(overrides: Partial<DocumentAttachment> = {}): DocumentAttachment {
  return { name: "laboratoire.pdf", mimeType: "application/pdf", size: 32, dataUrl: "data:application/pdf;base64,JVBERi0=", textState: "extractible", pages: [{ page: 1, text: "Globules rouges : 6,2 millions par microlitre." }], ...overrides };
}
beforeEach(() => {
  pdfFixture.pageCount = 1; pdfFixture.text = "Prescription du patient Rex. Amoxicilline 50 mg matin et soir pendant 5 jours."; pdfFixture.image = false;
  vi.clearAllMocks();
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("Lecture locale des documents du patient", () => {
  it("lit mot pour mot un document généré, sans modifier le document ni sa source", async () => {
    const original = Object.freeze(document());
    const source = await readPatientDocument(original, { patientId: "rex" });
    expect(source.sourceId).toBe(original.id);
    expect(source.pages).toEqual([{ number: 1, text: original.content, method: "text" }]);
    expect(parseDocumentAnswer(JSON.stringify({ extraits: [{ page: 1, texte: "Amoxicilline 50 mg matin et soir pendant 5 jours." }] }), source).extraits).toHaveLength(1);
    expect(original.status).toBe("finalise");
    expect(pdfFixture.readImage).not.toHaveBeenCalled();
  });
  it("lit les pages extractibles d’un PDF importé en conservant les numéros de page", async () => {
    const source = await readPatientDocument(document({ kind: "import", attachment: attachment({ pages: [{ page: 1, text: "Analyse sanguine" }, { page: 2, text: "Créatinine : 12 mg/L." }] }) }));
    expect(source.pages[1]).toEqual({ number: 2, text: "Créatinine : 12 mg/L.", method: "text" });
    expect(parseDocumentAnswer('{"extraits":[{"page":2,"texte":"Créatinine : 12 mg/L."}]}', source).extraits[0].page).toBe(2);
    expect(() => parseDocumentAnswer('{"extraits":[{"page":2,"texte":"Créatinine normale."}]}', source)).toThrow(/correspond pas exactement/);
  });
  it("signale un PDF scanné et ne lance aucune reconnaissance ni réponse inventée", async () => {
    await expect(readPatientDocument(document({ attachment: attachment({ textState: "scan", pages: [{ page: 1, text: "" }] }) }))).rejects.toThrow(SCANNED_DOCUMENT_MESSAGE);
    expect(pdfFixture.readImage).not.toHaveBeenCalled();
  });
  it("exclut les brouillons, les documents annulés et ceux d’un autre patient", async () => {
    await expect(readPatientDocument(document({ status: "brouillon" }))).rejects.toThrow(/Finalisez/);
    await expect(readPatientDocument(document({ status: "annule" }))).rejects.toThrow(/annulé/);
    await expect(readPatientDocument(document(), { patientId: "milo" })).rejects.toThrow(/n’appartient pas/);
  });
  it("requiert une action explicite avant la reconnaissance d’une image locale", async () => {
    const image = document({ attachment: attachment({ name: "photo.png", mimeType: "image/png", dataUrl: "data:image/png;base64,aW1hZ2U=", textState: "image", pages: [] }) });
    await expect(readPatientDocument(image)).rejects.toThrow(/explicitement/);
    expect(pdfFixture.readImage).not.toHaveBeenCalled();
    const source = await readPatientDocument(image, { allowImageOcr: true });
    expect(source.sourceId).toBe(image.id);
    expect(pdfFixture.readImage).toHaveBeenCalledOnce();
  });
  it("refuse une source trop longue au lieu de la tronquer", async () => {
    await expect(readPatientDocument(document({ content: "a".repeat(60001) }))).rejects.toThrow(/capacité/);
  });
});

describe("Import PDF sans appel distant ni OCR silencieuse", () => {
  function browser() {
    vi.stubGlobal("window", { location: { href: "http://localhost:5180/" } });
    vi.stubGlobal("FileReader", class {
      result: string | null = null; onload?: () => void;
      readAsDataURL() { this.result = "data:application/pdf;base64,JVBERi0="; this.onload?.(); }
    });
  }
  it("extrait la couche texte et conserve le fichier original localement", async () => {
    browser();
    const result = await preparePatientAttachment(new File(["%PDF-test"], "résultats.pdf", { type: "application/pdf" }));
    expect(result.textState).toBe("extractible");
    expect(result.pages).toEqual([{ page: 1, text: pdfFixture.text }]);
    expect(result.dataUrl).toBe("data:application/pdf;base64,JVBERi0=");
    expect(pdfFixture.destroyed).toHaveBeenCalledOnce();
    expect(pdfFixture.readImage).not.toHaveBeenCalled();
  });
  it("identifie un scan même lorsqu’il porte un petit en-tête numérique", async () => {
    browser(); pdfFixture.text = "Laboratoire vétérinaire"; pdfFixture.image = true;
    const result = await preparePatientAttachment(new File(["%PDF-test"], "scan.pdf", { type: "application/pdf" }));
    expect(result.textState).toBe("scan");
    expect(pdfFixture.readImage).not.toHaveBeenCalled();
  });
  it("conserve un résultat numérique court dans un PDF texte sans le confondre avec un scan", async () => {
    browser(); pdfFixture.text = "4,8 mg/L";
    const result = await preparePatientAttachment(new File(["%PDF-test"], "valeur.pdf", { type: "application/pdf" }));
    expect(result.textState).toBe("extractible");
    expect(result.pages[0].text).toBe("4,8 mg/L");
  });
  it("refuse de perdre des pages ou du texte pendant l’import", async () => {
    browser(); pdfFixture.pageCount = 21;
    await expect(preparePatientAttachment(new File(["%PDF-test"], "long.pdf", { type: "application/pdf" }))).rejects.toThrow(/20 pages/);
    pdfFixture.pageCount = 1; pdfFixture.text = "a".repeat(60001);
    await expect(preparePatientAttachment(new File(["%PDF-test"], "long.pdf", { type: "application/pdf" }))).rejects.toThrow(/tronqué/);
  });
  it("refuse les pièces non prises en charge avant toute lecture", async () => {
    await expect(preparePatientAttachment(new File(["texte"], "lettre.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }))).rejects.toThrow();
  });
});

describe("Registre et recherche patient", () => {
  it("filtre selon la date locale affichée, même après le changement de jour UTC", () => {
    const original = process.env.TZ; process.env.TZ = "America/Toronto";
    try {
      const docs = [document({ createdAt: "2026-10-18T00:30:00Z" })];
      expect(filterPatientDocuments(docs, { search: "", kind: "", from: "2026-10-17", to: "2026-10-17" })).toHaveLength(1);
    } finally { if (original) process.env.TZ = original; else delete process.env.TZ; }
  });
  it("combine recherche, type et dates inclusives sans altérer les documents", () => {
    const docs = [document(), document({ id: "old", kind: "report", title: "Compte-rendu", createdAt: "2026-09-01T10:00:00Z" }), document({ id: "today", title: "Ordonnance Milo", patientName: "Milo", createdAt: "2026-10-18T10:00:00Z" })];
    expect(filterPatientDocuments(docs, { search: " karim ", kind: "prescription", from: "2026-10-17", to: "2026-10-17" }).map(doc => doc.id)).toEqual(["document-rex"]);
    expect(docs).toHaveLength(3);
  });
  it("fournit des extraits actuels avec une portée patient et un identifiant distinct des anciennes notes", () => {
    const source = managedDocumentSearchChunks(document());
    expect(source).toMatchObject([{ patientId: "rex", sourceId: "patient-document:document-rex", sourceType: "document", section: "document", text: "Amoxicilline 50 mg matin et soir pendant 5 jours." }]);
    expect(managedDocumentSearchChunks(document({ status: "annule" }))).toEqual([]);
    expect(managedDocumentSearchChunks(document({ status: "brouillon" }))).toEqual([]);
    expect(managedDocumentSearchChunks(document({ attachment: attachment({ textState: "scan" }) }))).toEqual([]);
    expect(managedDocumentSearchChunks(document({ attachment: attachment({ textState: "image" }) }))).toEqual([]);
  });
});
