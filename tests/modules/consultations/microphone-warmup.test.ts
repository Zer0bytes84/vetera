import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createWarmupDetector, MICROPHONE_WARMUP } from "@/modules/consultations/local-ai/microphone-warmup";

const CHUNK = 4096 / 48000;
const rms = (db: number) => 10 ** (db / 20);
/** Chunks of 4096 samples at 48 kHz, with the level each one is recorded at. */
function feed(profile: (seconds: number) => number, until = 8) {
  const detector = createWarmupDetector();
  for (let seconds = CHUNK; seconds <= until; seconds += CHUNK) {
    const result = detector.push(seconds < 0.05 ? 0 : rms(profile(seconds)), seconds);
    if (result.state === "stable") return result;
  }
  return null;
}

// Levels of the WAV files sent to whisper-cli on 29/10, 250 ms windows from the
// start of each fresh capture (docs/recus/2026-10-29/diag-dictee and fix-dictee-generation).
const QUIET_START: Record<string, number[]> = {
  "diag rejeu 1, R1 précédée de silence": [-65, -64, -69, -62, -63, -61, -62, -63, -62, -66, -65, -62, -60, -54, -43, -42, -43, -42, -44, -44],
  "diag rejeu 1, R2 d'origine": [-62, -45, -41, -43, -46, -45, -43, -35, -44, -35, -35, -42, -36, -26, -19, -20, -32, -23, -21, -21],
  "diag rejeu 1, R2 précédée de silence": [-66, -61, -61, -63, -62, -65, -66, -61, -66, -63, -64, -64, -63, -58, -45, -45, -45, -46, -44, -46],
  "diag rejeu 1, R1 d'origine": [-64, -41, -41, -40, -37, -41, -40, -41, -34, -36, -38, -37, -34, -33, -18, -17, -17, -24, -46, -15],
  "diag rejeu 2, R1 retardée": [-78, -67, -67, -67, -68, -65, -67, -68, -69, -69, -69, -64, -61, -63, -37, -28, -24, -24, -19, -18],
  "après, R1 lue dès le faux signal": [-82, -68, -63, -59, -57, -55, -57, -57, -56, -56, -56, -60, -57, -62, -34, -27, -24, -39, -24, -17],
  "après, R1 lue à 0,7 s": [-76, -66, -66, -66, -66, -59, -61, -58, -60, -58, -64, -58, -56, -58, -40, -31, -25, -24, -19, -20],
  "après, clic à 0,5 s puis montée à 3,5 s": [-77, -68, -47, -67, -67, -67, -67, -65, -64, -65, -67, -68, -67, -68, -45, -45, -44, -44, -44, -45],
};
// The voice already plays, attenuated, before the step (playback 2.5 s after « Écoute »).
const VOICE_DURING_WARMUP: Record<string, number[]> = {
  "diag rejeu 2, R2 retardée": [-72, -69, -69, -69, -70, -69, -70, -68, -70, -68, -69, -41, -38, -32, -19, -20, -15, -18, -18, -17],
  "diag rejeu 2, R3 retardée (clic isolé à 1,5 s)": [-69, -68, -68, -68, -68, -64, -53, -60, -70, -68, -68, -36, -40, -29, -18, -18, -16, -16, -21, -20],
  "diag rejeu 2, R4 retardée": [-73, -65, -62, -63, -63, -61, -66, -68, -65, -64, -64, -34, -41, -31, -20, -24, -19, -17, -18, -17],
};
const fromWindows = (windows: number[]) => (seconds: number) =>
  windows[Math.min(windows.length - 1, Math.floor(seconds / MICROPHONE_WARMUP.windowSeconds))];

describe("préparation du micro : écoute annoncée une fois le niveau stable", () => {
  it.each(Object.entries(QUIET_START))("%s : écoute annoncée après la montée de 3,5 s, pas avant", (_, windows) => {
    const result = feed(fromWindows(windows));
    expect(result).toMatchObject({ state: "stable", reason: "montée" });
    expect(result!.at).toBeGreaterThanOrEqual(3.75);
    expect(result!.at).toBeLessThanOrEqual(4.1);
  });

  it.each(Object.entries(VOICE_DURING_WARMUP))(
    "%s : limite connue, une voix déjà là pendant l'atténuation avance l'annonce de 0,25 s",
    (_, windows) => {
      const result = feed(fromWindows(windows));
      expect(result).toMatchObject({ state: "stable", reason: "montée" });
      expect(result!.at).toBeGreaterThanOrEqual(3.2);
    }
  );

  it("une entrée qui ne monte jamais est prise comme prête au délai de secours, pas avant", () => {
    const result = feed(() => -48);
    expect(result).toMatchObject({ state: "stable", reason: "délai" });
    expect(result!.at).toBeGreaterThanOrEqual(MICROPHONE_WARMUP.maxSeconds);
    expect(result!.at).toBeLessThan(MICROPHONE_WARMUP.maxSeconds + 0.1);
  });

  it("un clic isolé dans une pièce silencieuse n'annonce pas l'écoute", () => {
    const result = feed((seconds) => (seconds >= 1.5 && seconds < 1.75 ? -45 : seconds < 3.5 ? -66 : -45));
    expect(result!.at).toBeGreaterThanOrEqual(3.75);
  });
});

const fixture = vi.hoisted(() => ({
  prepared: 0,
  closed: 0,
  options: [] as { keepOpen?: boolean; onLevel?: (rms: number, seconds: number) => void }[],
}));
vi.mock("@/modules/consultations/local-ai/models", () => ({
  getLocalModelUrls: () => ({ modelRoot: "local:", runtimeRoot: "local:runtime" }),
}));
vi.mock("@/modules/consultations/local-ai/audio-capture", () => ({
  prepareMicrophone: async () => {
    fixture.prepared += 1;
    return {
      stream: { getAudioTracks: () => [{ readyState: "live" }] },
      audio: { state: "running" },
      close: () => {
        fixture.closed += 1;
      },
    };
  },
  createLevelMeter: () => ({ read: () => 0, close: () => {} }),
  captureAudio: async (
    _stream: unknown,
    _signal: unknown,
    _onLimit: unknown,
    _audio: unknown,
    options: { keepOpen?: boolean; onLevel?: (rms: number, seconds: number) => void } = {}
  ) => {
    fixture.options.push(options);
    // The measured profile, recorded as soon as the capture runs.
    for (let seconds = CHUNK; seconds <= 4.5; seconds += CHUNK)
      options.onLevel?.(rms(seconds < 3.4 ? -62 : -43), seconds);
    return { stop: () => new Float32Array(16000), cancel: () => {} };
  },
}));
vi.mock("@/modules/consultations/local-ai/whisper-session", () => ({
  takeWhisperSession: async () => ({
    loaded: true,
    session: { close: () => {}, request: async () => ({ type: "ready" }) },
  }),
  parkWhisperSession: () => {},
  releaseWhisperSession: () => {},
}));
import { useLocalConsultationAi } from "@/modules/consultations/hooks/use-local-consultation-ai";

function setup(options?: Parameters<typeof useLocalConsultationAi>[0]) {
  const observe = vi.fn<(ai: ReturnType<typeof useLocalConsultationAi>) => void>();
  function Probe() {
    observe(useLocalConsultationAi(options));
    return null;
  }
  renderToStaticMarkup(React.createElement(Probe));
  return observe.mock.calls[0][0];
}
const models = { root: "local", whisperReady: true, generatorReady: true };

describe("dictée guidée : un micro pour les quatre rubriques", () => {
  it("garde le flux ouvert, mesure sa montée puis le ferme à l'annulation", async () => {
    fixture.options.length = 0;
    const before = { prepared: fixture.prepared, closed: fixture.closed };
    const ai = setup({ holdMicrophone: true });
    await ai.start(models);
    expect(fixture.prepared - before.prepared).toBe(1);
    expect(fixture.options[0].keepOpen).toBe(true);
    expect(typeof fixture.options[0].onLevel).toBe("function");
    expect(fixture.closed - before.closed).toBe(0);
    ai.cancel();
    expect(fixture.closed - before.closed).toBe(1);
  });

  it("sans l'option (recherche par la voix) : rien ne change, le micro suit la dictée", async () => {
    fixture.options.length = 0;
    const ai = setup();
    await ai.start(models);
    expect(fixture.options[0]).toEqual({ keepOpen: false, onLevel: undefined });
    ai.cancel();
  });
});
