// WebKit isolates the tauri:// page and shares WebAssembly memory, but does not
// expose the SharedArrayBuffer global that ONNX checks before using threads.
export const exposeSharedMemory = () => {
  if (typeof SharedArrayBuffer === "function" || !self.crossOriginIsolated) return;
  try {
    const shared = new WebAssembly.Memory({ initial: 1, maximum: 1, shared: true }).buffer.constructor;
    Object.defineProperty(globalThis, "SharedArrayBuffer", { value: shared, configurable: true, writable: true });
  } catch {
    /* No shared memory: ONNX stays on one thread. */
  }
};
