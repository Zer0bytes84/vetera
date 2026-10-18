import { beforeEach, expect, it, vi } from "vitest";
import type { PatientDocument } from "@/modules/documents/document-domain";
import type { LocalModelStatus } from "@/modules/consultations/local-ai/models";
import { readPatientDocument } from "@/modules/documents/lib/patient-document-reading";
import { readDocumentAnswer } from "@/modules/documents/lib/read-document-answer";

const engine = vi.hoisted(() => ({ request: vi.fn(), close: vi.fn(), create: vi.fn() }));
vi.mock("@/modules/consultations/local-ai/inference-client", () => ({
  LocalInferenceSession: { create: engine.create },
  abortError: () => new DOMException("Annulé", "AbortError"),
}));
vi.mock("@/modules/consultations/local-ai/models", () => ({ getLocalModelUrls: () => ({ generatorUrl: "local-model://fixture", tokenizerUrl: "local-model://tokens" }) }));
beforeEach(() => { vi.clearAllMocks(); engine.create.mockResolvedValue({ request: engine.request, close: engine.close }); });
const patientDocument = (imported = false) => ({
  id: "ordonnance", patientId: "rex", title: "Ordonnance de Rex", status: "finalise", content: "Dose consignée : 24 mg, voie orale.",
  attachment: imported ? { textState: "extractible", pages: [{ page: 2, text: "Dose consignée : 24 mg, voie orale." }] } : null,
}) as PatientDocument;
const models = { generatorReady: true } as LocalModelStatus;

it.each([false, true])("relie la source patient à la lecture assistée avec citation exacte et ferme le moteur, PDF : %s", async imported => {
  const document = patientDocument(imported), original = JSON.stringify(document);
  const page = imported ? 2 : 1;
  engine.request.mockResolvedValue({ type: "generated", text: JSON.stringify({ extraits: [{ page, texte: "24 mg, voie orale." }] }) });
  const source = await readPatientDocument(document, { patientId: "rex" });
  const result = await readDocumentAnswer(source, "Quel dosage a été prescrit ?", models, new AbortController().signal, () => {});
  expect(result.answer.extraits).toEqual([{ page, texte: "24 mg, voie orale." }]);
  expect(engine.request.mock.calls[0][0]).toMatchObject({ type: "generate", purpose: "document", generatorUrl: "local-model://fixture" });
  expect(engine.close).toHaveBeenCalledOnce();
  expect(JSON.stringify(document)).toBe(original);
});
it("refuse une dose inventée même après le nouvel essai et ferme le moteur local", async () => {
  engine.request.mockResolvedValue({ type: "generated", text: JSON.stringify({ extraits: [{ page: 1, texte: "Dose : 240 mg." }] }) });
  const source = await readPatientDocument(patientDocument());
  await expect(readDocumentAnswer(source, "Dosage ?", models, new AbortController().signal, () => {})).rejects.toThrow("ne correspond pas exactement");
  expect(engine.request).toHaveBeenCalledTimes(2);
  expect(engine.close).toHaveBeenCalledOnce();
});
it("signale un scan avant tout appel au moteur et préserve le document original", async () => {
  const document = patientDocument(true); document.attachment!.textState = "scan";
  const original = JSON.stringify(document);
  await expect(readPatientDocument(document)).rejects.toThrow("sans texte extractible");
  expect(engine.create).not.toHaveBeenCalled();
  expect(JSON.stringify(document)).toBe(original);
});
