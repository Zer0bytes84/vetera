import { describe, expect, it, vi } from "vitest";
import { generateValidatedSoap } from "@/modules/consultations/local-ai/generate-soap";
import { SoapFormatError } from "@/modules/consultations/local-ai/soap-schema";

const note = {
  subjective: "Toux depuis hier.",
  objective: "",
  assessment: "",
  plan: "Contrôle dans une semaine.",
};
const raw = JSON.stringify(note);
function setup(generate: (prompt: string, attempt: 1 | 2) => Promise<string>) {
  const controller = new AbortController();
  const onRetry = vi.fn();
  const run = () =>
    generateValidatedSoap({
      prompt: "strict",
      retryPrompt: "simplified",
      signal: controller.signal,
      generate,
      onRetry,
    });
  return { run, onRetry, controller };
}
describe("validated local SOAP generation", () => {
  it("returns a valid first response without another model call", async () => {
    const generate = vi.fn().mockResolvedValue(raw);
    const { run, onRetry } = setup(generate);
    expect(await run()).toEqual(note);
    expect(generate.mock.calls).toEqual([["strict", 1]]);
    expect(onRetry).not.toHaveBeenCalled();
  });
  it.each([
    '```json\n{"subjective":"Toux"}\n{"objective":""}\n{"assessment":""}\n{"plan":""}\n```',
    JSON.stringify({ ...note, objective: null }),
    JSON.stringify({ ...note, medication: "inconnue" }),
    "JSON tronqué {",
  ])("retries exactly once on a format failure: %s", async (invalid) => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce(invalid)
      .mockResolvedValueOnce(raw);
    const { run, onRetry } = setup(generate);
    expect(await run()).toEqual(note);
    expect(generate.mock.calls).toEqual([
      ["strict", 1],
      ["simplified", 2],
    ]);
    expect(onRetry).toHaveBeenCalledOnce();
  });
  it("reports a format error after two invalid responses without blaming dictation length", async () => {
    const generate = vi.fn().mockResolvedValue('{"subjective":"Toux"}');
    const { run } = setup(generate);
    await expect(run()).rejects.toThrow(SoapFormatError);
    expect(generate).toHaveBeenCalledTimes(2);
    await expect(run()).rejects.not.toThrow(/courte|Corrigez la dictée/);
  });
  it("does not retry a dosage rejection", async () => {
    const generate = vi
      .fn()
      .mockResolvedValue(
        JSON.stringify({ ...note, plan: "Administrer 5 mg/kg." }),
      );
    const { run, onRetry } = setup(generate);
    await expect(run()).rejects.toThrow("posologie");
    expect(generate).toHaveBeenCalledOnce();
    expect(onRetry).not.toHaveBeenCalled();
  });
  it("does not retry microphone, runtime or model-load failures", async () => {
    const generate = vi
      .fn()
      .mockRejectedValue(new Error("Chargement impossible"));
    const { run, onRetry } = setup(generate);
    await expect(run()).rejects.toThrow("Chargement impossible");
    expect(generate).toHaveBeenCalledOnce();
    expect(onRetry).not.toHaveBeenCalled();
  });
  it("does not return a late model response after cancellation", async () => {
    const controller = new AbortController();
    const generate = vi.fn(async () => {
      controller.abort();
      return raw;
    });
    await expect(
      generateValidatedSoap({
        prompt: "strict",
        retryPrompt: "simplified",
        signal: controller.signal,
        generate,
        onRetry: vi.fn(),
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
  it("does not start a second model call if cancelled between the attempts", async () => {
    const generate = vi.fn().mockResolvedValue("invalide");
    const controller = new AbortController();
    await expect(
      generateValidatedSoap({
        prompt: "strict",
        retryPrompt: "simplified",
        signal: controller.signal,
        generate,
        onRetry: () => controller.abort(),
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(generate).toHaveBeenCalledOnce();
  });
  describe("dictée guidée : second essai rubrique par rubrique", () => {
    const parts = [
      { key: "subjective" as const, prompt: "S seule", template: "{}" },
      { key: "plan" as const, prompt: "P seule", template: "{}" },
    ];
    const run = (generate: (prompt: string, attempt: 1 | 2) => Promise<string>) =>
      generateValidatedSoap({
        prompt: "strict",
        retryPrompt: "simplified",
        retryParts: parts,
        signal: new AbortController().signal,
        generate,
        onRetry: vi.fn(),
      });
    it("une clé omise au premier essai : chaque rubrique dictée est redemandée seule, puis la note est réassemblée", async () => {
      const generate = vi
        .fn()
        .mockResolvedValueOnce(JSON.stringify({ subjective: note.subjective, objective: "" }))
        .mockResolvedValueOnce(JSON.stringify({ subjective: note.subjective }))
        .mockResolvedValueOnce("```json\n" + JSON.stringify({ plan: note.plan }) + "\n```");
      expect(await run(generate)).toEqual(note);
      expect(generate.mock.calls.map(([prompt, attempt]) => [prompt, attempt])).toEqual([
        ["strict", 1],
        ["S seule", 2],
        ["P seule", 2],
      ]);
    });
    it("un premier essai accepté ne déclenche aucun appel de plus", async () => {
      const generate = vi.fn().mockResolvedValue(raw);
      expect(await run(generate)).toEqual(note);
      expect(generate).toHaveBeenCalledOnce();
    });
    it("seule la rubrique demandée est gardée ; une posologie ailleurs est refusée", async () => {
      const kept = vi
        .fn()
        .mockResolvedValueOnce("invalide")
        .mockResolvedValueOnce(JSON.stringify({ subjective: note.subjective, objective: "Inventé." }))
        .mockResolvedValueOnce(JSON.stringify({ plan: note.plan }));
      expect((await run(kept)).objective).toBe("");
      const dose = vi
        .fn()
        .mockResolvedValueOnce("invalide")
        .mockResolvedValueOnce(JSON.stringify({ subjective: note.subjective, plan: "Administrer 5 mg/kg." }));
      await expect(run(dose)).rejects.toThrow("posologie");
    });
    it("une rubrique au mauvais format au second essai refuse la note", async () => {
      const generate = vi.fn().mockResolvedValueOnce("invalide").mockResolvedValueOnce("tronqué {");
      await expect(run(generate)).rejects.toThrow(SoapFormatError);
      expect(generate).toHaveBeenCalledTimes(2);
    });
  });
});
