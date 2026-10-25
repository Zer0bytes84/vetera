/**
 * ONNX threads for the dictation. Measured on an M1 with 8 GB (2026-10-25):
 * 4 threads transcribe about twice as fast as 1, while 8 threads are slower
 * than 4 and exhausted the memory. Half the cores, at most 4, at least 1.
 */
export function whisperThreads(cores = globalThis.navigator?.hardwareConcurrency ?? 1) {
  return Math.max(1, Math.min(4, Math.floor(cores / 2)));
}
