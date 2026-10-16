import { abortError } from "@/modules/consultations/local-ai/inference-client";
import type { ReadingProgress } from "./document-reading";

// Tesseract 7's packaged worker protocol. Own the Worker before initialization
// so cancellation or a failed language load can always terminate it.
export class PackagedOcr {
  private worker: Worker;
  private pending: {
    resolve: (value: Record<string, unknown>) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
    jobId: string;
  } | null = null;
  private nextJob = 0;
  private closed = false;
  private page = 1;
  private readonly onAbort = () => this.close();
  constructor(
    private root: string,
    private signal: AbortSignal,
    onProgress: (event: ReadingProgress) => void
  ) {
    if (signal.aborted) throw abortError();
    this.worker = new Worker(root + "ocr.worker.js");
    this.worker.onmessage = ({ data }) => {
      if (this.closed) return;
      if (data.status === "progress") {
        onProgress({
          message: "Reconnaissance du texte sur cet ordinateur…",
          progress: Number(data.data.progress),
          page: this.page,
        });
      } else if (this.pending && this.pending.jobId === data.jobId) {
        const job = this.pending;
        this.pending = null;
        clearTimeout(job.timer);
        if (data.status === "reject")
          job.reject(new Error("Le texte n’a pas pu être reconnu localement."));
        else job.resolve(data.data as Record<string, unknown>);
      }
    };
    this.worker.onerror = (event) => {
      event.preventDefault();
      this.close(new Error("Le moteur de lecture local n’a pas pu démarrer."));
    };
    signal.addEventListener("abort", this.onAbort, { once: true });
  }
  private request(
    action: string,
    payload: Record<string, unknown>,
    transfer: Transferable[] = []
  ): Promise<Record<string, unknown>> {
    if (this.closed || this.signal.aborted) return Promise.reject(abortError());
    if (this.pending)
      return Promise.reject(
        new Error("La lecture du document est déjà en cours.")
      );
    return new Promise((resolve, reject) => {
      const jobId = "document-" + ++this.nextJob;
      const timer = setTimeout(
        () =>
          this.close(
            new Error(
              "La reconnaissance du texte n’a pas répondu. Essayez une image plus nette."
            )
          ),
        90000
      );
      this.pending = { resolve, reject, timer, jobId };
      this.worker.postMessage(
        { workerId: "baitari-documents", jobId, action, payload },
        transfer
      );
    });
  }
  async initialize() {
    await this.request("load", {
      options: { lstmOnly: true, corePath: this.root },
    });
    await this.request("loadLanguage", {
      langs: "fra+eng",
      options: {
        langPath: this.root + "lang",
        cacheMethod: "none",
        gzip: false,
        lstmOnly: true,
      },
    });
    await this.request("initialize", { langs: "fra+eng", oem: 1, config: {} });
  }
  async recognize(image: Uint8Array, page: number) {
    this.page = page;
    const data = await this.request(
      "recognize",
      { image, options: {}, output: { text: true } },
      [image.buffer as ArrayBuffer]
    );
    return {
      text: String(data.text ?? ""),
      confidence: Number(data.confidence ?? 0),
    };
  }
  close(error: Error = abortError()) {
    if (this.closed) return;
    this.closed = true;
    this.signal.removeEventListener("abort", this.onAbort);
    this.worker.terminate();
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(error);
      this.pending = null;
    }
  }
}
