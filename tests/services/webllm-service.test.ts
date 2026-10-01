import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ reload: vi.fn(), unload: vi.fn(), create: vi.fn(), options: null as null | { initProgressCallback: (report: {progress: number; text: string}) => void } }));
vi.mock("@mlc-ai/web-llm", () => ({
  prebuiltAppConfig: { model_list: [] },
  MLCEngine: class {
    constructor(options: NonNullable<typeof mock.options>) { mock.options = options; mock.create(); }
    reload = mock.reload;
    unload = mock.unload;
  },
}));
vi.mock("@/services/vetKnowledgeService", () => ({ vetKnowledgeService: {} }));
vi.mock("@/services/browser-store", () => ({ isTauriRuntime: () => true }));

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};

beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers();
  mock.reload.mockReset().mockResolvedValue(undefined);
  mock.unload.mockReset().mockResolvedValue(undefined);
  mock.create.mockReset(); mock.options = null;
  vi.stubGlobal("navigator", { gpu: { requestAdapter: vi.fn().mockResolvedValue({}) } });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("local model lifecycle", () => {
  it("shares a single GPU preflight/download and informs every caller", async () => {
    const service = await import("@/services/webLLMService");
    const pending = deferred(); mock.reload.mockReturnValue(pending.promise);
    const first = vi.fn(), second = vi.fn();
    const a = service.initializeWebLLM(first);
    const b = service.initializeWebLLM(second);
    expect(service.isWebLLMLoading()).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(mock.create).toHaveBeenCalledOnce();
    mock.options!.initProgressCallback({ progress: 1, text: "Finished fetching" });
    expect(service.getCurrentProgress()).toMatchObject({ status: "loading", progress: 0.99 });
    pending.resolve(); await Promise.all([a, b]);
    expect(service.isWebLLMReady()).toBe(true);
    expect(first).toHaveBeenLastCalledWith(expect.objectContaining({ status: "ready" }));
    expect(second).toHaveBeenLastCalledWith(expect.objectContaining({ status: "ready" }));
    const reopened = vi.fn(); service.subscribeToProgress(reopened)();
    expect(reopened).toHaveBeenLastCalledWith(expect.objectContaining({ status: "ready" }));
  });

  it("reports unavailable WebGPU without downloading and retains the error across views", async () => {
    vi.stubGlobal("navigator", {});
    const service = await import("@/services/webLLMService");
    await expect(service.initializeWebLLM()).rejects.toThrow("WebGPU");
    expect(mock.create).not.toHaveBeenCalled();
    expect(service.isWebLLMLoading()).toBe(false);
    const listener = vi.fn(); service.subscribeToProgress(listener)();
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ status: "error", text: expect.stringContaining("WebGPU") }));
  });

  it("times out a GPU adapter that never responds", async () => {
    vi.stubGlobal("navigator", { gpu: { requestAdapter: () => new Promise(() => {}) } });
    const service = await import("@/services/webLLMService");
    const failed = expect(service.initializeWebLLM()).rejects.toThrow("ne répond pas");
    await vi.advanceTimersByTimeAsync(15_001); await failed;
    expect(service.isWebLLMLoading()).toBe(false);
  });

  it("aborts a stalled load and allows retry without accepting a late success", async () => {
    const service = await import("@/services/webLLMService");
    const pending = deferred(); mock.reload.mockReturnValueOnce(pending.promise);
    const failed = expect(service.initializeWebLLM()).rejects.toThrow("ne progresse plus");
    await vi.advanceTimersByTimeAsync(180_001); await failed;
    expect(mock.unload).toHaveBeenCalled();
    pending.resolve(); await vi.advanceTimersByTimeAsync(0);
    expect(service.isWebLLMReady()).toBe(false);
    expect(service.getCurrentProgress().status).toBe("error");
    await service.initializeWebLLM();
    expect(service.isWebLLMReady()).toBe(true);
  });

  it("cancels a load immediately and rejects its late progress", async () => {
    const service = await import("@/services/webLLMService");
    const pending = deferred(); mock.reload.mockReturnValue(pending.promise);
    const cancelled = expect(service.initializeWebLLM()).rejects.toThrow("annulée");
    await vi.advanceTimersByTimeAsync(0);
    const oldCallback = mock.options!.initProgressCallback;
    await service.resetWebLLM(); await cancelled;
    oldCallback({ progress: 0.8, text: "late progress" });
    pending.resolve(); await vi.advanceTimersByTimeAsync(0);
    expect(service.getCurrentProgress().status).toBe("idle");
    expect(service.isWebLLMReady()).toBe(false);
  });

  it("shows a download error and can retry", async () => {
    const service = await import("@/services/webLLMService");
    mock.reload.mockRejectedValueOnce(new TypeError("Load failed"));
    await expect(service.initializeWebLLM()).rejects.toThrow("Téléchargement impossible");
    await service.initializeWebLLM();
    expect(service.getCurrentProgress().status).toBe("ready");
    await service.resetWebLLM();
    expect(service.getCurrentProgress().status).toBe("idle");
  });
});
