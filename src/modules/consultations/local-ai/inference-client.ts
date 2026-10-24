import { parkIdleModel, reserveClinicalModel } from "./model-lease";
import { recordGeneratorFallback } from "./generator-choice";
import type {
  LocalAiProgress,
  WorkerRequest,
  WorkerResponse,
} from "./worker-protocol";

export const abortError = () =>
  new DOMException("Tâche annulée.", "AbortError");
export class LocalInferenceSession {
  private pending: {
    resolve: (message: WorkerResponse) => void;
    reject: (error: Error) => void;
    expected: WorkerResponse["type"];
    timer: ReturnType<typeof setTimeout>;
  } | null = null;
  private closed = false;
  private unpark: (() => void) | null = null;
  private readonly onAbort = () => this.close();
  // Generation models that failed to load during this session (silent fallback).
  private readonly unavailable = new Set<string>();
  private lastRequest: WorkerRequest | null = null;
  private constructor(
    private worker: Worker,
    private release: () => void,
    private signal: AbortSignal,
    private onProgress: (event: LocalAiProgress) => void,
    private readonly spawn: () => Worker = () => worker
  ) {
    this.attach(worker);
    signal.addEventListener("abort", this.onAbort, { once: true });
  }
  private attach(worker: Worker) {
    worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      if (this.closed) return;
      if (data.type === "progress") {
        if (!this.unpark) this.onProgress(data);
        return;
      }
      if (data.type === "error") {
        this.reject(new Error(data.message));
        return;
      }
      if (data.type === "generator-unavailable") {
        this.retryWithout(data.url);
        return;
      }
      if (data.type === "generated" && data.fellBack) recordGeneratorFallback();
      if (this.pending && data.type === this.pending.expected) {
        const { resolve, timer } = this.pending;
        this.pending = null;
        clearTimeout(timer);
        resolve(data);
      }
    };
    worker.onerror = (event) => {
      event.preventDefault();
      // A parked worker that failed must not be resumed.
      if (this.unpark) {
        this.close();
        return;
      }
      this.reject(
        new Error(
          "Le moteur local n’a pas pu démarrer. Vérifiez l’installation de Baitari et réessayez."
        )
      );
    };
  }
  /** Same request, fresh worker, without the generation model that failed. */
  private retryWithout(url: string) {
    const request = this.lastRequest;
    if (!this.pending || request?.type !== "generate") return;
    this.unavailable.add(url);
    this.worker.terminate();
    this.worker = this.spawn();
    this.attach(this.worker);
    this.post(request, []);
  }
  private post(message: WorkerRequest, transfer: Transferable[]) {
    const request =
      message.type === "generate" && message.generators.some((candidate) => this.unavailable.has(candidate.url))
        ? { ...message, generators: message.generators.filter((candidate) => !this.unavailable.has(candidate.url)), fellBack: true }
        : message;
    this.lastRequest = message;
    this.worker.postMessage(request, transfer);
  }
  static async create(
    kind: "whisper" | "soap" | "embedding",
    signal: AbortSignal,
    onProgress: (event: LocalAiProgress) => void
  ) {
    if (signal.aborted) throw abortError();
    const release = reserveClinicalModel();
    try {
      if (signal.aborted) throw abortError();
      const worker =
        kind === "whisper"
          ? new Worker(
              new URL("../workers/whisper.worker.ts", import.meta.url),
              { type: "module" }
            )
          : kind === "embedding"
            ? new Worker(
                new URL("../workers/embedding.worker.ts", import.meta.url),
                { type: "module" }
              )
            : new Worker(
                new URL("../workers/soap.worker.ts", import.meta.url),
                {
                  type: "module",
                }
              );
      const spawn = () =>
        new Worker(new URL("../workers/soap.worker.ts", import.meta.url), { type: "module" });
      return new LocalInferenceSession(worker, release, signal, onProgress, kind === "soap" ? spawn : undefined);
    } catch (error) {
      release();
      throw error;
    }
  }
  request(
    message: WorkerRequest,
    expected: WorkerResponse["type"],
    transfer: Transferable[] = []
  ) {
    if (this.closed || this.unpark || this.signal.aborted)
      return Promise.reject(abortError());
    if (this.pending)
      return Promise.reject(new Error("Le moteur local est occupé."));
    return new Promise<WorkerResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.reject(
          new Error(
            "Le traitement local n’a pas répondu dans le délai prévu. Votre dictée est conservée ; vous pouvez réessayer."
          )
        );
        this.close();
      }, 480_000);
      this.pending = { resolve, reject, expected, timer };
      try {
        this.post(message, transfer);
      } catch (error) {
        this.reject(
          error instanceof Error
            ? error
            : new Error("Le moteur local n’a pas reçu la demande.")
        );
      }
    });
  }
  private reject(error: Error) {
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(error);
      this.pending = null;
    }
  }
  get isClosed() {
    return this.closed;
  }
  /**
   * Keeps the worker and its loaded model but gives the lease back: any other
   * local task evicts it (worker terminated) before starting.
   */
  park() {
    if (this.closed || this.unpark || this.pending) return;
    this.signal.removeEventListener("abort", this.onAbort);
    this.release();
    this.unpark = parkIdleModel(() => this.close());
  }
  /** Takes the lease again for a parked session; throws if another task holds it. */
  resume(signal: AbortSignal, onProgress: (event: LocalAiProgress) => void) {
    if (this.closed || !this.unpark) throw new Error("Session locale fermée.");
    if (signal.aborted) throw abortError();
    this.unpark();
    this.unpark = null;
    try {
      this.release = reserveClinicalModel();
    } catch (error) {
      this.close();
      throw error;
    }
    this.signal = signal;
    this.onProgress = onProgress;
    signal.addEventListener("abort", this.onAbort, { once: true });
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.unpark?.();
    this.signal.removeEventListener("abort", this.onAbort);
    // Worker termination also frees sessions during a stalled load / cancel.
    this.worker.terminate();
    this.reject(abortError());
    this.release();
  }
}
