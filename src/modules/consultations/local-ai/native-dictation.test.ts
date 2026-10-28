import { describe, expect, it } from "vitest";
import { encodePcmBase64 } from "./native-dictation";
import { normalizeTemperatureSymbols } from "./dictation-text";

describe("native dictation PCM", () => {
  it("encodes little-endian float32 without losing bytes", () => {
    expect(encodePcmBase64(new Float32Array([1]))).toBe("AACAPw==");
    expect(encodePcmBase64(new Float32Array())).toBe("");
    const pcm = new Float32Array([0, 0.5, -0.5, 1]);
    const decoded = Uint8Array.from(atob(encodePcmBase64(pcm)), (char) =>
      char.charCodeAt(0)
    );
    expect(new Float32Array(decoded.buffer)).toEqual(pcm);
  });

  it("encodes a view without copying its neighbours", () => {
    const parent = new Float32Array([9, 1, 9]);
    expect(encodePcmBase64(parent.subarray(1, 2))).toBe("AACAPw==");
  });
});

describe("temperature normalisation", () => {
  it("writes degrees Celsius as °C", () => {
    expect(
      normalizeTemperatureSymbols("Température 38.5 degrés Celsius. Normale.")
    ).toBe("Température 38.5 °C. Normale.");
    expect(normalizeTemperatureSymbols("38,5 degrés celsius")).toBe(
      "38,5 °C"
    );
    expect(normalizeTemperatureSymbols("38.5 Degrés Centigrades")).toBe(
      "38.5 °C"
    );
    expect(normalizeTemperatureSymbols("38.5 degrés C")).toBe("38.5 °C");
  });

  it("leaves everything else untouched", () => {
    expect(normalizeTemperatureSymbols("Température 38.5 °C, normale.")).toBe(
      "Température 38.5 °C, normale."
    );
    expect(normalizeTemperatureSymbols("Une pente de 30 degrés.")).toBe(
      "Une pente de 30 degrés."
    );
    expect(normalizeTemperatureSymbols("Le mot Celsius seul.")).toBe(
      "Le mot Celsius seul."
    );
    expect(
      normalizeTemperatureSymbols(
        "5 gouttes dans l'oreille droite, 2 fois par jour pendant 10 jours."
      )
    ).toBe("5 gouttes dans l'oreille droite, 2 fois par jour pendant 10 jours.");
  });

  it("handles a sentence starting with the unit", () => {
    expect(normalizeTemperatureSymbols("Degrés Celsius, la normale.")).toBe(
      "°C, la normale."
    );
  });
});
