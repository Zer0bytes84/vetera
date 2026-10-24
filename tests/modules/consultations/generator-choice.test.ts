import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_GENERATOR,
  generatorCandidates,
  recordGeneratorFallback,
  setGeneratorPreference,
  wrapUserTurn,
} from "@/modules/consultations/local-ai/generator-choice";

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());
const both = { generatorReady: true, generator4Ready: true };

describe("Choix du modèle de rédaction (phase B)", () => {
  it("reste sur Gemma 3 par défaut, même quand la nouvelle version est installée", () => {
    expect(DEFAULT_GENERATOR).toBe("gemma3");
    expect(generatorCandidates(both, "asset://m/")).toEqual([{ family: "gemma3", url: "asset://m/generator/gemma3.task" }]);
  });
  it("essaie Gemma 4 d'abord quand elle est choisie, avec Gemma 3 en repli", () => {
    setGeneratorPreference("gemma4");
    expect(generatorCandidates(both, "asset://m/").map((candidate) => candidate.url)).toEqual([
      "asset://m/generator4/gemma4-e2b.task",
      "asset://m/generator/gemma3.task",
    ]);
    expect(generatorCandidates({ generatorReady: true, generator4Ready: false }, "asset://m/").map((candidate) => candidate.family)).toEqual(["gemma3"]);
  });
  it("après un échec de chargement, va droit à Gemma 3 jusqu'à un nouveau choix", () => {
    setGeneratorPreference("gemma4");
    recordGeneratorFallback();
    expect(generatorCandidates(both, "asset://m/").map((candidate) => candidate.family)).toEqual(["gemma3"]);
    setGeneratorPreference("gemma4");
    expect(generatorCandidates(both, "asset://m/")[0].family).toBe("gemma4");
  });
  it("enveloppe le tour dans le gabarit du modèle chargé", () => {
    expect(wrapUserTurn("Bonjour", "gemma3")).toBe("<start_of_turn>user\nBonjour<end_of_turn>\n<start_of_turn>model\n");
    expect(wrapUserTurn("Bonjour", "gemma4")).toBe("<|turn>user\nBonjour<turn|>\n<|turn>model\n");
  });
});

const engine = vi.hoisted(() => ({ prompts: [] as string[], loads: [] as string[] }));
vi.mock("@/modules/consultations/local-ai/offline-policy", () => ({ enforceOfflineWorker: () => {} }));
vi.mock("@mediapipe/tasks-genai", () => ({
  FilesetResolver: { forGenAiTasks: async () => ({}) },
  LlmInference: {
    createFromOptions: async (_fileset: unknown, options: { baseOptions: { modelAssetBuffer: { url: string } } }) => {
      const url = options.baseOptions.modelAssetBuffer.url;
      engine.loads.push(url);
      if (url.includes("gemma4")) throw new Error("Mémoire graphique insuffisante");
      return {
        sizeInTokens: (text: string) => Math.ceil(text.length / 4),
        setOptions: async () => {},
        generateResponse: async (prompt: string) => {
          engine.prompts.push(prompt);
          return '{"subjective":"","objective":"","assessment":"","plan":""}';
        },
        close: () => {},
      };
    },
  },
}));

describe("Worker de rédaction : repli silencieux", () => {
  it("signale un modèle qui ne se charge pas, ou qui échoue à son premier usage, sans afficher d'erreur", async () => {
    const sent: { type: string; url?: string; generator?: string; fellBack?: boolean }[] = [];
    vi.stubGlobal("self", { postMessage: (message: (typeof sent)[number]) => sent.push(message) });
    vi.stubGlobal("navigator", { gpu: { requestAdapter: async () => ({}) } });
    vi.stubGlobal("fetch", async (url: string) => ({ ok: true, body: { getReader: () => ({ url }) } }));
    await import("@/modules/consultations/workers/soap.worker");
    const onmessage = (globalThis.self as unknown as { onmessage: (event: { data: unknown }) => Promise<void> }).onmessage;
    const gemma4 = { family: "gemma4", url: "asset://m/generator4/gemma4-e2b.task" };
    const gemma3 = { family: "gemma3", url: "asset://m/generator/gemma3.task" };
    await onmessage({ data: { type: "generate", generators: [gemma4, gemma3], runtimeRoot: "asset://runtime/", prompt: "Mets en forme cette note." } });
    expect(sent.filter((message) => message.type !== "progress")).toEqual([{ type: "generator-unavailable", url: gemma4.url }]);
    sent.length = 0;
    await onmessage({ data: { type: "generate", generators: [gemma3], runtimeRoot: "asset://runtime/", prompt: "Mets en forme cette note.", fellBack: true } });
    expect(sent.filter((message) => message.type !== "progress")).toEqual([{ type: "generated", text: expect.any(String), generator: "gemma3", fellBack: true }]);
    expect(engine.prompts.at(-1)).toBe("<start_of_turn>user\nMets en forme cette note.<end_of_turn>\n<start_of_turn>model\n");
  });
});
