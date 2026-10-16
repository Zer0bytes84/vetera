import { reserveClinicalModel } from "./model-lease";
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
  private readonly onAbort = () => this.close();
  private constructor(
    private readonly worker: Worker,
    private readonly release: () => void,
    private readonly signal: AbortSignal,
    onProgress: (event: LocalAiProgress) => void
  ) {
    worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      if (this.closed) return;
      if (data.type === "progress") {
        onProgress(data);
        return;
      }
      if (data.type === "error") {
        this.reject(new Error(data.message));
        return;
      }
      if (this.pending && data.type === this.pending.expected) {
        const { resolve, timer } = this.pending;
        this.pending = null;
        clearTimeout(timer);
        resolve(data);
      }
    };
    worker.onerror = (event) => {
      event.preventDefault();
      this.reject(
        new Error(
          "Le moteur local n’a pas pu démarrer. Vérifiez l’installation de Baitari et réessayez."
        )
      );
    };
    signal.addEventListener("abort", this.onAbort, { once: true });
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
      return new LocalInferenceSession(worker, release, signal, onProgress);
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
    if (this.closed || this.signal.aborted) return Promise.reject(abortError());
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
        this.worker.postMessage(message, transfer);
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
  close() {
    if (this.closed) return;
    this.closed = true;
    this.signal.removeEventListener("abort", this.onAbort);
    // Worker termination also frees sessions during a stalled load / cancel.
    this.worker.terminate();
    this.reject(abortError());
    this.release();
  }
}
