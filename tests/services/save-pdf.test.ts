import { beforeEach, describe, expect, it, vi } from "vitest";
import { savePdf } from "@/lib/save-pdf";

const mock = vi.hoisted(() => ({
  native: false,
  save: vi.fn(),
  writeFile: vi.fn(),
}));
vi.mock("@/services/browser-store", () => ({
  isTauriRuntime: () => mock.native,
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({ save: mock.save }));
vi.mock("@tauri-apps/plugin-fs", () => ({ writeFile: mock.writeFile }));
const doc = {
  save: vi.fn(),
  output: () => new Uint8Array([37, 80, 68, 70]).buffer,
};
beforeEach(() => {
  vi.clearAllMocks();
  mock.native = false;
});

describe("receipt PDF export", () => {
  it("downloads in the browser", async () => {
    expect(await savePdf(doc, "facture.pdf")).toBe(true);
    expect(doc.save).toHaveBeenCalledWith("facture.pdf");
    expect(mock.save).not.toHaveBeenCalled();
  });
  it("writes the selected native file instead of using WebKit download", async () => {
    mock.native = true;
    mock.save.mockResolvedValue("/tmp/facture.pdf");
    expect(await savePdf(doc, "facture.pdf")).toBe(true);
    expect(mock.writeFile).toHaveBeenCalledWith(
      "/tmp/facture.pdf",
      new Uint8Array([37, 80, 68, 70])
    );
    expect(doc.save).not.toHaveBeenCalled();
  });
  it("treats cancelling the save dialog as cancellation, not a payment failure", async () => {
    mock.native = true;
    mock.save.mockResolvedValue(null);
    expect(await savePdf(doc, "facture.pdf")).toBe(false);
    expect(mock.writeFile).not.toHaveBeenCalled();
  });
  it("propagates a disk failure for the PDF-only retry action", async () => {
    mock.native = true;
    mock.save.mockResolvedValue("/tmp/facture.pdf");
    mock.writeFile.mockRejectedValueOnce(new Error("Disk full"));
    await expect(savePdf(doc, "facture.pdf")).rejects.toThrow("Disk full");
  });
});
