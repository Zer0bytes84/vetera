import { afterEach, describe, expect, it, vi } from "vitest";
import { PackagedOcr } from "../../../src/modules/documents/lib/packaged-ocr";

class TestWorker {
  static instances: TestWorker[] = [];
  onmessage?: (event: { data: unknown }) => void;
  onerror?: (event: { preventDefault: () => void }) => void;
  messages: {
    action: string;
    jobId: string;
    payload: Record<string, unknown>;
  }[] = [];
  terminated = false;
  constructor(readonly url: string) {
    TestWorker.instances.push(this);
  }
  postMessage(message: (typeof this.messages)[number]) {
    this.messages.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  resolve(data: unknown = {}) {
    const request = this.messages.at(-1)!;
    this.onmessage?.({ data: { ...request, status: "resolve", data } });
  }
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  TestWorker.instances = [];
});
const setup = () => {
  vi.stubGlobal("Worker", TestWorker);
  const controller = new AbortController();
  const ocr = new PackagedOcr(
    "http://localhost/local-ai-runtime/ocr/",
    controller.signal,
    vi.fn(),
  );
  return { ocr, controller, worker: TestWorker.instances[0] };
};
describe("Moteur de reconnaissance embarqué", () => {
  it("owns and terminates the worker even during initial loading", async () => {
    const { ocr, controller, worker } = setup();
    const loading = ocr.initialize();
    const rejection = expect(loading).rejects.toThrow("annulée");
    controller.abort();
    await rejection;
    expect(worker.terminated).toBe(true);
    ocr.close();
    expect(worker.terminated).toBe(true);
  });
  it("initializes only local code and language files, then returns real recognition text", async () => {
    const { ocr, worker } = setup();
    const loading = ocr.initialize();
    worker.resolve();
    await Promise.resolve();
    expect(worker.messages.at(-1)?.payload).toMatchObject({
      options: {
        langPath: "http://localhost/local-ai-runtime/ocr/lang",
        gzip: false,
        cacheMethod: "none",
      },
    });
    worker.resolve();
    await Promise.resolve();
    worker.resolve();
    await loading;
    const result = ocr.recognize(new Uint8Array([1, 2, 3]), 1);
    worker.resolve({ text: "Créatinine : 1,8 mg/dL", confidence: 92 });
    await expect(result).resolves.toEqual({
      text: "Créatinine : 1,8 mg/dL",
      confidence: 92,
    });
    ocr.close();
    expect(worker.terminated).toBe(true);
  });
  it("terminates a stalled worker and provides a French error", async () => {
    vi.useFakeTimers();
    const { ocr, worker } = setup();
    const loading = ocr.initialize();
    const rejection = expect(loading).rejects.toThrow("n’a pas répondu");
    await vi.advanceTimersByTimeAsync(90000);
    await rejection;
    expect(worker.terminated).toBe(true);
  });
});
