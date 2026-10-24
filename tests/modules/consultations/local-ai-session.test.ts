import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const workers: FakeWorker[] = [];
class FakeWorker {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { preventDefault: () => void }) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    workers.push(this);
  }
  emit(data: unknown) {
    this.onmessage?.({ data });
  }
}
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  workers.length = 0;
  vi.stubGlobal("Worker", FakeWorker);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("exclusive clinical inference session", () => {
  it("reserves one worker and refuses concurrent inference until disposal", async () => {
    const { LocalInferenceSession } = await import(
      "@/modules/consultations/local-ai/inference-client"
    );
    const session = await LocalInferenceSession.create(
      "whisper",
      new AbortController().signal,
      vi.fn()
    );
    await expect(
      LocalInferenceSession.create(
        "soap",
        new AbortController().signal,
        vi.fn()
      )
    ).rejects.toThrow("déjà");
    expect(workers).toHaveLength(1);
    session.close();
    session.close();
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    const next = await LocalInferenceSession.create(
      "soap",
      new AbortController().signal,
      vi.fn()
    );
    next.close();
  });
  it("does not create a worker for a cancelled request", async () => {
    const { LocalInferenceSession } = await import(
      "@/modules/consultations/local-ai/inference-client"
    );
    const controller = new AbortController();
    controller.abort();
    await expect(
      LocalInferenceSession.create("soap", controller.signal, vi.fn())
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(workers).toHaveLength(0);
  });
  it("terminates a loading worker on cancellation and ignores its late response", async () => {
    const { LocalInferenceSession } = await import(
      "@/modules/consultations/local-ai/inference-client"
    );
    const { isClinicalModelReserved } = await import(
      "@/modules/consultations/local-ai/model-lease"
    );
    const controller = new AbortController(),
      progress = vi.fn();
    const session = await LocalInferenceSession.create(
      "whisper",
      controller.signal,
      progress
    );
    const rejected = expect(
      session.request(
        {
          type: "load-whisper",
          modelRoot: "asset://localhost/models/",
          generators: [{ family: "gemma3", url: "asset://localhost/models/gemma3.task" }],
          runtimeRoot: "http://localhost/runtime/",
        },
        "ready"
      )
    ).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await rejected;
    workers[0].emit({ type: "ready" });
    workers[0].emit({ type: "progress", message: "Late progress" });
    expect(progress).not.toHaveBeenCalled();
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    expect(isClinicalModelReserved()).toBe(false);
  });
  it("times out a stalled engine and releases the lease for a retry", async () => {
    const { LocalInferenceSession } = await import(
      "@/modules/consultations/local-ai/inference-client"
    );
    const { isClinicalModelReserved } = await import(
      "@/modules/consultations/local-ai/model-lease"
    );
    const session = await LocalInferenceSession.create(
      "soap",
      new AbortController().signal,
      vi.fn()
    );
    const rejected = expect(
      session.request(
        {
          type: "generate",
          generators: [{ family: "gemma3", url: "asset://localhost/models/gemma3.task" }],
          runtimeRoot: "http://localhost/runtime/",
          prompt: "SOAP",
        },
        "generated"
      )
    ).rejects.toThrow("délai prévu");
    await vi.advanceTimersByTimeAsync(480001);
    await rejected;
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    expect(isClinicalModelReserved()).toBe(false);
    const retry = await LocalInferenceSession.create(
      "whisper",
      new AbortController().signal,
      vi.fn()
    );
    retry.close();
  });
});

describe("parked search session", () => {
  it("gives the lease back, is evicted by the next local task and never resumed", async () => {
    const { LocalInferenceSession } = await import(
      "@/modules/consultations/local-ai/inference-client"
    );
    const { isClinicalModelReserved } = await import(
      "@/modules/consultations/local-ai/model-lease"
    );
    const progress = vi.fn();
    const search = await LocalInferenceSession.create(
      "embedding",
      new AbortController().signal,
      progress
    );
    search.park();
    expect(isClinicalModelReserved()).toBe(false);
    workers[0].emit({ type: "progress", message: "Late progress" });
    expect(progress).not.toHaveBeenCalled();
    const dictation = await LocalInferenceSession.create(
      "whisper",
      new AbortController().signal,
      vi.fn()
    );
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    expect(search.isClosed).toBe(true);
    expect(() =>
      search.resume(new AbortController().signal, vi.fn())
    ).toThrow();
    dictation.close();
    expect(isClinicalModelReserved()).toBe(false);
  });
  it("resumes the same worker with the new request's signal and progress", async () => {
    const { LocalInferenceSession } = await import(
      "@/modules/consultations/local-ai/inference-client"
    );
    const { isClinicalModelReserved } = await import(
      "@/modules/consultations/local-ai/model-lease"
    );
    const first = new AbortController();
    const search = await LocalInferenceSession.create(
      "embedding",
      first.signal,
      vi.fn()
    );
    search.park();
    first.abort();
    expect(search.isClosed).toBe(false);
    const second = new AbortController(),
      progress = vi.fn();
    search.resume(second.signal, progress);
    expect(isClinicalModelReserved()).toBe(true);
    expect(workers).toHaveLength(1);
    workers[0].emit({ type: "progress", message: "Lecture" });
    expect(progress).toHaveBeenCalledOnce();
    second.abort();
    expect(search.isClosed).toBe(true);
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    expect(isClinicalModelReserved()).toBe(false);
  });
  it("closes a parked worker that crashed instead of resuming it", async () => {
    const { LocalInferenceSession } = await import(
      "@/modules/consultations/local-ai/inference-client"
    );
    const search = await LocalInferenceSession.create(
      "embedding",
      new AbortController().signal,
      vi.fn()
    );
    search.park();
    workers[0].onerror?.({ preventDefault: vi.fn() });
    expect(search.isClosed).toBe(true);
    expect(workers[0].terminate).toHaveBeenCalledOnce();
  });
});

describe("engine capacity before the tokenizer is loaded", () => {
  it("keeps a margin over typical French notes and never goes below the minimum", async () => {
    const { estimateTokenCapacity } = await import(
      "@/modules/consultations/local-ai/token-capacity"
    );
    expect(estimateTokenCapacity("", 0)).toBe(1024);
    // A 2 249-character SOAP prompt measured at 542 tokens by Gemma 3.
    const estimate = estimateTokenCapacity("x".repeat(2249), 256);
    expect(estimate).toBeGreaterThanOrEqual(542 + 256);
    expect(estimate).toBeLessThan(2 * (542 + 256));
  });
  it("relance la note dans un worker neuf, sans le modèle qui n'a pas pu se charger, et s'en souvient au second essai", async () => {
    const { LocalInferenceSession } = await import("@/modules/consultations/local-ai/inference-client");
    const { hasGeneratorFallenBack } = await import("@/modules/consultations/local-ai/generator-choice");
    const session = await LocalInferenceSession.create("soap", new AbortController().signal, vi.fn());
    const generators = [
      { family: "gemma4" as const, url: "asset://localhost/models/generator4/gemma4-e2b.task" },
      { family: "gemma3" as const, url: "asset://localhost/models/generator/gemma3.task" },
    ];
    const request = { type: "generate" as const, generators, runtimeRoot: "asset://localhost/runtime/", prompt: "Note" };
    const first = session.request(request, "generated");
    workers[0].emit({ type: "generator-unavailable", url: generators[0].url });
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    expect(workers).toHaveLength(2);
    expect(workers[1].postMessage).toHaveBeenCalledWith({ ...request, generators: [generators[1]], fellBack: true }, []);
    workers[1].emit({ type: "generated", text: "{}", generator: "gemma3", fellBack: true });
    await expect(first).resolves.toMatchObject({ generator: "gemma3" });
    expect(hasGeneratorFallenBack()).toBe(true);
    const second = session.request({ ...request, prompt: "Recopie" }, "generated");
    expect(workers[1].postMessage).toHaveBeenLastCalledWith({ ...request, prompt: "Recopie", generators: [generators[1]], fellBack: true }, []);
    workers[1].emit({ type: "generated", text: "{}", generator: "gemma3", fellBack: true });
    await second;
    expect(workers).toHaveLength(2);
    session.close();
  });
});

