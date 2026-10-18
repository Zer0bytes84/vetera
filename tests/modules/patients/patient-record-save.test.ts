import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PatientRecordPdf } from "@/modules/patients/export/patient-record-types";

const mock = vi.hoisted(() => ({
  native: true, save: vi.fn(), writeFile: vi.fn(), getSetting: vi.fn(), setSetting: vi.fn(),
  getCurrentUser: vi.fn(), renderPdfPages: vi.fn(),
}));
vi.mock("@/services/browser-store", () => ({ isTauriRuntime: () => mock.native }));
vi.mock("@/services/appSettingsService", () => ({ getSetting: mock.getSetting, setSetting: mock.setSetting }));
vi.mock("@/data/repositories", () => ({ authRepository: { getCurrentUser: mock.getCurrentUser } }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ save: mock.save }));
vi.mock("@tauri-apps/plugin-fs", () => ({ writeFile: mock.writeFile }));
vi.mock("@tauri-apps/api/path", () => ({
  desktopDir: async () => "/Users/test/Desktop", join: async (...parts: string[]) => parts.join("/"),
  dirname: async (path: string) => path.slice(0, path.lastIndexOf("/")),
}));
vi.mock("@/modules/documents/lib/managed-document-pdf", () => ({ renderPdfPages: mock.renderPdfPages }));

import { printPatientRecordPdf, savePatientRecordPdf } from "@/modules/patients/export/patient-record-save";

const artifact: PatientRecordPdf = {
  bytes: new Uint8Array([37, 80, 68, 70]), pageCount: 1, filename: "Dossier_Mocha_2026-10-17.pdf",
  patientId: "mocha", patientName: "Mocha", requestedBy: "vet", generatedAt: "2026-10-17T12:00:00Z",
};

beforeEach(() => {
  vi.resetAllMocks(); mock.native = true;
  mock.getCurrentUser.mockResolvedValue({ id: "vet" });
  mock.getSetting.mockResolvedValue(null);
  mock.save.mockResolvedValue("/Users/test/Archives/dossier.pdf");
  mock.writeFile.mockResolvedValue(undefined);
  mock.setSetting.mockResolvedValue(undefined);
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it("propose le Bureau puis écrit exactement les octets relus et retient le dossier choisi", async () => {
  expect(await savePatientRecordPdf(artifact)).toEqual({ path: "/Users/test/Archives/dossier.pdf", downloaded: false });
  expect(mock.save).toHaveBeenCalledWith(expect.objectContaining({ defaultPath: "/Users/test/Desktop/Dossier_Mocha_2026-10-17.pdf" }));
  expect(mock.writeFile).toHaveBeenCalledWith("/Users/test/Archives/dossier.pdf", artifact.bytes);
  expect(mock.writeFile.mock.calls[0][1]).toBe(artifact.bytes);
  expect(mock.setSetting).toHaveBeenCalledWith("patient_record_pdf_directory", "/Users/test/Archives");
});

it("réutilise le dernier emplacement enregistré avec succès", async () => {
  mock.getSetting.mockResolvedValue("/Users/test/Dossiers");
  await savePatientRecordPdf(artifact);
  expect(mock.save).toHaveBeenCalledWith(expect.objectContaining({ defaultPath: "/Users/test/Dossiers/Dossier_Mocha_2026-10-17.pdf" }));
});

it("annule sans écriture ni modification des préférences", async () => {
  mock.save.mockResolvedValue(null);
  expect(await savePatientRecordPdf(artifact)).toBeNull();
  expect(mock.writeFile).not.toHaveBeenCalled();
  expect(mock.setSetting).not.toHaveBeenCalled();
});

it("conserve l’erreur d’écriture et ne retient pas une destination en échec", async () => {
  mock.writeFile.mockRejectedValue(new Error("Disk full"));
  await expect(savePatientRecordPdf(artifact)).rejects.toThrow("Disk full");
  expect(mock.setSetting).not.toHaveBeenCalled();
});

it("refuse un changement de session intervenu dans le dialogue d’enregistrement", async () => {
  mock.getCurrentUser.mockResolvedValueOnce({ id: "vet" }).mockResolvedValueOnce({ id: "other" });
  await expect(savePatientRecordPdf(artifact)).rejects.toThrow("Votre session a changé");
  expect(mock.writeFile).not.toHaveBeenCalled();
});

it("refuse une session expirée avant d’ouvrir le dialogue", async () => {
  mock.getCurrentUser.mockResolvedValue(null);
  await expect(savePatientRecordPdf(artifact)).rejects.toThrow("Votre session a changé");
  expect(mock.save).not.toHaveBeenCalled();
});

it("préserve le succès du fichier même si la préférence ne peut pas être mémorisée", async () => {
  mock.setSetting.mockRejectedValue(new Error("Préférence indisponible"));
  expect(await savePatientRecordPdf(artifact)).toEqual({ path: "/Users/test/Archives/dossier.pdf", downloaded: false });
});

it("revient au Bureau si la préférence ne peut pas être lue", async () => {
  mock.getSetting.mockRejectedValue(new Error("Préférence indisponible"));
  await savePatientRecordPdf(artifact);
  expect(mock.save).toHaveBeenCalledWith(expect.objectContaining({ defaultPath: "/Users/test/Desktop/Dossier_Mocha_2026-10-17.pdf" }));
});

it("télécharge les mêmes octets dans le navigateur sans inventer de chemin disque", async () => {
  vi.useFakeTimers(); mock.native = false;
  const link = { href: "", download: "", click: vi.fn() };
  const createObjectURL = vi.fn((_blob: Blob) => "blob:local-dossier"), revokeObjectURL = vi.fn();
  vi.stubGlobal("document", { createElement: () => link });
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
  expect(await savePatientRecordPdf(artifact)).toEqual({ path: artifact.filename, downloaded: true });
  expect(link.download).toBe(artifact.filename);
  expect(link.click).toHaveBeenCalledOnce();
  const blob = createObjectURL.mock.calls[0][0] as Blob;
  expect(new Uint8Array(await blob.arrayBuffer())).toEqual(artifact.bytes);
  expect(mock.save).not.toHaveBeenCalled();
  vi.advanceTimersByTime(30_000);
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:local-dossier");
});

it("annule la préparation d’impression avant d’ouvrir le dialogue système", async () => {
  const controller = new AbortController(); controller.abort();
  mock.renderPdfPages.mockResolvedValue([]);
  await expect(printPatientRecordPdf(artifact, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
});

it("interrompt aussi l’impression pendant le chargement des images sans rester bloqué", async () => {
  const controller = new AbortController();
  const remove = vi.fn(), print = vi.fn();
  const target = { open: vi.fn(), write: vi.fn(), close: vi.fn(), title: "", createElement: () => ({}), body: { appendChild: () => controller.abort() } };
  vi.stubGlobal("document", { createElement: () => ({ title: "", style: { cssText: "" }, contentDocument: target, contentWindow: { print }, remove }), body: { appendChild: vi.fn() } });
  mock.renderPdfPages.mockResolvedValue(["data:image/png;base64,aW1hZ2U="]);
  await expect(printPatientRecordPdf(artifact, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  expect(remove).toHaveBeenCalled();
  expect(print).not.toHaveBeenCalled();
});
