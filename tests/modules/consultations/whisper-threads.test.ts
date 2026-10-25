import { describe, expect, it } from "vitest";
import { whisperThreads } from "@/modules/consultations/local-ai/whisper-threads";

describe("threads de la dictée", () => {
  it("prend la moitié des cœurs, au plus 4 et au moins 1", () => {
    expect(whisperThreads(8)).toBe(4);
    expect(whisperThreads(16)).toBe(4);
    expect(whisperThreads(4)).toBe(2);
    expect(whisperThreads(1)).toBe(1);
    expect(whisperThreads(0)).toBe(1);
  });
});
