// The packaged OCR worker may load only packaged runtime files. This guard
// lives in the worker, never on the app's global networking layer.
const localRoot = new URL("./", self.location.href).href;
function localUrl(value) {
  const url = new URL(String(value), self.location.href);
  if (!url.href.startsWith(localRoot) || url.username || url.password)
    throw new Error("Accès réseau interdit pendant la lecture locale.");
  return url.href;
}
const fetchLocal = self.fetch.bind(self);
self.fetch = (input, options) => fetchLocal(localUrl(typeof input === "string" || input instanceof URL ? input : input.url), { ...options, redirect: "error" });
const openLocal = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url, ...args) {
  return Reflect.apply(openLocal, this, [method, localUrl(url), ...args]);
};
const importLocal = self.importScripts.bind(self);
self.importScripts = (...urls) => importLocal(...urls.map(localUrl));
self.importScripts(localRoot + "worker.min.js");
