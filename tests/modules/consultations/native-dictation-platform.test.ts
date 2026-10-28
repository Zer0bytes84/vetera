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
