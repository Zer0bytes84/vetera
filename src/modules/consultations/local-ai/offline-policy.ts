export function assertLocalUrl(value: string, roots: string[]) {
  if (!roots.some((root) => value.startsWith(root)))
    throw new Error(
      "Accès réseau interdit : l’assistant utilise uniquement les fichiers locaux importés."
    );
  const url = new URL(value);
  if (
    !["http:", "https:", "asset:", "tauri:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    !roots.some((root) => url.href.startsWith(new URL(root).href)) ||
    /(?:^|\/)\.\.(?:\/|$)/.test(
      decodeURIComponent(value.split("?")[0].split("#")[0])
    )
  ) {
    throw new Error("Chemin de modèle local invalide.");
  }
}
// Installed only inside the disposable inference workers, never on the app's
// global fetch. Exact roots come from the native AppData model directory and
// packaged runtime assets. No CDN, remote model, analytics or cloud fallback.
export function enforceOfflineWorker(roots: string[]) {
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    assertLocalUrl(url, roots);
    const response = await originalFetch(input, { ...init, redirect: "error" });
    if (response.url) assertLocalUrl(response.url, roots);
    return response;
  };
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    ...args: unknown[]
  ) {
    assertLocalUrl(String(url), roots);
    return Reflect.apply(originalOpen, this, [method, url, ...args]);
  } as typeof originalOpen;
}
