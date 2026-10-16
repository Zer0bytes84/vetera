import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DICTATION_LANGUAGE_KEY,
  readDictationLanguage,
  saveDictationLanguage,
  selectWhisperLanguage,
} from "@/modules/consultations/local-ai/whisper-language";

afterEach(() => vi.unstubAllGlobals());
describe("local Whisper language detection", () => {
  it("selects a language token rather than the highest vocabulary token", () => {
    expect(
      selectWhisperLanguage([100, -3, 1, 4, 0], {
        "<|fr|>": 2,
        "<|ar|>": 3,
        "<|en|>": 1,
      })
    ).toBe("ar");
    expect(
      selectWhisperLanguage([100, -3, 4, 1, 0], {
        "<|fr|>": 2,
        "<|ar|>": 3,
        "<|en|>": 1,
      })
    ).toBe("fr");
  });
  it("rejects malformed detection rather than silently defaulting to English", () => {
    expect(() => selectWhisperLanguage([NaN, 3], { "<|fr|>": 0 })).toThrow(
      "langue"
    );
    expect(() => selectWhisperLanguage([1, 2], { bad: 1 })).toThrow("langue");
    expect(() => selectWhisperLanguage([1, 2], { "<|fr|>": 100 })).toThrow(
      "langue"
    );
  });
  it("keeps French as default and persists a deliberate automatic choice", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key),
      setItem: (key: string, value: string) => values.set(key, value),
    });
    expect(readDictationLanguage()).toBe("fr");
    saveDictationLanguage("auto");
    expect(values.get(DICTATION_LANGUAGE_KEY)).toBe("auto");
    expect(readDictationLanguage()).toBe("auto");
  });
  it("works when persistent storage is unavailable", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(readDictationLanguage()).toBe("fr");
    expect(() => saveDictationLanguage("auto")).not.toThrow();
  });
});
