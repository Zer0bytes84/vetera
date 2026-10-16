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
          modelUrl: "asset://localhost/models/gemma3.task",
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
          modelUrl: "asset://localhost/models/gemma3.task",
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
