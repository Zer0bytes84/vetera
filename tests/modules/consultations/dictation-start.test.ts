import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  events: [] as string[],
  finishLoad: () => {},
}));
vi.mock("@/modules/consultations/local-ai/models", () => ({
  getLocalModelUrls: () => ({ modelRoot: "local:", runtimeRoot: "local:runtime" }),
}));
vi.mock("@/modules/consultations/local-ai/audio-capture", () => ({
  prepareMicrophone: async () => ({ stream: {}, audio: {}, close: () => {} }),
  createLevelMeter: () => ({ read: () => 0, close: () => {} }),
  captureAudio: async () => {
    fixture.events.push("capture");
    return { stop: () => new Float32Array(16000), cancel: () => {} };
  },
}));
vi.mock("@/modules/consultations/local-ai/whisper-session", () => ({
  takeWhisperSession: async () => ({
    loaded: false,
    session: {
      close: () => {},
      request: (message: { type: string }) => {
        fixture.events.push(`request:${message.type}`);
        return new Promise((resolve) => {
          fixture.finishLoad = () => {
            fixture.events.push("ready");
            resolve({ type: "ready" });
          };
        });
      },
    },
  }),
  parkWhisperSession: () => {},
  releaseWhisperSession: () => {},
}));
import { useLocalConsultationAi } from "@/modules/consultations/hooks/use-local-consultation-ai";

function setup() {
  const observe = vi.fn<(ai: ReturnType<typeof useLocalConsultationAi>) => void>();
  function Probe() {
    observe(useLocalConsultationAi());
    return null;
  }
  renderToStaticMarkup(React.createElement(Probe));
  return observe.mock.calls[0][0];
}

describe("démarrage de la dictée", () => {
  it("ouvre le micro sans attendre le chargement du modèle (après une recherche, il se recharge pendant la parole)", async () => {
    const ai = setup();
    await ai.start({ root: "local", whisperReady: true, generatorReady: true });
    expect(fixture.events).toEqual(["request:load-whisper", "capture"]);
    fixture.finishLoad();
    await Promise.resolve();
    expect(fixture.events.at(-1)).toBe("ready");
  });
});
