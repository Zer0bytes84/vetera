import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

// Pin runtime assets to the installed engines. They are served by Vite in dev
// and embedded in dist in production; neither runtime needs a CDN.
export function localAiRuntimePlugin() {
  const require = createRequire(import.meta.url);
  const onnx = path.dirname(require.resolve("onnxruntime-web"));
  const genai = path.join(
    path.dirname(require.resolve("@mediapipe/tasks-genai")),
    "wasm",
  );
  const ocr = path.dirname(require.resolve("tesseract.js/package.json"));
  const core = path.dirname(require.resolve("tesseract.js-core/package.json"));
  const pdf = path.dirname(require.resolve("pdfjs-dist/package.json"));
  const files = new Map([
    ...[
      "ort-wasm-simd-threaded.jsep.mjs",
      "ort-wasm-simd-threaded.jsep.wasm",
    ].map((name) => [`onnx/${name}`, path.join(onnx, name)]),
    ...[
      "genai_wasm_module_internal.js",
      "genai_wasm_module_internal.wasm",
      "genai_wasm_nosimd_internal.js",
      "genai_wasm_nosimd_internal.wasm",
    ].map((name) => [`mediapipe/${name}`, path.join(genai, name)]),
    ["ocr/worker.min.js", path.join(ocr, "dist/worker.min.js")],
    ["ocr/ocr.worker.js", path.resolve("resources/local-ocr/ocr.worker.js")],
    ["ocr/LICENSE", path.resolve("resources/local-ocr/LICENSE")],
    ["ocr/manifest.json", path.resolve("resources/local-ocr/manifest.json")],
    ...["fra", "eng"].map((lang) => [
      `ocr/lang/${lang}.traineddata`,
      path.resolve(`resources/local-ocr/${lang}.traineddata`),
    ]),
    ...readdirSync(core)
      .filter((name) => /^tesseract-core.*\.wasm(?:\.js)?$/.test(name))
      .map((name) => [`ocr/${name}`, path.join(core, name)]),
    ...["wasm", "standard_fonts", "cmaps"].flatMap((folder) =>
      readdirSync(path.join(pdf, folder))
        .filter((name) => name !== "LICENSE")
        .map((name) => [`pdf/${folder}/${name}`, path.join(pdf, folder, name)]),
    ),
  ]);
  return {
    name: "baitari-local-ai-runtime",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const key = request.url
          ?.split("?")[0]
          ?.replace(/^\/local-ai-runtime\//, "");
        if (!request.url?.startsWith("/local-ai-runtime/") || !files.has(key))
          return next();
        response.setHeader(
          "Content-Type",
          key.endsWith(".wasm")
            ? "application/wasm"
            : key.endsWith(".js") || key.endsWith(".mjs")
              ? "text/javascript"
              : "application/octet-stream",
        );
        response.end(readFileSync(files.get(key)));
      });
    },
    generateBundle() {
      for (const [name, source] of files)
        this.emitFile({
          type: "asset",
          fileName: `local-ai-runtime/${name}`,
          source: readFileSync(source),
        });
    },
  };
}
