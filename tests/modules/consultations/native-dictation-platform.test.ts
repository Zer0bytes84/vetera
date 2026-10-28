import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/browser-store", () => ({ isTauriRuntime: () => true }));
import { nativeDictationEnabled } from "@/modules/consultations/local-ai/native-dictation";

describe("moteur de dictée selon le poste", () => {
  it("macOS : le compagnon natif empaqueté transcrit", () => {
    expect(nativeDictationEnabled("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15")).toBe(true);
  });
  it("Windows : aucun compagnon empaqueté, la dictée WASM reste", () => {
    expect(nativeDictationEnabled("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/120")).toBe(false);
  });
});

describe("installation de la dictée", () => {
  it("sur macOS, la dictée n'est prête qu'avec son modèle natif ; ailleurs le modèle WASM suffit", async () => {
    const { dictationModelReady } = await import("@/modules/consultations/services/ai-model-provisioning");
    const base = { root: "x", whisperReady: true, generatorReady: true, embeddingReady: true };
    expect(dictationModelReady(base, true)).toBe(false);
    expect(dictationModelReady({ ...base, whisperTurboReady: true }, true)).toBe(true);
    expect(dictationModelReady(base, false)).toBe(true);
  });
  it("le manifeste installe le turbo épinglé, avec sa taille et son empreinte publiées", async () => {
    const manifest = (await import("../../../resources/local-ai/download-manifest.json")).default as {
      id: string; macosOnly?: boolean; files: { path: string; url: string; size: number; sha256: string }[];
    }[];
    const turbo = manifest.find((model) => model.id === "whisper-turbo")!;
    expect(turbo.macosOnly).toBe(true);
    expect(turbo.files).toEqual([{
      path: "ggml-large-v3-turbo-q8_0.bin",
      url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-large-v3-turbo-q8_0.bin",
      size: 874188075,
      sha256: "317eb69c11673c9de1e1f0d459b253999804ec71ac4c23c17ecf5fbe24e259a1",
    }]);
  });
});
