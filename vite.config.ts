import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { loadEnv, type Plugin } from "vite";
import { defineConfig, configDefaults } from "vitest/config";
// @ts-expect-error Shared Node build helper.
import { localAiRuntimePlugin } from "./scripts/local-ai-runtime-plugin.mjs";
// @ts-expect-error Build helper is shared with Node integration tests.
import { licenseBuildConfig } from "./scripts/license-build-config.mjs";
// @ts-expect-error Development-only test harness, a Node helper (see docs/TEST-HARNESS.md).
import { testHarnessPlugin } from "./scripts/test-harness-plugin.mjs";

// Cross-origin isolation (SharedArrayBuffer) lets the local search engine run
// on several threads. Production gets the same headers from tauri.conf.json.
export const CROSS_ORIGIN_ISOLATION_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};
// On every dev response, plugin middlewares (local AI runtime) included: workers
// and WASM files must carry the policy of the page that loads them.
const crossOriginIsolation = (): Plugin => {
  const apply = (_request: unknown, response: { setHeader(name: string, value: string): void }, next: () => void) => {
    for (const [name, value] of Object.entries(CROSS_ORIGIN_ISOLATION_HEADERS)) response.setHeader(name, value);
    next();
  };
  return {
    name: "baitari-cross-origin-isolation",
    configureServer: (server) => void server.middlewares.use(apply),
    configurePreviewServer: (server) => void server.middlewares.use(apply),
  };
};

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => ({
  test: {
    exclude: [...configDefaults.exclude, "tests/activation-server.test.mjs"],
  },
  define: licenseBuildConfig(command, { ...loadEnv(mode, process.cwd(), ""), ...process.env }, process.cwd()),
  // Tauri desktop bundles should resolve assets relative to index.html.
  // Keeping "/" here breaks packaged builds with "Importing a module script failed".
  base: process.env.TAURI_ENV_PLATFORM ? "./" : "/",
  plugins: [crossOriginIsolation(), react(), tailwindcss(), localAiRuntimePlugin(), ...testHarnessPlugin(command)],
  worker: { format: "es" },
  // Warm worker-only dependencies before the first consultation. Lazy discovery
  // during an inference otherwise invalidates the desktop window's module cache.
  optimizeDeps: { include: ["@huggingface/transformers", "transformers-v4", "@mediapipe/tasks-genai"] },
  server: {
    port: 5180,
    host: "0.0.0.0",
    strictPort: true,
    watch: {
      // Native file events avoid scanning the whole project every second.
      // Polling remains available for network-mounted development workspaces.
      usePolling: process.env.VITE_USE_POLLING === "true",
      interval: 1000,
    },
    fs: {
      allow: ["..", "../../node_modules/@fontsource"],
    },
  },
  resolve: {
    alias: [
      {
        find: /^@hugeicons\/core-free-icons$/,
        replacement: path.resolve(
          import.meta.dirname,
          "./src/lib/hugeicons.ts"
        ),
      },
      {
        find: "@",
        replacement: path.resolve(import.meta.dirname, "./src"),
      },
    ],
  },
  build: {
    manifest: true,
    rolldownOptions: {
      onwarn(warning, warn) {
        if (
          warning.code === "INVALID_ANNOTATION" &&
          warning.id?.includes("@hugeicons/core-free-icons")
        ) {
          return;
        }
        warn(warning);
      },
      output: {
        // Keep PDF and chart libraries out of the entry's static imports: they load
        // on demand. Rolldown replaces Rollup's `manualChunks` + `onlyExplicitManualChunks`:
        // a group captures only its own modules (`includeDependenciesRecursively: false`),
        // so shared modules are not pulled into a vendor chunk the entry would then import.
        // Tiptap and ProseMirror stay out of any group on purpose: splitting only @tiptap
        // creates NotesPro -> vendor-editor -> NotesPro and a temporal-dead-zone error
        // in packaged builds.
        codeSplitting: {
          groups: [
            {
              name: "vendor-pdf",
              test: /node_modules[\\/](jspdf|html2canvas)/,
              includeDependenciesRecursively: false,
            },
            {
              name: "vendor-charts",
              test: /node_modules[\\/](recharts|d3-)/,
              includeDependenciesRecursively: false,
            },
          ],
        },
      },
    },
  },
}));
